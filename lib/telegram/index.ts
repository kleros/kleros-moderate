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
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/lang.json";

const ModeratorBot = require('node-telegram-bot-api');
const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: true});

//const whitelist = ['-780089934'];

bot.on("my_chat_member", async function(myChatMember: TelegramBot.ChatMemberUpdated) {
    //if (!whitelist.includes(String(myChatMember.chat.id))){
    //    await bot.sendMessage(myChatMember.chat.id, `The hosted Kleros Moderate service is in beta. This chat id ${myChatMember.chat.id} is not whitelisted. Submit an [interest form](https://forms.gle/3Yteu5YFTZoWGhXv7) to get whitelisted, or self-host the [bot](https://github.com/kleros/kleros-moderate).`, {parse_mode: 'Markdown'});
    //    return;
    //}
    try {
        if (myChatMember.new_chat_member?.status === "administrator" && myChatMember.old_chat_member?.status === "member" ) {
            await bot.sendMessage(myChatMember.chat.id, '/setrules https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf');
            await setRules('telegram', String(myChatMember.chat.id), 'https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf', new Date().getTime()/1000);
            await bot.sendMessage(myChatMember.chat.id, `The Kleros Moderation Community Guidelines apply as the default rules. Crafting precise policies can be challenging, if you are certain in setting a new policy, you can set new rules with /setrules [url] or /setrules [reply to message].

*Make sure to setup a bot account (to pay for txn fees) with /newaccount.*

Optional, for public groups, set the chat invite url with /setinviteurl [url] e.g. /setinviteurl https://t.me/groupInviteUrl.

By default, only admins can report and add evidence. To allow all users to report and add evidence, use /togglepermissions.`, {parse_mode: 'Markdown'});
        } else if (myChatMember.new_chat_member?.status === "member" && myChatMember.old_chat_member?.status === "left" ){
            await bot.sendMessage(myChatMember.chat.id, 'Please make sure to enable all of the admin rights for the bot.');
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