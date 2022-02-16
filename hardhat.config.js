/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: "https://rpc.gnosischain.com",
      },
    },
  },
};
