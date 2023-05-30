const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../hardhat.helper.config")
const {verify} = require("../utils/verify")
const ENTRANCE_FEE = ethers.utils.parseEther("0.01")
const chainId = network.config.chainId
const GAS_LANE = networkConfig[chainId]["gasLane"]
const CALLBACK_GAS_LIMIT = "500000"

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    let vrfCoordinatorV2Address, subscriptionId,vrfCoordinatorV2Mock
    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        /* Create Mock Subscription ID Using createSubscription() function */
        /* Confirming Transaction */
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transcationReceipt = await transactionResponse.wait(1)
        /* Get Subscription ID (we are getting it by emitted event as s_subId has no getter function)*/
        subscriptionId = transcationReceipt.events[0].args.subId
        console.log(subscriptionId.toString())
        // Now Fund the Subscription
        /* fundSubscription takes two argument subID and amount */
        const data = await vrfCoordinatorV2Mock.fundSubscription(subscriptionId,ethers.utils.parseEther("30"))
    }

    else{
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    // Hardcoded Interval to 30 seconds
    const args = [vrfCoordinatorV2Address,ENTRANCE_FEE,GAS_LANE,subscriptionId,CALLBACK_GAS_LIMIT,"30"]
    log("Deploying Raffle Now")
    const raffle = await deploy("Raffle", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (developmentChains.includes(network.name)){
        log("Now adding consumer (Raffle contract) address")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId,raffle.address)
    }
    if (!developmentChains.includes(network.name)){
        log("Verifying")
        await verify(raffle.address,args)
        log("--------------------------")
    }
}

module.exports.tags = ["all","raffle"]