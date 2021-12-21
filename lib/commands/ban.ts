import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {BigNumber, utils} from "ethers";
import {addBan, getRules, isMod} from "../db";
import {getRealityETHV30} from "../ethers";

/*
 * /ban
 */
const regexp = /\/ban/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/ban must be used in a reply`);
        return;
    }

    const botUser = await bot.getMe();

    if (botUser.id === msg.reply_to_message.from.id) {
        await bot.sendMessage(msg.chat.id, `The Moderator Bot can't be banned.`);
        return;
    }

    const rules = await getRules(msg.chat.id);

    if (!rules) {
        await bot.sendMessage(msg.chat.id, `You need to /setrules before /ban`);
        return;
    }

    try {
        const fromUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || String(msg.reply_to_message.from.id);

        const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

        const isAdmin = user.status === 'creator' || user.status === 'administrator';
        const isModerator = await isMod(msg.chat.id, msg.from.id);

        const hasBanningPermission = isAdmin || isModerator;

        const minBond = process.env.CHAIN_NAME === 'kovan'
            ? utils.parseEther('0.00025')
            : utils.parseUnits('1', 18); // 1 DAI

        const reward = hasBanningPermission ? minBond : 0;

        const questionId = await askQuestionWithMinBond(
            fromUsername,
            rules,
            reward,
            minBond
        );

        await addBan(msg.chat.id, questionId, hasBanningPermission);

        const appealUrl = `https://reality.eth.link/app/#!/question/${process.env.REALITITY_ETH_V30}-${questionId}`;

        if (hasBanningPermission) {
            // the user gets notified and it is explained to them how to appeal.
            await bot.sendMessage(msg.chat.id, `*${fromUsername}* you have been banned, you can appeal here: ${appealUrl}`, {parse_mode: 'Markdown'});

            //@ts-ignore
            //await bot.banChatMember(msg.chat.id, String(msg.reply_to_message.from.id));
        } else {
            // the user first needs to answer and provide a bond
            await bot.sendMessage(msg.chat.id, `For the ban to be applied you need to provide an answer with a bond of 1 DAI: ${appealUrl}`, {parse_mode: 'Markdown'});
        }
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.reason}`);
        return;
    }
}

async function askQuestionWithMinBond(fromUsername: string, rulesUrl: string, reward: number|BigNumber, minBond: number|BigNumber): Promise<string> {
    // A question is automatically created in Realitio with an answer in favor of banning the user.
    // Bond of the answer: 1 xDAI (initially the answer can be omitted).

    const qType = 'bool';
    const outcomes = [];
    const category = 'misc';

    const question = `Has ${fromUsername} infringed the Telegram group rules (${rulesUrl}) and should get banned?`;

    const realityETHV30 = getRealityETHV30(process.env.REALITITY_ETH_V30);

    const tx = await realityETHV30.askQuestionWithMinBond(
        0,
        encodeQuestionText(qType, question, outcomes, category),
        process.env.REALITIO_ARBITRATOR,
        60 * 60 * 24, // 1 day
        0,
        +new Date(),
        minBond,
        {
            value: reward,
            // gasLimit is needed to test in kovan
            gasLimit: process.env.CHAIN_NAME === 'kovan' ? 200000 : undefined
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

export {regexp, callback};