require('dotenv').config()
import {CommandCallback} from "../../types";
import * as TelegramBot from "node-telegram-bot-api";
import * as newAccount from "../../lib/telegram/commands/newAccount";
import * as setAccount from "../../lib/telegram/commands/setAccount";
import * as setInviteUrl from "../../lib/telegram/commands/setInviteUrl";
import * as getAccount from "../../lib/telegram/commands/getAccount";
import * as setRulesCommand from "../../lib/telegram/commands/setRules";
import {setRules} from "../db";
import * as getRules from "../../lib/telegram/commands/getRules";
import * as report from "../../lib/telegram/commands/report";
import * as addEvidence from "../../lib/telegram/commands/addEvidence";
import * as setLanguage from "../../lib/telegram/commands/setLanguage";
import * as togglePermissions from "../../lib/telegram/commands/togglePermissions";
import * as getPermissions from "../../lib/telegram/commands/getPermissions";
import langJson from "./assets/lang.json";

const ModeratorBot = require('node-telegram-bot-api');
const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: true});
var flag = true; // hack to prevent duplicate messages

bot.on("my_chat_member", async function(myChatMember: TelegramBot.ChatMemberUpdated) {
    try {
        if (myChatMember.new_chat_member?.status === "administrator") {
            await bot.sendMessage(myChatMember.chat.id, '/setrules https://ipfs.kleros.io/ipfs/QmNvhZTNu3vAV43VNfQFKWrUYJ78oZgLhiZje78hWZoTLS/Kleros%20Moderate%20Community%20Guideline.pdf');
            await setRules('telegram', String(myChatMember.chat.id), 'https://ipfs.kleros.io/ipfs/QmNvhZTNu3vAV43VNfQFKWrUYJ78oZgLhiZje78hWZoTLS/Kleros%20Moderate%20Community%20Guideline.pdf', new Date().getTime()/1000);
            await bot.sendMessage(myChatMember.chat.id, `The Kleros Moderation Community Guidelines apply as the default rules. Crafting precise policies can be challenging, if you are certain in setting a new policy, you can set new rules with /setrules [url] or /setrules [reply to message].

Make sure to setup a bot account (to pay for txn fees) with /newaccount, and (optionally) set the chat invite url with /setinviteurl [url] e.g. /setinviteurl https://t.me/groupInviteUrl.

By default, only admins can report and add evidence. To allow all users to report and add evidence, use /togglePermissions.`);
            flag = true;

        } else if (flag){
            await bot.sendMessage(myChatMember.chat.id, 'Please make sure to enable all of the admin rights for the bot and set the group type to public.');
            flag = false;
        }
    } catch (error) {
        console.log(error);   
    }
});

const commands: {regexp: RegExp, callback: CommandCallback}[] = [
    newAccount,
    setAccount,
    getAccount,
    setInviteUrl,
    setRulesCommand,
    getRules,    
    report,
    addEvidence,
    setLanguage,
    togglePermissions,
    getPermissions
];

commands.forEach((command) => {
    bot.onText(
        command.regexp,
        (msg: TelegramBot.Message, match: string[]) => {
            command.callback(bot, msg, match)
        }
    )
})

console.log('Telegram bot ready...');