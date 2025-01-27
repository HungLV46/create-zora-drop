/**
 * Script to create Zora drop
 */
require("dotenv").config();

const { getNetworkConfig } = require("../../../config/network-config");
const { ethers } = require("hardhat");
const fs = require("fs");

const collectionAddress = "0x0478daab689235e5a5d4dcb2d34dd737573cbeb7";

async function purchase() {
  const networkConfig = getNetworkConfig(process.env.CHAIN_NAME);

  const provider = new ethers.JsonRpcProvider(networkConfig.json_rpc_url);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // create offer
  const dropABI = JSON.parse(
    fs.readFileSync("./config/abis/ERC721Drop.json"),
  ).abi;
  const dropContract = new ethers.Contract(
    collectionAddress,
    dropABI,
    deployer,
  );
  const response = await dropContract.purchase(100, {
    value: ethers.parseEther("0.0777").toString(),
  });
  console.log(response);
}

purchase();
