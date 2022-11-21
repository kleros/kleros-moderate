import * as TelegramBot from "node-telegram-bot-api";
import { getQuestionId } from "../../graph";
import  {reportMsg} from "./report";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";
const escape = require('markdown-escape')

/*
 * /getrules
 */

const callback = async (db: any, settings: groupSettings, botaddress: string, bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery, batchedSend: any) => {
    const rawCalldata = callbackQuery.data;
    const calldata = rawCalldata.split('|');
    const match = callbackQuery.message.reply_markup.inline_keyboard[0][0].text;
    const msg: any = callbackQuery.message;
    const newConfirmations = Number(match.substring(9,10)) + 1;

    if (callbackQuery.from.id == Number(calldata[2]))
        return;
    //if (calldata.length > 3 && callbackQuery.from.id == Number(calldata[3]))
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
      //todo proper rule chronology
    if (newConfirmations > 1){
        const reportedQuestionId = await getQuestionId(botaddress, 'Telegram', String(msg.chat.id), String(calldata[0]), String(calldata[1]));
        if (reportedQuestionId){
          return;
        }
        if (reportedQuestionId)
            await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].socialConsensus.reported}(https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
        else{
            bot.deleteMessage(msg.chat.id, String(msg.message_id))
            const user = (await bot.getChatMember(String(msg.chat.id), String(calldata[0]))).user;
            const fromUsername = escape(user.username || user.first_name || `no-username-set`);
            await reportMsg(settings, db, bot, msg, fromUsername, String(calldata[0]), msg.entities[0].url, String(calldata[1]), msg.entities[2].url, calldata[2],batchedSend);
        }
    } else{
      bot.editMessageReplyMarkup(markdown, opts)
    }
}

export {callback};