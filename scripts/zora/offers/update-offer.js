/**
 * Script to create Zora drop
 */
require('dotenv').config();

const { getNetworkConfig } = require('../../../config/network-config');
const { ethers } = require('hardhat');
const fs = require('fs');
const { sleep } = require('../../util');

const collectionAddress = "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6";
const tokenId = 45;

async function createOffer() {
  const networkConfig = getNetworkConfig(process.env.CHAIN_NAME);

  const provider = new ethers.JsonRpcProvider(networkConfig.json_rpc_url);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // create offer
  const offerABI = JSON.parse(fs.readFileSync('./config/abis/OffersOmnibus.json')).abi;
  const offerContract = new ethers.Contract(networkConfig.zora_contract_addresses.OFFERS_OMNIBUS, offerABI, deployer);
  const createResponse = await offerContract.setOfferAmount(
    collectionAddress, 
    tokenId,
    80,
    "0x0000000000000000000000000000000000000000",
    ethers.parseEther("0.08").toString());
  console.log(createResponse);
}

createOffer();
