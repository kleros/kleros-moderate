import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {setFederation,getFederationName} from "../../db";
import langJson from "../assets/lang.json";

/*
 * /joinfed
 */
const regexp = /\/fedinfo\s?(.+)?/

const callback = async (db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        if (msg.chat.type !== "private"){
            const opts = msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'Get Help (DM)',
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=newfed`
                        }
                    ]
                    ]
                }
            }: {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [
                        {
                            text: 'Get Help (DM)',
                            url: `https://t.me/${process.env.BOT_USERNAME}?start=newfed`
                        }
                    ]
                    ]
                }
            }
            bot.sendMessage(msg.chat.id, `DM me for help with your federation : )`, opts);        
            return;
        }
        const name = getFederationName(db, 'telegram',msg.from.id);
        console.log(name)
        if (name){
            bot.sendMessage(settings.channelID, `Your federation *${name}* with id \`${msg.from.id}\` already exists.`,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
            return
        }
        if (!match[1]){
            bot.sendMessage(settings.channelID, `Please name your federation eg: \`/newfed My New Federation\``,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
            return
        } else{
            const name = match[1].substring(0,65)
            setFederation(db, 'telegram',name, msg.from.id)
            bot.sendMessage(settings.channelID, `Your new federation is called *${match[1].substring(0,65)}* with id ${msg.from.id}. You can add groups to your federation by sending \`/joinfed ${msg.from.id}\` in each group.`,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
        }
        //joinFederation(db, 'telegram', String(msg.chat.id), String(msg.from.id))
        //bot.sendMessage(msg.chat.id, 'Your group has joined the federation.', msg.chat.is_forum? {message_thread_id: msg.message_thread_id}:{})
    } catch(e){
        console.log(e)
    }
}

export {regexp, callback};