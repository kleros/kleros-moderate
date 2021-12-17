import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";
import {getRules} from "../db";

/*
 * /getrules
 */
const regexp = /\/getrules/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const rules = await getRules(msg.chat.id);
    await bot.sendMessage(msg.chat.id, rules || 'No rules found for this chat.');
}

export {regexp, callback};