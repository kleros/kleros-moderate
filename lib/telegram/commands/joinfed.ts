import * as TelegramBot from "node-telegram-bot-api";
import { groupSettings } from "../../../types";
import {joinFederation,followFederation,getFederationName} from "../../db";
import langJson from "../assets/lang.json";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );
var myBot;

myCache.on("expired",function(key,value){
    myBot.deleteMessage(value, key);
    });

/*
 * /joinfed
 */
const regexp = /\/joinfed\s?(.+)?/

const callback = async (db: any, settings: groupSettings, bot: any, botId: string, msg: any, match: string[]) => {
    try{
        if (!match[1]){
            const resp = bot.sendMessage(settings.channelID, `Please specify a federation eg. \`/joinfed <federation_id>\`.`,msg.chat.is_forum? {
                message_thread_id: msg.message_thread_id,
                parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
            myCache.set(resp.message_id, msg.chat.id)
        } else{
            const name = getFederationName(db, 'telegram',String(Number(match[1])))
            if (!name){
                const resp = bot.sendMessage(settings.channelID, `Federation not found. The federation id of any group can be found by sending \`/fedinfo\` in a group.`,msg.chat.is_forum? {
                    message_thread_id: msg.message_thread_id,
                    parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
                myCache.set(resp.message_id, msg.chat.id)
                }
            else if (msg.from.id === match[1]){
                bot.sendMessage(settings.channelID, `Your group is now a member of the *${name}* Federation. Reputation extends through all member communities.`,msg.chat.is_forum? {message_thread_id: msg.message_thread_id,parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
                joinFederation(db, 'telegram', String(msg.chat.id), match[1])
            }
            else{
                bot.sendMessage(settings.channelID, `Your group is now a following of the *${name}* Federation. The reputation of users in groups of the federation extend to this group.`,msg.chat.is_forum? {message_thread_id: msg.message_thread_id,parse_mode: 'Markdown'}:{parse_mode: 'Markdown'});
                followFederation(db, 'telegram', String(msg.chat.id), match[1])
            }
        }
    } catch(e){
    console.log(e)
    }
}

export {regexp, callback};