import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getGroup} from "../../db";

/*
 * /getaccount
 */
const regexp = /\/getaccount/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const group = await getGroup('telegram', String(msg.chat.id));

    await bot.sendMessage(msg.chat.id, group ? `Bot address: ${group.address}` : 'Bot address not set.');
}

export {regexp, callback};