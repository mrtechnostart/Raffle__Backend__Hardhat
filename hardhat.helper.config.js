const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: "2417",
    },
    31337: {
        name: "hardhat",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    },
}
const frontEndContractsFile = "/home/mrtechnostart/Desktop/raffle/src/Constants/ContractAddress.json"
const frontEndAbiFile = "/home/mrtechnostart/Desktop/raffle/src/Constants/abi.json"

const developmentChains = ["hardhat", "localhost"]

module.exports = {
    networkConfig,
    developmentChains,
    frontEndAbiFile,
    frontEndContractsFile
}
