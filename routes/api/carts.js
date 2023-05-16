const express = require('express');
const fs = require('fs');
const router = express.Router();

const productsFilePath = './data/products.json';
const cartsFilePath = './data/carts.json';

const generateId = (items) => {
    const ids = items.map((i) => i.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
};

const readItemsFromFile = (filePath) => {
  try {
    const itemsJson = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(itemsJson);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const saveItemsToFile = (items, filePath) => {
  const itemsJson = JSON.stringify(items);
  fs.writeFileSync(filePath, itemsJson, 'utf-8');
};

const errorHandler = (err, req, res, next) => {
  res.status(err.status || 500).json({ status: err.status || 500, response: err.message });
}

router.use(express.json());

router.get('/', (req, res) => {
  const carts = readItemsFromFile(cartsFilePath);
  res.json({ status: 200, response: carts });
});

router.get('/:cid', (req, res, next) => {
  const { cid } = req.params;
  const carts = readItemsFromFile(cartsFilePath);
  const cart = carts.find((c) => c.id === parseInt(cid));
  if (cart) {
    res.json({ status: 200, response: cart });
  } else {
    errorHandler({ status: 404, message: (`Cart with id ${cid} not found.`) }, req, res, next);
  }
});

router.post('/', (req, res) => {
  const carts = readItemsFromFile(cartsFilePath);
  const newCart = {
    id: generateId(carts),
    products: [],
  };
  carts.push(newCart);
  saveItemsToFile(carts, cartsFilePath);
  res.status(201).json({ status: 201, response: newCart });
});

router.put('/:cid/product/:pid/:units', (req, res, next) => {
  const { cid, pid, units } = req.params;
  const carts = readItemsFromFile(cartsFilePath);
  const products = readItemsFromFile(productsFilePath);
  const cartIndex = carts.findIndex((c) => c.id === parseInt(cid));
  const productIndex = products.findIndex((p) => p.id === parseInt(pid));
  if (cartIndex === -1) {
    errorHandler({ status: 404, message: (`Cart with id ${cid} not found.`) }, req, res, next);
  }
  if (productIndex === -1) {
    errorHandler({ status: 404, message: (`Product with id ${pid} not found.`) }, req, res, next);
  }
  const product = products[productIndex];
  if (product.stock < units) {
    errorHandler({ status: 400, message: (`There are not enough units of the product ${product.code}.`) }, req, res, next);
  }
  const cart = carts[cartIndex];
  const cartProductIndex = cart.products.findIndex((p) => p.id === parseInt(pid));
  if (cartProductIndex === -1) {
    cart.products.push({
      id: product.id,
      units: parseInt(units),
    });
  } else {
    const cartProduct = cart.products[cartProductIndex];
    const newUnits = cartProduct.units + parseInt(units);
    if (product.stock < newUnits) {
      errorHandler({ status: 400, message: (`There are not enough units of the product ${product.id}`) }, req, res, next);
    }
    cartProduct.units = newUnits;
  }
  product.stock -= parseInt(units);

  saveItemsToFile(carts, cartsFilePath);
  saveItemsToFile(products, productsFilePath);
  res.json({ status: 200, response: carts[cartIndex] });
});

router.delete('/:cid/product/:pid/:units', (req, res, next) => {
  const cid = req.params.cid;
  const pid = req.params.pid;
  let unitsToRemove = parseInt(req.params.units);
  const carts = readItemsFromFile(cartsFilePath);
  const products = readItemsFromFile(productsFilePath);
  const cartIndex = carts.findIndex((c) => c.id === parseInt(cid));
  const cart = carts[cartIndex];

  if (!cart) {
    errorHandler({ status: 404, message: (`Cart with id ${cid} not found.`) }, req, res, next);
  }

  const productIndex = cart.products.findIndex((p) => p.id === parseInt(pid));

  if (productIndex === -1) {
    errorHandler({ status: 404, message: (`Product with id ${pid} not found in cart ${cid}.`) }, req, res, next);
  }

  const product = cart.products[productIndex];
  const productToUpdateIndex = products.findIndex((p) => p.id === parseInt(pid));
  const productToUpdate = products[productToUpdateIndex];

  if (unitsToRemove > product.units) {
    errorHandler({ status: 400, message: (`There are not enough units of the product ${product.code} to delete.`) }, req, res, next);
  } else {
    product.units -= unitsToRemove;
    productToUpdate.stock += unitsToRemove;
  }

  if (productToUpdateIndex === -1) {
    errorHandler({ status: 404, message: (`Product with id ${pid} not found`) }, req, res, next);
  }

  if (product.units === 0) {
    cart.products.splice(productIndex, 1);
  }

  saveItemsToFile(carts, cartsFilePath);
  saveItemsToFile(products, productsFilePath);

  res.json({ status: 200, response: (`Product with id ${pid} removed from cart ${cid}.`) });
});

module.exports = router