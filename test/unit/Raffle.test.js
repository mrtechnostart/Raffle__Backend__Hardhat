const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { networkConfig, developmentChains } = require("../../hardhat.helper.config")
developmentChains.includes(network.name)
    ? describe("Raffle", () => {
          let deployer, Raffle, VRFCoordinatorV2Mock, interval
          const ENTRANCE_FEE = ethers.utils.parseEther("0.01")
          const chainId = network.config.chainId
          const GAS_LANE = networkConfig[chainId]["gasLane"]
          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              Raffle = await ethers.getContract("Raffle")
              VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              interval = await Raffle.getInterval()
          })
          describe("constructor", () => {
              it("Must set up everything properly", async () => {
                  /* Test for Entrance fee is assigned correctly */
                  assert.equal((await Raffle.getEntranceFee()).toString(), ENTRANCE_FEE.toString())
                  /* Test for correct assignment of vrfCoordinator Address */
                  assert.equal(
                      (await Raffle.getVRFCoordinator()).toString(),
                      VRFCoordinatorV2Mock.address.toString()
                  )
                  /* Test for correct gas lane */
                  assert.equal((await Raffle.getGasLane()).toString(), GAS_LANE)
                  /* Subscription Id */
                  assert.equal((await Raffle.getSubscriptionId()).toString(), "1")
              })
          })
          describe("enterRaffle", () => {
              it("Must revert if not enough ETH is provided", async () => {
                  await expect(Raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETH")
              })
              it("Must allow user to enter Raffle in case of sufficient ETH is given", async () => {
                  await Raffle.enterRaffle({ value: ethers.utils.parseEther("0.02") })
                  const playersNumber = await Raffle.getPlayersNumber()
                  assert.equal(playersNumber.toString(), 1)
                  /** Another way to do the same is buy checking if Raffle contract 
            /* has some money in it after successfull transaction
            */

                  /** This can be acheived by ethers.provider.getBalance(Raffle.address) */
              })
              it("Must add player to s_players array", async () => {
                  await Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  const playerAddress = await Raffle.getPlayer(0)
                  assert.equal(playerAddress.toString(), deployer.toString())
              })
              it("Must emit an event with participant's address", async () => {
                  await expect(
                      Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  ).to.emit(Raffle, "RaffleEnter")
              })
              it("Must not allow participants to enter Raffle when it's closed", async () => {
                  await Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  await network.provider.send("evm_mine", [])
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await Raffle.performUpkeep([])
                  /* 1--> indicates calculating stage */
                  await expect(
                      Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  ).to.be.revertedWith("Raffle__NotOpen")
              })
          })
          describe("checkUpkeep", () => {
              it("Must return true when necessary conditions are met", async () => {
                  network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  /** */
                  assert.equal((await Raffle.callStatic.checkUpkeep([]))[0], true)
              })
              it("Must return false if time has not passed", async () => {
                  await Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  assert((await Raffle.callStatic.checkUpkeep([]))[0] === false)
              })
              it("Must return false when contract is not funded properly", async () => {
                  network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  /** We are mining as time is calculated by difference of two blocks in blockchain */
                  network.provider.send("evm_mine")
                  assert.equal((await Raffle.callStatic.checkUpkeep([]))[0], false)
              })
          })
          describe("performUpkeep", () => {
              it("Must revert with Raffle__upKeepNotNeeded", async () => {
                  network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  network.provider.send("evm_mine")
                  await expect(Raffle.performUpkeep([])).to.be.revertedWith(
                      "Raffle__upKeepNotNeeded"
                  )
              })
              it("Must emit requestId by event Name RequestedRaffleWinner", async () => {
                  await Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  network.provider.send("evm_mine")
                  await expect(Raffle.performUpkeep([])).to.emit(Raffle, "RequestedRaffleWinner")
              })
          })
          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  network.provider.send("evm_mine")
                  await Raffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
              })
              it("Picks a winner, resets the lottery and transfer the funds", async () => {
                  const additionalEntrants = 2
                  const startingIndex = 1
                  accounts = await ethers.getSigners()
                  for (let i = startingIndex; i < startingIndex + additionalEntrants; i++) {
                      const AccountConnectedRaffle = await Raffle.connect(accounts[i])
                      AccountConnectedRaffle.enterRaffle({ value: ethers.utils.parseEther("0.03") })
                  }
                  const startingTimeStamp = await Raffle.getTimeStamp()
                  await new Promise(async (resolve, reject) => {
                      Raffle.once("WinnerPicked", async () => {
                          try {
                              const recentWinner = await Raffle.getRecentWinner()
                              const raffleState = await Raffle.getRaffleState()
                              const endingTimeStamp = await Raffle.getTimeStamp()
                              assert.equal(raffleState.toString(), "0")
                              assert.equal(recentWinner, accounts[2].address)
                              assert(endingTimeStamp.toNumber() - startingTimeStamp.toNumber() > 0)
                              resolve()
                          } catch (error) {
                              reject(error)
                          }
                      })
                      const tx = await Raffle.performUpkeep([])
                      const response = await tx.wait(1)
                      const requestId = response.events[1].args.requestId
                      /* fulfillRandomWords will fulfill the random words */
                      await VRFCoordinatorV2Mock.fulfillRandomWords(requestId, Raffle.address)
                  })
              })
          })
      })
    : describe.skip
