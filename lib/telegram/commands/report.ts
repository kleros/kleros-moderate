import * as TelegramBot from "node-telegram-bot-api";
import {setInviteURL, getInviteURL, getRule,getAllowance, setAllowance, addReport, getRecordCount, getQuestionId} from "../../db";
import { groupSettings } from "../../../types";
import {upload} from "./addEvidence"
import {reportUser} from "../../bot-core";
import langJson from "../assets/lang.json";
const Web3 = require('web3')
const web3 = new Web3(process.env.WEB3_PROVIDER_URL)

/*
 * /report
 */
const ob = require('urbit-ob')
const regexp = /\/report\s?(.+)?/
// cacheIndex => groupID,reported message id => [pending report message id]
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
const myCacheGarbageCollection = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
const myCacheGarbageCollectionSlow = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
var myBot;
var myQueue;

myCacheGarbageCollection.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });
myCacheGarbageCollectionSlow.on("expired",function(key,value){
    myQueue.add(async () => {try{await myBot.deleteMessage(value, key)}catch{}});
    });
const callback = async (queue: any, db:any, settings: groupSettings, bot: any, botId: number, msg: any, match: string[]) => {
    try{        
        if(msg.text.substring(0,11) === '/info')
            return
        if (!myBot)
            myBot = bot
        if (!myQueue)
            myQueue = queue
        if (!msg.reply_to_message) {
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `/report ${langJson[settings.lang].errorReply}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
        return val}catch{}});
        if (!resp)
        return resp
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
            return;
        }

        if (msg.reply_to_message.date < Date.now()/1000-86400*7){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `Live and let live. This message is more than one week old. The future is asynchronous, but we believe moderation should not be punitive. Next time try to make the report sooner.`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
            return val}catch{}});
            if (!resp)
            return resp
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
            return;
        }

        // WHO WATCHES THE WATCHMEN??
        // can't ban bots
        if (msg.reply_to_message.from.is_bot){
            let resp;
            if(msg.reply_to_message.from.username === "GroupAnonymousBot")
                resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `User is anonymous. Ask admins to disable anonymouse admins to moderate admin behavior.`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                return val}catch{}});
            else
                resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.errorModBot}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                return val}catch{}});
                if (!resp)
                return resp
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
            return
        }
        let report: TelegramBot.ChatMember
        if(!settings.admin_reportable){
            report = await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id,msg.reply_to_message.from.id)
                return val}catch{}})
                if (!report)
                return report
            if(report.status === "administrator" || report.status === "creator"){
                const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.errorAdmin}`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                return val}catch{}});
                if (!resp)
                return resp
                myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
                return
            }
        }

        const fromUsername = (msg.reply_to_message.from.username || msg.reply_to_message.from.first_name || `no-username-set`);
        const reportedUserID = String(msg.reply_to_message.from.id);
        const currentTimeMs = Date.now()/1000;
