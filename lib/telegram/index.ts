require('dotenv').config()
import * as TelegramBot from "node-telegram-bot-api";
import * as getAccount from "../../lib/telegram/commands/getAccount";
import * as setRulesCommand from "../../lib/telegram/commands/setRules";
import * as getRules from "../../lib/telegram/commands/getRules";
import * as report from "../../lib/telegram/commands/report";
import * as welcome from "../../lib/telegram/commands/welcome";
import * as greeting from "../../lib/telegram/commands/greeting";
import * as socialConsensus from "../../lib/telegram/commands/socialConsensus";
import * as addEvidence from "../../lib/telegram/commands/addEvidence";
import * as setLanguage from "../../lib/telegram/commands/setLanguage";
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/lang.json";
import {openDb, getLang, setLang, getRule, setRules} from "../db";

const ModeratorBot = require('node-telegram-bot-api');
const bot: TelegramBot = new ModeratorBot(process.env.BOT_TOKEN, {polling: true});
const db = openDb();
const whitelist = ['-1001711792724', '-1001612151117', '-1001151472172', '-1001585259197'];
let warnMsg : Map<number, [number, number]> = new Map();
let lang : Map<number, string> = new Map();

bot.on("my_chat_member", async function(myChatMember: TelegramBot.ChatMemberUpdated) {
    try{
        if (!await validate(myChatMember.chat.id))
            return;   
        const language = lang?.get(myChatMember.chat.id);
        await welcome.callback(db, language, bot, myChatMember);
    } catch(error){
        console.log(error);
        console.log("Welcome error.");
    }
});

bot.on("new_chat_members", async function (msg: any) {
    try{
        if (!await validate(msg.chat.id))
            return;     
        const language = lang?.get(msg.chat.id);
        await greeting.callback(db, language, bot, msg);
    } catch(error){
        console.log(error);
        console.log("New chat member error.");
    }
});

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    try{
        if (!await validate(callbackQuery.message.chat.id))
            return;
        const language = lang?.get(callbackQuery.message.chat.id);
        await socialConsensus.callback(db, language, bot, callbackQuery);
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
    addEvidence,
    getReports,
    setLanguage,
];

commands.forEach((command) => {
    bot.onText(
        command.regexp,
        async (msg: TelegramBot.Message, match: string[]) => {      
            try{
                if (!await validate(msg.chat.id))
                    return;
                const language = lang?.get(msg.chat.id);
                command.callback(db, language, bot, msg, match);
                if(command == setLanguage){
                    var currentLang = getLang(db, 'telegram', String(msg.chat.id));
                    if (currentLang !== language){
                        lang.set(msg.chat.id, language);
                    }
                }

            } catch (err){
                console.log(`${command.regexp} command error.`);
                console.log(err);
            }
        }
    )
})


const validate = async (chatId: number): Promise<boolean> => {
    var language = lang?.get(chatId);
    if (!language){
        var currentLang = getLang(db, 'telegram', String(chatId));
        if (!langJson[currentLang]) {
            setLang(db, 'telegram', String(chatId),'en');
            currentLang = 'en';
        }
        if (currentLang !== language){
            language = currentLang;
            lang.set(chatId, language);
        }
    }

    const botUser = await bot.getChatMember(chatId, String((await bot.getMe()).id));
    if (botUser.can_send_messages == false){
        return false;
    } else if (botUser.status != "administrator" || botUser.can_restrict_members != true || botUser.can_invite_users != true){
        const previousMsgId = warnMsg?.get(chatId);
        if (previousMsgId){
            bot.deleteMessage(chatId, String(previousMsgId[0]));
            bot.deleteMessage(chatId, String(previousMsgId[1]));
        }
        const msg1 = await bot.sendVideo(chatId, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4');
        const msg2 = await bot.sendMessage(chatId, langJson[language].errorAdminRights);
        warnMsg.set(chatId, [msg1.message_id, msg2.message_id]);

        return false;
    } else
        return true;
}

const whitelisted = async (chatId: number): Promise<boolean> => {
    const botUser = await bot.getChatMember(chatId, String((await bot.getMe()).id));
    if (botUser.can_send_messages == false){
        return false;
    } else if (!whitelist.includes(String(chatId))){
        await bot.sendMessage(chatId, `The hosted Kleros Moderate service is in beta. This chat id ${chatId} is not whitelisted. Submit an [interest form](https://forms.gle/3Yteu5YFTZoWGhXv7) to get whitelisted, or self-host the [bot](https://github.com/kleros/kleros-moderate).`, {parse_mode: 'Markdown'});
        return false;
    } else
        return true;
 }

console.log('Telegram bot ready...');