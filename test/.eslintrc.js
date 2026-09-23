// The test tree had no config of its own, so every jest global (describe/test/expect/jest) and
// every browser global read as no-undef -- which is why `npm run test:lint` has been failing on
// test/unit/lib/nomokit-ml-relay.test.js. Mirrors the browser env the code under test runs in.
module.exports = {
    env: {
        browser: true,
        es6: true,
        jest: true
    },
    rules: {
        'no-undefined': [0]
    }
};
