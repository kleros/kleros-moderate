import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {Wallet} from "@ethersproject/wallet";
import {createBot} from "../../db";

/*
 * /newbot
 */
const regexp = /\/newbot/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const user = await bot.getChatMember(msg.chat.id, String(msg.from.id));

    if (user.status !== 'creator' && user.status !== 'administrator') {
        await bot.sendMessage(msg.chat.id, 'Only admins can execute this command.');
        return;
    }

    const wallet = Wallet.createRandom();

    await createBot(
        String(msg.from.id),
        wallet.address,
        wallet.privateKey,
    );

    await bot.sendMessage(msg.chat.id, `Bot address: ${wallet.address}. Send xDAI to that address to pay for the gas used. Execute /setbot to start using this bot.`);
}

export {regexp, callback};