require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Product = require("./models/Product");
const Batch = require("./models/Batch");
const { validateBatch } = require("./logic/validateBatch");
const contract = require("./contract");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB once when the server starts
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

// Brand registers a new product
app.post("/register-product", async (req, res) => {
  try {
    const { productId, brandAddress, productName, ingredients, weightPerUnit, maxShelfLifeDays } = req.body;

    // Save on-chain
    const tx = await contract.registerProduct(
      productId, productName, ingredients, weightPerUnit, maxShelfLifeDays
    );
    await tx.wait();

    // Cache in MongoDB for fast lookups later
    await Product.create({ productId, brandAddress, productName, ingredients, weightPerUnit, maxShelfLifeDays });

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Brand submits a new batch — gets validated, then written on-chain
app.post("/submit-batch", async (req, res) => {
  try {
    const { batchId, productId, manufactureDate, expiryDate, weight, ingredients } = req.body;

    // Run historical pattern validation
    const { flagged, reasons } = await validateBatch({
      productId, manufactureDate, expiryDate, weight, ingredients
    });

    // Write to blockchain, including the flagged result
    const tx = await contract.submitBatch(
      batchId, productId, manufactureDate, expiryDate, weight, flagged
    );
    await tx.wait();

    // Cache in MongoDB so future batches can compare against this one
    await Batch.create({ batchId, productId, manufactureDate, expiryDate, weight, ingredients, flagged });

    res.json({ success: true, flagged, reasons, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Look up a single product's registered baseline (used by brand/consumer pages and the benchmark script)
app.get("/product/:productId", async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Consumer-facing: get a product's full batch history
app.get("/product/:productId/batches", async (req, res) => {
  try {
    const batches = await Batch.find({ productId: req.params.productId }).sort({ manufactureDate: 1 });
    res.json({ success: true, batches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));