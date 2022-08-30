import * as TelegramBot from "node-telegram-bot-api";
import {getRule, getAllowance, setAllowance, setAllowanceAsked, getReportRequest, getQuestionId} from "../../db";
import  {reportMsg} from "./report";

/*
 * /getrules
 */

const callback = async (bot: any, callbackQuery: TelegramBot.CallbackQuery) => {
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
        const reportAllowance = await getAllowance('telegram', String(msg.chat.id), String(msg.from.id));
        if ( reportAllowance === undefined ){
            setAllowance('telegram', String(msg.chat.id), String(msg.from.id), 2, 15, Math.ceil( new Date().getTime() / 1000));
        } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 28800) && reportAllowance.report_allowance == 0 ){
            return;
        } else{
            const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800) - 1;
            const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5;
            const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
            setAllowance('telegram', String(msg.chat.id), String(msg.from.id), newReportAllowance, newEvidenceAllowance, newRefreshTimestamp);
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
                text: 'Confirm ('+newConfirmations+'/3)',
                callback_data: rawCalldata+'|'+String(callbackQuery.from.id)
              }
            ]
          ]
        }
      };
      const reportRequest = await getReportRequest('telegram', String(msg.chat.id),calldata[0]);
      //todo proper rule chronology
      const rules = await getRule('telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
      const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + String(reportRequest.msg_id);

    if (newConfirmations > 2){
        const reportedQuestionId = await getQuestionId('telegram', String(msg.chat.id), reportRequest.user_id, String(reportRequest.msg_id));
        if (reportedQuestionId)
            await bot.sendMessage(msg.chat.id, `The message is already [reported](https://realityeth.github.io/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
        else{
            const optsFinal = {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
              };
            bot.editMessageText('Report confirmed.', optsFinal);
            const questionId = await reportMsg(bot, msg, reportRequest.username, reportRequest.user_id, rules, reportRequest.msg_id, reportRequest.msgBackup);
            setAllowanceAsked(questionId, 'telegram', String(msg.chat.id), calldata[1]);
            setAllowanceAsked(questionId, 'telegram', String(msg.chat.id), calldata[2]);
            setAllowanceAsked(questionId, 'telegram', String(msg.chat.id), String(callbackQuery.from.id));
        }
    } else
        bot.editMessageText(`Reports require atleast 3 confirmations.\n\n Should ${reportRequest.username} (ID: ${reportRequest.user_id}) be reported for breaking the [rules](${rules}) due to conduct over this [message](${msgLink}) ([ipfs backup](${reportRequest.msgBackup}))?`, opts);
    //bot.sendMessage(msg.chat.id, "You have already confirmed");
}

export {callback};