const { network, ethers } = require("hardhat")
const { developmentChains } = require("../hardhat.helper.config")

const BASE_FEE = ethers.utils.parseEther("0.25") // It costs 0.25 base fee 
const GAS_PRICE_LINK = 1e9


module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    if (developmentChains.includes(network.name)) {
        const args = [BASE_FEE,GAS_PRICE_LINK]
        log("Deploying Mocks Now!!")
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: args,
            log: true
        })
        log("Mocks Deployed");
        log("--------------------")
    }
}
module.exports.tags = ["all","mocks"]