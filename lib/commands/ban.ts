import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {RealityETHV30__factory} from "../typechain";
import {Wallet} from '@ethersproject/wallet';
import {JsonRpcProvider} from '@ethersproject/providers';
import {utils} from "ethers";
import {addBan, getRules} from "../db";

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

    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    const rules = await getRules(msg.chat.id);

    if (!rules) {
        await bot.sendMessage(msg.chat.id, `You need to /setrules before /ban`);
        return;
    }

    const fromUsername = msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || msg.reply_to_message.from.id;

    let appealUrl;

    if (user.status === 'creator' || user.status === 'administrator') {

        try {
            const questionId = await askQuestionWithMinBond(fromUsername, rules);

            await addBan(msg.chat.id, questionId);

            appealUrl = `https://reality.eth.link/app/#!/question/${process.env.REALITITY_ETH_V30}-${questionId}`;
        } catch (e) {
            console.log(e);

            await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.message}`);
            return;
        }

    } else {
        // TODO
        // The user is required to create a question in Realitio and submit an answer with a minimum bond.
        await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
        return;
    }

    // the user gets notified and it is explained to them how to appeal.
    await bot.sendMessage(msg.chat.id, `*${fromUsername}* you have been banned, you can appeal here: ${appealUrl}`, {parse_mode: 'Markdown'});

    // TODO: If the user appeals (submits an answer to Realitio), the user gets automatically unbanned.

    //@ts-ignore
    //await bot.banChatMember(msg.chat.id, String(msg.reply_to_message.from.id));
}

async function askQuestionWithMinBond(fromUsername, rules): Promise<string> {
    // A question is automatically created in Realitio with an answer in favor of banning the user.
    // Bond of the answer: 1 xDAI (initially the answer can be omitted).

    const qType = 'bool';
    const outcomes = [];
    const category = 'misc';

    const question = `Has ${fromUsername} infringed the Telegram group rules (${rules}) and should get banned?`;

    const realityETHV30 = getRealityETHV30(process.env.REALITITY_ETH_V30);

    const tx = await realityETHV30.askQuestionWithMinBond(
        0,
        encodeQuestionText(qType, question, outcomes, category),
        process.env.REALITIO_ARBITRATOR,
        60 * 60 * 24, // 1 day
        0,
        0,
        utils.parseUnits("1", 18) // 1 DAI
    );

    const receipt = await tx.wait();

    const log = realityETHV30.interface.parseLog(receipt.logs[0]);

    return log.args[0];
}

function getRealityETHV30(realitioAddress: string) {
    let wallet = new Wallet(process.env.WALLET_PRIVATE_KEY, new JsonRpcProvider(process.env.WEB3_PROVIDER_URL));

    return RealityETHV30__factory.connect(realitioAddress, wallet);
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