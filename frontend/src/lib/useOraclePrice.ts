import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { peptideOracleContract } from "./contracts";

/** Live price for a market with an on-chain PeptideOracle feed. Falls back to `fallback` while loading/unset. */
export function useOraclePrice(oracleKey: `0x${string}` | undefined, fallback: number) {
  const { data, isLoading } = useReadContract({
    ...peptideOracleContract,
    functionName: "getPrice",
    args: oracleKey ? [oracleKey] : undefined,
    query: { enabled: !!oracleKey },
  });

  if (!oracleKey || data === undefined) {
    return { price: fallback, isLive: false, isLoading };
  }
  return { price: Number(formatEther(data as bigint)), isLive: true, isLoading };
}
