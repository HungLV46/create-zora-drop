const { MerkleTree } = require("merkletreejs");
const { defaultAbiCoder } = require("@ethersproject/abi");
const { hexValue } = require("@ethersproject/bytes");
const { getAddress } = require("@ethersproject/address");
const keccak256 = require("keccak256");

function hashForEntry(entry) {
  return keccak256(
    defaultAbiCoder.encode(
      ["address", "uint256", "uint256"],
      [getAddress(entry.user), entry.maxCanMint, entry.price]
    )
  );
}

function makeTree(entries) {
  entries = entries.map((entry) => {
    entry.hash = hashForEntry(entry);
    return entry;
  });
  const tree = new MerkleTree(
    entries.map((entry) => entry.hash),
    keccak256,
    { sortPairs: true }
  );
  entries = entries.map((entry) => {
    entry.hash = hexValue(entry.hash);
    entry.proof = tree.getHexProof(entry.hash);
    return entry;
  });

  return {
    tree,
    root: tree.getHexRoot(),
    entries,
  };
}

module.exports = { makeTree, hashForEntry }