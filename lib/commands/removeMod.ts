import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";

/*
 * /removemod ?
 */
const regexp = /\/removemod (.+)/

const callback: CommandCallback = (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    // TODO
    bot.sendMessage(msg.chat.id, 'This command is not implemented yet...');
}

export {regexp, callback};