/*
        const cachedReportRequestMessage = myCache.get([msg.chat.id, msg.reply_to_message.message_id].toString())
        if (cachedReportRequestMessage){ // message already reported
            const msgLinkReport = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + cachedReportRequestMessage;
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.reported}(${msgLinkReport})`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})
            return val}catch{}});
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
            return;
        }*/
        const reportedQuestionId = getQuestionId(db, 'telegram', String(msg.chat.id), reportedUserID, String(msg.reply_to_message.message_id));
        if (reportedQuestionId){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].report.reported}(https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${reportedQuestionId})`, msg.chat.is_forum? {message_thread_id: msg.message_thread_id, parse_mode: 'Markdown', disable_web_page_preview: true}: {parse_mode: 'Markdown', disable_web_page_preview: true})
            return val}catch{}});
            if (!resp)
            return resp
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
            return;
        }



        const rules = getRule(db, 'telegram', String(msg.chat.id), msg.reply_to_message.date);

        if (!rules){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].report.norules, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
        return val}catch{}});
        if (!resp)
        return resp
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
            return;
        }
        
        const chatobj = await queue.add(async () => {try{const val = await bot.getChat(msg.chat.id)
            return val}catch{}});
        if (!chatobj)
            return
        const isPrivate = !chatobj.active_usernames;
        const evidencepath = await upload(queue, bot, settings.lang, msg, isPrivate);
        const msgBackup = 'https://ipfs.kleros.io'+evidencepath;
        // TODO report
        const reportAllowance = getAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id));
        const reporter = await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id,msg.from.id)
            return val}catch{}})
            if (!reporter)
            return reporter
        if(!settings.admin_reportable && (reporter.status === "administrator" || reporter.status === "creator")){
            console.log(report.status)
        } else if (!reportAllowance){
            setAllowance(db, 'telegram', String(msg.chat.id), String(msg.from.id), 2, 15, currentTimeMs);
        } else if (currentTimeMs < reportAllowance.timestamp_refresh + 28800 && reportAllowance.report_allowance == 0 ){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].report.noallowance, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
            return val}catch{}});
            if (!resp)
                return resp
            myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
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
            ...(msg.chat.is_topic_message && {message_thread_id: msg.message_thread_id}),
            disable_web_page_preview: true,
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
        const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/'+`${msg.chat.is_forum? msg.is_topic_message? msg.message_thread_id: 1 : ''}/`+msg.reply_to_message.message_id;
        const reportRequestMsg: TelegramBot.Message = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].socialConsensus.consensus2} [${fromUsername}](tg://user?id=${reportedUserID}) ${langJson[settings.lang].socialConsensus.consensus3}(${rules}) ${langJson[settings.lang].socialConsensus.consensus4}(${msgLink}) ([${langJson[settings.lang].socialConsensus.consensus5}](${msgBackup}))?`, opts)
        return val}catch (e){}}); 
        if (!reportRequestMsg)
            return
        myCache.set([msg.chat.id, msg.reply_to_message.message_id].toString(),`${msg.chat.is_forum? `${msg.message_thread_id}/${reportRequestMsg.message_id}`:''}${reportRequestMsg.message_id}`) ; 
        myCacheGarbageCollectionSlow.set(reportRequestMsg.message_id, msg.chat.id)
        return;
    } catch(e){
        console.log(e)       
    }
}
const reportMsg = async (queue: any, settings: groupSettings, db: any, bot: any, msg: any, fromUsername: string, reportedUserID: string, rules: string, msgId: string, msgBackup: string, reportedBy: string, batchedSend: any) => {
    try {
        var inviteURL = myCache.get(msg.chat.id)
        if (!inviteURL){
            inviteURL = getInviteURL(db, 'telegram', String(msg.chat.id));
            if (!inviteURL){
                inviteURL = await queue.add(async () => {try{const val = await bot.exportChatInviteLink(msg.chat.id)
                    return val}catch{}});
                if (!inviteURL)
                    return
                setInviteURL(db, 'telegram', String(msg.chat.id), inviteURL);
            }
            myCache.set(msg.chat.id, inviteURL)
        }

        const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/'+`${msg.chat.is_forum? msg.is_topic_message? msg.message_thread_id: 1 : ''}/`+msg.reply_to_message.message_id;

        const cachedEvidenceIndex = myCache.get("evidence"+msg.chat.id);
        const evidenceIndex = cachedEvidenceIndex? cachedEvidenceIndex+1:getRecordCount(db, 'telegram', String(msg.chat.id))+1
        myCache.set("evidence"+msg.chat.id, evidenceIndex);
        const chatobj = await queue.add(async () => {try{const val = await bot.getChat(msg.chat.id)
            return val}catch{}});
        if (!chatobj)
            return
        const isPrivate: boolean = !chatobj.active_usernames;

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
            reportedBy,
            isPrivate);

        addReport(db, questionId, 'telegram', String(msg.chat.id), reportedUserID, fromUsername , (msg.chat.is_forum? `${msg.message_thread_id}/`:'')+String(msg.reply_to_message.message_id), msg.reply_to_message.date,evidenceIndex, msgBackup);

        queue.add(async () => {try{await bot.sendMessage(settings.channelID, `[${fromUsername}](tg://user?id=${reportedUserID})'s conduct due to this [message](${msgLink}) ([backup](${msgBackup})) is reported for breaking the [rules](${rules}).\n\nDid *${fromUsername}* break the rules? The [question](${appealUrl}) can be answered with a minimum bond of 5 DAI. Need assistance answering the question? [DM](https://t.me/${process.env.BOT_USERNAME}?start=helpgnosis) me for help : )\n\nTo save a record, reply to messages you want saved with \`/evidence ${evidenceIndex}\``, msg.chat.is_forum? {message_thread_id: settings.thread_id_notifications , parse_mode: 'Markdown'}: {parse_mode: 'Markdown'})}catch{}});
        return questionId;
    } catch (e) {
        console.log(e);
        try{
            queue.add(async () => {try{await bot.sendMessage(msg.chat.id, `${langJson[settings.lang].errorTxn}. ${e.reason}. `,msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})}catch{}});
        } catch(e){
            console.log(e)
        }
        return;
    }
}

export {regexp, callback, reportMsg};