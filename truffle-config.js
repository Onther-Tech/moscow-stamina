const gas_reporter = {
  reporter: 'eth-gas-reporter',
  reporterOptions : {
    currency: 'USD',
    gasPrice: 20
  },
};

const mocha = process.env.GAS_REPORTER ? gas_reporter : {};


module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 3000000,
    },
    coverage: {
      host: "127.0.0.1",
      network_id: "*",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    },
  },
  mocha,
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    },
  },
};
