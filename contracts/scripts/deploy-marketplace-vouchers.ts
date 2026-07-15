import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import deployment from "../deployments/testnet.json";
import catalog from "../data/marketplace-catalog.json";

/**
 * Deploy PeptideVoucher + MarketplaceShop (mints NFT on USDC purchase),
 * list all catalog kit prices, wire minter.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const usdc = deployment.contracts.USDC as string;
  const treasury = deployment.contracts.Treasury as string;
  console.log("USDC:", usdc);
  console.log("Treasury:", treasury);

  const Voucher = await ethers.getContractFactory("PeptideVoucher");
  const voucher = await Voucher.deploy();
  await voucher.waitForDeployment();
  const voucherAddr = await voucher.getAddress();
  console.log("PeptideVoucher:", voucherAddr);

  const Shop = await ethers.getContractFactory("MarketplaceShop");
  const shop = await Shop.deploy(usdc, treasury, voucherAddr);
  await shop.waitForDeployment();
  const shopAddr = await shop.getAddress();
  console.log("MarketplaceShop:", shopAddr);

  await (await voucher.setMinter(shopAddr)).wait();
  console.log("Minter set to shop");

  const ids: string[] = [];
  const prices: bigint[] = [];
  for (const item of catalog as { id: string; priceFrom: number }[]) {
    const productId = ethers.id(item.id);
    const raw = BigInt(Math.round(item.priceFrom * 1_000_000));
    ids.push(productId);
    prices.push(raw);
    console.log(`  ${item.id}  $${item.priceFrom} → ${raw}`);
  }

  await (await shop.setPrices(ids, prices)).wait();
  console.log("Listed", ids.length, "products");

  const sampleId = ethers.id("semaglutide");
  console.log("semaglutide price:", (await shop.priceOf(sampleId)).toString());
  console.log("voucher minter:", await voucher.minter());

  const path = join(__dirname, "../deployments/testnet.json");
  const json = JSON.parse(readFileSync(path, "utf8"));
  json.contracts.MarketplaceShop = shopAddr;
  json.contracts.PeptideVoucher = voucherAddr;
  json.marketplace = {
    listedAt: new Date().toISOString(),
    productCount: ids.length,
    collateral: "USDC",
    decimals: 6,
    voucher: voucherAddr,
    note: "Pept Trade x Research Only — pay USDC, receive PeptideVoucher NFT redeemable for physical kit",
  };
  json.deployedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
  console.log("Updated deployments/testnet.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
