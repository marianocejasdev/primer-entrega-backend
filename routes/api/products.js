const express = require('express');
const fs = require('fs');
const router = express.Router();

const productsFilePath = './data/products.json';

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
    const { limit } = req.query;
    let products = readItemsFromFile(productsFilePath);
    if (limit) {
        products = products.slice(0, limit);
    }
    res.json({ status: 200, response: products });
});

router.get('/:pid', (req, res, next) => {
    const { pid } = req.params;
    const products = readItemsFromFile(productsFilePath);
    const product = products.find((p) => p.id === parseInt(pid));
    if (product) {
        res.json({ status: 200, response: product });
    } else {
        errorHandler({ status: 404, message: `Product with id ${pid} not found.` }, req, res, next);
    }
});

router.post('/', (req, res, next) => {
    const products = readItemsFromFile(productsFilePath);
    const newProduct = {
        id: generateId(products),
        title: req.body.title,
        description: req.body.description,
        code: req.body.code,
        price: req.body.price,
        status: true,
        stock: req.body.stock,
        category: req.body.category,
        thumbnails: req.body.thumbnails || [],
    };
    if (!newProduct.title || !newProduct.description || !newProduct.code || !newProduct.price || !newProduct.stock || !newProduct.category) {
        errorHandler({ status: 400, message: 'All fields are required.' }, req, res, next);
    } else {
        // Verificar si ya existe un producto con el mismo code
        const productWithSameCode = products.find(p => p.code === newProduct.code);
        if (productWithSameCode) {
            errorHandler({ status: 400, message: 'Product code already exists.' }, req, res, next);
        } else {
            products.push(newProduct);
            saveItemsToFile(products, productsFilePath);
            res.status(201).json({ status: 201, response: products });
        }
    }
});

router.put('/:pid', (req, res, next) => {
    const { pid } = req.params;
    const products = readItemsFromFile(productsFilePath);
    const index = products.findIndex((p) => p.id === parseInt(pid));
    if (index !== -1) {
        const product = {
            ...products[index],
            title: req.body.title || products[index].title,
            description: req.body.description || products[index].description,
            price: req.body.price || products[index].price,
            status: req.body.status || products[index].status,
            stock: req.body.stock || products[index].stock,
            category: req.body.category || products[index].category,
            thumbnails: req.body.thumbnails || products[index].thumbnails,
        };
        if (req.body.code === products[index].code) {
            product.code = products[index].code;
            products[index] = product;
            saveItemsToFile(products, productsFilePath);
            res.json({ status: 200, response: product });
        } else {
            errorHandler({ status: 400, message: "Cannot modify product code." }, req, res, next);
        }
    } else {
        errorHandler({ status: 404, message: (`Product with id ${pid} not found.`) }, req, res, next);
    }
});

router.delete('/:pid', (req, res, next) => {
    const { pid } = req.params;
    let products = readItemsFromFile(productsFilePath);
    const index = products.findIndex((p) => p.id === parseInt(pid));
    if (index !== -1) {
        const product = products[index];
        products.splice(index, 1);
        saveItemsToFile(products, productsFilePath);
        res.json({ status: 200, response: products });
    } else {
        errorHandler({ status: 404, message: (`Product with id ${pid} not found`) }, req, res, next);
    }
});

module.exports = router