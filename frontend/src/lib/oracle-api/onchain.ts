import { createPublicClient, http, formatUnits, type Address } from "viem";
import { robinhoodChainTestnet } from "@/lib/chains";
import { TESTNET_CONTRACTS } from "@/lib/deployments";
import { marketKeyOf } from "./registry";

const ORACLE_ABI = [
  {
    type: "function",
    name: "getPrice",
    stateMutability: "view",
    inputs: [{ name: "marketKey", type: "bytes32" }],
    outputs: [{ name: "price", type: "uint256" }],
  },
  {
    type: "function",
    name: "feeds",
    stateMutability: "view",
    inputs: [{ name: "marketKey", type: "bytes32" }],
    outputs: [
      { name: "chainlinkFeed", type: "address" },
      { name: "pushedPrice", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "stalenessWindow", type: "uint256" },
      { name: "source", type: "string" },
      { name: "paused", type: "bool" },
    ],
  },
] as const;

function client() {
  return createPublicClient({
    chain: robinhoodChainTestnet,
    transport: http(
      process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com",
      { timeout: 12_000 },
    ),
  });
}

export type OnChainQuote = {
  market: string;
  marketKey: `0x${string}`;
  price: number;
  priceRaw: string;
  updatedAt: number;
  source: string;
  paused: boolean;
  stalenessWindow: number;
  chainId: number;
  oracle: Address;
};

export async function fetchOnChainQuote(marketId: string): Promise<OnChainQuote | null> {
  try {
    const c = client();
    const marketKey = marketKeyOf(marketId);
    const oracle = TESTNET_CONTRACTS.PeptideOracle as Address;

    const feed = await c.readContract({
      address: oracle,
      abi: ORACLE_ABI,
      functionName: "feeds",
      args: [marketKey],
    });

    const [chainlinkFeed, pushedPrice, updatedAt, stalenessWindow, source, paused] = feed;
    void chainlinkFeed;

    let priceRaw = pushedPrice;
    if (!paused) {
      try {
        priceRaw = await c.readContract({
          address: oracle,
          abi: ORACLE_ABI,
          functionName: "getPrice",
          args: [marketKey],
        });
      } catch {
        // feed may be stale/paused for getPrice; fall back to pushed
      }
    }

    if (priceRaw === 0n && updatedAt === 0n) return null;

    return {
      market: marketId,
      marketKey,
      price: Number(formatUnits(priceRaw, 18)),
      priceRaw: priceRaw.toString(),
      updatedAt: Number(updatedAt),
      source: source || "on-chain",
      paused,
      stalenessWindow: Number(stalenessWindow),
      chainId: robinhoodChainTestnet.id,
      oracle,
    };
  } catch {
    return null;
  }
}
