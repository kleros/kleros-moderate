import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/langNew.json";
import { groupSettings } from "../../../types";
/*
 * /warnmode ?
 */
const regexp = /^\/warnmode/

const callback = async (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const opts = msg.chat.is_forum? {
        message_thread_id: msg.message_thread_id,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '0',
                        callback_data: `7|${msg.from.id}|0`
                    }, 
                    {
                        text: '1',
                        callback_data: `7|${msg.from.id}|1`
                    }, 
                    {
                        text: '2',
                        callback_data: `7|${msg.from.id}|2`
                    },
                    {
                        text: '3',
                        callback_data: `7|${msg.from.id}`+'|3'
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
                        text: '0',
                        callback_data: `7|${msg.from.id}|0`
                    }, 
                    {
                        text: '1',
                        callback_data: `7|${msg.from.id}|1`
                    }, 
                    {
                        text: '2',
                        callback_data: `7|${msg.from.id}|2`
                    },
                    {
                        text: '3',
                        callback_data: `7|${msg.from.id}`+'|3'
                    }
            ]
        ]
        }
    }
    console.log('yo')
    queue.add(async () => {try{await bot.sendMessage(msg.chat.id,langJson[settings.lang].warn,opts)}catch(e){console.log(e)}})
}

export {regexp, callback};