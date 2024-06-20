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

  // 1. offerer approve offer module
  const managerABI = JSON.parse(fs.readFileSync('./config/abis/ZoraModuleManager.json')).abi;
  const managerContract = new ethers.Contract(networkConfig.zora_contract_addresses.MODULE_MANAGER, managerABI, deployer);
  const managerApprovalResponse = await managerContract.setApprovalForModule(networkConfig.zora_contract_addresses.OFFERS_OMNIBUS, true);
  await sleep(1000);

  // 2. offerer set allowance for erc20 module
  const offerPrice = ethers.parseEther("0.1").toString();
  const wethABI = JSON.parse(fs.readFileSync('./config/abis/WETH9.json')).abi;
  const wethContract = new ethers.Contract(networkConfig.zora_contract_addresses.WETH, wethABI, deployer);
  const wethApproveResponse = await wethContract.approve(networkConfig.zora_contract_addresses.ERC20_TRANSFER_HELPER, offerPrice);
  await sleep(1000);

  // 3. offerer create offer
  const offerABI = JSON.parse(fs.readFileSync('./config/abis/OffersOmnibus.json')).abi;
  const offerContract = new ethers.Contract(networkConfig.zora_contract_addresses.OFFERS_OMNIBUS, offerABI, deployer);
  // const createResponse = await offerContract.createOfferMinimal(collectionAddress, tokenId, { value: ethers.parseEther("0.1").toString() });
  const createResponse = await offerContract.createOffer(
    collectionAddress, 
    tokenId,
    "0x0000000000000000000000000000000000000000",
    offerPrice,
    "1721628115",
    0,
    0,
    "0x0000000000000000000000000000000000000000",
    { value: ethers.parseEther("0.1").toString() }
  );
  console.log(createResponse);
}

createOffer();
