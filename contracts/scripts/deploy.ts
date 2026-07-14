import { ethers } from "hardhat";

/// Deploys the core Peptide Hub contract set to whatever network Hardhat is
/// pointed at (see hardhat.config.ts `robinhoodTestnet`). Wiring markets,
/// oracle feeds, and Treasury depositor/reserve-token whitelists is left as
/// governed follow-up calls, not part of deploy.
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const PEPT = await ethers.getContractFactory("PEPT");
  const pept = await PEPT.deploy();
  await pept.waitForDeployment();
  console.log("PEPT:", await pept.getAddress());

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(await pept.getAddress());
  await treasury.waitForDeployment();
  console.log("Treasury:", await treasury.getAddress());

  const BondDepository = await ethers.getContractFactory("BondDepository");
  const bondDepository = await BondDepository.deploy(await pept.getAddress(), await treasury.getAddress());
  await bondDepository.waitForDeployment();
  console.log("BondDepository:", await bondDepository.getAddress());

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(await pept.getAddress());
  await staking.waitForDeployment();
  console.log("Staking:", await staking.getAddress());

  const PeptideOracle = await ethers.getContractFactory("PeptideOracle");
  const oracle = await PeptideOracle.deploy();
  await oracle.waitForDeployment();
  console.log("PeptideOracle:", await oracle.getAddress());

  // PerpsEngine needs a collateral token address — pass a whitelisted
  // stable/Stock Token address here once one is chosen for testnet.
  const collateralTokenAddress = process.env.COLLATERAL_TOKEN_ADDRESS;
  if (collateralTokenAddress) {
    const PerpsEngine = await ethers.getContractFactory("PerpsEngine");
    const perpsEngine = await PerpsEngine.deploy(
      collateralTokenAddress,
      await oracle.getAddress(),
      await treasury.getAddress()
    );
    await perpsEngine.waitForDeployment();
    console.log("PerpsEngine:", await perpsEngine.getAddress());
  } else {
    console.log("PerpsEngine: skipped (set COLLATERAL_TOKEN_ADDRESS to deploy)");
  }

  // Grant PEPT mint rights.
  await (await pept.setMinter(await treasury.getAddress(), true)).wait();
  await (await pept.setMinter(await bondDepository.getAddress(), true)).wait();
  console.log("Minter rights granted to Treasury and BondDepository");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
