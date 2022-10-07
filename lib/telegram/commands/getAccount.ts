import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import langJson from "../assets/lang.json";

/*
 * /getaccount
 */
const regexp = /\/getaccount/

const callback = async (db: any, lang: string, bot: TelegramBot, msg: TelegramBot.Message) => {
    const add = await (await new Wallet(process.env.PRIVATE_KEY)).address;
    await bot.sendMessage(msg.chat.id, `${langJson[lang].getAccount}: ${add}`);
}

export {regexp, callback};