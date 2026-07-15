import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import deployment from "../deployments/testnet.json";
import catalog from "../data/marketplace-catalog.json";

/**
 * Deploy MarketplaceShop (USDC checkout) and list all catalog kit prices.
 * productId = keccak256(utf8 bytes of catalog id string)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const usdc = deployment.contracts.USDC as string;
  const treasury = deployment.contracts.Treasury as string;
  console.log("USDC:", usdc);
  console.log("Treasury:", treasury);

  const Factory = await ethers.getContractFactory("MarketplaceShop");
  const shop = await Factory.deploy(usdc, treasury);
  await shop.waitForDeployment();
  const shopAddr = await shop.getAddress();
  console.log("MarketplaceShop:", shopAddr);

  const ids: string[] = [];
  const prices: bigint[] = [];
  for (const item of catalog as { id: string; priceFrom: number }[]) {
    const productId = ethers.id(item.id); // keccak256(utf8)
    // 6-dec USDC: dollars * 1e6 (round to nearest micro-USDC)
    const raw = BigInt(Math.round(item.priceFrom * 1_000_000));
    ids.push(productId);
    prices.push(raw);
    console.log(`  ${item.id}  ${productId.slice(0, 10)}…  $${item.priceFrom} → ${raw}`);
  }

  // batch setPrices (all 31 fits one tx)
  const tx = await shop.setPrices(ids, prices);
  await tx.wait();
  console.log("Listed", ids.length, "products");

  // spot-check
  const sampleId = ethers.id("semaglutide");
  const samplePrice = await shop.priceOf(sampleId);
  console.log("semaglutide price raw:", samplePrice.toString());

  const path = join(__dirname, "../deployments/testnet.json");
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.contracts.MarketplaceShop = shopAddr;
  json.marketplace = {
    listedAt: new Date().toISOString(),
    productCount: ids.length,
    collateral: "USDC",
    decimals: 6,
    note: "Pept Trade x Research Only — pay kit price in testnet USDC; proceeds to Treasury",
  };
  json.deployedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log("Updated deployments/testnet.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
