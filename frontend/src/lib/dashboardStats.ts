// Presentational demo figures, not fetched from anywhere real. TVL/OI/etc.
// have no on-chain source yet (Treasury and PerpsEngine are fresh/empty on
// testnet); these exist purely to give the dashboard the density the design
// calls for. Replace with real reads once there's real usage to report.
export const PEPT_INDEX_STATS = {
  tvl: "$2.4M",
  openInterest: "$860K",
  constituents: 12,
};

export const GLP1_INDEX_WEIGHTS = [
  { label: "Semaglutide", value: 60 },
  { label: "Tirzepatide", value: 25 },
  { label: "Retatrutide", value: 15 },
];

export const PORTFOLIO_ALLOCATION = [
  { label: "SEMA Perp", value: 40 },
  { label: "GLP1 Index", value: 30 },
  { label: "LLY Perp", value: 18 },
  { label: "TSHA Perp", value: 12 },
];

export const STATUS_BAR = {
  peptTvl: "$2.4M",
  labs: 128,
  researchPapers: 340,
  marketplaceListings: 2450,
  network: "Robinhood Chain Testnet",
  status: "Healthy" as const,
};
