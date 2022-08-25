require('dotenv').config()
import {CommandCallback} from "../../types";
import * as TelegramBot from "node-telegram-bot-api";
import * as newAccount from "../../lib/telegram/commands/newAccount";
import * as setAccount from "../../lib/telegram/commands/setAccount";
import * as setInviteUrl from "../../lib/telegram/commands/setInviteUrl";
import * as getAccount from "../../lib/telegram/commands/getAccount";
import * as setRulesCommand from "../../lib/telegram/commands/setRules";
import {setRules, setPermissions, getAllowance, setAllowance, getReportRequest} from "../db";
import * as getRules from "../../lib/telegram/commands/getRules";
import * as report from "../../lib/telegram/commands/report";
import * as addEvidence from "../../lib/telegram/commands/addEvidence";
import * as setLanguage from "../../lib/telegram/commands/setLanguage";
import * as togglePermissions from "../../lib/telegram/commands/togglePermissions";
import * as getPermissions from "../../lib/telegram/commands/getPermissions";
import * as getReports from "../../lib/telegram/commands/getReports";
import langJson from "./assets/lang.json";
import { getRule, getQuestionId } from "../db";
import  {reportMsg} from "../../lib/telegram/commands/report";


const ModeratorBot = require('node-telegram-bot-api');
const bot: any = new ModeratorBot(process.env.BOT_TOKEN, {polling: true});

//const whitelist = ['-780089934'];

