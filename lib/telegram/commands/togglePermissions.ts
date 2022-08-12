import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {setPermissions, getPermissions} from "../../db";

/*
 * /setaccount [address]
 */
const regexp = /\/togglePermissions/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status !== 'creator' && user.status !== 'administrator') {
        await bot.sendMessage(msg.chat.id, 'Only admins can execute this command.');
        return;
    }
    const res = await getPermissions('telegram', String(msg.chat.id));
    const state = res == true;


    await setPermissions('telegram', String(msg.chat.id), !state);

    await bot.sendMessage(msg.chat.id, !state ? 'Bot permissions updated. All users can report.': 'Bot permissions updated. Only admins can report.');
}

export {regexp, callback};