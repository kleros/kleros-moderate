import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {setInviteURL} from "../../db";
import {validateUrl} from "./setRules";

/*
 * /setinviteurl [group invite url]
 */
const regexp = /\/setinviteurl\s?(.+)?/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    try {
        const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

        if (user.status === 'creator' || user.status === 'administrator') {
                if (validateUrl(match[1])) {
                    await setInviteURL('telegram', String(msg.chat.id), match[1]);
                    await bot.sendMessage(msg.chat.id, 'Group invite URL set.');
                } else {
                    await bot.sendMessage(msg.chat.id, '/setinviteurl must be followed by a valid invite URL to the group.');
                }
        } else {
            await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
        }   
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback, validateUrl};