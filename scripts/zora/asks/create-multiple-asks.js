/**
 * Script to create Zora drop
 */
require("dotenv").config();

const { getNetworkConfig } = require("../../../config/network-config");
const { ethers } = require("hardhat");
const fs = require("fs");

const tokens = [
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 67,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 68,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 69,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 70,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 71,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 72,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 73,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 74,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 75,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 76,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 77,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 78,
  },
  {
    contract_address: "0xab20ee01c395f64efd9f45b12a9633e054d0bdf6",
    token_id: 79,
  },
];

async function createAsk() {
  const networkConfig = getNetworkConfig(process.env.CHAIN_NAME);

  const provider = new ethers.JsonRpcProvider(networkConfig.json_rpc_url);
  const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // 1. creating call data, assuming that all pre-conditions before the creation are met
  // a trick would be running creating a single ask script first
  const askABI = JSON.parse(fs.readFileSync("./config/abis/AsksV1_1.json")).abi;
  const iAsk = new ethers.Interface(askABI);
  const askPrice = ethers.parseEther("0.01").toString();
  const askCurrency = "0x0000000000000000000000000000000000000000";
  const sellerFundsRecipient = deployer.address;
  const findersFeeBps = 0;
  const calls = tokens.map((token) => ({
    allowFailure: false,
    callData: iAsk.encodeFunctionData("createAsk", [
      token.contract_address,
      token.token_id,
      askPrice,
      askCurrency,
      sellerFundsRecipient,
      findersFeeBps,
    ]),
  }));

  // 2. asker create ask
  const askContract = new ethers.Contract(
    networkConfig.zora_contract_addresses.ASK_V1,
    askABI,
    deployer,
  );
  const createResponse = await askContract.aggregate(calls);
  console.log(createResponse);
}

createAsk();
