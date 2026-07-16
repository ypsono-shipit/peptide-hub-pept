"use client";

import { useMemo } from "react";
import { useChainId } from "wagmi";
import { getContracts, type AppContracts } from "./contracts";
import { getNetwork, type NetworkConfig } from "./deployments";

/** Chain-aware contract addresses + ABIs for the connected wallet network. */
export function useAppContracts(): AppContracts {
  const chainId = useChainId();
  return useMemo(() => getContracts(chainId), [chainId]);
}

/** Active network metadata (collateral symbol, explorer, mintability, …). */
export function useNetworkConfig(): NetworkConfig {
  const chainId = useChainId();
  return useMemo(() => getNetwork(chainId), [chainId]);
}
