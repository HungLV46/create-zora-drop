/**
 * Script to create Zora drop
 */
require('dotenv').config();

const { getNetworkConfig } = require('../../../config/network-config');
const { ethers } = require('hardhat');
const fs = require('fs');
const _ = require('lodash');
const { sleep } = require('../../util');

function getParamsForScript() {
  const privateKey = process.env.PRIVATE_KEY;
  if(_.isEmpty(privateKey)) {
    throw Error(
      "Missing Deployer Account", 
      "Private key of the deployer must be specified in '.env' file. e.g. PRIVATE_KEY=xxx"
    );
  }

  const zoraDropAddress = process.argv[2];
  if(_.isEmpty(zoraDropAddress)) {
    throw Error(
      "Missing zora drop address", 
      "Must specify zora drop address (for calling purchase) as the first argument of the script."
    );
  }

  return {
    chain_name: process.env.CHAIN_NAME || "serenity",
    private_key: `0x${privateKey}`,
    zora_drop_address: zoraDropAddress,
    purchase_quantity: process.argv[3] || 1
  };
}

// set up needed entities to interact with blockchain & contracts
function createNetworkEntities(chainName, deployerPrivateKey, dropAddress) {
  const networkConfig = getNetworkConfig(chainName);
  const chainId = networkConfig.chain_id;
  const jsonRpcUrl = networkConfig.json_rpc_url;

  const provider = new ethers.JsonRpcProvider(jsonRpcUrl);
  const dropABI = JSON.parse(fs.readFileSync('./config/abis/ERC721Drop.json')).abi;
  const deployer = new ethers.Wallet(deployerPrivateKey, provider);
  const deployerAddress = deployer.address;
  const proxyContract = new ethers.Contract(dropAddress, dropABI, deployer);

  // console.log("=========== BASE CONFIG ===========");
  // console.log("Chain ID:", chainId);
  // console.log("JSON RPC URL:", jsonRpcUrl);
  // console.log("Deployer address:", deployerAddress);
  console.log("Zora drop address:", dropAddress, "\n");

  return {
    provider,
    deployer_address: deployerAddress,
    zora_drop_contract: proxyContract
  }
}

// main function
async function purchase() {
  const { chain_name, private_key, zora_drop_address:dropAddress, purchase_quantity } = getParamsForScript();
  const { provider, zora_drop_contract:dropContract } = createNetworkEntities(chain_name, private_key, dropAddress)

  const proofs = [
    "0xbbd7c77df0fa18dbf6217a98dbfb2cc45e9482b513a02ed9332a7f8272e5176a",
    "0x4e3616fd86fac205bd9dd6defbcc0737f52c78875420d23579b2ab7c9dc9b2b2"];

  const createResponse = await dropContract.purchasePresale(1,2,0,proofs);
  
  // print results
  // console.log("======== PURCHASE RESULT ========");
  const transactionHash = createResponse.hash;
  console.log("Transaction Hash:", transactionHash);
  await sleep(6000); // wait for transaction to be mined
  const transactionReceipt = await provider.getTransactionReceipt(transactionHash);
  if(transactionReceipt) {
    console.log("Transaction status:", transactionReceipt.status === 1 ? "success" : "failed");
  } else {
    console.log("Cannot check status of the transaction.");
  }
}

purchase()
  .then(() => process.exit(0))
  .catch(error => { console.log(error); process.exit(1); })
