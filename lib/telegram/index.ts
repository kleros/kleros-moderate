require('dotenv').config()
import * as TelegramBot from "node-telegram-bot-api";
import * as getAccount from "../../lib/telegram/commands/getAccount";
import * as setRulesCommand from "../../lib/telegram/commands/setRules";
import * as getRules from "../../lib/telegram/commands/getRules";
import * as getLeaderboard from "../../lib/telegram/commands/getLeaderboard";
import * as addEvidenceHelp from "../../lib/telegram/commands/addEvidenceHelp";
import * as report from "../../lib/telegram/commands/report";
import * as fedinfo from "../../lib/telegram/commands/fedinfo";
import * as welcome from "../../lib/telegram/commands/welcome";
import * as multilang from "../../lib/telegram/commands/multilang";
import * as toggleWelcome from "../../lib/telegram/commands/toggleWelcome";
import * as toggleEnforce from "../../lib/telegram/commands/toggleEnforcement";
import * as toggleAdminReportable from "../../lib/telegram/commands/toggleAdminReportable";
import * as greeting from "../../lib/telegram/commands/greeting";
import * as toggleCaptcha from "../../lib/telegram/commands/toggleCaptcha";
import * as help from "../../lib/telegram/commands/help";
import * as socialConsensus from "../../lib/telegram/commands/socialConsensus";
import * as addEvidence from "../../lib/telegram/commands/addEvidence";
import * as leaveFed from "../../lib/telegram/commands/leavefed";
import * as newFed from "../../lib/telegram/commands/newfed";
import * as joinFed from "../../lib/telegram/commands/joinfed";
import * as start from "../../lib/telegram/commands/start";
import * as setLanguage from "../../lib/telegram/commands/setLanguage";
import * as setChannel from "../../lib/telegram/commands/setChannel";
import * as setChannelFed from "../../lib/telegram/commands/setChannelFed";
import * as getChannel from "../../lib/telegram/commands/getChannel";
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/langNew.json";
import {groupSettings, groupSettingsUnderspecified} from "../../types";
import {openDb, getGroupSettings, getRule, getReportsUserInfoActive,getFederatedBanHistory, getFederatedFollowingBanHistory, getLocalBanHistory, eraseThreadID} from "../db";
const Web3 = require('web3')
const {default: PQueue} = require('p-queue');
const queue = new PQueue({intervalCap: 20, interval: 1000,carryoverConcurrencyCount: true});
const _batchedSend = require('../batched-send')
const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
const batchedSend = _batchedSend(
    web3, 
    process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS,
    process.env.PRIVATE_KEY,
    10000 // The debounce timeout period in milliseconds in which transactions are batched.
  )
  const defaultSettings: groupSettings = {
    lang: 'en',
    rules: langJson['en'].defaultRules,
    channelID: '',
    greeting_mode: false,
    captcha: false,
    admin_reportable: false,
    enforcement: true,
    thread_id_rules: '',
    thread_id_welcome: '',
    thread_id_notifications: '',
    federation_id: '',
    federation_id_following: ''
}
const ModeratorBot = require('node-telegram-bot-api');
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: {params: {"allowed_updates": JSON.stringify(["my_chat_member","message","callback_query", "new_chat_members"])}}, testEnvironment: false});
//const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: true, testEnvironment: true});

//bot.
var botId: number; 
const db = openDb();
const exit = async () => {   
    await db.close()
    await bot.stopPolling({ cancel: true })
}

['SIGINT', 'SIGTERM', 'SIGQUIT','EXIT']
  .forEach(signal => process.on(signal, async () => {
    await exit()
    process.exit();
  }));
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
// Throttling

const myCacheGarbageCollection = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
const myCacheThrottle = new NodeCache( { stdTTL: 60, checkperiod: 90 } );

myCacheGarbageCollection.on("expired",function(key,value){
    queue.add(async () => {try{await bot.deleteMessage(value, key)}catch{}});
    });

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
  }

