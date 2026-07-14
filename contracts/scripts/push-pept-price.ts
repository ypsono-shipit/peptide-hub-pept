import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";

// Bootstraps a genesis price for the PEPT-USD market key on PeptideOracle.
// PEPT has no external market yet (no liquidity/price discovery), so this
// is an explicit admin-set starting point — standard for a fresh OHM-fork
// launch — not a real market price. Re-run with a different amount to
// adjust, or replace with a real feed once one exists.
async function main() {
  const marketKey = ethers.keccak256(ethers.toUtf8Bytes("PEPT-USD"));
  const genesisPrice = ethers.parseEther("1"); // $1.00, 18 decimals

  const oracle = await ethers.getContractAt("PeptideOracle", deployment.contracts.PeptideOracle);
  const tx = await oracle.pushPrice(marketKey, genesisPrice);
  await tx.wait();

  console.log("marketKey (PEPT-USD):", marketKey);
  console.log("pushed price:", ethers.formatEther(genesisPrice), "USD");
  console.log("tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
