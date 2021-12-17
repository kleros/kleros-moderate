import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {setRules} from "../db";

/*
 * /setrules [ipfs file path]
 */
const regexp = /\/setrules (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    // TODO: validate url?
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status === 'creator' || user.status === 'administrator') {
        await setRules(msg.chat.id, match[1]);
        await bot.sendMessage(msg.chat.id, 'Rules updated');
    } else {
        await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
    }
}

export {regexp, callback};