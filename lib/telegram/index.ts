require('dotenv').config()
import * as TelegramBot from "node-telegram-bot-api";
import * as getAccount from "../../lib/telegram/commands/getAccount";
import * as setRulesCommand from "../../lib/telegram/commands/setRules";
import * as getRules from "../../lib/telegram/commands/getRules";
import * as report from "../../lib/telegram/commands/report";
import * as welcome from "../../lib/telegram/commands/welcome";
import * as toggleWelcome from "../../lib/telegram/commands/toggleWelcome";
import * as greeting from "../../lib/telegram/commands/greeting";
import * as socialConsensus from "../../lib/telegram/commands/socialConsensus";
import * as addEvidence from "../../lib/telegram/commands/addEvidence";
import * as leaveFed from "../../lib/telegram/commands/leavefed";
import * as joinFed from "../../lib/telegram/commands/joinfed";
import * as start from "../../lib/telegram/commands/start";
import * as setLanguage from "../../lib/telegram/commands/setLanguage";
import * as setChannel from "../../lib/telegram/commands/setChannel";
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/lang.json";
import {groupSettings, groupSettingsUnderspecified} from "../../types";
import {openDb, getGroupSettings, getRule, eraseThreadID} from "../db";

const Web3 = require('web3')
const _batchedSend = require('web3-batched-send')
const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
const batchedSend = _batchedSend(
    web3, 
    process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS,
    process.env.PRIVATE_KEY,
    20000 // The debounce timeout period in milliseconds in which transactions are batched.
  )
  const defaultSettings: groupSettings = {
    lang: 'en',
    rules: langJson['en'].defaultRules,
    channelID: '',
    greeting_mode: false,
    thread_id_rules: '',
    thread_id_welcome: '',
    thread_id_notifications: ''
}
const ModeratorBot = require('node-telegram-bot-api');
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: true, testEnvironment: false});
//bot.
var botId: number; 
const db = openDb();
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 900, checkperiod: 1200 } );
// Throttling

bot.on("my_chat_member", async function(myChatMember: any) {
    try{
        if(throttled(myChatMember.from.id) || myChatMember.chat.is_forum)
            return
        const settings = validate(myChatMember.chat);

        if(myChatMember.chat.type === "channel"){
            try{
                bot.sendMessage(myChatMember.chat.id, `The channel id is <code>${myChatMember.chat.id}</code>`, {parse_mode: "HTML"});
            } catch(e) {
                console.log(e)
            }
            return;
        } else if (myChatMember.chat.type === "supergroup")
            welcome.callback(settings, bot, myChatMember);
        else if (myChatMember.chat.type === "private")
            return
        else
            try{
                bot.sendVideo(myChatMember.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: "Group is not a supergroup. Please promote me to an admin."});
            } catch(e){
                console.log(e)
            }
    } catch(e){
        console.log("Welcome error." + e);
    }
});

bot.on("new_chat_members", async function (chatMemberUpdated: TelegramBot.ChatMemberUpdated) {
    if(!hasStarted(chatMemberUpdated.chat.id)||throttled(chatMemberUpdated.from.id) )
        return;
    const settings = validate(chatMemberUpdated.chat);
    if (chatMemberUpdated.chat.type !== "supergroup")
        return;
    if (settings.greeting_mode)
        await greeting.callback(bot, settings, chatMemberUpdated);        
});

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    if(!hasStarted(callbackQuery.message.chat.id)||throttled(callbackQuery.from.id))
        return;
    const settings = validate(callbackQuery.message.chat);
    const rawCalldata = callbackQuery.data;
    const calldata = rawCalldata.split('|');
    try{
        if (Number(calldata[0]) === 0){ // set language
            if (callbackQuery.from.id !== Number(calldata[1]))
                return;
            bot.deleteMessage(callbackQuery.message.chat.id, String(callbackQuery.message.message_id))
            setLanguage.setLanguageConfirm(db, bot, settings, callbackQuery.data, callbackQuery.message);
        } else if (Number(calldata[0]) === 1){ // add evidence
            if (callbackQuery.from.id !== Number(calldata[1]))
                return;
            // handle addevidence callback
        } else
            await socialConsensus.callback(db, settings, bot, callbackQuery, batchedSend);
    } catch(e){
        console.log("Callback Query Error" + e);
    }
  });

const commands: {regexp: RegExp, callback: any}[] = [
    getAccount,
    setRulesCommand,
    getRules,    
    report,
    toggleWelcome,
    start,
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
            if(throttled(msg.from.id) || msg.chat.type !== "supergroup")
                return
            const groupSettings = validate(msg.chat);
            if (command === start){
                if (hasStarted(msg.chat.id)){
                    try{
                        bot.sendMessage(msg.chat.id, "Susie is already moderating this community.", msg.chat.is_forum? {message_thread_id: msg.message_thread_id} : {})
                        return
                    } catch(e){
                        console.log(e)
                    }
                }
            } else if(!hasStarted(msg.chat.id)){
                return;
            }

            try{
                if (!botId)
                    botId = (await bot.getMe()).id;
            } catch(e){
                console.log(e)
            }

            if (adminOnlyCommands.indexOf(command)!==-1){
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
                    bot.sendMessage(msg.chat.id, langJson[groupSettings.lang].errorAdminOnly, msg.chat.is_forum? {message_thread_id: msg.message_thread_id}: {})
                    return;
                }
            }

            // todo success bool return val, to not always delete settings
            command.callback(db, groupSettings, bot, botId, msg, match,batchedSend);
            if (command === setLanguage || command === setRulesCommand || command === setChannel || command === toggleWelcome || command === start)
                myCache.del(msg.chat.id)
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
        return defaultSettings;
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
        thread_id_rules: groupSettings?.thread_id_rules ?? defaultSettings.thread_id_rules,
        thread_id_welcome: groupSettings?.thread_id_welcome ?? defaultSettings.thread_id_rules,
        thread_id_notifications: groupSettings?.thread_id_notifications ?? defaultSettings.thread_id_notifications
    }
    console.log(fullSettings);
    return fullSettings
}
/*
const checkMigration = async (groupSettings: groupSettings, chat: any): Promise<groupSettings> => {
    await bot.sendMessage(chat.id, "Started topic mode", {messsage_thread_id: groupSettings.thread_id_notifications})
    if (chat.is_forum && !groupSettings.thread_id_notifications){ // turn topics on
        try{
            const threads = await start.topicMode(db, bot, groupSettings, String(chat.id));
            groupSettings.thread_id_rules = threads[0]
            groupSettings.thread_id_notifications = threads[1]
            groupSettings.channelID = String(chat.id)
            myCache.set(chat.id, groupSettings)
        } catch(e){
            console.log(e)
        }
    }
    return groupSettings
}*/

console.log('Telegram bot ready...');