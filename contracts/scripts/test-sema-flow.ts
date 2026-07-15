import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";

async function main() {
  const collateral = await ethers.getContractAt("MockERC20", deployment.contracts.TestCollateral_tPUSD!);
  const perpsEngine = await ethers.getContractAt("PerpsEngine", deployment.contracts.PerpsEngine!);

  const marketKey = ethers.keccak256(ethers.toUtf8Bytes("SEMA-PERP"));
  const collateralAmount = ethers.parseEther("100");
  const sizeUsd = collateralAmount * 10n; // 10x

  console.log("Approving...");
  await (await collateral.approve(deployment.contracts.PerpsEngine!, collateralAmount)).wait();

  console.log("Opening SEMA-PERP position...");
  const openTx = await perpsEngine.openPosition(marketKey, true, sizeUsd, collateralAmount);
  await openTx.wait();

  const positionId = (await perpsEngine.nextPositionId()) - 1n;
  const position = await perpsEngine.positions(positionId);
  console.log("Position:", {
    isLong: position.isLong,
    sizeUsd: ethers.formatEther(position.sizeUsd),
    collateral: ethers.formatEther(position.collateral),
    entryPrice: ethers.formatEther(position.entryPrice),
  });

  console.log("Closing...");
  await (await perpsEngine.closePosition(positionId)).wait();
  const afterClose = await perpsEngine.positions(positionId);
  console.log("Closed, trader now:", afterClose.trader);
}

main().catch((error) => {
  console.error("SEMA FLOW TEST FAILED:", error);
  process.exitCode = 1;
});
