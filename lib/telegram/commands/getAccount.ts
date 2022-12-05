import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";

/*
 * /getaccount
 */
const regexp = /\/getaccount/
var address: string;

const callback = async (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        if (!address)
            address = process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS;
        bot.sendMessage(settings.channelID, `${langJson[settings.lang].getAccount}: ${address}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}:{});
    } catch(e){
        console.log('gettaccount error. '+e)
    }
}

export {regexp, callback};