import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";

// deploy-perps.ts configured the PEPT-IDX market under
// keccak256("PEPT-IDX"), but PeptideOracle's PEPT price was pushed under
// keccak256("PEPT-USD") (push-pept-price.ts) — a different key. Since
// PerpsEngine.Market.oracleKey == the mapping key it's stored under (see
// PerpsEngine.sol setMarket), opening a PEPT-IDX position would call
// oracle.getPrice(keccak256("PEPT-IDX")), which has no price and reverts.
// Re-registers the market under the correct key. The old
// keccak256("PEPT-IDX") entry is orphaned but harmless — nothing
// references it.
async function main() {
  const perpsEngine = await ethers.getContractAt("PerpsEngine", deployment.contracts.PerpsEngine!);
  const correctKey = ethers.keccak256(ethers.toUtf8Bytes("PEPT-USD"));

  const tx = await perpsEngine.setMarket(
    correctKey,
    true,
    10 * 10_000, // 10x max leverage, matching deploy-perps.ts
    1,
    5,
    10,
    100,
    500
  );
  await tx.wait();
  console.log("PEPT-IDX market re-registered under correct oracle key:", correctKey, "tx:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
