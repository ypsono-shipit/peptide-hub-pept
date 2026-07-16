import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { useAppContracts, useNetworkConfig } from "./useAppContracts";

export type OnChainPosition = {
  id: bigint;
  trader: `0x${string}`;
  marketKey: `0x${string}`;
  isLong: boolean;
  sizeUsd: bigint;
  collateral: bigint;
  entryPrice: bigint;
  entryFundingIndex: bigint;
  openedAt: bigint;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Scans positionId 1..nextPositionId-1 and returns the ones owned by `address`. */
export function usePositions(address: `0x${string}` | undefined) {
  const { perpsEngine } = useAppContracts();
  const network = useNetworkConfig();
  const live = network.contractsLive;

  const nextId = useReadContract({
    ...perpsEngine,
    functionName: "nextPositionId",
    query: { enabled: live },
  });

  const ids = useMemo(() => {
    const n = nextId.data ? Number(nextId.data) : 1;
    return Array.from({ length: Math.max(n - 1, 0) }, (_, i) => BigInt(i + 1));
  }, [nextId.data]);

  const positionsQuery = useReadContracts({
    contracts: ids.map((id) => ({
      ...perpsEngine,
      functionName: "positions",
      args: [id],
    })),
    query: { enabled: live && ids.length > 0 },
  });

  const positions: OnChainPosition[] = useMemo(() => {
    if (!positionsQuery.data || !address) return [];
    return positionsQuery.data
      .map((r, i) => {
        if (r.status !== "success") return null;
        const [
          trader,
          marketKey,
          isLong,
          sizeUsd,
          collateral,
          entryPrice,
          entryFundingIndex,
          openedAt,
        ] = r.result as readonly [
          `0x${string}`,
          `0x${string}`,
          boolean,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ];
        if (trader.toLowerCase() !== address.toLowerCase() || trader === ZERO_ADDRESS) return null;
        return {
          id: ids[i]!,
          trader,
          marketKey,
          isLong,
          sizeUsd,
          collateral,
          entryPrice,
          entryFundingIndex,
          openedAt,
        };
      })
      .filter((p): p is OnChainPosition => p !== null);
  }, [positionsQuery.data, ids, address]);

  return {
    positions,
    isLoading: nextId.isLoading || positionsQuery.isLoading,
    refetch: () => {
      nextId.refetch();
      positionsQuery.refetch();
    },
  };
}
