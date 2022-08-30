import {BigNumber, utils} from "ethers";
import {getRealityETHV30} from "./ethers";
import {Wallet} from "@ethersproject/wallet";
import {createAccount} from "./db";

interface RealityBanResult {
    questionId: string
    questionUrl: string
}

export const reportUser = async (hasBanningPermission: boolean, fromUsername: string, UserID: string, platform: string, group: string, inviteURL: string, groupID: string, rules: string, message: string, messageBackup: string): Promise<RealityBanResult> => {
    const minBond = utils.parseUnits('5', 18); // 5 DAI
    const questionId = await askQuestionWithMinBond(
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
        questionUrl: `https://realityeth.github.io/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${questionId}`
    };
}

async function askQuestionWithMinBond(fromUsername: string, UserID: string, platform: string, group: string, inviteURL: string, groupID: string, rulesUrl: string|BigNumber, message: string, messageBackup: string, minBond: number|BigNumber): Promise<string> {
    // A question is automatically created in Realitio with an answer in favor of banning the user.
    // Bond of the answer: 1 xDAI (initially the answer can be omitted).
    const realityETHV30 = getRealityETHV30(process.env.REALITITY_ETH_V30, process.env.PRIVATE_KEY);

    const delim = '\u241f';
    const category = 'misc';
    const lang = 'en_US'
    const tx = await realityETHV30.askQuestionWithMinBond(
        process.env.TEMPLATE_ID,
        fromUsername+delim+UserID+delim+platform+delim+group+delim+inviteURL+delim+groupID+delim+rulesUrl+delim+message+delim+messageBackup+delim+category+delim+lang,
        process.env.REALITIO_ARBITRATOR,
        86400, // 1 day
        Math.floor(new Date().getTime()/1000),
        0,
        minBond,
        {
            value: 0
        }
    );

    const receipt = await tx.wait();
    const log = realityETHV30.interface.parseLog(receipt.logs[0]);

    return log.args[0];
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

export const createWalletAndAccount = async (platform: string, userId: string) => {
    const wallet = Wallet.createRandom();
    
    await createAccount(
        wallet.address,
        wallet.privateKey,
        platform,
        userId
    );

    return wallet.address
}