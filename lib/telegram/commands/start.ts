import * as TelegramBot from "node-telegram-bot-api";
import {setThreadID, getThreadIDNotifications, setRules} from "../../db";
import langJson from "../assets/lang.json";
import {groupSettings} from "../../../types";

/*
 * /start
 */
const regexp = /\/start/

const callback = async (db: any, settings: groupSettings, bot: any, botID: string, msg: any) => {
    // admin check
    try{
        const botUser = await bot.getChatMember(msg.chat.id, botID)
        if(botUser.status !== "administrator" || !botUser.can_restrict_members){
            bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', msg.chat.is_forum? {message_thread_id: msg.message_thread_id, caption: "Please give Susie full admin rights.\n\nThen try to /start community moderation again."} : {caption: "Please give Susie full admin rights.\n\nThen try to /start community moderation again."});
            return;
        }
        if (msg.chat.is_forum){
            if(!botUser.can_manage_topics){
                bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {message_thread_id: msg.message_thread_id, caption: "Must have can manage topics"});
                return;
            }
            const thread_ids = getThreadIDNotifications(db, 'telegram', String(msg.chat.id));
            if (thread_ids){
                bot.sendMessage(msg.chat.id, "Already started.", {message_thread_id: msg.message_thread_id});
            }
            await topicMode(db,bot,settings,String(msg.chat.id));
        }
        setRules(db, 'telegram', String(msg.chat.id), langJson[settings.lang].defaultRules, Math.floor(Date.now()/1000));
        bot.sendMessage(msg.chat.id, `Hi! I'm a Kleros Moderator. I help communities crowdsource moderation. If you need help, just DM me : )\n\n${langJson[settings.lang].defaultRulesMsg1}(${langJson[settings.lang].defaultRules}).`, msg.chat.is_forum? {parse_mode: "Markdown", message_thread_id: msg.message_thread_id}: {parse_mode: "Markdown"})
        return;
    } catch (e){
        try{
            if (msg.chat.is_forum){
                bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {message_thread_id: msg.message_thread_id, caption: "Must have can manage topics"});
            } else{
                bot.sendVideo(msg.chat.id, 'https://ipfs.kleros.io/ipfs/QmbnEeVzBjcAnnDKGYJrRo1Lx2FFnG62hYfqx4fLTqYKC7/guide.mp4', {caption: langJson[settings.lang].errorAdminRights+"Topics must be enabled"});
            }
        } catch (e){
            console.log(e)
        }
    }
}

const topicMode = async (db:any, bot: any, settings: groupSettings, chat_id: string): Promise<[string,string]> => {
        // tg bugging, won't display icon_color if set
        const topicRules = await bot.createForumTopic(chat_id, 'Rules', {icon_custom_emoji_id: '4929691942553387009'});
        const topicModeration = await bot.createForumTopic(chat_id, 'Moderation', {icon_custom_emoji_id: '4929336692923432961'});

        bot.sendMessage(settings.channelID, `Please refer to the moderation topic for notifications, and the rules topic for rules. `);
        bot.sendMessage(chat_id, `${langJson[settings.lang].defaultRulesMsg1alt}. ${langJson[settings.lang].defaultRulesMsg2}.`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id});
        //bot.sendMessage(chat_id, `${langJson[settings.lang].greeting2}(${settings.rules}). ${langJson[settings.lang].greeting3}`, {parse_mode: "Markdown", message_thread_id: topicRules.message_thread_id});
        bot.sendMessage(chat_id, `${langJson[settings.lang].greeting1}[Kleros Moderate](https://kleros.io/moderate/).`, {parse_mode: "Markdown", message_thread_id: topicModeration.message_thread_id});
        bot.closeForumTopic(chat_id, topicRules.message_thread_id)
        setThreadID(db,'telegram',chat_id,String(topicRules.message_thread_id), String(topicModeration.message_thread_id))
        return [topicRules.message_thread_id, topicModeration.message_thread_id]
}

export {regexp, callback, topicMode};