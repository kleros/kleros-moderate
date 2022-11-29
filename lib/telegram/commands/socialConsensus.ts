import * as TelegramBot from "node-telegram-bot-api";
import { getQuestionId } from "../../graph";
import  {reportMsg} from "./report";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";
const escape = require('markdown-escape')
import {Wallet} from "@ethersproject/wallet";

var botAddress: string;
/*
 * /getrules
 */

const callback = async (db: any, settings: groupSettings, bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery, batchedSend: any) => {
    if(!botAddress)
      botAddress = await (await new Wallet(process.env.PRIVATE_KEY)).address.toLowerCase();

    const rawCalldata = callbackQuery.data;
    const calldata = rawCalldata.split('|');
    const match = callbackQuery.message.reply_markup.inline_keyboard[0][0].text;
    const msg: any = callbackQuery.message;
    const newConfirmations = Number(match.substring(9,10)) + 1;

    if (callbackQuery.from.id == Number(calldata[3]))
        return;
    //if (calldata.length > 4 && callbackQuery.from.id == Number(calldata[4]))
    //    return;

    const markdown = {
          inline_keyboard: [
            [
              {
                text: langJson[settings.lang].socialConsensus.confirm + '('+newConfirmations+'/3)',
                callback_data: rawCalldata+'|'+String(callbackQuery.from.id)
              }
            ]
          ]
        };
        const opts = msg.chat.is_forum? {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
        } : {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          message_thread_id: msg.message_thread_id
        }
        const optsFinal = msg.chat.is_forum? {
          chat_id: msg.chat.id,
          message_id: msg.message_id
        } : {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          message_thread_id: msg.message_thread_id
        }
    try{
      if (newConfirmations > 1){
        bot.editMessageReplyMarkup({ inline_keyboard: []}, optsFinal)
        bot.editMessageText("User Reported.",optsFinal)
        const user = (await bot.getChatMember(String(msg.chat.id), String(calldata[1]))).user;
        const fromUsername = user.username || user.first_name || `no-username-set`;
        await reportMsg(settings, db, bot, msg, fromUsername, String(calldata[1]), msg.entities[1].url, String(calldata[2]), msg.entities[3].url, calldata[3],batchedSend);
      } else{
        bot.editMessageReplyMarkup(markdown, opts)
      }
    } catch(e){
      console.log('social consensus error'+e);
    }
}

export {callback};