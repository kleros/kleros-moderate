import * as TelegramBot from "node-telegram-bot-api";
import {setRules, setPermissions, getRule} from "../../db";

/*
 * Welcome Message
 */

const callback = async (bot: TelegramBot, myChatMember: TelegramBot.ChatMemberUpdated) => {
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
}

export {callback};