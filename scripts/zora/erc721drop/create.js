/**
 * Script to create Zora drop
 */
require("dotenv").config();

const { getNetworkConfig } = require("../../../config/network-config");
const { ethers } = require("hardhat");
const fs = require("fs");
const _ = require("lodash");
const axios = require("axios").default;
const { sleep } = require("../../util");
const { create } = require("ipfs-http-client");
const { makeTree } = require("../merkle-tree/merkle");

function getParamsForScript() {
  const privateKey = process.env.PRIVATE_KEY;
  if (_.isEmpty(privateKey)) {
    throw Error(
      "Missing Deployer Account",
      "Private key of the deployer must be specified in '.env' file. e.g. PRIVATE_KEY=xxx",
    );
  }

  return {
    chain_name: process.env.CHAIN_NAME || "serenity",
    private_key: `0x${privateKey}`,
    zora_drop_config_path:
      process.argv[2] || "./scripts/zora/erc721drop/drop-config.json",
  };
}

// set up needed entities to interact with blockchain & contracts
function createNetworkEntities(chainName, deployerPrivateKey) {
  const networkConfig = getNetworkConfig(chainName);
  const chainId = networkConfig.chain_id;
  const jsonRpcUrl = networkConfig.json_rpc_url;
  const creatorProxyAddress =
    networkConfig.zora_contract_addresses.ZORA_NFT_CREATOR_PROXY;

  const provider = new ethers.JsonRpcProvider(jsonRpcUrl);
  const creatorABI = JSON.parse(
    fs.readFileSync("./config/abis/ZoraNFTCreatorV1.json"),
  ).abi;
  const deployer = new ethers.Wallet(deployerPrivateKey, provider);
  const deployerAddress = deployer.address;
  const proxyContract = new ethers.Contract(
    creatorProxyAddress,
    creatorABI,
    deployer,
  );

  console.log("=========== BASE CONFIG ===========");
  console.log("Chain ID:", chainId);
  console.log("JSON RPC URL:", jsonRpcUrl);
  console.log("Deployer address:", deployerAddress);
  console.log("Zora NFT creator proxy address:", creatorProxyAddress, "\n");

  return {
    provider,
    deployer_address: deployerAddress,
    zora_creator_proxy_contract: proxyContract,
    mint_fee_per_quantity: networkConfig.mint_fee_per_quantity,
  };
}

// has side effect
async function processWhitelist(whitelist, fee) {
  // generate merkle proofs
  const merkleTree = makeTree(whitelist);
  const presaleMerkleRoot = merkleTree.root;

  const allowlist = await axios
    .get(
      `https://${process.env.GRAPHQL_DOMAIN}/api/rest/allowlist/${presaleMerkleRoot}`,
    )
    .then((response) => response.data.evmallowlists);

  // insert merkle proofs to db
  if (_.isEmpty(allowlist)) {
    console.log("Insert allowlist items");
    await axios
      .post(
        `https://${process.env.GRAPHQL_DOMAIN}/api/rest/insert-allowlist`,
        {
          id: presaleMerkleRoot,
          allowlists_items: {
            data: merkleTree.entries.map((entry, index) => ({
              index,
              address: "\\" + entry.user.slice(1),
              max_mints: entry.maxCanMint,
              price: entry.price,
              actual_price: entry.price + fee,
              proofs: entry.proof,
            })),
          },
        },
        {
          headers: {
            "x-hasura-admin-secret": process.env.GRAPHQL_ADMIN_SECRET,
          },
        },
      )
      .then((response) =>
        console.log(JSON.stringify(response.data.evminsert_allowlists) + "\n"),
      );
  }

  return presaleMerkleRoot;
}

