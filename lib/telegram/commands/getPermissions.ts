import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getPermissions} from "../../db";

/*
 * /getaccount
 */
const regexp = /\/getpermissions/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const res = await getPermissions('telegram', String(msg.chat.id));
    console.log(res);
    const state = res == true;
    console.log(state);
    await bot.sendMessage(msg.chat.id, state ? 'Reporting users is permissionless.' : `Reporting users is permissioned to admins.`);
}

export {regexp, callback};