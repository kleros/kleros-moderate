import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../types";

/*
 * /setlanguage ?
 */
const regexp = /\/setlanguage (.+)/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    // TODO: add multi language support

    const validLanguages = {
        'en': 'English'
    };

    const langCode = match[1].toLowerCase();

    if (user.status === 'creator' || user.status === 'administrator') {
        if (validLanguages[langCode] !== undefined) {
            await bot.sendMessage(msg.chat.id, `Language changed to "${validLanguages[langCode]}".`);
        } else {
            await bot.sendMessage(msg.chat.id, `"${langCode}" is not a supported language.`);
        }
    } else {
        await bot.sendMessage(msg.chat.id, `Only admins can execute this command.`);
    }
}

export {regexp, callback};