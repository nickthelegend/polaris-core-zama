// AMM Contract Addresses and ABIs
export const AMM_DEPLOYMENTS = {
  mockTokens: {
    WETH: "0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00",
    BNB: "0x36C02dA8a0983159322a80FFE9F24b1acfF8B570",
    USDC: "0x809d550fca64d94Bd9F66E60752A544199cfAC3D",
    USDT: "0x4c5859f0F772848b2D91F1D83E2Fe57935348029"
  },
  lendingPools: {
    WETH: "0x1291Be112d480055DaFd8a610b7d1e203891C274",
    BNB: "0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154",
    USDC: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575",
    USDT: "0xCD8a1C3ba11CF5ECfa6267617243239504a98d90"
  },
  privateSwaps: {
    WETH: "0x82e01223d51Eb87e16A03E24687EDF0F294da6f1",
    BNB: "0x2bdCC0de6bE1f7D2ee689a0342D76F52E8EFABa3",
    USDC: "0x7969c5eD335650692Bc04293B07F5BF2e7A673C0",
    USDT: "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650"
  },
  ammPools: {
    BNB_USDC: "0xc351628EB244ec633d5f21fBD6621e1a683B1181",
    BNB_USDT: "0xFD471836031dc5108809D173A067e8486B9047A3",
    WETH_USDC: "0x51A1ceB83B83F1985a81C295d1fF28Afef186E02",
    WETH_USDT: "0x36b58F5C1969B7b6591D752ea6F5486D069010AB"
  }
} as const

export const ERC20_ABI = [
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export const AMM_ABI = [
  {
    inputs: [{ name: "tokenIn", type: "address" }, { name: "amountIn", type: "uint256" }],
    name: "swap",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenIn", type: "address" }, { name: "amountIn", type: "uint256" }],
    name: "getAmountOut",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const
