import * as TelegramBot from "node-telegram-bot-api";
import {getRule} from "../../db";
import langJson from "../assets/lang.json";
import { getUsersWithQuestionsNotFinalized } from "../../db";
import { groupSettings } from "../../../types";

/*
 * /addevidencehelp
 */
const regexp = /\/addevidencehelp/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const groupId = getUsersWithQuestionsNotFinalized(db, 'telegram', msg.text.substring(22))
    if (!groupId || groupId.length === 0){
        queue.add(() => bot.sendMessage(msg.chat.id, `There are no reports to add evidence to in your group.`));      
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
    queue.add(() => bot.sendMessage(msg.chat.id, `Let me help you find the report you want to add evidence to. Which user is the report about?`,opts));        
}

export {regexp, callback};