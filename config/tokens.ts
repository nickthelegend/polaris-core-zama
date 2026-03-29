/**
 * Token configuration for Polaris.
 * Addresses are keyed by chainId.
 */

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  addresses: Record<number, string>;
}

// Chain IDs
const SEPOLIA = 11155111;
const LOCALHOST = 31337;

export const TOKENS: Record<string, TokenConfig> = {
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    logo: "/tokens/weth.svg",
    addresses: {
      [SEPOLIA]: "0x35504AceAea50B3dbeF640618b535feDB2db680B",
      [LOCALHOST]: "0x1291Be112d480055DaFd8a610b7d1e203891C274",
    },
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logo: "/tokens/usdc.svg",
    addresses: {
      [SEPOLIA]: "0xA715e84556b03aBdaC42aa421b5D6081A5434a2F",
      [LOCALHOST]: "0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154",
    },
  },
  WBTC: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    logo: "/tokens/wbtc.svg",
    addresses: {
      [SEPOLIA]: "0x4105F990aBd92f8CCCD8c58433963B862C4b34a5",
      [LOCALHOST]: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575",
    },
  },
  BNB: {
    symbol: "BNB",
    name: "Wrapped BNB",
    decimals: 18,
    logo: "/tokens/bnb.svg",
    addresses: {
      [SEPOLIA]: "0xd376252519348D8d219C250E374CE81A1B528BE5",
      [LOCALHOST]: "0xCD8a1C3ba11CF5ECfa6267617243239504a98d90",
    },
  },
};

/** Get a token's address for the given chainId, or undefined if not configured. */
export function getTokenAddress(symbol: string, chainId: number): string | undefined {
  return TOKENS[symbol]?.addresses[chainId];
}

/** Get all tokens configured for a given chainId. */
export function getTokensForChain(chainId: number): Array<TokenConfig & { address: string }> {
  return Object.values(TOKENS)
    .filter((t) => t.addresses[chainId] && t.addresses[chainId] !== "0x0000000000000000000000000000000000000000")
    .map((t) => ({ ...t, address: t.addresses[chainId] }));
}
