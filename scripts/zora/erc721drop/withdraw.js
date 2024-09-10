/**
 * Script to create Zora drop
 */
require("dotenv").config();

const { getNetworkConfig } = require("../../../config/network-config");
const { ethers } = require("hardhat");
const fs = require("fs");

const collectionAddress = "0x4b2b47f592a83241cc730b2543a05a98a632b395";

async function withdraw() {
  const networkConfig = getNetworkConfig(process.env.CHAIN_NAME);

  const provider = new ethers.JsonRpcProvider(networkConfig.json_rpc_url);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // 1. filler approve erc721 transfer helper to transfer token in collection
  const dropABI = JSON.parse(
    fs.readFileSync("./config/abis/ERC721Drop.json"),
  ).abi;
  const dropContract = new ethers.Contract(
    collectionAddress,
    dropABI,
    deployer,
  );
  const withdrawResponse = await dropContract.withdraw();

  console.log("Contract balance:", await provider.getBalance(collectionAddress));
  console.log("Transaction Hash:", withdrawResponse.hash);
}

withdraw();
