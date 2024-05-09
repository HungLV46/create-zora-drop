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

  const config = {
    name: rawConfig.name,
    symbol: rawConfig.symbol,
    defaultAdmin: rawConfig.defaultAdmin || defaultAddress,
    editionSize: rawConfig.editionSize,
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
  
    config.saleConfig.presaleStart = rawConfig.saleConfig.presale.startTime;
    config.saleConfig.presaleEnd = rawConfig.saleConfig.presale.endTime;
    config.saleConfig.presaleMerkleRoot = `0x${processWhitelistResposne.root}`;
  }

  // process public sale config
  if(!_.isEmpty(rawConfig.saleConfig.publicSale)) {
    config.saleConfig.publicSaleStart = rawConfig.saleConfig.publicSale.startTime;
    config.saleConfig.publicSaleEnd = rawConfig.saleConfig.publicSale.endTime;
    config.saleConfig.publicSalePrice = ethers.parseEther(rawConfig.saleConfig.publicSale.publicSalePrice).toString();
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
      presaleStart: new Date(config.saleConfig.presaleStart * 1000),
      presaleEnd: new Date(config.saleConfig.presaleEnd * 1000),
      publicSaleStart: new Date(config.saleConfig.publicSaleStart * 1000),
      publicSaleEnd: new Date(config.saleConfig.publicSaleEnd * 1000)
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
    console.log("Collection contract address:", transactionReceipt.logs.find(log => log.index === 0).address, "\n");
  } else {
    console.log("Cannot check status of the transaction.");
  }
}

createZoraDrop()
  .then(() => process.exit(0))
  .catch(error => { console.log(error); process.exit(1); })
  