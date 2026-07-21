import { formatEther, zeroAddress } from "viem";
import { useReadContract } from "wagmi";
import { useNetworkConfig } from "./useAppContracts";
import {
  CHAIN_TESTNET,
  TESTNET_CONTRACTS,
} from "./deployments";
import PEPTIDE_ORACLE_ABI from "./abis/PeptideOracle.json";
import type { Abi } from "viem";

/**
 * Live research mark for a market key (e.g. SEMA-PERP).
 *
 * Reads PeptideOracle on the connected chain when deployed.
 * On Robinhood mainnet the full perps stack (incl. oracle) is not deployed yet —
 * only SEMA/USDG spot is live — so we fall back to the testnet oracle where the
 * dual-source cron still pushes SEMA/TIRZ/RETA/GLP1 marks.
 */
export function useOraclePrice(oracleKey: `0x${string}` | undefined, fallback: number) {
  const network = useNetworkConfig();
  const localOracle = network.contracts.PeptideOracle;
  const hasLocalOracle =
    !!localOracle && localOracle.toLowerCase() !== zeroAddress.toLowerCase();

  const chainId = hasLocalOracle ? network.chainId : CHAIN_TESTNET;
  const address = (hasLocalOracle
    ? localOracle
    : TESTNET_CONTRACTS.PeptideOracle) as `0x${string}`;

  const { data, isLoading } = useReadContract({
    address,
    abi: PEPTIDE_ORACLE_ABI as Abi,
    functionName: "getPrice",
    args: oracleKey ? [oracleKey] : undefined,
    chainId,
    query: {
      enabled: !!oracleKey && !!address,
      refetchInterval: 30_000,
    },
  });

  if (!oracleKey || data === undefined) {
    return { price: fallback, isLive: false, isLoading };
  }

  const price = Number(formatEther(data as bigint));
  if (!Number.isFinite(price) || price <= 0) {
    return { price: fallback, isLive: false, isLoading };
  }

  return { price, isLive: true, isLoading };
}
