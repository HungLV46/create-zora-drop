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

// A5 user is owner of token: 0xBf5A7aB89ac095b221522B430306D67b44e50955
// A6 is offerer: 0x5606b4eA93F696Dd82Ca983BAF5723d00729f127
async function fillOffer() {
  const networkConfig = getNetworkConfig(process.env.CHAIN_NAME);

  const provider = new ethers.JsonRpcProvider(networkConfig.json_rpc_url);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY_2, provider);

  // 1. filler approve erc721 transfer helper to transfer token in collection
  const dropABI = JSON.parse(fs.readFileSync('./config/abis/ERC721Drop.json')).abi;
  const dropContract = new ethers.Contract(collectionAddress, dropABI, deployer);
  const approveResponse = await dropContract.setApprovalForAll(networkConfig.zora_contract_addresses.ERC721_TRANSFER_HELPER, true);
  await sleep(1000);

  // 2. filler approve erc721 transfer helper module
  const managerABI = JSON.parse(fs.readFileSync('./config/abis/ZoraModuleManager.json')).abi;
  const managerContract = new ethers.Contract(networkConfig.zora_contract_addresses.MODULE_MANAGER, managerABI, deployer);
  const managerApprovalResponse = await managerContract.setApprovalForModule(networkConfig.zora_contract_addresses.OFFERS_OMNIBUS, true);
  await sleep(1000);

  // fill offer
  const offerABI = JSON.parse(fs.readFileSync('./config/abis/OffersOmnibus.json')).abi;
  const offerContract = new ethers.Contract(networkConfig.zora_contract_addresses.OFFERS_OMNIBUS, offerABI, deployer);
  const updateResponse = await offerContract.fillOffer(
    collectionAddress, 
    tokenId,
    77,
    ethers.parseEther("0.1").toString(),
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000"
  );
  console.log(updateResponse);
}

fillOffer();
