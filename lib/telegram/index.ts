require('dotenv').config()
import * as TelegramBot from "node-telegram-bot-api";
import * as getAccount from "../../lib/telegram/commands/getAccount";
import * as setRulesCommand from "../../lib/telegram/commands/setRules";
import * as getRules from "../../lib/telegram/commands/getRules";
import * as addEvidenceHelp from "../../lib/telegram/commands/addEvidenceHelp";
import * as report from "../../lib/telegram/commands/report";
import * as welcome from "../../lib/telegram/commands/welcome";
import * as toggleWelcome from "../../lib/telegram/commands/toggleWelcome";
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
import * as getChannel from "../../lib/telegram/commands/getChannel";
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/lang.json";
import {groupSettings, groupSettingsUnderspecified} from "../../types";
import {openDb, getGroupSettings, getRule, getReportsUserInfo,getFederatedBanHistoryBase, getFederatedFollowingBanHistoryBase, getLocalBanHistoryBase, eraseThreadID} from "../db";

const Web3 = require('web3')
const _batchedSend = require('web3-batched-send')
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
    thread_id_rules: '',
    thread_id_welcome: '',
    thread_id_notifications: '',
    federation_id: '',
    federation_id_following: ''
}
const ModeratorBot = require('node-telegram-bot-api');
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: true, testEnvironment: true});
//bot.
var botId: number; 
const db = openDb();
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
// Throttling

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
  }

bot.on("my_chat_member", async function(myChatMember: any) {
    try{
        if(throttled(myChatMember.from.id) || myChatMember.chat.is_forum)
            return
        const settings = validate(myChatMember.chat);

        if(myChatMember.chat.type === "channel"){
            await delay(2000);
            if( myChatMember.new_chat_member.status === "administrator"){
                try{
                    bot.sendMessage(myChatMember.chat.id, `The channel id is <code>${myChatMember.chat.id}</code>`, {parse_mode: "HTML"});
                } catch(e) {
                    console.log('channel id msg error'+e);
                }
            }
            return;
        } else if (myChatMember.chat.type === "supergroup")
            welcome.callback(settings, bot, myChatMember);
        else if (myChatMember.chat.type === "private")
            return
        else
            try{
                bot.sendVideo(myChatMember.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: "Hi! I'm Susie, a moderation and group management bot. Please promote me to an admin then try to /start me to unlock my full potential."});
            } catch(e){
                console.log(e)
            }
    } catch(e){
        console.log("Welcome error." + e);
    }
});

bot.on("new_chat_members", async function (chatMemberUpdated: TelegramBot.ChatMemberUpdated) {
    if(!hasStarted(chatMemberUpdated.chat.id)||throttled(chatMemberUpdated.from.id)||chatMemberUpdated.chat.type !== "supergroup")
        return;    
    const settings = validate(chatMemberUpdated.chat);
    let calculateHistory = []
    if (settings.federation_id)
        calculateHistory = getFederatedBanHistoryBase(db, 'telegram', String(chatMemberUpdated.from.id),String(chatMemberUpdated.chat.id),false)
    else if (settings.federation_id_following)
        calculateHistory = getFederatedFollowingBanHistoryBase(db, 'telegram', String(chatMemberUpdated.from.id),String(chatMemberUpdated.chat.id),settings.federation_id_following,false)
    else 
        calculateHistory = getLocalBanHistoryBase(db, 'telegram', String(chatMemberUpdated.from.id),String(chatMemberUpdated.chat.id),false)

    if (calculateHistory)
        return

    if(settings.captcha || settings.greeting_mode)
        greeting.callback(bot, settings, chatMemberUpdated);        
});

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    const calldata = callbackQuery.data.split('|');
    if (calldata.length < 2)
        return
    if((!hasStarted(callbackQuery.message.chat.id) && callbackQuery.message.chat.type == "supergroup")||throttled(callbackQuery.from.id))
        return;
    const settings = validate(callbackQuery.message.chat);
    if (Number(calldata[0]) === 0){ // set language
        if (callbackQuery.from.id !== Number(calldata[1]))
            return;
        setLanguage.setLanguageConfirm(db, bot, settings, calldata[2], callbackQuery.message);
    } else if (Number(calldata[0]) === 1){ // add evidence
        if (callbackQuery.from.id !== Number(calldata[1]))
            return;
        // handle addevidence callback
    } else if (Number(calldata[0]) === 2){ // report confirmations
        socialConsensus.callback(db, settings, bot, callbackQuery, batchedSend);
    } else if (Number(calldata[0]) === 3){ // report confirmations
        help.respond(settings, bot, calldata[1], callbackQuery);
    } else if (Number(calldata[0]) === 4){
        const reports = getReportsUserInfo(db, 'telegram', calldata[1], calldata[2]);
        var reportMessage: string = `To add evidence, reply to the message you want saved in the original chat with the evidence index.\n\n`
        reports.forEach( (report) => {
            const MsgLink = 'https://t.me/c/' + calldata[1].substring(4) + '/' + report.msg_id;
            reportMessage += `- [Message](${MsgLink}) ([${langJson[settings.lang].socialConsensus.consensus5}](${report.msgBackup})) [${langJson[settings.lang].getReports.reportMessage3}](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITY_ETH_V30}-${report.question_id}), \`/addevidence ${report.evidenceIndex}\` <context (optional)>\n`;
        });

        reportMessage +='\n eg. /addevidence 1 This message breaks the rules because xyz.'
        const optsResponse = {
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        };
        try{
            bot.editMessageReplyMarkup({inline_keyboard: [[]]}, optsResponse)
            bot.editMessageText(reportMessage , optsResponse);
        } catch (e){
            console.log(e)
        }
    } else if (Number(calldata[0]) === 5){
        if (callbackQuery.from.id !== Number(calldata[1]))
            return;
        const options = {can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: false, can_change_info: false, can_pin_messages: false};
        bot.restrictChatMember(callbackQuery.message.chat.id, callbackQuery.from.id, options);
        bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id)
    }
  });

