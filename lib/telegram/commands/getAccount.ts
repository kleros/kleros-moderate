import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";

/*
 * /getaccount
 */
const regexp = /\/getaccount/
var address: string;

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        if (!address)
            address = (await new Wallet(process.env.PRIVATE_KEY)).address
        queue.add(async () => {try{await bot.sendMessage(settings.channelID, `*${langJson[settings.lang].getAccount}*: ${address}\n\n*Transaction Batch Address*: ${process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"})}catch{}});
    } catch(e){
        console.log('gettaccount error. '+e)
    }
}

export {regexp, callback};