/**
 * LLY-PERP mark from Robinhood Chain mainnet stock token + live equity quote.
 *
 * Token (RH mainnet 4663):
 *   0x8005d266423c7Ea827372c9c864491e5786600eA
 *   "Eli Lilly • Robinhood Token" / LLY (18 decimals)
 *
 * The stock token itself is a 1:1 claim on LLY equity — it does not expose
 * latestAnswer()/getPrice(). We verify the token is live on-chain, then take
 * the public Robinhood equity quote as the USD mark (same as RH UI).
 */

import { JsonRpcProvider, Contract, getAddress } from "ethers";

/** RH mainnet stock token (checksum-correct). */
export const MAINNET_LLY_TOKEN = getAddress(
  "0x8005d266423c7ea827372c9c864491e5786600ea",
);

export const ROBINHOOD_MAINNET_RPC =
  process.env.ROBINHOOD_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";

const ERC20_META_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

export type LlyPriceResult = {
  symbol: "LLY-PERP";
  /** USD mark for one LLY share / stock token */
  priceUsd: number;
  token: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  source: string;
  quoteBid?: number;
  quoteAsk?: number;
  previousClose?: number;
  fetchedAt: string;
};

async function verifyLlyToken(rpcUrl = ROBINHOOD_MAINNET_RPC): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}> {
  const provider = new JsonRpcProvider(rpcUrl, 4663);
  const code = await provider.getCode(MAINNET_LLY_TOKEN);
  if (!code || code === "0x") {
    throw new Error(`No contract code at LLY token ${MAINNET_LLY_TOKEN}`);
  }
  const token = new Contract(MAINNET_LLY_TOKEN, ERC20_META_ABI, provider);
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name() as Promise<string>,
    token.symbol() as Promise<string>,
    token.decimals() as Promise<number>,
    token.totalSupply() as Promise<bigint>,
  ]);
  if (symbol.toUpperCase() !== "LLY") {
    throw new Error(`Expected symbol LLY at ${MAINNET_LLY_TOKEN}, got ${symbol}`);
  }
  return { name, symbol, decimals: Number(decimals), totalSupply };
}

/** Public Robinhood quotes API (same feed as rh.com equity). */
async function fetchRobinhoodEquityQuote(ticker = "LLY"): Promise<{
  last: number;
  bid?: number;
  ask?: number;
  previousClose?: number;
}> {
  const url = `https://api.robinhood.com/quotes/${encodeURIComponent(ticker)}/`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "pept-trade-oracle/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Robinhood quotes HTTP ${res.status} for ${ticker}`);
  }
  const j = (await res.json()) as {
    last_trade_price?: string;
    bid_price?: string;
    ask_price?: string;
    previous_close?: string;
    symbol?: string;
  };
  const last = Number(j.last_trade_price);
  if (!Number.isFinite(last) || last <= 0) {
    throw new Error(`Invalid LLY last_trade_price: ${j.last_trade_price}`);
  }
  return {
    last,
    bid: j.bid_price ? Number(j.bid_price) : undefined,
    ask: j.ask_price ? Number(j.ask_price) : undefined,
    previousClose: j.previous_close ? Number(j.previous_close) : undefined,
  };
}

/**
 * Resolve LLY-PERP mark: on-chain stock token identity + RH equity last trade.
 */
export async function resolveLlyPrice(opts?: {
  rpcUrl?: string;
  skipOnChainVerify?: boolean;
}): Promise<LlyPriceResult> {
  let tokenName = "Eli Lilly • Robinhood Token";
  let tokenSymbol = "LLY";
  let tokenDecimals = 18;

  if (!opts?.skipOnChainVerify) {
    const meta = await verifyLlyToken(opts?.rpcUrl);
    tokenName = meta.name;
    tokenSymbol = meta.symbol;
    tokenDecimals = meta.decimals;
  }

  const quote = await fetchRobinhoodEquityQuote("LLY");
  const priceUsd = Math.round(quote.last * 1e4) / 1e4;

  return {
    symbol: "LLY-PERP",
    priceUsd,
    token: MAINNET_LLY_TOKEN,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    quoteBid: quote.bid,
    quoteAsk: quote.ask,
    previousClose: quote.previousClose,
    source:
      `RH mainnet stock token ${MAINNET_LLY_TOKEN.slice(0, 10)}… · ` +
      `equity last $${priceUsd}` +
      (quote.bid && quote.ask ? ` (bid $${quote.bid} / ask $${quote.ask})` : ""),
    fetchedAt: new Date().toISOString(),
  };
}
