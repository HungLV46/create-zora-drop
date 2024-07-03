const getNetworkConfig = (chainName) => {
  switch (chainName) {
    case "xstaxy":
      return {
        chain_id: 6322,
        json_rpc_url: "https://jsonrpc.aura.network",
        zora_contract_addresses: {
          ZORA_NFT_CREATOR_PROXY: "0xdc99E17F7386E5148F585D7bAA4E1c482F4017F7",
        },
        mint_fee_per_quantity: 0,
      };
    case "euphoria":
      return {
        chain_id: 6321,
        json_rpc_url: "https://jsonrpc.euphoria.aura.network",
        zora_contract_addresses: {
          DROP_METADATA_RENDERER: "0x0458316F3549D0C9Bba67966d07E0909Bf83F8FD",
          EDITION_METADATA_RENDERER:
            "0xf139F465d0599fD2814DAC86526DF5De1875B5E8",
          ERC721DROP_IMPL: "0xD04C2b6F8ceD1052B3cAE9Ba61021B9f9C87c49b",
          // "ERC721DROP_IMPL_VERSION": 14,
          FACTORY_UPGRADE_GATE: "0x5f5CA4097fB1dA6F9C85Af43796421E2ab5A4D01",
          ZORA_NFT_CREATOR_V1_IMPL:
            "0x76F495DcebEc4A4d4c5E488243fd4509A158656a",
          ZORA_NFT_CREATOR_PROXY: "0xc1d364764D1a05bF7E10668146B2aB43C4966e00",
        },
        mint_fee_per_quantity: 0,
      };
    case "serenity":
      return {
        chain_id: 1236,
        json_rpc_url: "https://jsonrpc.serenity.aura.network",
        zora_contract_addresses: {
          ZORA_NFT_CREATOR_PROXY: "0xf69Fd9D27c09778CEB0e82E297496b49cFA0f994",
          MODULE_MANAGER: "0xB28D39287eC900E0987f5dD755651dE4256D0F5b",
          ERC20_TRANSFER_HELPER: "0xd1fC2D4F9984B6214D0a3778cbacbAbfA5e84224",
          ERC721_TRANSFER_HELPER: "0x56e88b1731D55703C1f80391602297715886Fa6A",
          ASK_V1: "0xFB51498b7Be8B3947f9782A96C4106Fd603beAAA",
          WETH: "0xE974cC14c93FC6077B0d65F98832B846C5454A0B",
        },
        mint_fee_per_quantity: 0,
      };
    case "devnet":
      return {
        chain_id: 1235,
        json_rpc_url: "https://jsonrpc.dev.aura.network",
        zora_contract_addresses: {
          ZORA_NFT_CREATOR_PROXY: "0xaa8ebaC64cA6c0B016F0EBCD41fff17673aF29bA",
          MODULE_MANAGER: "0x6B1Cc558DA2f0d909aD16FA29F2D74bF7A8cA6B4",
          OFFERS_OMNIBUS: "0x14511dEfE1fbc147b7364d3A5A3ED1179bd0c707",
          ERC20_TRANSFER_HELPER: "0xbeA9f83Dc816f0Df3F7fB43a288BE9fF211C3E7A",
          ERC721_TRANSFER_HELPER: "0x9f075Deab9a7433f0A5541d235a57db1cA491E0a",
          WETH: "0x7C258D32e0C5ADda30d18194870b56A38E2EBBbC",
          ASK_V1: "0x19d4E98A6b84787879fdc71b5b4a992fF92a5f77",
        },
        multicall_addresses: {
          MULTICALL3: "0xde6894229929a4d4376771abd8ad3ca864cfdba8",
          ATTACKER: "0x9A3B1e7d48e0464b9D476F26D56B65D62b716eb5",
        },
        mint_fee_per_quantity: 0,
      };
    case "sepolia":
      return {
        chain_id: 11155111,
        json_rpc_url: "https://eth-sepolia.public.blastapi.io",
        zora_contract_addresses: {
          DROP_METADATA_RENDERER: "0x0Cf8733DEd6d9E0905A8cCc8DC767F381A76970a",
          EDITION_METADATA_RENDERER:
            "0xC5c958a65656A84b74100D1d420a1819fEA18d41",
          ERC721DROP_IMPL: "0x78b524931e9d847c40BcBf225c25e154a7B05fDA",
          ERC721DROP_IMPL_VERSION: 14,
          FACTORY_UPGRADE_GATE: "0x3C1ebcF36Ca9DD9371c9aA99c274e4988906c6E3",
          ZORA_NFT_CREATOR_PROXY: "0x87cfd516c5ea86e50b950678CA970a8a28de27ac",
          ZORA_NFT_CREATOR_V1_IMPL:
            "0x2fBdBc34B6015e7b40638179Aa05a2D2267452c7",
          timestamp: 1696361962,
          commit: "6361928",
        },
      };
    default:
      throw new Error(`${chainName} is not supported!`);
  }
};

module.exports = {
  getNetworkConfig,
};
