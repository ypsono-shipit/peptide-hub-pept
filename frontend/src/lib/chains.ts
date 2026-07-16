import { defineChain } from "viem";

// Mainnet chain ID is 4663; testnet is a *separate* chain ID (46630).
// https://docs.robinhood.com/chain/connecting/

export const robinhoodChainTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Testnet Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

export const robinhoodChainMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ROBINHOOD_MAINNET_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  testnet: false,
});

export const SUPPORTED_CHAINS = [robinhoodChainTestnet, robinhoodChainMainnet] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

export function isSupportedChainId(id: number): id is SupportedChainId {
  return id === 46630 || id === 4663;
}
