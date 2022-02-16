import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getBot} from "../../db";

/*
 * /getaccount
 */
const regexp = /\/getaccount/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const chatBot = await getBot(String(msg.chat.id), 'telegram');

    await bot.sendMessage(msg.chat.id, chatBot ? `Bot address: ${chatBot.address}` : 'Bot address not set.');
}

export {regexp, callback};