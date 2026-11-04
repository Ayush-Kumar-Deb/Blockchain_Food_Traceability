const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productId: { type: Number, required: true, unique: true },
  brandAddress: { type: String, required: true },
  productName: { type: String, required: true },
  ingredients: { type: [String], required: true },
  weightPerUnit: { type: Number, required: true },
  maxShelfLifeDays: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", productSchema);