import * as TelegramBot from "node-telegram-bot-api";
import {getRule} from "../../db";
import langJson from "../assets/langNew.json";
import { getUsersWithQuestionsNotFinalized } from "../../db";
import { groupSettings } from "../../../types";

/*
 * /addevidencehelp
 */
const regexp = /\/addevidencehelp/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const groupId = getUsersWithQuestionsNotFinalized(db, 'telegram', msg.text.substring(22))
    if (!groupId || groupId.length === 0){
        queue.add(() => {try{bot.sendMessage(msg.chat.id, langJson[settings.lang].info.noevidence)}catch{}});      
        return  
    }
    var inline_keyboard_evidence = []
    var inline_keyboard_evidence_cursor = [];
    groupId.forEach((element, index) => {
        if (index % 3 === 0){
            if(inline_keyboard_evidence_cursor.length > 0){
                inline_keyboard_evidence.push(inline_keyboard_evidence_cursor)
            }
            inline_keyboard_evidence_cursor = []
        }
        inline_keyboard_evidence_cursor.push({
            text: element.username,
            callback_data: '4|'+msg.text.substring(22)+'|'+element.user_id
        });
    });
    inline_keyboard_evidence.push(inline_keyboard_evidence_cursor)

    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: inline_keyboard_evidence
        }
    }
    queue.add(() => {try{bot.sendMessage(msg.chat.id, langJson[settings.lang].info.evidence,opts)}catch{}});      
}

export {regexp, callback};