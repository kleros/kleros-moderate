import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import ipfsPublish from "../ipfs-publish";
import {getRealitioArbitrator} from "../ethers";

const processCommand = async (msg: TelegramBot.Message, questionId: number|string): Promise<string> => {
    const enc = new TextEncoder();

    const evidence = `Chat: ${msg.chat.title} (${Math.abs(msg.chat.id)})

Author: ${msg.from.username || msg.from.first_name || 'ID: '+msg.from.id } (${(new Date(msg.date*1000)).toISOString()})

Message: ${msg.reply_to_message.text}`;

    const evidencePath = await ipfsPublish('evidence.json', enc.encode(evidence));

    await getRealitioArbitrator(process.env.REALITIO_ARBITRATOR)
        .submitEvidence(
            questionId,
            evidencePath
        )

    return evidencePath;
}

/*
 * /addevidence [questionId]
 */
const regexp = /\/addevidence (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {

    if (!msg.reply_to_message) {
        await bot.sendMessage(msg.chat.id, `/addevidence must be used in a reply`);
        return;
    }

    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status !== 'creator' && user.status !== 'administrator') {
        await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
        return;
    }

    try {
        const evidencePath = await processCommand(msg, match[1]);

        await bot.sendMessage(msg.chat.id, `Evidence submitted: ${evidencePath}`);
    } catch (e) {
        console.log(e);

        await bot.sendMessage(msg.chat.id, `An unexpected error has occurred: ${e.message}`);
    }
}

export {regexp, callback, processCommand};