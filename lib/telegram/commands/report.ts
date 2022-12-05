import * as TelegramBot from "node-telegram-bot-api";
import {setInviteURL, getInviteURL, getRule,getAllowance, setAllowance, addReport, getConcurrentReports, getRecordCount, getQuestionId} from "../../db";
import { groupSettings } from "../../../types";
import {upload} from "./addEvidence"
import {reportUser} from "../../bot-core";
import langJson from "../assets/lang.json";

/*
 * /report
 */
const regexp = /\/report\s?(.+)?/
let evidenceIndexMap : Map<number, number> = new Map<number, number>();
// cacheIndex => groupID,reported message id => [pending report message id]
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );

const callback = async (db:any, settings: groupSettings, bot: any, botId: number, msg: any, match: string[]) => {
    try{        
        if (!msg.reply_to_message) {
            bot.sendMessage(msg.chat.id, `/report ${langJson[settings.lang].errorReply}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
            return;
        }

        // WHO WATCHES THE WATCHMEN??
        // can't ban bots
        if (msg.reply_to_message.from.is_bot){
            if(msg.reply_to_message.from.username === "GroupAnonymousBot")
                bot.sendMessage(msg.chat.id, `User is anonymous. Ask admins to disable anonymouse admins to moderate admin behavior.`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
            else
                bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.errorModBot}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
            return
        }

        const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
        const reportedUserID = String(msg.reply_to_message.from.id);
        const currentTimeMs = Date.now()/1000;

        const cachedReportRequestMessage = myCache.get([msg.chat.id, msg.reply_to_message.message_id].toString())
        if (cachedReportRequestMessage){ // message already reported
            const msgLinkReport = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + cachedReportRequestMessage;
            bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.reported}(${msgLinkReport})`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
            return;
        }
        const reportedQuestionId = getQuestionId(db, 'telegram', String(msg.chat.id), reportedUserID, String(msg.reply_to_message.message_id));
        if (reportedQuestionId){
            bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.reported}(https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
            return;
        }



        const rules = getRule(db, 'telegram', String(msg.chat.id), msg.reply_to_message.date);

        if (!rules){
            bot.sendMessage(msg.chat.id, langJson[settings.lang].report.norules, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
            return;
        }
        

        const evidencepath = await upload(bot, settings.lang, msg);
        const msgBackup = 'https://ipfs.kleros.io'+evidencepath;
        // TODO report
        
        const reportAllowance = getAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id));
        if (!reportAllowance){
            setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), 2, 15, currentTimeMs);
        } else if (currentTimeMs < reportAllowance.timestamp_refresh + 28800 && reportAllowance.report_allowance == 0 ){
            bot.sendMessage(msg.chat.id, langJson[settings.lang].report.noallowance, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
            return;
        } else{
            const newReportAllowance = reportAllowance.report_allowance + Math.floor((currentTimeMs - reportAllowance.timestamp_refresh)/28800) - 1;
            const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((currentTimeMs - reportAllowance.timestamp_refresh)/28800)*5;
            const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((currentTimeMs - reportAllowance.timestamp_refresh)/28800)*28800;
            setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), Math.min(newReportAllowance,3), Math.min(newEvidenceAllowance,15), newRefreshTimestamp);
        }
        const opts = {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.reply_to_message.message_id,
            reply_markup: {
                inline_keyboard: [
                [
                    {
                    text: langJson[settings.lang].socialConsensus.confirm + ' (1/3)',
                    callback_data: '2|'+String(msg.reply_to_message.from.id)+'|'+String(msg.reply_to_message.message_id)+'|'+String(msg.from.id)
                    }
                ]
                ]
            }
        };
        const optsThread = {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.reply_to_message.message_id,
            message_thread_id: msg.message_thread_id,
            reply_markup: {
                inline_keyboard: [
                [
                    {
                    text: langJson[settings.lang].socialConsensus.confirm + ' (1/3)',
                    callback_data: "2|"+String(msg.reply_to_message.from.id)+'|'+String(msg.reply_to_message.message_id)+'|'+String(msg.from.id)
                    }
                ]
                ]
            }
        };
        const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + msg.reply_to_message.message_id;
        const reportRequestMsg: TelegramBot.Message = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].socialConsensus.consensus2} [${fromUsername}](tg://user?id=${reportedUserID}) ${langJson[settings.lang].socialConsensus.consensus3}(${rules}) ${langJson[settings.lang].socialConsensus.consensus4}(${msgLink}) ([${langJson[settings.lang].socialConsensus.consensus5}](${msgBackup}))?`, msg.chat.is_forum? optsThread: opts); 
        myCache.set([msg.chat.id, msg.reply_to_message.message_id].toString(),reportRequestMsg.message_id) ; 
        return;
    } catch(e){
        console.log(e)       
    }
}
const reportMsg = async (settings: groupSettings, db: any, bot: any, msg: any, fromUsername: string, reportedUserID: string, rules: string, msgId: string, msgBackup: string, reportedBy: string, batchedSend: any) => {
    try {
        var inviteURL = myCache.get(msg.chat.id)
        if (!inviteURL){
            inviteURL = getInviteURL(db, 'telegram', String(msg.chat.id));
            if (!inviteURL){
                inviteURL = await bot.exportChatInviteLink(msg.chat.id);
                setInviteURL(db, 'telegram', String(msg.chat.id), inviteURL);
            }
            myCache.set(msg.chat.id, inviteURL)
        }

        const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + msgId;

        const cachedEvidenceIndex = myCache.get("evidence"+msg.chat.id);
        const evidenceIndex = cachedEvidenceIndex? cachedEvidenceIndex+1:getRecordCount(db, 'telegram', String(msg.chat.id))+1
        myCache.set("evidence"+msg.chat.id, evidenceIndex);

        const {questionId, questionUrl: appealUrl} = await reportUser(
            batchedSend,
            settings.lang,
            false, 
            fromUsername, 
            reportedUserID, 
            'Telegram',
            msg.chat.title,
            inviteURL, 
            String(msg.chat.id), 
            rules, 
            msgLink, 
            msgBackup,
            reportedBy);

        addReport(db, questionId, 'telegram', String(msg.chat.id), reportedUserID, fromUsername , msgId, msg.reply_to_message.date,evidenceIndex, msgBackup);

        bot.sendMessage(settings.channelID, `[${fromUsername}](tg://user?id=${reportedUserID})'s conduct due to this [message](${msgLink}) ([backup](${msgBackup})) is reported for breaking the [rules](${rules}).\n\nDid *${fromUsername}* break the rules? The [question](${appealUrl}) can be answered with a minimum bond of 5 DAI. Need help getting DAI on Gnosis Chain for your answer? [DM](https://t.me/KlerosModeratorBot?start=helpgnosis) me for help : )\n\nTo save a record, reply to messages you want saved with \`/addevidence ${evidenceIndex}\``, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'});
        return questionId;
    } catch (e) {
        console.log(e);
        try{
            bot.sendMessage(msg.chat.id, `${langJson[settings.lang].errorTxn}. ${e.reason}. `,msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {});
        } catch(e){
            console.log(e)
        }
        return;
    }
}

export {regexp, callback, reportMsg};