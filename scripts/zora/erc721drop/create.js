/**
 * Script to create Zora drop
 */
require('dotenv').config();

const { getNetworkConfig } = require('../../../config/network-config');
const { ethers } = require('hardhat');
const fs = require('fs');
const _ = require("lodash");
const axios = require('axios').default;
const { sleep } = require('../../util');
const { create } = require('ipfs-http-client');

function getParamsForScript() {
  const privateKey = process.env.PRIVATE_KEY;
  if(_.isEmpty(privateKey)) {
    throw Error(
      "Missing Deployer Account", 
      "Private key of the deployer must be specified in '.env' file. e.g. PRIVATE_KEY=xxx"
    );
  }

  return {
    chain_name: process.env.CHAIN_NAME || "serenity",
    private_key: `0x${privateKey}`,
    zora_drop_config_path: process.argv[2] || './scripts/zora/erc721drop/drop-config.json',
  };
}

// set up needed entities to interact with blockchain & contracts
function createNetworkEntities(chainName, deployerPrivateKey) {
  const networkConfig = getNetworkConfig(chainName);
  const chainId = networkConfig.chain_id;
  const jsonRpcUrl = networkConfig.json_rpc_url;
  const creatorProxyAddress = networkConfig.zora_contract_addresses.ZORA_NFT_CREATOR_PROXY;

  const provider = new ethers.JsonRpcProvider(jsonRpcUrl);
  const creatorABI = JSON.parse(fs.readFileSync('./config/abis/ZoraNFTCreatorV1.json')).abi;
  const deployer = new ethers.Wallet(deployerPrivateKey, provider);
  const deployerAddress = deployer.address;
  const proxyContract = new ethers.Contract(creatorProxyAddress, creatorABI, deployer);

  console.log("=========== BASE CONFIG ===========");
  console.log("Chain ID:", chainId);
  console.log("JSON RPC URL:", jsonRpcUrl);
  console.log("Deployer address:", deployerAddress);
  console.log("Zora NFT creator proxy address:", creatorProxyAddress, "\n");

  return {
    provider,
    deployer_address: deployerAddress,
    zora_creator_proxy_contract: proxyContract
  }
}

