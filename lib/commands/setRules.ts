import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {setRules} from "../db";

/*
 * /setrules [ipfs file path]
 */
const regexp = /\/setrules (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    // TODO: validate url?
    await setRules(msg.chat.id, match[1]);
    bot.sendMessage(msg.chat.id, 'Rules updated');
}

export {regexp, callback};