bot.on("my_chat_member", async function(myChatMember: any) {
    try{
        const lang_code = myChatMember?.from?.language_code
        console.log(myChatMember)
        if(throttled(myChatMember.from.id))
            return
        if(myChatMember.new_chat_member.status === "left"){
            return;
            // todo remove rules>?
            // stop()?
        }

        const settings = validate(myChatMember.chat, lang_code);
        console.log('HMMMMMM')
        if(myChatMember.chat.type === "channel"){
            await delay(2000);
            if( myChatMember.new_chat_member.status === "administrator"){
                try{
                    queue.add(async () => {try{await bot.sendMessage(myChatMember.chat.id, langJson[lang_code].index.channel+`<code>${myChatMember.chat.id}</code>`, {parse_mode: "HTML"})}catch{}});
                } catch(e) {
                    console.log('channel id msg error'+e);
                }
            }
            return;
        } else if (myChatMember.chat.type === "supergroup")
            welcome.callback(queue, settings, bot, myChatMember);
        else if (myChatMember.chat.type === "private")
            return
        else
            try{
                const video = myChatMember.chat.is_forum? 'QmSdP3SDoHCdW739xLDBKM3gnLeeZug77RgwgxBJSchvYV/guide_topics.mp4' : 'QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4'
                queue.add(async () => {try{await bot.sendVideo(myChatMember.chat.id, `https://ipfs.kleros.io/ipfs/${video}`, {caption: langJson[lang_code].index.supergroup})}catch{}});
            } catch(e){
                console.log(e)
            }
    } catch(e){
        console.log("Welcome error." + e);
    }
});

/*  Forward messages to Susie for appeal
// include "member" in allowed updates to work

bot.on("message", async function (msg: TelegramBot.Message) {
    if (msg.chat.type !== "private")
        return;
    console.log(msg)
})
*/
//invite_url only present in private groups
// include "chat_member" in allowed updates to work
/*
bot.on("chat_member", async function (msg: any) {
    if (msg.new_chat_member){
        if(msg.invite_link?.creator?.is_bot){
            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
            bot.restrictChatMember(msg.chat.id, msg.new_chat_member.id, options)
        }
        else{
            const options = await bot.getChat(msg.chat.id).permissions
            bot.restrictChatMember(msg.chat.id, msg.new_chat_member.id, options)
        }
    }
})
*/

bot.on("new_chat_members", async function (chatMemberUpdated: any) {

    console.log(chatMemberUpdated)
    if(!hasStarted(chatMemberUpdated.chat.id)||throttled(chatMemberUpdated.from.id)||chatMemberUpdated.chat.type !== "supergroup")
        return;    
        
    console.log('hmmm1')
    const settings = validate(chatMemberUpdated.chat);
    console.log('hmmm2')
    let calculateHistory = []
    if (settings.federation_id)
        calculateHistory = getFederatedBanHistory(db, 'telegram', String(chatMemberUpdated.new_chat_member.id),settings.federation_id,true)
    else if (settings.federation_id_following)
        calculateHistory = getFederatedFollowingBanHistory(db, 'telegram', String(chatMemberUpdated.new_chat_member.id),String(chatMemberUpdated.chat.id),settings.federation_id_following,true)
    else 
        calculateHistory = getLocalBanHistory(db, 'telegram', String(chatMemberUpdated.new_chat_member.id),String(chatMemberUpdated.chat.id),true)

    console.log('wtf')
    console.log(calculateHistory)

    // todo notify groups about federal outlaws when enforcement is false

    if (calculateHistory.length > 0){
        var max_timestamp = 0
        for (const ban of calculateHistory){
            if (ban.timestamp_finalized > max_timestamp)
                max_timestamp = ban.timestamp_finalized
        }
        const parole_time = calcPenalty(calculateHistory.length, max_timestamp)
        if (settings.enforcement && parole_time*1000 > Date.now()){
            queue.add(async () => {try{await bot.banChatMember(chatMemberUpdated.chat.id, chatMemberUpdated.new_chat_member.id, {until_date: parole_time})}catch{}})
            return
        }
    }

    let calculateHistoryActive = []
    if (settings.federation_id)
        calculateHistoryActive = getFederatedBanHistory(db, 'telegram', String(chatMemberUpdated.new_chat_member.id),settings.federation_id,false)
    else if (settings.federation_id_following)
        calculateHistoryActive = getFederatedFollowingBanHistory(db, 'telegram', String(chatMemberUpdated.new_chat_member.id),String(chatMemberUpdated.chat.id),settings.federation_id_following,false)
    else 
        calculateHistoryActive = getLocalBanHistory(db, 'telegram', String(chatMemberUpdated.new_chat_member.id),String(chatMemberUpdated.chat.id),false)

    console.log('wtf')
    console.log(calculateHistoryActive)

    if (calculateHistoryActive.length > 0){
        var max_timestamp = 0
        for (const ban of calculateHistoryActive){
            if (ban.timestamp_active > max_timestamp)
                max_timestamp = ban.timestamp_active
        }
        const parole_time = calcPenalty(calculateHistoryActive.length, max_timestamp)
        if (settings.enforcement && parole_time > Date.now()){
            const options = {can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false, until_date: parole_time};
            queue.add(async () => {try{await bot.restrictChatMember(chatMemberUpdated.chat.id, chatMemberUpdated.new_chat_member.id, options)}catch{}})
            return;
        }
    } 

    if(settings.captcha || settings.greeting_mode)
        greeting.callback(db, queue, bot, settings, chatMemberUpdated);        
});


