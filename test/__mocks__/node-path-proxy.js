// Proxy for 'node:path' – allows Jest 21 to resolve chromedriver's require('node:path').
module.exports = require('path');
