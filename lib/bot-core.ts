import {BigNumber, utils} from "ethers";
import {getRealityETHV30} from "./ethers";
import {Wallet} from "@ethersproject/wallet";
import {createAccount} from "./db";
const Web3 = require('web3')
const _contract = require('./abi/RealityETH_v3_0.json')
const _batchedSend = require('web3-batched-send')
const escape = require('markdown-escape')
const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
const batchedSend = _batchedSend(
    web3, // Your web3 object.
    // The address of the transaction batcher contract you wish to use. The addresses for the different networks are listed below. If the one you need is missing, feel free to deploy it yourself and make a PR to save the address here for others to use.
    process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS,
    process.env.PRIVATE_KEY, // The private key of the account you want to send transactions from.
    12000 // The debounce timeout period in milliseconds in which transactions are batched.
  )

const contract = new web3.eth.Contract(
    _contract,
    process.env.REALITITY_ETH_V30
  )

interface RealityBanResult {
    questionId: string
    questionUrl: string
}

export const reportUser = async (lang: string, hasBanningPermission: boolean, fromUsername: string, UserID: string, platform: string, group: string, inviteURL: string, groupID: string, rules: string, message: string, messageBackup: string): Promise<RealityBanResult> => {
    const minBond = utils.parseUnits('5', 18); // 5 DAI
    const questionId = await askQuestionWithMinBond(
        lang,
        fromUsername,
        UserID,
        platform,
        group,
        inviteURL,
        groupID,
        rules,
        message,
        messageBackup,
        minBond
    );

    if(hasBanningPermission){
        //await answerQuestion(questionId, privateKey);
    }

    return {
        questionId: questionId,
        questionUrl: `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${questionId}`
    };

}

async function askQuestionWithMinBond(lang: string, fromUsername: string, UserID: string, platform: string, group: string, inviteURL: string, groupID: string, rulesUrl: string|BigNumber, message: string, messageBackup: string, minBond: number|BigNumber): Promise<string> {
    // A question is automatically created in Realitio with an answer in favor of banning the user.
    // Bond of the answer: 1 xDAI (initially the answer can be omitted).
    const realityETHV30 = getRealityETHV30(process.env.REALITITY_ETH_V30, process.env.PRIVATE_KEY);

    const delim = '\u241f';
    const category = 'misc';
    const openingTs = Math.floor(new Date().getTime()/1000);
    const question = fromUsername+delim+UserID+delim+platform+delim+group+delim+inviteURL+delim+groupID+delim+rulesUrl+delim+message+delim+messageBackup+delim+category+delim+lang;
    const arbitrator = process.env.REALITIO_ARBITRATOR;
    const templateId =  process.env.TEMPLATE_ID;
    const timeout = 86400;
    const reality = process.env.REALITITY_ETH_V30;
    const txnBatchSender = process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS;
    const nonce = 0;
    const contentHash = web3.utils.soliditySha3(
        { type: 'uint256', value: templateId },
        { type: 'uint32', value: openingTs },
        { type: 'string', value: question });

    const questionHash = web3.utils.soliditySha3(
        { type: 'bytes32', value: contentHash },
        { type: 'address', value: arbitrator },
        { type: 'uint32', value: timeout },
        { type: 'uint256', value: minBond },
        { type: 'address', value: reality },
        { type: 'address', value: txnBatchSender },
        { type: 'uint256', value: nonce });

    await batchedSend({
        args: [        
            templateId,
            question,
            arbitrator,
            timeout, // 1 day
            openingTs,
            nonce,
            minBond],
        method: contract.methods.askQuestionWithMinBond,
        to: contract.options.address
      });

    return questionHash;
}

async function answerQuestion(questionId: string, privateKey: string): Promise<string> {
    // A question is automatically created in Realitio with an answer in favor of banning the user.
    // Bond of the answer: 1 xDAI (initially the answer can be omitted).

    const realityETHV30 = getRealityETHV30(process.env.REALITITY_ETH_V30, privateKey);
    const minBond = utils.parseUnits('1', 15); // 0.01 DAI

    const tx = await realityETHV30.submitAnswer(
        questionId, // 377 rinkeby
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        0,
        {
            value: minBond
        }
    );

    const receipt = await tx.wait();

    const log = realityETHV30.interface.parseLog(receipt.logs[0]);

    return log.args[0];
}

export const createWalletAndAccount = async (db: any, platform: string, userId: string) => {
    const wallet = Wallet.createRandom();
    
    await createAccount(
        db,
        wallet.address,
        wallet.privateKey,
        platform,
        userId
    );

    return wallet.address
}