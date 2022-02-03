/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: "https://rpc.xdaichain.com"
      }
    },
  },
};
