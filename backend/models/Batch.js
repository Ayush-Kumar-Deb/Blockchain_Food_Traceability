const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  batchId: { type: Number, required: true, unique: true },
  productId: { type: Number, required: true },
  manufactureDate: { type: Number, required: true }, // unix timestamp
  expiryDate: { type: Number, required: true },       // unix timestamp
  weight: { type: Number, required: true },
  ingredients: { type: [String], required: true },
  flagged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Batch", batchSchema);