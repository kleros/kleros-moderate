import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import langJson from "../assets/lang.json";

/*
 * /getaccount
 */
const regexp = /\/getaccount/
var address: string;

const callback = async (db: any, lang: string, bot: any, msg: any) => {
    if (!address)
        address = (await new Wallet(process.env.PRIVATE_KEY)).address;
        
    await bot.sendMessage(msg.chat.id, `${langJson[lang].getAccount}: ${address}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}:{});
}

export {regexp, callback};