const Product = require("../models/Product");

const WEIGHT_TOLERANCE_PERCENT = 10; // allowed drift from baseline weight

// Compares a new batch against its product's baseline + past batch history.
// Returns { flagged: boolean, reasons: string[] }
async function validateBatch(newBatch) {
  const reasons = [];

  const product = await Product.findOne({ productId: newBatch.productId });
  if (!product) {
    return { flagged: true, reasons: ["Product not registered"] };
  }

  // Check 1: expiry date must be within the product's max shelf life
  const shelfLifeSeconds = product.maxShelfLifeDays * 24 * 60 * 60;
  const actualShelfLife = newBatch.expiryDate - newBatch.manufactureDate;
  if (actualShelfLife <= 0 || actualShelfLife > shelfLifeSeconds) {
    reasons.push("Expiry date is outside the expected shelf-life range");
  }

  // Check 2: weight must be within tolerance of the baseline weight
  const allowedDrift = product.weightPerUnit * (WEIGHT_TOLERANCE_PERCENT / 100);
  const weightDiff = Math.abs(newBatch.weight - product.weightPerUnit);
  if (weightDiff > allowedDrift) {
    reasons.push(`Weight differs from baseline by more than ${WEIGHT_TOLERANCE_PERCENT}%`);
  }

  // Check 3: ingredient list must exactly match the baseline
  const baseline = [...product.ingredients].sort();
  const incoming = [...newBatch.ingredients].sort();
  const sameIngredients =
    baseline.length === incoming.length &&
    baseline.every((item, i) => item === incoming[i]);
  if (!sameIngredients) {
    reasons.push("Ingredient list does not match the registered product");
  }

  return { flagged: reasons.length > 0, reasons };
}

module.exports = { validateBatch };