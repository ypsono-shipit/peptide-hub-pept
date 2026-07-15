import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

/**
 * Normalize a deployer key from .env / GitHub Actions secrets.
 * Common paste mistakes: quotes, trailing newlines, "DEPLOYER_PRIVATE_KEY=",
 * double 0x prefix — all of which make Hardhat say "private key too long".
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let k = raw.trim().replace(/^["']|["']$/g, "");
  // If the whole .env line was pasted into the secret:
  if (k.includes("DEPLOYER_PRIVATE_KEY=")) {
    k = k.split("DEPLOYER_PRIVATE_KEY=").pop()!.trim();
  }
  k = k.replace(/\s+/g, "");
  while (k.toLowerCase().startsWith("0x0x")) {
    k = "0x" + k.slice(4);
  }
  if (!k.startsWith("0x") && /^[0-9a-fA-F]{64}$/.test(k)) {
    k = "0x" + k;
  }
  // Valid secp256k1 private key: 32 bytes = 0x + 64 hex
  if (!/^0x[0-9a-fA-F]{64}$/.test(k)) {
    throw new Error(
      `DEPLOYER_PRIVATE_KEY is malformed (got ${k.length} chars after normalize; ` +
        `expected 0x + 64 hex). Re-paste only the key value into the GitHub secret — ` +
        `no quotes, no DEPLOYER_PRIVATE_KEY= prefix, single 0x.`,
    );
  }
  return k;
}

const deployerKey = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);

// Robinhood Chain: mainnet chain ID is 4663, testnet is a *separate* chain
// ID (46630) — see https://docs.robinhood.com/chain/connecting/. Don't
// conflate the two.
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Robinhood testnet rejects Cancun-only opcodes (mcopy); stay on paris
      evmVersion: "paris",
    },
  },
  paths: {
    sources: "./src",
  },
  networks: {
    robinhoodTestnet: {
      url: process.env.ROBINHOOD_TESTNET_RPC || "https://rpc.testnet.chain.robinhood.com",
      chainId: 46630,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
};

export default config;