const calcPenalty = (ban_level: number, timestamp_finalized: number): number => {
    if(ban_level == 1)
        return  timestamp_finalized + 86400
    else if (ban_level == 2)
        return  timestamp_finalized + 604800
    else
        return  timestamp_finalized + 31536000
}

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    const calldata = callbackQuery.data.split('|');
    if((callbackQuery.data !== '6' && !hasStarted(callbackQuery.message.chat.id) && callbackQuery.message.chat.type == "supergroup")||throttled(callbackQuery.from.id))
        return;
    const settings = validate(callbackQuery.message.chat);
    if (Number(calldata[0]) === 0){ // set language
        if (callbackQuery.from.id !== Number(calldata[1]))
            return;
        setLanguage.setLanguageConfirm(queue, db, bot, settings, calldata[2], callbackQuery.message);
        myCache.del(callbackQuery.message.chat.id)
    } else if (Number(calldata[0]) === 1){ // add evidence
        if (callbackQuery.from.id !== Number(calldata[1]))
            return;
        // handle addevidence callback
    } else if (Number(calldata[0]) === 2){ // report confirmations
        socialConsensus.callback(queue, db, settings, bot, callbackQuery, batchedSend);
    } else if (Number(calldata[0]) === 3){ // report confirmations
        help.respond(queue, settings, bot, calldata[1], callbackQuery);
    } else if (Number(calldata[0]) === 4){
        const reports = getReportsUserInfoActive(db, 'telegram', calldata[1], calldata[2]);
        var reportMessage: string = `To add evidence, reply to the message you want saved in the original chat with the evidence index.\n\n`
        reports.forEach( (report) => {
            const MsgLink = 'https://t.me/c/' + calldata[1].substring(4) + '/' + report.msg_id;
            reportMessage += `- [Message](${MsgLink}) ([${langJson[settings.lang].socialConsensus.consensus5}](${report.msgBackup})) [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), \`/addevidence ${report.evidenceIndex}\` <context (optional)>\n`;
        });

        reportMessage +='\n eg. \`/evidence\` 1 This message breaks the rules because xyz.'
        const optsResponse = {
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };
        try{
            queue.add(async () => {try{await bot.editMessageReplyMarkup({inline_keyboard: [[]]}, optsResponse)}catch{}})
            queue.add(async () => {try{await bot.editMessageText(reportMessage , optsResponse)}catch{}});
        } catch (e){
            console.log(e)
        }
    } else if (Number(calldata[0]) === 5){
        console.log(calldata)
        console.log(callbackQuery.from.id)
        if (callbackQuery.from.id !== Number(calldata[1]))
            return;
        const permissions = await queue.add(async () => {try{const val = (await bot.getChat(callbackQuery.message.chat.id)).permissions
            return val}catch (e){console.log(e)}})
        console.log(permissions)
        if(!permissions)
            return
        queue.add(async () => {try{await bot.restrictChatMember(callbackQuery.message.chat.id, callbackQuery.from.id, permissions)}catch{}});
        queue.add(async () => {try{await bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id)}catch{}})
    } else if (Number(calldata[0]) === 6){
        const member = await queue.add(async () => {try{const val = await bot.getChatMember(callbackQuery.message.chat.id, callbackQuery.from.id)
            return val}catch{}})
            if(!member)
            return
        if (member.status === "admin" || member.status === "creator"){
            queue.add(async () => {try{await bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id)}catch{}})
            start.callback(queue, db, settings,bot,String(botId),callbackQuery.message,[],batchedSend, true)
        }
    }
    });

