"use client";

import { PropsWithChildren, useEffect } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { connectorsForWallets, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { initiaPrivyWallet, injectStyles, InterwovenKitProvider, TESTNET, PRIVY_APP_ID } from "@initia/interwovenkit-react";
// @ts-ignore
import interwovenKitStyles from "@initia/interwovenkit-react/styles.js";
import { PrivyProvider } from "@privy-io/react-auth";
import { ThemeProvider } from "next-themes";
import { defineChain } from "viem";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [initiaPrivyWallet],
    },
  ],
  {
    appName: "Polaris Pay",
    projectId: "YOUR_PROJECT_ID",
  }
);

// Define Initia Weave rollup (Pointed to 140.245.206.114)
const minievm = defineChain({
  id: 4443872029483122, 
  name: 'Polaris Initia Rollup',
  nativeCurrency: { name: 'GAS', symbol: 'GAS', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://140.245.206.114:8545'] },
    public: { http: ['http://140.245.206.114:8545'] },
  },
});

const wagmiConfig = createConfig({
  connectors,
  chains: [minievm as any, mainnet],
  transports: {
    [minievm.id]: http(),
    [mainnet.id]: http(),
  },
});

const queryClient = new QueryClient();

const weaveLocal: any = {
  chain_id: "polaris-1",
  chain_name: "polaris",
  bech32_prefix: "init",
  pretty_name: "Polaris Pay (Initia)",
  network_type: "testnet",
  status: "live",
  apis: {
    rpc: [{ address: "http://140.245.206.114:26657" }],
    rest: [{ address: "http://140.245.206.114:1317" }],
    "json-rpc": [{ address: "http://140.245.206.114:8545" }]
  },
  fees: {
    fee_tokens: [{
      denom: "GAS",
      fixed_min_gas_price: 0,
      low_gas_price: 0,
      average_gas_price: 0,
      high_gas_price: 0
    }]
  },
  staking: { staking_tokens: [{ denom: "GAS" }] },
  native_assets: [{
    denom: "GAS",
    name: "GAS",
    symbol: "GAS",
    decimals: 18
  }],
  metadata: {
    is_l1: false,
    minitia: {
      type: "minievm"
    }
  }
};

export function Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    if (interwovenKitStyles) {
      injectStyles(interwovenKitStyles);
    }
  }, []);

  return (
    <ConvexClientProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RainbowKitProvider theme={darkTheme()}>
              <PrivyProvider
                appId={PRIVY_APP_ID}
                config={{
                  loginMethodsAndOrder: {
                    primary: [`privy:${PRIVY_APP_ID}`, 'detected_ethereum_wallets'],
                  },
                }}
              >
                <InterwovenKitProvider
                  customChain={weaveLocal}
                  // @ts-ignore
                  customChains={[weaveLocal]}
                  defaultChainId="polaris-1"
                  theme="dark"
                >
                  {children}
                  <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                  />
                </InterwovenKitProvider>
              </PrivyProvider>
            </RainbowKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
