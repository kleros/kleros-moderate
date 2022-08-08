import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getRules} from "../../db";

/*
 * /getrules
 */
const regexp = /\/getrules/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const rules = await getRules('telegram', String(msg.chat.id));
    try {
        await bot.sendMessage(msg.chat.id, rules || 'No rules found for this chat.');        
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback};