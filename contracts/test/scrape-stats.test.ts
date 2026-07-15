import { expect } from "chai";
import {
  iqrFilter,
  median,
  mean,
  sizeWeightedAverage,
  weightedAverage,
  iqrThenSizeWeighted,
  roundPrice,
} from "../scripts/lib/stats";
import { parseListingsFromHtml } from "../scripts/lib/scrape-peptidescouter";
import {
  extractSizeMg,
  parseWooVariations,
  parseSimplePrice,
} from "../scripts/lib/scrape-vendor-basket";
import { combineDualSources } from "../scripts/lib/dual-source";

describe("oracle stats", () => {
  it("median odd/even", () => {
    expect(median([3, 1, 2])).to.equal(2);
    expect(median([4, 1, 2, 3])).to.equal(2.5);
  });

  it("iqrFilter drops extreme outliers", () => {
    const values = [5, 5.1, 4.9, 5.2, 4.8, 5.0, 5.05, 50];
    const filtered = iqrFilter(values);
    expect(filtered).to.not.include(50);
    expect(filtered.length).to.be.greaterThanOrEqual(6);
  });

  it("sizeWeightedAverage", () => {
    const v = sizeWeightedAverage([
      { pricePerMg: 2, sizeMg: 10 },
      { pricePerMg: 4, sizeMg: 30 },
    ]);
    expect(v).to.equal(3.5);
  });

  it("roundPrice", () => {
    expect(roundPrice(1.23456, 4)).to.equal(1.2346);
  });

  it("mean", () => {
    expect(mean([1, 2, 3])).to.equal(2);
  });

  it("weightedAverage", () => {
    // (5*2 + 7*1) / 3 = 17/3
    expect(weightedAverage([
      { value: 5, weight: 2 },
      { value: 7, weight: 1 },
    ])).to.be.closeTo(17 / 3, 1e-9);
  });

  it("iqrThenSizeWeighted prefers larger vials", () => {
    const r = iqrThenSizeWeighted([
      { pricePerMg: 10, sizeMg: 1 },
      { pricePerMg: 4, sizeMg: 30 },
      { pricePerMg: 4, sizeMg: 30 },
      { pricePerMg: 4.1, sizeMg: 20 },
      { pricePerMg: 3.9, sizeMg: 10 },
      { pricePerMg: 4.2, sizeMg: 5 },
    ]);
    expect(r.method).to.equal("size_weighted_iqr");
    // Dominated by 30mg @ $4
    expect(r.price).to.be.closeTo(4.05, 0.5);
  });
});

describe("parseListingsFromHtml", () => {
  const sampleHtml = `
    <html><body>
    <table>
      <thead><tr>
        <th>Vendor</th><th>Size</th><th>Price</th><th>$/mg ↑</th><th>Stock</th>
      </tr></thead>
      <tbody>
        <tr>
          <td>Acme Peptides4.0 ★ · 4 reviews</td>
          <td>30 mg</td>
          <td>$40.00$36.00</td>
          <td>$1.33$1.20</td>
          <td>IN STOCK</td>
        </tr>
        <tr>
          <td>Other Lab</td>
          <td>10 mg</td>
          <td>$50.00</td>
          <td>$5.00</td>
          <td>OUT OF STOCK</td>
        </tr>
        <tr>
          <td>Bad Row</td>
          <td>5 mg</td>
          <td>$1</td>
          <td>n/a</td>
          <td>IN STOCK</td>
        </tr>
      </tbody>
    </table>
    </body></html>
  `;

  it("parses sale $/mg, size, stock", () => {
    const listings = parseListingsFromHtml(sampleHtml);
    expect(listings).to.have.length(2);

    expect(listings[0]!.vendor).to.equal("Acme Peptides");
    expect(listings[0]!.sizeMg).to.equal(30);
    expect(listings[0]!.pricePerMg).to.equal(1.2);
    expect(listings[0]!.listPricePerMg).to.equal(1.33);
    expect(listings[0]!.inStock).to.equal(true);

    expect(listings[1]!.pricePerMg).to.equal(5);
    expect(listings[1]!.inStock).to.equal(false);
  });
});

describe("vendor basket parsers", () => {
  it("extractSizeMg from common patterns", () => {
    expect(extractSizeMg("5mg")).to.equal(5);
    expect(extractSizeMg("dosage: 10mg")).to.equal(10);
    expect(extractSizeMg("Semaglutide - 20 mg vial")).to.equal(20);
    expect(extractSizeMg("https://x.com/product/ezp-1p-5mg/")).to.equal(5);
    expect(extractSizeMg("no size here")).to.equal(null);
  });

  it("parseWooVariations", () => {
    const variations = [
      {
        attributes: { attribute_pa_dosage: "5mg" },
        display_price: 50,
        is_in_stock: true,
      },
      {
        attributes: { attribute_pa_dosage: "10mg" },
        display_price: 90,
        is_in_stock: true,
      },
    ];
    const html = `<form data-product_variations="${JSON.stringify(variations).replace(/"/g, "&quot;")}"></form>`;
    const offers = parseWooVariations(html, {
      vendor: "Test",
      url: "https://example.com/product/x/",
    });
    expect(offers).to.have.length(2);
    expect(offers[0]!.pricePerMg).to.equal(10);
    expect(offers[1]!.pricePerMg).to.equal(9);
  });

  it("parseSimplePrice with fixed sizeMg", () => {
    const html = `<html><h1>Semaglutide</h1><span class="woocommerce-Price-amount amount"><bdi><span>$</span>40.00</bdi></span></html>`;
    const offers = parseSimplePrice(html, {
      vendor: "Test",
      url: "https://example.com/sema",
      sizeMg: 10,
    });
    expect(offers).to.have.length(1);
    expect(offers[0]!.pricePerMg).to.equal(4);
  });
});

