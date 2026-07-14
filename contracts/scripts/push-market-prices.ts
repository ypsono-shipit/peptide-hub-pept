import { ethers } from "hardhat";
import deployment from "../deployments/testnet.json";

// Bootstraps genesis prices for markets with no real backing token.
// Robinhood Chain's official token contracts list (docs.robinhood.com/chain/
// contracts) has zero biotech/pharma tickers as of this writing — no LLY, no
// TSHA, nothing in the sector — so these can't be wired to real Stock Token
// Chainlink feeds like the PRD originally assumed. All three are therefore
// admin-set synthetic prices via PeptideOracle, same as PEPT-USD. Revisit
// once/if Robinhood lists real biotech Stock Tokens.
const MARKETS: { symbol: string; price: string }[] = [
  { symbol: "LLY-PERP", price: "812.44" },
  { symbol: "TSHA-PERP", price: "6.72" },
  { symbol: "GLP1-BASKET", price: "118.05" },
];

async function main() {
  const oracle = await ethers.getContractAt("PeptideOracle", deployment.contracts.PeptideOracle);

  for (const m of MARKETS) {
    const marketKey = ethers.keccak256(ethers.toUtf8Bytes(m.symbol));
    const price = ethers.parseEther(m.price);
    const tx = await oracle.pushPrice(marketKey, price);
    await tx.wait();
    console.log(`${m.symbol}: marketKey=${marketKey} price=$${m.price} tx=${tx.hash}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
