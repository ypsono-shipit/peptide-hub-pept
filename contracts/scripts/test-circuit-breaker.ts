import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";

// Verifies the deviation circuit breaker actually rejects a >30% price
// move instead of trusting the Solidity logic blindly.
async function main() {
  const oracle = await ethers.getContractAt("PeptideOracle", deployment.contracts.PeptideOracle);
  const key = ethers.keccak256(ethers.toUtf8Bytes("SEMA-PERP"));

  const before = await oracle.latestPrice(key);
  console.log("SEMA-PERP before:", ethers.formatEther(before));

  // Push a price 50% higher — should trip the breaker, not apply.
  const badPrice = (before * 150n) / 100n;
  await (await oracle.pushPrice(key, badPrice, "test: intentional bad push")).wait();

  const feed = await oracle.feeds(key);
  console.log("paused after bad push:", feed.paused, "| stored price still:", ethers.formatEther(feed.pushedPrice));

  let reverted = false;
  try {
    await oracle.latestPrice(key);
  } catch (e: any) {
    reverted = e.message.includes("circuit breaker paused");
  }
  console.log("getPrice reverts while paused:", reverted);

  // Unpause and confirm normal reads resume, then restore correct price.
  await (await oracle.unpause(key)).wait();
  const afterUnpause = await oracle.latestPrice(key);
  console.log("price readable after unpause:", ethers.formatEther(afterUnpause), "(still the old, pre-bad-push price)");

  await (await oracle.pushPrice(key, before, "test: restore correct price")).wait();
  const restored = await oracle.latestPrice(key);
  console.log("restored to:", ethers.formatEther(restored));
}

main().catch((error) => {
  console.error("CIRCUIT BREAKER TEST FAILED:", error);
  process.exitCode = 1;
});
