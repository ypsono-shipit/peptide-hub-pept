/**
 * PEPT LP Points program — weekly epochs for SEMA/USDG LPs.
 *
 * Emission model (matches PeptLpGauge.sol):
 * - 1 epoch = 7 days
 * - Fixed WEEKLY_EMISSION points stream pro-rata to staked LP
 * - Points are airdrop score for upcoming $PEPT (not transferable)
 */

export const EPOCH_DURATION_SEC = 7 * 24 * 60 * 60;

/** Default weekly emission (whole points, not wei). Gauge uses 18-decimal scale. */
export const WEEKLY_EMISSION = 100_000;

/** Boost if staked in gauge vs idle LP (idle earns 0 on-chain; display only). */
export const IDLE_LP_POINTS_NOTE =
  "Points accrue only while LP is staked in the PEPT gauge. Holding LP wallet-side does not earn.";

export type EpochInfo = {
  epoch: number;
  startsAt: number; // unix sec
  endsAt: number;
  secondsLeft: number;
  weeklyEmission: number;
  progress: number; // 0..1 within epoch
};

/** Epoch index from a known program start (gauge startTime once deployed). */
export function epochFromStart(startTimeSec: number, nowSec = Math.floor(Date.now() / 1000)): EpochInfo {
  const start = startTimeSec > 0 ? startTimeSec : nowSec;
  const elapsed = Math.max(0, nowSec - start);
  const epoch = Math.floor(elapsed / EPOCH_DURATION_SEC);
  const epochStart = start + epoch * EPOCH_DURATION_SEC;
  const endsAt = epochStart + EPOCH_DURATION_SEC;
  const secondsLeft = Math.max(0, endsAt - nowSec);
  const progress = 1 - secondsLeft / EPOCH_DURATION_SEC;
  return {
    epoch,
    startsAt: epochStart,
    endsAt,
    secondsLeft,
    weeklyEmission: WEEKLY_EMISSION,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

/** Provisional epoch clock until gauge is deployed (UTC Monday-aligned). */
export function provisionalEpoch(nowSec = Math.floor(Date.now() / 1000)): EpochInfo {
  // Align to Monday 00:00 UTC
  const d = new Date(nowSec * 1000);
  const day = d.getUTCDay(); // 0 Sun
  const daysFromMonday = (day + 6) % 7;
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysFromMonday) / 1000;
  // Arbitrary genesis for display epochs
  const genesis = Date.UTC(2026, 6, 20) / 1000; // 2026-07-20
  const epoch = Math.floor((monday - genesis) / EPOCH_DURATION_SEC);
  const endsAt = monday + EPOCH_DURATION_SEC;
  const secondsLeft = Math.max(0, endsAt - nowSec);
  return {
    epoch: Math.max(0, epoch),
    startsAt: monday,
    endsAt,
    secondsLeft,
    weeklyEmission: WEEKLY_EMISSION,
    progress: 1 - secondsLeft / EPOCH_DURATION_SEC,
  };
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Estimate points earned this epoch if `share` of total staked LP held constant.
 * share = userStaked / totalStaked in [0,1]
 */
export function estimateEpochPoints(share: number, epochProgress = 1): number {
  if (!Number.isFinite(share) || share <= 0) return 0;
  return WEEKLY_EMISSION * Math.min(1, share) * Math.min(1, Math.max(0, epochProgress));
}

/** Points per second for a share of the pool. */
export function pointsPerSecond(share: number): number {
  if (!Number.isFinite(share) || share <= 0) return 0;
  return (WEEKLY_EMISSION * share) / EPOCH_DURATION_SEC;
}
