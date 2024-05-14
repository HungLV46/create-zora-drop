const getNetworkConfig = (chainName) => {
  switch(chainName) {
    case "serenity": return {
      chain_id: 1236,
      json_rpc_url: "https://jsonrpc.serenity.aura.network",
      zora_contract_addresses: {
        "DROP_METADATA_RENDERER": "0xeaE7Eb86dF7D166d7454213FF745ECdf0e96e46f",
        "EDITION_METADATA_RENDERER": "0x36eCe7432E052C64a18E49b7C456463AC0AbAc57",
        "ERC721DROP_IMPL": "0x03D389c532e2b0Aa33Cd302f1e147843245B177a",
        "ERC721DROP_IMPL_VERSION": 14,
        "FACTORY_UPGRADE_GATE": "0x27f924A037e7b34971c8a565353E78cAab60D3B0",
        "ZORA_NFT_CREATOR_PROXY": "0x6Ff00F6B2120157fcA353fBe24D25536042197dF",
        "ZORA_NFT_CREATOR_V1_IMPL": "0xF0938d397956921b1fB326C7822259f575807d08"
      }
    }
    case "sepolia": return {
      chain_id: 11155111,
      json_rpc_url: "https://eth-sepolia.public.blastapi.io",
      zora_contract_addresses: {
        "DROP_METADATA_RENDERER": "0x0Cf8733DEd6d9E0905A8cCc8DC767F381A76970a",
        "EDITION_METADATA_RENDERER": "0xC5c958a65656A84b74100D1d420a1819fEA18d41",
        "ERC721DROP_IMPL": "0x78b524931e9d847c40BcBf225c25e154a7B05fDA",
        "ERC721DROP_IMPL_VERSION": 14,
        "FACTORY_UPGRADE_GATE": "0x3C1ebcF36Ca9DD9371c9aA99c274e4988906c6E3",
        "ZORA_NFT_CREATOR_PROXY": "0x87cfd516c5ea86e50b950678CA970a8a28de27ac",
        "ZORA_NFT_CREATOR_V1_IMPL": "0x2fBdBc34B6015e7b40638179Aa05a2D2267452c7",
        "timestamp": 1696361962,
        "commit": "6361928"
      }
    }
    default: throw new Error(`${chainName} is not supported!`);
  }
};

module.exports = {
  getNetworkConfig
}
