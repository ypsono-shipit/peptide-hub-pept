import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import { useAppContracts, useNetworkConfig } from "./useAppContracts";

/** Live price for a market with an on-chain PeptideOracle feed. Falls back to `fallback` while loading/unset. */
export function useOraclePrice(oracleKey: `0x${string}` | undefined, fallback: number) {
  const { peptideOracle } = useAppContracts();
  const network = useNetworkConfig();

  const { data, isLoading } = useReadContract({
    ...peptideOracle,
    functionName: "getPrice",
    args: oracleKey ? [oracleKey] : undefined,
    query: { enabled: !!oracleKey && network.contractsLive },
  });

  if (!oracleKey || !network.contractsLive || data === undefined) {
    return { price: fallback, isLive: false, isLoading };
  }
  return { price: Number(formatEther(data as bigint)), isLive: true, isLoading };
}
