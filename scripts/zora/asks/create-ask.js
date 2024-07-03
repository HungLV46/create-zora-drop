/**
 * Script to create Zora drop
 */
require("dotenv").config();

const { getNetworkConfig } = require("../../../config/network-config");
const { ethers } = require("hardhat");
const fs = require("fs");
const { sleep } = require("../../util");

const collectionAddress = "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6";
const tokenId = 67;

async function createAsk() {
  const networkConfig = getNetworkConfig(process.env.CHAIN_NAME);

  const provider = new ethers.JsonRpcProvider(networkConfig.json_rpc_url);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // 1. asker approve ask module
  const managerABI = JSON.parse(
    fs.readFileSync("./config/abis/ZoraModuleManager.json"),
  ).abi;
  const managerContract = new ethers.Contract(
    networkConfig.zora_contract_addresses.MODULE_MANAGER,
    managerABI,
    deployer,
  );
  const managerApprovalResponse = await managerContract.setApprovalForModule(
    networkConfig.zora_contract_addresses.ASK_V1,
    true,
  );
  await sleep(1000);

  // 2. asker approve erc721 transfer helper to transfer ERC721Drop tokens
  const dropABI = JSON.parse(
    fs.readFileSync("./config/abis/ERC721Drop.json"),
  ).abi;
  const dropContract = new ethers.Contract(
    collectionAddress,
    dropABI,
    deployer,
  );
  const dropApproveResponse = await dropContract.setApprovalForAll(
    networkConfig.zora_contract_addresses.ERC721_TRANSFER_HELPER,
    true,
  );
  await sleep(1000);

  // 3. asker create ask
  const askABI = JSON.parse(fs.readFileSync("./config/abis/AsksV1_1.json")).abi;
  const askContract = new ethers.Contract(
    networkConfig.zora_contract_addresses.ASK_V1,
    askABI,
    deployer,
  );
  const createResponse = await askContract.createAsk(
    collectionAddress,
    tokenId,
    ethers.parseEther("0.001").toString(),
    "0x0000000000000000000000000000000000000000",
    deployer.address,
    0,
  );
  console.log(createResponse);
}

createAsk();