async function processZoraDropConfig(configPath, defaultAddress, fee) {
  const rawConfig = JSON.parse(fs.readFileSync(configPath));
  const maxSupply = rawConfig.editionSize;

  const config = {
    name: rawConfig.name,
    symbol: rawConfig.symbol,
    defaultAdmin: rawConfig.defaultAdmin || defaultAddress,
    editionSize: maxSupply,
    royaltyBPS: rawConfig.royaltyBPS,
    fundsRecipient: rawConfig.fundsRecipient || defaultAddress,
    metadataURIBase: rawConfig.metadataURIBase,
    metadataContractURI: rawConfig.metadataContractURI,
    saleConfig: {
      presaleStart: 0,
      presaleEnd: 0,
      presaleMerkleRoot:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      publicSaleStart: 0,
      publicSaleEnd: 0,
      publicSalePrice: "0",
      maxSalePurchasePerAddress: 0,
    },
  };

  // process presale config
  if (!_.isEmpty(rawConfig.saleConfig.presale?.whitelist)) {
    rawConfig.saleConfig.presale.whitelist.forEach(
      (entry) => (entry.price = ethers.parseEther(entry.price).toString()),
    );

    const presaleMerkleRoot = await processWhitelist(
      rawConfig.saleConfig.presale.whitelist,
      fee,
    );
    const presaleStartTime = rawConfig.saleConfig.presale.startTime;
    const presaleEndTime = rawConfig.saleConfig.presale.endTime;
    config.saleConfig.presaleStart = presaleStartTime;
    config.saleConfig.presaleEnd = presaleEndTime;
    config.saleConfig.presaleMerkleRoot = presaleMerkleRoot;
  }

  // process public sale config
  if (!_.isEmpty(rawConfig.saleConfig.publicSale)) {
    const publicSaleStartTime = rawConfig.saleConfig.publicSale.startTime;
    const publicSaleEndTime = rawConfig.saleConfig.publicSale.endTime;
    const publicSalePrice = ethers
      .parseEther(rawConfig.saleConfig.publicSale.publicSalePrice)
      .toString();
    const maxPublicSalePerAddress =
      rawConfig.saleConfig.publicSale.maxSalePurchasePerAddress;

    config.saleConfig.publicSaleStart = publicSaleStartTime;
    config.saleConfig.publicSaleEnd = publicSaleEndTime;
    config.saleConfig.publicSalePrice = publicSalePrice;
    config.saleConfig.maxSalePurchasePerAddress = maxPublicSalePerAddress;
  }

  // upload metadata to IFPS to create contract URI
  if (_.isEmpty(config.metadataContractURI) && !_.isEmpty(rawConfig.metadata)) {
    const ipfsClient = create({
      url: process.env.IPFS_GATEWAY,
      timeout: 60000,
    });
    const result = await ipfsClient.add(JSON.stringify(rawConfig.metadata), {
      cidVersion: 1,
    });
    config.metadataContractURI = `${process.env.IPFS_LINK_PREFIX}${result.cid.toString()}`;
  }

  console.log("========= ZORA DROP CONFIG =========");
  console.log(
    {
      ...config,
      saleConfig: {
        ...config.saleConfig,
        presaleStart: new Date(
          config.saleConfig.presaleStart * 1000,
        ).toLocaleString(),
        presaleEnd: new Date(
          config.saleConfig.presaleEnd * 1000,
        ).toLocaleString(),
        publicSaleStart: new Date(
          config.saleConfig.publicSaleStart * 1000,
        ).toLocaleString(),
        publicSaleEnd: new Date(
          config.saleConfig.publicSaleEnd * 1000,
        ).toLocaleString(),
      },
    },
    "\n",
  );

  return config;
}

// main function
async function createZoraDrop() {
  const {
    chain_name,
    private_key,
    zora_drop_config_path: configPath,
  } = getParamsForScript();
  const {
    provider,
    deployer_address,
    zora_creator_proxy_contract: proxyContract,
    mint_fee_per_quantity: fee,
  } = createNetworkEntities(chain_name, private_key);

  const config = await processZoraDropConfig(configPath, deployer_address, fee);

  const createResponse = await proxyContract.createDrop(
    config.name,
    config.symbol,
    config.defaultAdmin,
    config.editionSize,
    config.royaltyBPS,
    config.fundsRecipient,
    config.saleConfig,
    config.metadataURIBase,
    config.metadataContractURI,
  );

  // print results
  console.log("======== CREATE ZORA DROP RESULT ========");
  const transactionHash = createResponse.hash;
  console.log("Transaction Hash:", transactionHash);
  await sleep(6000); // wait for transaction to be mined
  const transactionReceipt =
    await provider.getTransactionReceipt(transactionHash);
  let collectionAddress;
  if (transactionReceipt) {
    console.log(
      "Transaction status:",
      transactionReceipt.status === 1 ? "success" : "failed",
    );
    collectionAddress = transactionReceipt.logs
      .find((log) => log.index === 0)
      .address.toLowerCase();
    console.log("Collection contract address:", collectionAddress, "\n");
  } else {
    console.log("Cannot check status of the transaction.");
  }
  fs.appendFileSync(
    "created-collections.txt",
    collectionAddress + " " + transactionHash + "\n",
  );
}

createZoraDrop()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
