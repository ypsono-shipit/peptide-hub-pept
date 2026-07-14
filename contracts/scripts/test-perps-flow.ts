import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";

// End-to-end smoke test of the exact flow the frontend triggers: approve,
// openPosition, read it back, closePosition. Run once after any PerpsEngine
// config change to catch mismatches (like the PEPT-IDX key bug) before
// shipping to the UI.
async function main() {
  const [deployer] = await ethers.getSigners();

  const collateral = await ethers.getContractAt("MockERC20", deployment.contracts.TestCollateral_tPUSD!);
  const perpsEngine = await ethers.getContractAt("PerpsEngine", deployment.contracts.PerpsEngine!);

  const marketKey = ethers.keccak256(ethers.toUtf8Bytes("PEPT-USD"));
  const collateralAmount = ethers.parseEther("100");
  const sizeUsd = collateralAmount * 5n; // 5x

  console.log("Approving...");
  await (await collateral.approve(deployment.contracts.PerpsEngine!, collateralAmount)).wait();

  console.log("Opening position...");
  const openTx = await perpsEngine.openPosition(marketKey, true, sizeUsd, collateralAmount);
  const openReceipt = await openTx.wait();
  console.log("Opened, tx:", openReceipt!.hash);

  const positionId = await perpsEngine.nextPositionId() - 1n;
  const position = await perpsEngine.positions(positionId);
  console.log("Position", positionId.toString(), ":", {
    trader: position.trader,
    isLong: position.isLong,
    sizeUsd: ethers.formatEther(position.sizeUsd),
    collateral: ethers.formatEther(position.collateral),
    entryPrice: ethers.formatEther(position.entryPrice),
  });

  console.log("Closing position...");
  const closeTx = await perpsEngine.closePosition(positionId);
  const closeReceipt = await closeTx.wait();
  console.log("Closed, tx:", closeReceipt!.hash);

  const afterClose = await perpsEngine.positions(positionId);
  console.log("Position after close (trader should be zero address):", afterClose.trader);
}

main().catch((error) => {
  console.error("FLOW TEST FAILED:", error);
  process.exitCode = 1;
});
