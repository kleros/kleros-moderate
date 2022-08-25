import * as TelegramBot from "node-telegram-bot-api";
import {CommandCallback} from "../../../types";
import {getGroup} from "../../db";
import {Wallet} from "@ethersproject/wallet";

/*
 * /getaccount
 */
const regexp = /\/getaccount/

const callback: CommandCallback = async (bot: TelegramBot, msg: TelegramBot.Message) => {
    const add = await (await new Wallet(process.env.PRIVATE_KEY)).address;
    await bot.sendMessage(msg.chat.id, `Bot address: ${add}`);
}

export {regexp, callback};