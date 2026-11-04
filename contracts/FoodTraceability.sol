// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FoodTraceability {

    struct Product {
        uint256 productId;
        address brandAddress;
        string productName;
        string[] ingredients;
        uint256 weightPerUnit;   // baseline weight, in grams
        uint256 maxShelfLifeDays;
        bool exists;
    }

    struct Batch {
        uint256 batchId;
        uint256 productId;
        uint256 manufactureDate; // unix timestamp
        uint256 expiryDate;      // unix timestamp
        uint256 weight;          // this batch's actual weight
        bool flagged;
        uint256 timestamp;       // when it was recorded on-chain
    }

    mapping(uint256 => Product) public products;
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => uint256[]) public productBatches; // productId => list of batchIds

    event ProductRegistered(uint256 productId, address brandAddress);
    event BatchSubmitted(uint256 batchId, uint256 productId, bool flagged);

    // Brand registers a new product (called once per product)
    function registerProduct(
        uint256 _productId,
        string memory _productName,
        string[] memory _ingredients,
        uint256 _weightPerUnit,
        uint256 _maxShelfLifeDays
    ) external {
        require(!products[_productId].exists, "Product already registered");

        products[_productId] = Product(
            _productId,
            msg.sender,
            _productName,
            _ingredients,
            _weightPerUnit,
            _maxShelfLifeDays,
            true
        );

        emit ProductRegistered(_productId, msg.sender);
    }

    // Brand submits a new batch. "flagged" is decided off-chain by the backend
    // before calling this function, based on comparison with past batches.
    function submitBatch(
        uint256 _batchId,
        uint256 _productId,
        uint256 _manufactureDate,
        uint256 _expiryDate,
        uint256 _weight,
        bool _flagged
    ) external {
        require(products[_productId].exists, "Product not registered");
        require(products[_productId].brandAddress == msg.sender, "Not your product");

        batches[_batchId] = Batch(
            _batchId,
            _productId,
            _manufactureDate,
            _expiryDate,
            _weight,
            _flagged,
            block.timestamp
        );

        productBatches[_productId].push(_batchId);
        emit BatchSubmitted(_batchId, _productId, _flagged);
    }

    // Consumer-facing: get all batch IDs for a product, to scan through history
    function getProductBatches(uint256 _productId) external view returns (uint256[] memory) {
        return productBatches[_productId];
    }
}