describe("combineDualSources", () => {
  const equalPricing = {
    listingAggregation: "size_weighted" as const,
    sourceWeights: { peptidescouter: 0.5, vendor_basket: 0.5 },
    weightBySampleCount: false,
    maxSourceDivergenceBps: 4000,
  };

  it("weight-averages two sources", () => {
    const r = combineDualSources({
      slug: "semaglutide",
      pricing: equalPricing,
      scouter: {
        slug: "semaglutide",
        url: "",
        scrapedAt: "",
        listingCount: 10,
        inStockCount: 8,
        sampleCount: 8,
        medianPerMg: 5,
        meanPerMg: 5,
        vwapPerMg: 5,
        minPerMg: 1,
        maxPerMg: 10,
        pricePerMg: 5,
        method: "size_weighted_iqr",
        source: "scouter",
        listings: [],
      },
      basket: {
        slug: "semaglutide",
        scrapedAt: "",
        offerCount: 4,
        sampleCount: 4,
        vendorCount: 3,
        pricePerMg: 5.4,
        medianPerMg: 5.4,
        meanPerMg: 5.4,
        minPerMg: 5,
        maxPerMg: 6,
        method: "size_weighted_iqr",
        source: "basket",
        offers: [],
        errors: [],
      },
    });
    // 50/50 of 5 and 5.4
    expect(r.pricePerMg).to.equal(5.2);
    expect(r.singleSource).to.equal(false);
    expect(r.divergenceWarning).to.equal(false);
    expect(r.method).to.match(/weighted/);
  });

  it("sample counts tilt the weight", () => {
    const r = combineDualSources({
      slug: "semaglutide",
      pricing: {
        listingAggregation: "size_weighted",
        sourceWeights: { peptidescouter: 1, vendor_basket: 1 },
        weightBySampleCount: true,
        maxSourceDivergenceBps: 10000,
      },
      scouter: {
        slug: "semaglutide",
        url: "",
        scrapedAt: "",
        listingCount: 100,
        inStockCount: 90,
        sampleCount: 90,
        medianPerMg: 4,
        meanPerMg: 4,
        vwapPerMg: 4,
        minPerMg: 4,
        maxPerMg: 4,
        pricePerMg: 4,
        method: "size_weighted_iqr",
        source: "scouter",
        listings: [],
      },
      basket: {
        slug: "semaglutide",
        scrapedAt: "",
        offerCount: 10,
        sampleCount: 10,
        vendorCount: 5,
        pricePerMg: 8,
        medianPerMg: 8,
        meanPerMg: 8,
        minPerMg: 8,
        maxPerMg: 8,
        method: "size_weighted_iqr",
        source: "basket",
        offers: [],
        errors: [],
      },
    });
    // (4*90 + 8*10) / 100 = 4.4
    expect(r.pricePerMg).to.equal(4.4);
  });

  it("flags large divergence", () => {
    const r = combineDualSources({
      slug: "tirzepatide",
      pricing: equalPricing,
      scouter: {
        slug: "tirzepatide",
        url: "",
        scrapedAt: "",
        listingCount: 1,
        inStockCount: 1,
        sampleCount: 1,
        medianPerMg: 3,
        meanPerMg: 3,
        vwapPerMg: null,
        minPerMg: 3,
        maxPerMg: 3,
        pricePerMg: 3,
        method: "size_weighted_iqr",
        source: "scouter",
        listings: [],
      },
      basket: {
        slug: "tirzepatide",
        scrapedAt: "",
        offerCount: 1,
        sampleCount: 1,
        vendorCount: 1,
        pricePerMg: 6,
        medianPerMg: 6,
        meanPerMg: 6,
        minPerMg: 6,
        maxPerMg: 6,
        method: "size_weighted_iqr",
        source: "basket",
        offers: [],
        errors: [],
      },
      maxSourceDivergenceBps: 2500,
    });
    expect(r.divergenceWarning).to.equal(true);
    expect(r.pricePerMg).to.equal(4.5);
  });

  it("single source ok", () => {
    const r = combineDualSources({
      slug: "retatrutide",
      pricing: equalPricing,
      scouter: {
        slug: "retatrutide",
        url: "",
        scrapedAt: "",
        listingCount: 1,
        inStockCount: 1,
        sampleCount: 1,
        medianPerMg: 5.1,
        meanPerMg: 5.1,
        vwapPerMg: null,
        minPerMg: 5.1,
        maxPerMg: 5.1,
        pricePerMg: 5.1,
        method: "size_weighted_iqr",
        source: "scouter",
        listings: [],
      },
      basket: null,
    });
    expect(r.singleSource).to.equal(true);
    expect(r.pricePerMg).to.equal(5.1);
  });
});