const commands: {regexp: RegExp, callback: any}[] = [
    getAccount,
    setRulesCommand,
    getRules,    
    report,
    toggleWelcome,
    toggleEnforce,
    start,
    fedinfo,
    toggleCaptcha,
    help,
    newFed,
    getChannel,
    toggleAdminReportable,
    leaveFed,
    joinFed,
    multilang,
    setChannel,
    setChannelFed,
    addEvidence,
    getReports,
    setLanguage,
];

const adminOnlyCommands = [joinFed, toggleEnforce, multilang, leaveFed, newFed, toggleCaptcha, setLanguage, setChannelFed, setChannel, toggleWelcome, toggleAdminReportable, start, setRulesCommand ]
const settingUpateCommands = [setLanguage, toggleEnforce, setRulesCommand, joinFed, setChannel, toggleWelcome, toggleCaptcha, toggleAdminReportable]

commands.forEach((command) => {
    bot.onText(
        command.regexp,
        async (msg: any, match: string[]) => { 
            if (!botId)
                botId = (await queue.add(async () => {try{const val = await bot.getMe()
                    return val}catch{}})).id;
            if(throttled(msg.from.id))
                return
            const groupSettings = validate(msg.chat);
            if(msg.chat.type === "private"){
                if (msg.text === '/start help'){
                    help.callback(queue, db, groupSettings, bot, botId, msg);
                    return
                } else if(msg.text === '/start helpgnosis'){
                    help.helpgnosis(queue, db, groupSettings, bot, botId, msg);
                    return
                } else if(msg.text === '/start helpnotifications'){
                    help.helpnotifications(queue, db, groupSettings, bot, botId, msg);
                    return
                } else if (msg.text.substring(0,22) === '/start addevidencehelp'){
                    addEvidenceHelp.callback(queue, db, groupSettings, bot, botId, msg);
                    return
                } else if (msg.text.substring(0,16) === '/start getreport'){
                    getReports.callback(queue, db, groupSettings, bot, botId, msg);
                    return
                } else if (msg.text === '/start newfed' || msg.text.substring(0,7) === '/newfed'){
                    newFed.callback(queue, db, groupSettings, bot, String(botId), msg, match);
                    return
                }
                else if (msg.text === '/start setfedchannel' || msg.text.substring(0,14) === '/setfedchannel'){
                    setChannelFed.callback(queue, db, groupSettings, bot, String(botId), msg, match, batchedSend);
                    return
                } else if (msg.text !== '/start' && msg.text != '/help' && msg.text !== '/start botstart')
                    return
            } else if(msg.chat.type !== "supergroup" && !(msg.chat.type === "group" && msg.text === '/help'))
                return
            if(!hasStarted(msg.chat.id) && (command !== help && command !== start)){
                return;
            }

            if (msg.chat.type !== "private" && adminOnlyCommands.indexOf(command)!==-1){
                var status = myCache.get("status"+msg.chat.id+msg.from.id)
                if (!status){
                    try{
                        status = (await queue.add(async () => {try{const val = await bot.getChatMember(msg.chat.id, String(msg.from.id))
                            return val}catch{}})).status;
                        myCache.set("status"+msg.chat.id+msg.from.id,status)
                    } catch(e){
                        console.log(e)
                        return;
                    }
                }
                if (!(status === 'creator' || status === 'administrator')) {
                    try{
                        const lang_code = hasStarted(msg.chat.id)? groupSettings.lang : msg?.from?.language_code
                        const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[lang_code].error.admin, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                        return val}catch{}})
                        if(!resp)
                        return
                        myCacheGarbageCollection.set(resp.message_id, msg.chat.id)
                    } catch(e){
                        console.log(e)
                    }
                    return;
                }
            }

            // todo success bool return val, to not always delete settings
            command.callback(queue, db, groupSettings, bot, botId, msg, match,batchedSend);
            if (settingUpateCommands.indexOf(command)!==-1)
                myCache.del(msg.chat.id)
            if (command === start)
                myCache.del("started"+msg.chat.id)
        }
    )
})


