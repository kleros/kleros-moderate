import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {setRules} from "../../db";
import ipfsPublish from "../../ipfs-publish";

/*
 * /setrules [ipfs file path]
 */
const regexp = /\/setrules\s?(.+)?/

const validateUrl = (s: string): boolean => {
    try {
        new URL(s);
        return true;
    } catch (err) {
        return false;
    }
};

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status === 'creator' || user.status === 'administrator') {
        if (msg.reply_to_message) {
            const enc = new TextEncoder();

            const rulesPath = await ipfsPublish('rules.json', enc.encode(msg.reply_to_message.text))

            await setRules(msg.chat.id, rulesPath);

            await bot.sendMessage(msg.chat.id, 'Rules updated');
        } else {
            if (validateUrl(match[1])) {
                await setRules(msg.chat.id, match[1]);
                await bot.sendMessage(msg.chat.id, 'Rules updated');
            } else {
                await bot.sendMessage(msg.chat.id, 'Invalid url passed to /setrules');
            }
        }
    } else {
        await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
    }
}

export {regexp, callback};