const commands: {regexp: RegExp, callback: any}[] = [
    getAccount,
    setRulesCommand,
    getRules,    
    report,
    toggleWelcome,
    start,
    toggleCaptcha,
    help,
    newFed,
    getChannel,
    leaveFed,
    joinFed,
    setChannel,
    addEvidence,
    getReports,
    setLanguage,
];

const adminOnlyCommands = [joinFed, leaveFed, setLanguage, setChannel, toggleWelcome, start, setRulesCommand ]

commands.forEach((command) => {
    bot.onText(
        command.regexp,
        async (msg: any, match: string[]) => {  
            if(throttled(msg.from.id))
                return
            const groupSettings = validate(msg.chat);
            if(msg.chat.type === "private"){
                if (msg.text === '/start help'){
                    help.callback(db, groupSettings, bot, botId, msg);
                    return
                } else if(msg.text === '/start helpgnosis'){
                    help.helpgnosis(db, groupSettings, bot, botId, msg);
                    return
                } else if(msg.text === '/start helpnotifications'){
                    help.helpnotifications(db, groupSettings, bot, botId, msg);
                    return
                } else if (msg.text.substring(0,22) === '/start addevidencehelp'){
                    addEvidenceHelp.callback(db, groupSettings, bot, botId, msg);
                    return
                } else if (msg.text.substring(0,16) === '/start getreport'){
                    getReports.callback(db, groupSettings, bot, botId, msg);
                    return
                } else if (msg.text === '/start newfed' || msg.text.substring(0,7) === '/newfed'){
                    newFed.callback(db, groupSettings, bot, String(botId), msg, match);
                    return
                } else if (msg.text !== '/start' && msg.text != '/help' && msg.text !== '/start botstart')
                    return
            } else if(msg.chat.type !== "supergroup" && !(msg.chat.type === "group" && msg.text === '/help'))
                return
            if (command === start){
                if (hasStarted(msg.chat.id)){
                    try{
                        bot.sendMessage(msg.chat.id, "Susie is already moderating this community.", msg.chat.is_forum? {message_thread_id: msg.message_thread_id} : {})
                        return
                    } catch(e){
                        console.log(e)
                    }
                }
            } else if(!hasStarted(msg.chat.id) && command !== help){
                return;
            }

            try{
                if (!botId)
                    botId = (await bot.getMe()).id;
            } catch(e){
                console.log(e)
            }

            if (msg.chat.type !== "private" && adminOnlyCommands.indexOf(command)!==-1){
                var status = myCache.get("status"+msg.chat.id+msg.from.id)
                if (!status){
                    try{
                        status = (await bot.getChatMember(msg.chat.id, String(msg.from.id))).status;
                        myCache.set("status"+msg.chat.id+msg.from.id,status)
                    } catch(e){
                        console.log(e)
                        return;
                    }
                }
                if (!(status === 'creator' || status === 'administrator')) {
                    try{
                        bot.sendMessage(msg.chat.id, langJson[groupSettings.lang].errorAdminOnly, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                    } catch(e){
                        console.log(e)
                    }
                    return;
                }
            }

            // todo success bool return val, to not always delete settings
            command.callback(db, groupSettings, bot, botId, msg, match,batchedSend);
            if (command === setLanguage || command === setRulesCommand || command === setChannel || command === toggleWelcome || command === toggleCaptcha)
                myCache.del(msg.chat.id)
            if (command === start)
                myCache.del("started"+msg.chat.id)
        }
    )
})


const throttled = (userId: number): boolean => {
    const count = myCache.get(userId) ?? 1
    if (count >100)
        return true
    myCache.set(userId.toString(), count + 1)
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

const validate = (chat: any): groupSettings=> {
    if (!hasStarted(chat.id)){
        let settings = defaultSettings;
        settings.channelID = String(chat.id)
        return settings;
    }
    var groupSettings : groupSettingsUnderspecified = myCache.get(chat.id)
    if (!groupSettings){
        const rules = getRule(db, 'telegram', String(chat.id), Math.floor(Date.now()/1000))
        groupSettings = getGroupSettings(db, 'telegram', String(chat.id))
        groupSettings.rules = rules
        myCache.set(chat.id, groupSettings)
    }
    const fullSettings = {
        lang: groupSettings?.lang ?? defaultSettings.lang,
        rules: groupSettings?.rules ?? defaultSettings.rules,
        channelID: groupSettings?.channelID ?? String(chat.id),
        greeting_mode: groupSettings?.greeting_mode ?? defaultSettings.greeting_mode,
        admin_reportable: groupSettings?.admin_reportable ?? defaultSettings.admin_reportable,
        captcha: groupSettings?.captcha ?? defaultSettings.captcha,
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
            const threads = await start.topicMode(db, bot, groupSettings, chat);
            bot.sendMessage(chat.id, "Started topic mode", {messsage_thread_id: groupSettings.thread_id_notifications})
            groupSettings.thread_id_rules = threads[0]
            groupSettings.thread_id_notifications = threads[1]
            groupSettings.channelID = String(chat.id)
            myCache.set(chat.id, groupSettings)
        } catch(e){
            try{
                bot.sendMessage(chat.id, "Susie cannot manage groups in topic mode with out permission to manage topics. Please ask an admin to enable this permission to allow Susie to continue help moderating your community.", {messsage_thread_id: groupSettings.thread_id_notifications})
            } catch(e){
                console.log(e)
            }
            console.log(e)
        }
    }
    return groupSettings
}

console.log('Telegram bot ready...');