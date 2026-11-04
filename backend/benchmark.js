// Scalability benchmark: fires batch submissions at increasing volumes,
// measures TPS (transactions per second) and average latency at each level.

const API = "http://localhost:3000";
// Seeded from the current time so batch IDs never collide across separate runs
let batchCounter = Date.now() % 1000000;
const PRODUCT_ID = 22;     // <-- the only thing you need to change between runs

// Fetches the product's real registered baseline, so generated batches
// always match it automatically (no need to hand-edit weight/ingredients/shelf-life).
async function fetchBaseline() {
  const res = await fetch(`${API}/product/${PRODUCT_ID}`);
  const data = await res.json();
  if (!data.success) {
    throw new Error(
      `Product ${PRODUCT_ID} not found. Register it first on brand.html, or change PRODUCT_ID above.`
    );
  }
  return data.product;
}

function randomBatch(baseline) {
  batchCounter++;
  const now = Math.floor(Date.now() / 1000);
  // Shelf life is kept 1 day inside the registered max, so the batch always passes that check
  const shelfLifeSeconds = Math.max(baseline.maxShelfLifeDays - 1, 1) * 24 * 60 * 60;
  return {
    batchId: batchCounter,
    productId: PRODUCT_ID,
    manufactureDate: now,
    expiryDate: now + shelfLifeSeconds,
    weight: baseline.weightPerUnit, // matches baseline exactly, well within tolerance
    ingredients: baseline.ingredients
  };
}

async function sendBatch(baseline) {
  const start = Date.now();
  try {
    const res = await fetch(`${API}/submit-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(randomBatch(baseline))
    });
    const data = await res.json();
    const latency = Date.now() - start;
    // Only count as a real success if the backend actually confirmed the write
    if (data.success) {
      return { ok: true, latency };
    } else {
      return { ok: false, latency, error: data.error };
    }
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message };
  }
}

async function runLoadLevel(count, baseline) {
  console.log(`\n--- Testing with ${count} concurrent batch submissions ---`);
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(sendBatch(baseline));
  }
  const results = await Promise.all(promises);

  const totalTime = (Date.now() - startTime) / 1000; // seconds
  const successful = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const avgLatency = successful.length
    ? successful.reduce((a, b) => a + b.latency, 0) / successful.length
    : 0;
  const tps = successful.length / totalTime;

  console.log(`Successful: ${successful.length}/${count}`);
  if (failed.length) {
    console.log(`Failed: ${failed.length}/${count} (e.g. "${failed[0].error}")`);
  }
  console.log(`Total time: ${totalTime.toFixed(2)}s`);
  console.log(`Average latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`Throughput (TPS): ${tps.toFixed(2)}`);

  return {
    count,
    successful: successful.length,
    failed: failed.length,
    totalTime,
    avgLatency,
    tps
  };
}

async function runBenchmark() {
  const baseline = await fetchBaseline();
  console.log(`Using Product ${PRODUCT_ID}: "${baseline.productName}"`);
  console.log(`Baseline -> weight: ${baseline.weightPerUnit}g, ingredients: ${baseline.ingredients.join(", ")}, max shelf life: ${baseline.maxShelfLifeDays} days`);

  const loadLevels = [5, 10, 20, 40];
  const results = [];

  for (const level of loadLevels) {
    const result = await runLoadLevel(level, baseline);
    results.push(result);
    await new Promise(r => setTimeout(r, 2000)); // brief pause between levels
  }

  console.log("\n=== SUMMARY ===");
  console.table(results);
}

runBenchmark();