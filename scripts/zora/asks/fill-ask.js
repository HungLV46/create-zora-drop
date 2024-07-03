/**
 * Script to create Zora drop
 */
require("dotenv").config();

const { getNetworkConfig } = require("../../../config/network-config");
const { ethers } = require("hardhat");
const fs = require("fs");
const { sleep } = require("../../util");

const collectionAddress = "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6";
const tokenId = 49;

async function fillAsk() {
  const networkConfig = getNetworkConfig(process.env.CHAIN_NAME);

  const provider = new ethers.JsonRpcProvider(networkConfig.json_rpc_url);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY_2, provider);

  // 1. buyer approve ask module
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

  // 3. buyer fill ask
  const askABI = JSON.parse(fs.readFileSync("./config/abis/AsksV1_1.json")).abi;
  const askPrice = ethers.parseEther("0.7").toString();
  const askContract = new ethers.Contract(
    networkConfig.zora_contract_addresses.ASK_V1,
    askABI,
    deployer,
  );
  const response = await askContract.fillAsk(
    collectionAddress,
    tokenId,
    "0x0000000000000000000000000000000000000000",
    askPrice,
    "0x0000000000000000000000000000000000000000",
    { value: askPrice },
  );
  console.log(response);
}

fillAsk();
