require("dotenv").config();
const { ethers } = require("ethers");
const contractJson = require("./FoodTraceability.json");

// Connects to the local Hardhat blockchain
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Uses Hardhat's default first test account to sign transactions
// (this is a well-known, publicly documented test private key, safe only for local use)
const wallet = new ethers.Wallet(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  provider
);

// NonceManager tracks the next nonce locally instead of asking the network
// each time, so multiple concurrent transactions from this same wallet
// (e.g. during the scalability benchmark) don't collide on the same nonce.
const signer = new ethers.NonceManager(wallet);

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractJson.abi,
  signer
);

module.exports = contract;