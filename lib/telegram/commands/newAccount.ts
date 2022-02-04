import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {createAccount} from "../../bot-core";

/*
 * /newaccount
 */
const regexp = /\/newaccount/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status !== 'creator' && user.status !== 'administrator') {
        await bot.sendMessage(msg.chat.id, 'Only admins can execute this command.');
        return;
    }

    const address = await createAccount(String(msg.from.id), 'telegram');

    await bot.sendMessage(msg.chat.id, `Account created. Send xDAI to ${address} to pay for the gas used. Execute /setaccount to start using the bot.`);
}

export {regexp, callback};