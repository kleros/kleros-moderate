import {BigNumber, utils} from "ethers";
import {getRealityETHV30} from "./ethers";
const _contract = require('./abi/RealityETH_v3_0.json')
const Web3 = require('web3')
const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
const ob = require('urbit-ob')

const contract = new web3.eth.Contract(
    _contract,
    process.env.REALITY_ETH_V30
  )

interface RealityBanResult {
    questionId: string
    questionUrl: string
}

export const reportUser = async (batchedSend:any, lang: string, hasBanningPermission: boolean, fromUsername: string, UserID: string, platform: string, group: string, inviteURL: string, groupID: string, rules: string, message: string, messageBackup: string, reportedBy: string, isPrivate: boolean): Promise<RealityBanResult> => {
    const minBond = utils.parseUnits('5', 12); // 5 DAI
    var fromUsernameUrbit;
    if(isPrivate){
        // private group
        const hashedUserID = web3.utils.sha3(UserID+process.env.secret);
        fromUsernameUrbit = ob.patp(hashedUserID.substring(0,8))
    }
    const delim = '\u241f';
    const question = isPrivate? fromUsernameUrbit+delim+rules+delim+messageBackup+delim+reportedBy : fromUsername+delim+UserID+delim+platform+delim+group+delim+inviteURL+delim+groupID+delim+rules+delim+message+delim+messageBackup+delim+reportedBy ;
    const template_id = Number(isPrivate? process.env.TEMPLATE_ID_PRIVATE: process.env.TEMPLATE_ID)

    const questionId = await askQuestionWithMinBond(
        batchedSend,
        question,
        template_id,
        minBond
    );

    return {
        questionId: questionId,
        questionUrl: `https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${questionId}`
    };

}

async function askQuestionWithMinBond(batchedSend: any, question: string, template_id: number, minBond: number|BigNumber): Promise<string> {
    // A question is automatically created in Realitio with an answer in favor of banning the user.
    //const realityETHV30 = getRealityETHV30(process.env.REALITY_ETH_V30, process.env.PRIVATE_KEY);

    const openingTs = Math.floor(new Date().getTime()/1000);
    const arbitrator = process.env.REALITIO_ARBITRATOR;
    const timeout = 86400;
    const reality = process.env.REALITY_ETH_V30;
    const txnBatchSender = process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS;
    const nonce = 0;
    const contentHash = web3.utils.soliditySha3(
        { type: 'uint256', value: template_id },
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
            template_id,
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

    const realityETHV30 = getRealityETHV30(process.env.REALITY_ETH_V30, privateKey);
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