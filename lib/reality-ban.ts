import {BigNumber, utils} from "ethers";
import {getRealityETHV30} from "./ethers";

interface RealityBanResult {
    questionId: string
    questionUrl: string
}

export const realityBan = async (hasBanningPermission: boolean, fromUsername: string, rules: string, privateKey: string): Promise<RealityBanResult> => {

    const minBond = utils.parseUnits('1', 18); // 1 DAI

    const reward = hasBanningPermission ? minBond : 0;

    const questionId = await askQuestionWithMinBond(
        fromUsername,
        rules,
        reward,
        minBond,
        privateKey
    );

    return {
        questionId: questionId,
        questionUrl: `https://reality.eth.link/app/index.html#!/network/100/question/${process.env.REALITITY_ETH_V30}-${questionId}`
    };
}

async function askQuestionWithMinBond(fromUsername: string, rulesUrl: string, reward: number|BigNumber, minBond: number|BigNumber, privateKey: string): Promise<string> {
    // A question is automatically created in Realitio with an answer in favor of banning the user.
    // Bond of the answer: 1 xDAI (initially the answer can be omitted).

    const qType = 'bool';
    const outcomes = [];
    const category = 'misc';

    const question = `Has ${fromUsername} infringed the Telegram group rules (${rulesUrl}) and should get banned?`;

    const realityETHV30 = getRealityETHV30(process.env.REALITITY_ETH_V30, privateKey);

    const tx = await realityETHV30.askQuestionWithMinBond(
        0,
        encodeQuestionText(qType, question, outcomes, category),
        process.env.REALITIO_ARBITRATOR,
        60 * 60 * 24, // 1 day
        0,
        +new Date(),
        minBond,
        {
            value: reward
        }
    );

    const receipt = await tx.wait();

    const log = realityETHV30.interface.parseLog(receipt.logs[0]);

    return log.args[0];
}

// https://github.com/RealityETH/reality-eth-monorepo/blob/d95a9f4ee5c96f88b07651a63b3b6bf5f0e0074d/packages/reality-eth-lib/formatters/question.js#L221
function encodeQuestionText(
    qtype: 'bool' | 'single-select' | 'multiple-select' | 'uint' | 'datetime',
    txt: string,
    outcomes: string[],
    category: string,
    lang?: string
) {
    let qText = JSON.stringify(txt).replace(/^"|"$/g, '');
    const delim = '\u241f';
    //console.log('using template_id', template_id);
    if (qtype == 'single-select' || qtype == 'multiple-select') {
        const outcome_str = JSON.stringify(outcomes).replace(/^\[/, '').replace(/\]$/, '');
        //console.log('made outcome_str', outcome_str);
        qText = qText + delim + outcome_str;
        //console.log('made qtext', qtext);
    }
    if (typeof lang == 'undefined' || lang == '') {
        lang = 'en_US';
    }
    qText = qText + delim + category + delim + lang;
    return qText;
}