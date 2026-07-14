import { Wallet } from "ethers";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

// One-off: generates a fresh testnet-only deployer wallet and writes the
// private key straight to .env (gitignored). Never prints the private key —
// only the address, which is what you fund from the faucet.
const envPath = join(__dirname, "..", ".env");

if (existsSync(envPath) && readFileSync(envPath, "utf8").includes("DEPLOYER_PRIVATE_KEY=0x")) {
  console.error("DEPLOYER_PRIVATE_KEY already set in .env — refusing to overwrite. Delete it manually first if you want a new wallet.");
  process.exit(1);
}

const wallet = Wallet.createRandom();

const envLines = [
  `ROBINHOOD_TESTNET_RPC=https://rpc.testnet.chain.robinhood.com`,
  `DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`,
  `COLLATERAL_TOKEN_ADDRESS=`,
];
writeFileSync(envPath, envLines.join("\n") + "\n", { mode: 0o600 });

console.log("Deployer wallet generated. Fund this address via the faucet:");
console.log(wallet.address);
console.log("\nFaucet: https://faucet.testnet.chain.robinhood.com");
console.log("Private key written to contracts/.env (gitignored, not printed here).");
