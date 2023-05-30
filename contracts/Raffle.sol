// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

error Raffle__NotEnoughETH();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__upKeepNotNeeded(uint256 cuurentBalance,uint256 playerLength,uint256 raffleState);

/**
 * @title Raffle Smart Contract
 * @author Ram Badan Pandey
 * @notice This contract create an untamperable decentralized smart contract
 * @dev This contract implements ChainLink VRF V2 and Chainlink Automation Compatible 
 * Interface for automated execution of this contract
 */

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* Custom Data Types */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callBackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    /* Lottery Variables */
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private immutable i_interval;
    uint256 private s_lastTimeStamp;

    /* Events */
    event RaffleEnter(address indexed players);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address recentWinner);

    /* vrfCoordinatorV2 is the address of contract which will do Random Number Verification for us */
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callBackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callBackGasLimit = callBackGasLimit;
        s_raffleState = RaffleState.OPEN;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETH();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    /**
     * @dev this is a function that chainlink keeper nodes will call
     * this look for upkeepNeeded to return true, once it's true it performs upkeep
     * The following needs to be true for the contract to run properly :-
     * 1. Contract have atleast 1 player in s_player, and have some ETH
     * 2. Time interval has passed
     * 3. Subscription needs to be funded with LINK
     * 4. Lotter s_raffleState == RaffleState.OPEN should return true
     */

    function checkUpkeep(
        bytes memory /* checkData */
    ) public view returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = (s_raffleState == RaffleState.OPEN);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool playersAvailable = (s_players.length > 0);
        bool isFunded = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && playersAvailable && isFunded);

    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded){
            revert Raffle__upKeepNotNeeded(address(this).balance,s_players.length,uint256(s_raffleState));
        }

        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callBackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 /*requestId*/,
        uint256[] memory randomWords
    ) internal override {
        uint256 randomWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[randomWinner];
        s_recentWinner = recentWinner;
        /**
         * @dev Reset the players array to size 0 after winner is selected
         * @dev  '(0)' denotes that we are actually resetting array to size 0
         */
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        s_raffleState = RaffleState.OPEN;
        emit WinnerPicked(recentWinner);

    }

    /* public/view functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }
    
    function getRaffleState() public view returns (RaffleState){
        return s_raffleState;
    }

    function getPlayersNumber() public view returns (uint256){
        return s_players.length;
    }

    function getTimeStamp() public view returns (uint256){
        return s_lastTimeStamp;
    }
    function getInterval() public view returns(uint256){
        return i_interval;
    }
    function getVRFCoordinator() public view returns (address){
        return address(i_vrfCoordinator);
    }
    function getGasLane() public view returns (bytes32){
        return i_gasLane;
    }
    function getSubscriptionId() public view returns(uint64){
        return i_subscriptionId;
    }
}