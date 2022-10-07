import * as TelegramBot from "node-telegram-bot-api";
import {getRule, getAllowance, setAllowance, setAllowanceAsked, getReportRequest, getQuestionId} from "../../db";
import  {reportMsg} from "./report";
import langJson from "../assets/lang.json";
const escape = require('markdown-escape')

/*
 * /getrules
 */

const callback = async (db: any, lang: string, bot: any, callbackQuery: TelegramBot.CallbackQuery) => {
    const rawCalldata = callbackQuery.data;
    const calldata = rawCalldata.split('|');
    const match = callbackQuery.message.reply_markup.inline_keyboard[0][0].text;
    const msg = callbackQuery.message;
    const user = await bot.getChatMember(msg.chat.id, String(callbackQuery.from.id));
    const isAdmin = user.status === 'creator' || user.status === 'administrator';

    if (!isAdmin){
        if (callbackQuery.from.id == Number(calldata[1])) {
            return;
        }
    
        if (calldata.length > 2 && callbackQuery.from.id == Number(calldata[2])){
            return;
        }
        const reportAllowance = await getAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id));
        if ( reportAllowance === undefined ){
            setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), 2, 15, Math.ceil( new Date().getTime() / 1000));
        } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 28800) && reportAllowance.report_allowance == 0 ){
            return;
        } else{
            const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800) - 1;
            const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5;
            const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
            setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), Math.min(newReportAllowance,3), Math.min(newEvidenceAllowance,15), newRefreshTimestamp);
        }
    }

    const newConfirmations = Number(match.substring(9,10)) + 1;

    const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: langJson[lang].socialConsensus.confirm + '('+newConfirmations+'/3)',
                callback_data: rawCalldata+'|'+String(callbackQuery.from.id)
              }
            ]
          ]
        }
      };
      const reportRequest = await getReportRequest(db, 'telegram', String(msg.chat.id),calldata[0]);
      //todo proper rule chronology
      const rules = await getRule(db, 'telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
      const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + String(reportRequest.msg_id);

    if (newConfirmations > 2){
        const reportedQuestionId = await getQuestionId(db, 'telegram', String(msg.chat.id), reportRequest.user_id, String(reportRequest.msg_id));
        if (reportedQuestionId)
            await bot.sendMessage(msg.chat.id, `${langJson[lang].socialConsensus.reported}(https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
        else{
            const optsFinal = {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
              };
            bot.editMessageText(langJson[lang].socialConsensus.reportConfirm, optsFinal);
            const questionId = await reportMsg(db, bot, msg, reportRequest.username, reportRequest.user_id, rules, reportRequest.msg_id, reportRequest.msgBackup);
            setAllowanceAsked(db, questionId, 'telegram', String(msg.chat.id), calldata[1]);
            setAllowanceAsked(db, questionId, 'telegram', String(msg.chat.id), calldata[2]);
            setAllowanceAsked(db, questionId, 'telegram', String(msg.chat.id), String(callbackQuery.from.id));
        }
    } else
        bot.editMessageText(`${langJson[lang].socialConsensus.consensus1}\n\n ${langJson[lang].socialConsensus.consensus2} ${escape(reportRequest.username)} (ID: ${reportRequest.user_id}) ${langJson[lang].socialConsensus.consensus3}(${rules}) due to conduct over this [message]${langJson[lang].socialConsensus.consensus4}(${msgLink}) ([${langJson[lang].socialConsensus.consensus5}](${reportRequest.msgBackup}))?`, opts);
}

export {callback};