async function processZoraDropConfig(configPath, defaultAddress) {
  const rawConfig = JSON.parse(fs.readFileSync(configPath));
  const maxSupply = rawConfig.editionSize;

  // rawConfig.metadata.mintConfig = { maxSupply: maxSupply, phases: [] };

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
      presaleMerkleRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
      publicSaleStart: 0,
      publicSaleEnd: 0,
      publicSalePrice: "0",
      maxSalePurchasePerAddress: 0
    }
  }

  // process presale config
  if(!_.isEmpty(rawConfig.saleConfig.presale?.whitelist)) {
    rawConfig.saleConfig.presale.whitelist.forEach(entry => entry.price = ethers.parseEther(entry.price).toString());

    const { data:processWhitelistResposne } = await axios.post('https://allowlist.zora.co/allowlist', {
      entries: rawConfig.saleConfig.presale.whitelist
    });

    if(!processWhitelistResposne.success) throw new Exception("Presale whiltelist process failed", JSON.stringify(processWhitelistResposne));
  
    const presaleStartTime = rawConfig.saleConfig.presale.startTime;
    const presaleEndTime = rawConfig.saleConfig.presale.endTime;
    config.saleConfig.presaleStart = presaleStartTime;
    config.saleConfig.presaleEnd = presaleEndTime;
    config.saleConfig.presaleMerkleRoot = `0x${processWhitelistResposne.root}`;

    // rawConfig.metadata.mintConfig.phases.push({
    //   startTime: presaleStartTime,
    //   endTime: presaleEndTime,
    //   tx: {
    //     method: "0x25024a2b",
    //     params: [
    //       {
    //         kind: "QUANTITY",
    //         name: "quantity",
    //         abiType: "uint256"
    //       },
    //       {
    //         kind: "QUANTITY",
    //         name: "max_quantity",
    //         abiType: "uint256"
    //       },          {
    //         kind: "QUANTITY",
    //         name: "price_per_token",
    //         abiType: "uint256"
    //       },
    //       {
    //         kind: "MAPPING_RECIPIENT",
    //         name: "proof",
    //         abiType: "bytes32[]"
    //       }
    //     ]
    //   }
    // });
  }

  // process public sale config
  if(!_.isEmpty(rawConfig.saleConfig.publicSale)) {
    const publicSaleStartTime = rawConfig.saleConfig.publicSale.startTime;
    const publicSaleEndTime = rawConfig.saleConfig.publicSale.endTime;
    const publicSalePrice = ethers.parseEther(rawConfig.saleConfig.publicSale.publicSalePrice).toString();
    const maxPublicSalePerAddress = rawConfig.saleConfig.publicSale.maxSalePurchasePerAddress;

    config.saleConfig.publicSaleStart = publicSaleStartTime;
    config.saleConfig.publicSaleEnd = publicSaleEndTime;
    config.saleConfig.publicSalePrice = publicSalePrice;
    config.saleConfig.maxSalePurchasePerAddress = maxPublicSalePerAddress;

    // rawConfig.metadata.mintConfig.phases.push({
    //   price: publicSalePrice,
    //   startTime: publicSaleStartTime,
    //   endTime: publicSaleEndTime,
    //   maxMintsPerWallet: maxPublicSalePerAddress,
    //   tx: {
    //     method: "0xefef39a1",
    //     params: [
    //       {
    //         kind: "QUANTITY",
    //         name: "quantity",
    //         abiType: "uint256"
    //       }
    //     ]
    //   }
    // });
  }

  // upload metadata to IFPS to create contract URI
  if(_.isEmpty(config.metadataContractURI) && !_.isEmpty(rawConfig.metadata)) {
    const ipfsClient = create({ url: process.env.IPFS_GATEWAY, timeout: 60000 });
    const result = await ipfsClient.add(JSON.stringify(rawConfig.metadata), { cidVersion: 1 });
    config.metadataContractURI = `${process.env.IPFS_LINK_PREFIX}${result.cid.toString()}`;
  }

  console.log("========= ZORA DROP CONFIG =========");
  console.log({ ...config,
    saleConfig: {
      ...config.saleConfig,
      presaleStart: new Date(config.saleConfig.presaleStart * 1000).toLocaleString(),
      presaleEnd: new Date(config.saleConfig.presaleEnd * 1000).toLocaleString(),
      publicSaleStart: new Date(config.saleConfig.publicSaleStart * 1000).toLocaleString(),
      publicSaleEnd: new Date(config.saleConfig.publicSaleEnd * 1000).toLocaleString()
    }
  }, "\n");

  return config;
}

// main function
async function createZoraDrop() {
  const { chain_name, private_key, zora_drop_config_path:configPath } = getParamsForScript();
  const { provider, deployer_address, zora_creator_proxy_contract:proxyContract } = createNetworkEntities(chain_name, private_key)

  const config = await processZoraDropConfig(configPath, deployer_address);

  const createResponse = await proxyContract.createDrop(
    config.name, 
    config.symbol, 
    config.defaultAdmin, 
    config.editionSize, 
    config.royaltyBPS, 
    config.fundsRecipient, 
    config.saleConfig, 
    config.metadataURIBase, 
    config.metadataContractURI
  );
  
  // print results
  console.log("======== CREATE ZORA DROP RESULT ========");
  const transactionHash = createResponse.hash;
  console.log("Transaction Hash:", transactionHash);
  await sleep(6000); // wait for transaction to be mined
  const transactionReceipt = await provider.getTransactionReceipt(transactionHash);
  if(transactionReceipt) {
    console.log("Transaction status:", transactionReceipt.status === 1 ? "success" : "failed");
    console.log("Collection contract address:", transactionReceipt.logs.find(log => log.index === 0).address.toLowerCase(), "\n");
  } else {
    console.log("Cannot check status of the transaction.");
  }
}

createZoraDrop()
  .then(() => process.exit(0))
  .catch(error => { console.log(error); process.exit(1); })
  