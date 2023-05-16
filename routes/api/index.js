const { Router } = require('express');
const products_router = require('./products.js');
const carts_router = require('./carts.js');

const router = Router();

router.use('/products', products_router);
router.use('/carts', carts_router);

module.exports = router;