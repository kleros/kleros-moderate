import * as TelegramBot from "node-telegram-bot-api";
import {groupSettings} from "../../../types";
import {setMultilangGroup} from "../../db";
import langJson from "../assets/langNew.json";
const NodeCache = require( "node-cache" );
const myCache = new NodeCache( { stdTTL: 90, checkperiod: 120 } );

/*
 * /multilang [lang code] [invite url]
 */
const regexp = /\/multilang/
const regexpFull = /\/multilang (.+)/

const callback = async (queue: any, db: any, settings: groupSettings, bot: TelegramBot, botId: string, msg: any, match: string[], batchedSend: any) => {
    try {
        const newmatch = msg.text.match(regexpFull);
        if (!newmatch || newmatch.length < 2){
            const resp = await queue.add(async () => {try{const val = await bot.sendMessage(msg.chat.id, langJson[settings.lang].multilang.error, {parse_mode: "Markdown", disable_web_page_preview: true})
            return val}catch{}});
            if(!resp)
            return
            myCache.set(resp.message_id, msg.chat.id)
            return; 
        }
        console.log(newmatch)
        const lang_sibling = settings.lang === 'en' ? 'es' : 'en'
        setMultilangGroup(db, 'telegram', String(msg.chat.id), newmatch[1], lang_sibling);
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[settings.lang].multilang[lang_sibling], {parse_mode: "Markdown", disable_web_page_preview: true})}catch{}});
    } catch (error) {
        console.log(error);
    }
}

export {regexp, callback};