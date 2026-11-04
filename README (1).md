# Blockchain-Based Food Supply Chain Traceability

A blockchain traceability system that does more than store records permanently: it **validates each batch against its product's baseline before writing it on-chain**, and it is **load-tested** to show how it behaves as concurrent traffic grows.

Most blockchain traceability work protects data *after* it is written but does not check that the data was correct in the first place ("garbage in, garbage out"). It also rarely reports scalability numbers. This project addresses both gaps.

## Key Features

- **Pre-write validation:** every batch is checked before it reaches the chain.
- **Flagged, not rejected:** batches that fail checks are still recorded on-chain, tagged `flagged`, with the specific reasons returned. History stays complete and transparent.
- **On-chain access control:** only the wallet that registered a product can submit batches for it. The smart contract enforces this, so it cannot be bypassed by a custom client.
- **Consumer transparency:** a consumer page shows a product's full batch history, flagged batches included.
- **Scalability benchmark:** measures success rate, latency and throughput (TPS) at 5, 10, 20 and 40 concurrent submissions.

## Architecture

| Layer | Technology | Role |
| --- | --- | --- |
| Blockchain | Solidity on Hardhat network | Permanent source of truth; enforces brand ownership |
| Validation | Node.js (`logic/validateBatch.js`) | Decides `flagged` and reasons before writing |
| API | Express (`backend/index.js`) | Coordinates validation, blockchain write, cache update |
| Cache | MongoDB Atlas + Mongoose | Fast reads for validation and consumer lookups |
| Frontend | Plain HTML/CSS/JS | Brand portal and consumer lookup |

**Write path:** Frontend -> API -> Validation (reads cache) -> Blockchain (writes) -> Cache (updated).
**Read path:** Frontend -> API -> Cache.

## Validation Checks

| Check | Rule | Catches |
| --- | --- | --- |
| Shelf-life plausibility | Expiry minus manufacture must be > 0 and <= `maxShelfLifeDays` | Implausible or fraudulent expiry dates |
| Weight tolerance | Within 10% of baseline weight | Under-filling, mislabeling, data-entry errors |
| Ingredient consistency | Sorted ingredient list must match baseline exactly | Added, removed or substituted ingredients |

A batch can fail several checks at once, and all failure reasons are returned.

> An earlier date-ordering check was removed because it caused false flags under concurrent submissions (a race condition). Reintroducing it safely with database-level locking is listed as future work.

## Scalability Results

Run on a local Hardhat network, after fixing nonce collisions with Ethers.js `NonceManager`:

| Concurrent batches | Success rate | Avg. latency (ms) | Throughput (TPS) |
| --- | --- | --- | --- |
| 5 | 100% | 410 | 10.18 |
| 10 | 100% | 581 | 11.36 |
| 20 | 100% | 420 | 35.84 |
| 40 | 100% | 533 | 58.82 |

Latency stays in a narrow band while throughput rises, which suggests transaction confirmation time, not validation, dominates the cost. Results will vary slightly between runs and do not include real public-network consensus delay.

## Project Structure

```
.
├── contracts/FoodTraceability.sol
├── ignition/modules/FoodTraceabilityModule.js
├── test/FoodTraceability.js
├── hardhat.config.ts
├── backend/
│   ├── index.js            # Express API
│   ├── contract.js         # Ethers.js bridge to the contract
│   ├── benchmark.js        # Scalability benchmark
│   ├── logic/validateBatch.js
│   ├── models/Product.js
│   ├── models/Batch.js
│   ├── FoodTraceability.json   # Contract ABI
│   └── .env.example
└── frontend/
    ├── brand.html
    └── consumer.html
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Install

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
cd backend
npm install
```

### Configure

Copy `backend/.env.example` to `backend/.env` and fill in your MongoDB connection string. The contract address is filled in after step 2 below.

### Run (3 terminals)

**Terminal 1 - local blockchain**
```bash
npx hardhat node
```

**Terminal 2 - deploy the contract**
```bash
npx hardhat ignition deploy ignition/modules/FoodTraceabilityModule.js --network localhost
```
Copy the printed contract address into `CONTRACT_ADDRESS` in `backend/.env`.

**Terminal 3 - backend**
```bash
cd backend
node index.js
```

Then open `frontend/brand.html` and `frontend/consumer.html` in your browser.

> The local blockchain forgets everything when restarted, while MongoDB keeps its data. Use new, unused Product IDs and Batch IDs each session to avoid duplicate-key errors.

### Test the contract

```bash
npx hardhat test
```

### Run the scalability benchmark

1. Register a product on `brand.html` (for example ID 50: Milk, Vitamin A, Vitamin D, 500 g, 7 days).
2. In `backend/benchmark.js`, set `PRODUCT_ID` to that ID and `batchCounter` to a fresh range.
3. Run:
```bash
cd backend
node benchmark.js
```

## API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/register-product` | POST | Register a product baseline on-chain and cache it |
| `/submit-batch` | POST | Validate, write on-chain, and cache a batch |
| `/product/:productId/batches` | GET | Return a product's full batch history |

## Security Note

`backend/contract.js` signs transactions with Hardhat's publicly known Account #0 test key. This is safe **only** for the local test network. Never use that key, or any real private key committed to a repository, on a real network. Use environment variables for real keys.

## Limitations and Future Work

- Functional testing covers a small number of products and batches.
- Benchmark ran locally, not on a public testnet. Sepolia deployment is planned.
- Ingredient check is exact-match, not proportion-aware.
- 10% weight tolerance is a default, not a regulatory standard.
- Planned: concurrency-safe date-ordering check, regulator read-only role, batch recall, QR codes, anomaly-detection model, batching transactions to raise throughput.

## Tech Stack

Solidity, Hardhat, Ethers.js, Node.js, Express, MongoDB (Mongoose), HTML/CSS/JavaScript.

## License

MIT
