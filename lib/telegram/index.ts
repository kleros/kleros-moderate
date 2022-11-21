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
import * as start from "../../lib/telegram/commands/start";
import * as setLanguage from "../../lib/telegram/commands/setLanguage";
import * as setChannel from "../../lib/telegram/commands/setChannel";
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/lang.json";
import {groupSettings} from "../../types";
import {openDb, getGroupSettings, eraseThreadID, dbstart, dbstarted} from "../db";
import {Wallet} from "@ethersproject/wallet";

const Web3 = require('web3')
const _batchedSend = require('web3-batched-send')
const web3 = new Web3(process.env.WEB3_PROVIDER_URL)
const batchedSend = _batchedSend(
    web3, 
    process.env.TRANSACTION_BATCHER_CONTRACT_ADDRESS,
    process.env.PRIVATE_KEY,
    20000 // The debounce timeout period in milliseconds in which transactions are batched.
  )
var botAddress: string;
const ModeratorBot = require('node-telegram-bot-api');
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: true, testEnvironment: false});
//bot.
var botId: number; 
const db = openDb();
const started : Map<number, boolean> = new Map();
const settings : Map<number, groupSettings> = new Map();
// Throttling
const msgCounters : Map<number, number> = new Map();
const lastMsgEpochs : Map<number, number> = new Map();

bot.on("my_chat_member", async function(myChatMember: any) {
    try{
        console.log(myChatMember)
        if(myChatMember.chat.is_forum){
            return;
        }
        const settings = validate(myChatMember.chat);

        if(myChatMember.chat.type === "channel"){
            try{
                bot.sendMessage(myChatMember.chat.id, "The channel id is " + myChatMember.chat.id);
            } catch(e) {
                console.log(e)
            }
            return;
        }
        await welcome.callback(settings, bot, myChatMember);
    } catch(e){
        console.log("Welcome error." + e);
    }
});

bot.on("new_chat_members", async function (chatMemberUpdated: any) {
    console.log('new chat member')
    const settings = validate(chatMemberUpdated.chat);
    if(!started.has(chatMemberUpdated.chat.id))
        return;
    if (chatMemberUpdated.chat.type === "channel"){
        return;
    }

    if (settings.greeting_mode)
        await greeting.callback(bot, settings, chatMemberUpdated);        
});

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    try{
        if(!botAddress)
            botAddress = (await new Wallet(process.env.PRIVATE_KEY)).address;
        if(!started.has(callbackQuery.message.chat.id))
            return;
            const settings = validate(callbackQuery.message.chat);

            if (callbackQuery.data.length < 3){
            const user = await bot.getChatMember(callbackQuery.message.chat.id, String(callbackQuery.from.id))
            if (user.status !== "creator" && user.status !== "administrator")
                return;
            bot.deleteMessage(callbackQuery.message.chat.id, String(callbackQuery.message.message_id))
            setLanguage.setLanguageConfirm(db, bot, settings, callbackQuery.data, callbackQuery.message);
        }
        else 
            await socialConsensus.callback(db, settings, botAddress, bot, callbackQuery, batchedSend);
    } catch(error){
        console.log(error);
        console.log("Social Consensus Error");
    }
  });

const commands: {regexp: RegExp, callback: any}[] = [
    getAccount,
    setRulesCommand,
    getRules,    
    report,
    toggleWelcome,
    start,
    setChannel,
    addEvidence,
    getReports,
    setLanguage,
];

commands.forEach((command) => {
    bot.onText(
        command.regexp,
        async (msg: any, match: string[]) => {  
            const groupSettings = validate(msg.chat);

            if (command === start){
                if (started.has(msg.chat.id)){
                    try{
                        bot.sendMessage(msg.chat.id, "Susie is already moderating this community.", msg.chat.is_forum? {message_thread_id: msg.message_thread_id} : {})
                        return
                    } catch(e){
                        console.log(e)
                    }
                }
            } else if(!started.has(msg.chat.id)){
                return;
            }

            if (!botId)
            botId = (await bot.getMe()).id;

            command.callback(db, groupSettings, bot, botId, msg, match,batchedSend);
            if (command === setLanguage || command === setRulesCommand || command === setChannel || command === toggleWelcome || command === start)
                settings.delete(msg.chat.id)
        }
    )
})

const throttling = (chat: TelegramBot.Chat): boolean => {
    const lastEpoch = lastMsgEpochs.get(chat.id) ?? 0;
    const currentEpoch = Math.floor(Date.now()/1000) % 60;
    if (currentEpoch > lastEpoch){
        lastMsgEpochs.set(chat.id, currentEpoch);
        msgCounters.set(chat.id,1);
    }
    const msgCounter = msgCounters.get(chat.id);
    if (msgCounter > 20)
        return false;
    msgCounters.set(chat.id,msgCounter+1);
    return true;

}

const validate = (chat: any): groupSettings=> {
    var groupSettings : groupSettings = settings.get(chat.id)
    if (!groupSettings){
        groupSettings = getGroupSettings(db, 'telegram', String(chat.id))
        console.log ('groupSettings fetched from db');
        console.log(groupSettings)
        if(groupSettings){
            settings.set(chat.id, groupSettings)
            started.set(chat.id, true)
        }
    }
    /*
    if (groupSettings && !chat.is_forum && groupSettings.thread_id_notifications){ // turn topics off
        eraseThreadID(db, 'telegram', String(chat.id))
        groupSettings.thread_id_notifications = ''
        groupSettings.thread_id_rules = ''
        groupSettings.thread_id_welcome = ''
        settings.set(chat.id, groupSettings)
    }*/
    const fullSettings = {
        lang: groupSettings?.lang ?? 'en',
        rules: groupSettings?.rules ?? langJson['en'].defaultRules,
        channelID: groupSettings?.channelID ?? String(chat.id),
        greeting_mode: groupSettings?.greeting_mode ?? false,
        thread_id_rules: groupSettings?.thread_id_rules ?? '',
        thread_id_welcome: groupSettings?.thread_id_welcome ?? '',
        thread_id_notifications: groupSettings?.thread_id_notifications ?? ''
    }
    console.log(fullSettings);
    return fullSettings
}

const checkMigration = async (groupSettings: groupSettings, chat: any): Promise<groupSettings> => {
    if (chat.is_forum && !groupSettings.thread_id_notifications){ // turn topics on
        try{
            const threads = await start.topicMode(db, bot, groupSettings, String(chat.id));
            groupSettings.thread_id_rules = threads[0]
            groupSettings.thread_id_notifications = threads[1]
            groupSettings.channelID = String(chat.id)
            settings.set(chat.id, groupSettings)
        } catch(e){
            console.log(e)
        }
    }
    return groupSettings
}

console.log('Telegram bot ready...');