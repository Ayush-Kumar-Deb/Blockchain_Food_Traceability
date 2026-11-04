import { expect } from "chai";
import { network } from "hardhat";

describe("FoodTraceability", function () {
  it("should register a product and submit a batch", async function () {
    const { ethers } = await network.connect();

    // Get a fake test wallet from Hardhat's built-in accounts
    const [brand] = await ethers.getSigners();

    // Deploy the contract to the local Hardhat blockchain
    const FoodTraceability = await ethers.getContractFactory("FoodTraceability");
    const contract = await FoodTraceability.deploy();
    await contract.waitForDeployment();

    // Register a product as the "brand" wallet
    await contract.connect(brand).registerProduct(
      1,                          // productId
      "Amul Toned Milk 500ml",    // productName
      ["Milk", "Vitamin A", "Vitamin D"], // ingredients
      500,                        // weightPerUnit (grams)
      7                           // maxShelfLifeDays
    );

    // Check the product was actually stored correctly
    const product = await contract.products(1);
    expect(product.productName).to.equal("Amul Toned Milk 500ml");
    expect(product.brandAddress).to.equal(brand.address);

    // Submit a batch for that product
    await contract.connect(brand).submitBatch(
      101,          // batchId
      1,            // productId
      1758585600,   // manufactureDate (example unix timestamp)
      1759190400,   // expiryDate
      498,          // weight (slightly under baseline, should be fine)
      false         // flagged
    );

    // Check the batch was recorded and linked to the product
    const productBatches = await contract.getProductBatches(1);
    expect(productBatches.length).to.equal(1);
    expect(productBatches[0]).to.equal(101);
  });
});
