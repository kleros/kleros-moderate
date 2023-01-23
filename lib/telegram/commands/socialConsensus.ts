import * as TelegramBot from "node-telegram-bot-api";
import { getQuestionId } from "../../graph";
import  {reportMsg} from "./report";
import langJson from "../assets/langNew.json";
import { groupSettings } from "../../../types";
const escape = require('markdown-escape')
import {Wallet} from "@ethersproject/wallet";

var botAddress: string;
/*
 * social consensus callback
 */

const callback = async (queue: any, db: any, settings: groupSettings, bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery, batchedSend: any) => {
    if(!botAddress)
      botAddress = await (await new Wallet(process.env.PRIVATE_KEY)).address.toLowerCase();

    const rawCalldata = callbackQuery.data;
    const calldata = rawCalldata.split('|');
    const match = callbackQuery.message.reply_markup.inline_keyboard[0][0].text;
    const msg: any = callbackQuery.message;
    const newConfirmations = Number(match.substring(match.length - 4,match.length-3)) + 1;
    console.log(newConfirmations)

    if (callbackQuery.from.id == Number(calldata[4]))
        return;
    //if (calldata.length > 5 && callbackQuery.from.id == Number(calldata[5]))
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
        const user = (await queue.add(async () => {try{const val = await bot.getChatMember(String(msg.chat.id), String(calldata[1]))
          return val}catch{}})).user;
          const fromUsername = user.username || user.first_name || `no-username-set`;
        const [appealURL, evidenceIndex] = await reportMsg(queue, settings, db, bot, msg, fromUsername, String(calldata[1]), msg.entities[1].url, String(calldata[2]), msg.entities[3].url, calldata[4],calldata[3],batchedSend);
        queue.add(async () => {try{await bot.deleteMessage(msg.chat.id, msg.message_id)}catch{}})
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, settings.lang === "en"? `User [reported](${appealURL}). Add evidence with \`/evidence ${evidenceIndex}\`` : `Usuario [reportado](${appealURL}). Añadir pruebas con \`/evidence ${evidenceIndex}\``,{disable_web_page_preview: true, parse_mode: "Markdown"})}catch{}})
      } else{
        queue.add(async () => {try{await bot.editMessageReplyMarkup(markdown, opts)}catch{}})
      }
    } catch(e){
      console.log('social consensus error'+e);
    }
}

export {callback};