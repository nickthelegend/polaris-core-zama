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
      [SEPOLIA]: process.env.VITE_MOCK_WETH || "0x35504AceAea50B3dbeF640618b535feDB2db680B",
      [LOCALHOST]: "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82",
    },
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logo: "/tokens/usdc.svg",
    addresses: {
      [SEPOLIA]: process.env.VITE_MOCK_USDC || "0xA715e84556b03aBdaC42aa421b5D6081A5434a2F",
      [LOCALHOST]: "0x9A676e781A523b5d0C0e43731313A708CB607508",
    },
  },
  WBTC: {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    decimals: 8,
    logo: "/tokens/wbtc.svg",
    addresses: {
      [SEPOLIA]: process.env.VITE_MOCK_WBTC || "0x4105F990aBd92f8CCCD8c58433963B862C4b34a5",
      [LOCALHOST]: "0x0B306BF915C4d645ff596e518fAf3F9669b97016",
    },
  },
  BNB: {
    symbol: "BNB",
    name: "Wrapped BNB",
    decimals: 18,
    logo: "/tokens/bnb.svg",
    addresses: {
      [SEPOLIA]: process.env.VITE_MOCK_BNB || "0xd376252519348D8d219C250E374CE81A1B528BE5",
      [LOCALHOST]: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
    },
  },
};

/** Get a token's address for the given chainId, or undefined if not configured. */
export function getTokenAddress(symbol: string, chainId: number): string | undefined {
  const token = TOKENS[symbol];
  if (!token) return undefined;
  // Direct match first, then fall back to localhost addresses for unknown chains
  return token.addresses[chainId] ?? token.addresses[LOCALHOST];
}

/** Get all tokens configured for a given chainId. */
export function getTokensForChain(chainId: number): Array<TokenConfig & { address: string }> {
  return Object.values(TOKENS)
    .filter((t) => t.addresses[chainId] && t.addresses[chainId] !== "0x0000000000000000000000000000000000000000")
    .map((t) => ({ ...t, address: t.addresses[chainId] }));
}
