require('dotenv').config()
import {CommandCallback} from "../../types";
import * as TelegramBot from "node-telegram-bot-api";
import * as newAccount from "../../lib/telegram/commands/newAccount";
import * as setInviteUrl from "../../lib/telegram/commands/setInviteUrl";
import * as getAccount from "../../lib/telegram/commands/getAccount";
import * as setRulesCommand from "../../lib/telegram/commands/setRules";
import * as getRules from "../../lib/telegram/commands/getRules";
import * as report from "../../lib/telegram/commands/report";
import * as welcome from "../../lib/telegram/commands/welcome";
import * as greeting from "../../lib/telegram/commands/greeting";
import * as socialConsensus from "../../lib/telegram/commands/socialConsensus";
import * as addEvidence from "../../lib/telegram/commands/addEvidence";
import * as setLanguage from "../../lib/telegram/commands/setLanguage";
import * as togglePermissions from "../../lib/telegram/commands/togglePermissions";
import * as getPermissions from "../../lib/telegram/commands/getPermissions";
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/lang.json";

const ModeratorBot = require('node-telegram-bot-api');
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: true});

//const whitelist = ['-780089934'];

bot.on("my_chat_member", async function(myChatMember: TelegramBot.ChatMemberUpdated) {
    await welcome.callback(bot, myChatMember);
});

bot.on("new_chat_members", async function (msg: TelegramBot.Message) {
    await greeting.callback(bot, msg);
});

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    socialConsensus.callback(bot, callbackQuery);
  });

const commands: {regexp: RegExp, callback: CommandCallback}[] = [
    newAccount,
    getAccount,
    setInviteUrl,
    setRulesCommand,
    getRules,    
    report,
    addEvidence,
    getReports,
    setLanguage,
    togglePermissions,
    getPermissions
];

commands.forEach((command) => {
    bot.onText(
        command.regexp,
        (msg: TelegramBot.Message, match: string[]) => {
            
            //if (!whitelist.includes(String(msg.chat.id)))
            //    return;            
            command.callback(bot, msg, match)
        }
    )
})

console.log('Telegram bot ready...');