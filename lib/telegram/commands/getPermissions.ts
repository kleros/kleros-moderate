import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getPermissions} from "../../db";

/*
 * /getaccount
 */
const regexp = /\/getpermissions/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const res = await getPermissions('telegram', String(msg.chat.id));
    const state = res == true;
    await bot.sendMessage(msg.chat.id, state ? 'Reporting users is permissionless.' : `Reporting users is permissioned to admins.`);
}

export {regexp, callback};