const throttled = (userId: number): boolean => {
    const count = myCacheThrottle.get(userId) ?? 1
    if (count >20)
        return true
    myCacheThrottle.set(userId.toString(), count + 1)
    return false;
}

const hasStarted = (chatid: number): boolean=> {
    const cachedStarted = myCache.get("started"+chatid);
    if (typeof cachedStarted !== 'undefined')
        return cachedStarted;
    const rules = getRule(db, 'telegram', String(chatid), Math.floor(Date.now()/1000))
    if (rules){
        myCache.set("started"+chatid, true)
        return true;
    }
    else {
        myCache.set("started"+chatid, false)
        return false;
    }
}

const validate = (chat: any, language_code?: string): groupSettings=> {
    if (!hasStarted(chat.id)){
        let settings = defaultSettings;
        settings.channelID = String(chat.id)
        return settings;
    }
    var groupSettings : groupSettingsUnderspecified = myCache.get(chat.id)
    if (!groupSettings){
        const rules = getRule(db, 'telegram', String(chat.id), Math.floor(Date.now()/1000))
        groupSettings = getGroupSettings(db, 'telegram', String(chat.id))
        groupSettings.rules = rules.rules
        myCache.set(chat.id, groupSettings)
    }
    const fullSettings = {
        lang: groupSettings?.lang ?? defaultSettings.lang,
        rules: groupSettings?.rules ?? defaultSettings.rules,
        channelID: chat.is_forum? String(chat.id): (groupSettings?.channelID ?? String(chat.id)),
        greeting_mode: groupSettings?.greeting_mode ?? defaultSettings.greeting_mode,
        admin_reportable: groupSettings?.admin_reportable ?? defaultSettings.admin_reportable,
        captcha: groupSettings?.captcha ?? defaultSettings.captcha,
        enforcement: groupSettings?.enforcement ?? defaultSettings.enforcement,
        thread_id_rules: groupSettings?.thread_id_rules ?? defaultSettings.thread_id_rules,
        thread_id_welcome: groupSettings?.thread_id_welcome ?? defaultSettings.thread_id_rules,
        thread_id_notifications: groupSettings?.thread_id_notifications ?? defaultSettings.thread_id_notifications,
        federation_id: groupSettings?.federation_id ?? defaultSettings.federation_id,
        federation_id_following: groupSettings?.federation_id_following ?? defaultSettings.federation_id_following
    }
    checkMigration(fullSettings, chat)

    console.log(fullSettings);
    return fullSettings
}

const checkMigration = async (groupSettings: groupSettings, chat: any): Promise<groupSettings> => {
    if (chat.is_forum && !groupSettings.thread_id_notifications){ // turn topics on
        try{
            const threads = await start.topicMode(queue, db, bot, groupSettings, chat);
            if(!threads)
                return;
            queue.add(async () => {try{await bot.sendMessage(chat.id, langJson[groupSettings.lang].index.topic, {messsage_thread_id: groupSettings.thread_id_notifications})}catch{}})
            groupSettings.thread_id_rules = threads[0]
            groupSettings.thread_id_notifications = threads[1]
            groupSettings.channelID = String(chat.id)
            myCache.set(chat.id, groupSettings)
        } catch(e){
            try{
                queue.add(async () => {try{await bot.sendMessage(chat.id, langJson[groupSettings.lang].index.topicError, {messsage_thread_id: groupSettings.thread_id_notifications})}catch{}})
            } catch(e){
                console.log(e)
            }
            console.log(e)
        }
    }
    return groupSettings
}

console.log('Telegram bot ready...');