// SPDX-License-Identifier: MIT

/**
 *  @authors: [@shotaronowhere]
 *  @reviewers: []
 *  @auditors: []
 *  @bounties: []
 *  @deployments: []
 */

pragma solidity ^0.8.10;

import "@reality.eth/contracts/development/contracts/IRealityETH.sol";

 /**
 * ModerateBilling
 **/
contract ModerateBilling {

    address public immutable owner;
    IRealityETH public immutable reality;
    address public immutable arbitrator;
    mapping(bytes32 => address) public accounts;
    mapping(address => uint256) public balance;

    struct Question {
        bytes32 content_hash;
        address arbitrator;
        uint32 opening_ts;
        uint32 timeout;
        uint32 finalize_ts;
        bool is_pending_arbitration;
        uint256 bounty;
        bytes32 best_answer;
        bytes32 history_hash;
        uint256 bond;
        uint256 min_bond;
    }

    event ruleSet(bytes32 id, string rules);

    modifier onlyByOwner() {
        require(owner == msg.sender, "Access not allowed: Owner only.");
        _;
    }

    modifier deductGasCost(address groupAccount)
    {
        uint256 remainingGasStart;
        assembly{
            remainingGasStart := add(mul(calldatasize(),16),gas())
        }

        _;
        
        // 21000 + 100 (overhead margin) + 2100 (cold sload) + 2 * 5000 (sstore) + 1200 send
        uint256 gasCost = (remainingGasStart - gasleft() + 34400) * tx.gasprice;
        // Deduct gas cost
        balance[groupAccount] -= gasCost;
        payable(msg.sender).send(gasCost);
    }

    modifier deductGasCostCold(bytes32 groupId)
    {
        uint256 remainingGasStart;
        assembly{
            remainingGasStart := add(mul(calldatasize(),16),gas())
        }

        _;

        // 21000 + 100 (overhead margin) + 2 * 2100 (cold sload) + 2 * 5000 (sstore) + 1200 send
        uint256 gasCost = (remainingGasStart - gasleft() + 36500) * tx.gasprice;
        // Deduct gas cost
        balance[accounts[groupId]] -= gasCost;
        payable(msg.sender).send(gasCost);
    }

    constructor(
        IRealityETH _reality, 
        address _arbitrator
    ){
        owner = msg.sender;
        reality = _reality;
        arbitrator = _arbitrator;
    }

    function fundAccount() external payable{
        balance[msg.sender] += msg.value;
    }

    function withdraw() external{
        uint256 amount = balance[msg.sender];
        balance[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function registerGroup(bytes32 groupId, address groupAccount) onlyByOwner deductGasCost(groupAccount) public{
        accounts[groupId] = groupAccount;
    }

    function setRules(bytes32 groupId, string calldata rules) onlyByOwner deductGasCostCold(groupId) public{
        emit ruleSet(groupId, rules);
    }

    function ask(bytes32 groupId, uint256 templateId, string calldata question, uint32 timeout, uint256 minBond) external onlyByOwner deductGasCostCold(groupId){
        reality.askQuestionWithMinBond(templateId, 
            question, 
            arbitrator, 
            timeout, 
            uint32(block.timestamp), 
            0, 
            minBond);
    }

    function getId(string calldata platform, string calldata groupId) public pure returns(bytes32){
        return keccak256(abi.encode(platform, groupId));
    }

    function getQuestions(bytes32[] calldata questionIds) public view returns(Question[] memory){
        uint256 len = questionIds.length;
        Question[] memory questions = new Question[](len);
        for(uint i = 0; i < len; i++){
            (, 
            , 
            questions[i].opening_ts,
            questions[i].timeout,
            questions[i].finalize_ts,
            questions[i].is_pending_arbitration,
            ,
            questions[i].best_answer,
            ,
            ,
            
            ) = reality.questions(questionIds[i]);
        }
        return questions;
    }
}