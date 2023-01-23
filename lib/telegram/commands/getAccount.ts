import * as TelegramBot from "node-telegram-bot-api";
import {Wallet} from "@ethersproject/wallet";
import langJson from "../assets/langNew.json";
import { groupSettings } from "../../../types";

/*
 * /account
 */
const regexp = /\/account/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `*${langJson[settings.lang].getAccount}*: ${process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: "Markdown"}:{parse_mode: "Markdown"})}catch{}});
    } catch(e){
        console.log('gettaccount error. '+e)
    }
}

export {regexp, callback};