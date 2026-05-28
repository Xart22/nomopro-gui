// Proxy for 'node:fs' – allows Jest 21 (which doesn't support the node: prefix)
// to resolve chromedriver's require('node:fs') to the standard 'fs' built-in.
module.exports = require('fs');
