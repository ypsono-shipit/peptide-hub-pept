/** Shared browser session between transfer steps and /redeem/shipping */

export const REDEEM_SESSION_KEY = "pept_redeem_transfer";

export type RedeemSessionSema = {
  kind: "sema";
  txHash: string;
  wallet: string;
  kits: number;
  seMa: number;
  treasury: string;
  token: string;
  at: number;
};

export type RedeemSessionNft = {
  kind: "nft";
  txHash: string;
  wallet: string;
  tokenId: number;
  productId?: string;
  productName?: string;
  kitLabel?: string;
  at: number;
};

export type RedeemSession = RedeemSessionSema | RedeemSessionNft;

export function loadRedeemSession(): RedeemSession | null {
  try {
    const raw = sessionStorage.getItem(REDEEM_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const txHash = typeof parsed.txHash === "string" ? parsed.txHash : "";
    const wallet = typeof parsed.wallet === "string" ? parsed.wallet : "";
    const at = typeof parsed.at === "number" ? parsed.at : 0;
    if (!txHash || !wallet) return null;
    if (Date.now() - at > 2 * 60 * 60 * 1000) return null;

    if (parsed.kind === "nft") {
      return {
        kind: "nft",
        txHash,
        wallet,
        tokenId: Number(parsed.tokenId) || 0,
        productId: typeof parsed.productId === "string" ? parsed.productId : undefined,
        productName: typeof parsed.productName === "string" ? parsed.productName : undefined,
        kitLabel: typeof parsed.kitLabel === "string" ? parsed.kitLabel : undefined,
        at,
      };
    }

    // Default / back-compat: SEMA token transfer session
    return {
      kind: "sema",
      txHash,
      wallet,
      kits: Number(parsed.kits) || 1,
      seMa: Number(parsed.seMa) || 10,
      treasury: typeof parsed.treasury === "string" ? parsed.treasury : "",
      token: typeof parsed.token === "string" ? parsed.token : "",
      at,
    };
  } catch {
    return null;
  }
}

export function saveRedeemSession(session: RedeemSession) {
  sessionStorage.setItem(REDEEM_SESSION_KEY, JSON.stringify(session));
}

export function clearRedeemSession() {
  try {
    sessionStorage.removeItem(REDEEM_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