bot.on("my_chat_member", async function(myChatMember: TelegramBot.ChatMemberUpdated) {
    //if (!whitelist.includes(String(myChatMember.chat.id))){
    //    await bot.sendMessage(myChatMember.chat.id, `The hosted Kleros Moderate service is in beta. This chat id ${myChatMember.chat.id} is not whitelisted. Submit an [interest form](https://forms.gle/3Yteu5YFTZoWGhXv7) to get whitelisted, or self-host the [bot](https://github.com/kleros/kleros-moderate).`, {parse_mode: 'Markdown'});
    //    return;
    //}
    try {
        if (myChatMember.new_chat_member?.status === "administrator" && myChatMember.old_chat_member?.status === "member" ) {
            //await bot.sendMessage(myChatMember.chat.id, '/setrules https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf');
            const rules = await getRule('telegram', String(myChatMember.chat.id), Math.floor(Date.now()/1000));
            const defaultRules = 'https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf';

            if (!rules)
                await setRules('telegram', String(myChatMember.chat.id), defaultRules, new Date().getTime()/1000);

            await bot.sendMessage(myChatMember.chat.id, `Welcome, this group is moderated with [Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown"});
            await bot.sendMessage(myChatMember.chat.id, `Please make sure to follow the [community rules](${defaultRules}). Users who break the rules can be reported by replying to a message with the command '/report'.`, {parse_mode: "Markdown"});
            //The Kleros Moderation Community Guidelines apply as the default rules. Crafting precise policies can be challenging, if you are certain in setting a new policy, you can set new rules with /setrules [url] or /setrules [reply to message].
            //Optional, for public groups, set the chat invite url with /setinviteurl [url] e.g. /setinviteurl https://t.me/groupInviteUrl.
            //await bot.sendMessage(myChatMember.chat.id, `*Make sure to setup a bot account (to pay for txn fees) with /newaccount*.`, {parse_mode: 'Markdown'});
            await setPermissions('telegram', String(myChatMember.chat.id), true);

        } else if (myChatMember.new_chat_member?.status === "member" && myChatMember.old_chat_member?.status === "left" ){
            const rules = await getRule('telegram', String(myChatMember.chat.id), Math.floor(Date.now()/1000));
            const defaultRules = 'https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf';
            if (!rules)
                await setRules('telegram', String(myChatMember.chat.id), defaultRules, new Date().getTime()/1000);
            
            await bot.sendMessage(myChatMember.chat.id, 'Please make sure to enable all of the admin rights for the bot.');
        }
    } catch (error) {
        console.log(error);   
    }
});

bot.on("new_chat_members", async function (msg: TelegramBot.Message) {
    const defaultRules = 'https://ipfs.kleros.io/ipfs/QmeYuhtdsbyrpYa3tsRFTb92jcvUJNb2CJ2NdLE5fsRyAX/Kleros%20Moderate%20Community%20Guideline.pdf';

    const rules = await getRule('telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
    
    if (!rules)
        await setRules('telegram', String(msg.chat.id), defaultRules, new Date().getTime()/1000);

    await bot.sendMessage(msg.chat.id, `Welcome, this group is mediated with [Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown"});
    await bot.sendMessage(msg.chat.id, `Please make sure to follow the [community rules](${defaultRules}). Users who break the rules can be reported by replying to a message with the command '/report'.`, {parse_mode: "Markdown"});
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

// Handle callback queries
bot.on('callback_query', async function onCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
    const rawCalldata = callbackQuery.data;
    const calldata = rawCalldata.split('|');
    const match = callbackQuery.message.reply_markup.inline_keyboard[0][0].text;
    const msg = callbackQuery.message;
    const user = await bot.getChatMember(msg.chat.id, String(callbackQuery.from.id));
    const isAdmin = user.status === 'creator' || user.status === 'administrator';

    if (!isAdmin){
        if (callbackQuery.from.id == Number(calldata[1])) {
            return;
        }
    
        if (calldata.length > 2 && callbackQuery.from.id == Number(calldata[2])){
            return;
        }
        const reportAllowance = await getAllowance('telegram', String(msg.chat.id), String(msg.from.id));
        if ( reportAllowance === undefined ){
            setAllowance('telegram', String(msg.chat.id), String(msg.from.id), 2, 15, Math.ceil( new Date().getTime() / 1000));
        } else if ((Math.ceil( new Date().getTime() / 1000) < reportAllowance.timestamp_refresh + 28800) && reportAllowance.report_allowance == 0 ){
            return;
        } else{
            const newReportAllowance = reportAllowance.report_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800) - 1;
            const newEvidenceAllowance = reportAllowance.evidence_allowance + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*5;
            const newRefreshTimestamp = reportAllowance.timestamp_refresh + Math.floor((Math.ceil( new Date().getTime() / 1000) - reportAllowance.timestamp_refresh)/28800)*28800;
            setAllowance('telegram', String(msg.chat.id), String(msg.from.id), newReportAllowance, newEvidenceAllowance, newRefreshTimestamp);
        }
    }

    const newConfirmations = Number(match.substring(9,10)) + 1;

    const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Confirm ('+newConfirmations+'/3)',
                callback_data: rawCalldata+'|'+String(callbackQuery.from.id)
              }
            ]
          ]
        }
      };
      const reportRequest = await getReportRequest('telegram', String(msg.chat.id),calldata[0]);
      //todo proper rule chronology
      const rules = await getRule('telegram', String(msg.chat.id), Math.floor(Date.now()/1000));
      const msgLink = 'https://t.me/c/' + String(msg.chat.id).substring(4) + '/' + String(reportRequest.msg_id);

    if (newConfirmations > 2){
        const reportedQuestionId = await getQuestionId('telegram', String(msg.chat.id), reportRequest.user_id, String(reportRequest.msg_id));
        if (reportedQuestionId)
            await bot.sendMessage(msg.chat.id, `The message is already [reported](https://reality.eth.limo/app/#!/network/${process.env.CHAIN_ID}/question/${process.env.REALITITY_ETH_V30}-${reportedQuestionId})`, {parse_mode: 'Markdown'});
        else
            reportMsg(bot, msg, reportRequest.username, reportRequest.user_id, rules, reportRequest.msg_id, reportRequest.msgBackup);
        const optsFinal = {
            chat_id: msg.chat.id,
            message_id: msg.message_id,
          };
        bot.editMessageText('Report confirmed.', optsFinal);
    } else
        bot.editMessageText(`Reports require atleast 3 confirmations.\n\n Should ${reportRequest.username} (ID: ${reportRequest.user_id}) be reported for breaking the [rules](${rules}) due to conduct over this [message](${msgLink}) ([ipfs backup](${reportRequest.msgBackup}))?`, opts);
    //bot.sendMessage(msg.chat.id, "You have already confirmed");
  });

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