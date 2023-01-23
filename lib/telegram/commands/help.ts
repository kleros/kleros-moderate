import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/langNew.json";
import { groupSettings } from "../../../types";

/*
 * /help
 */
const regexp = /\/help/

const helpgnosis = (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const lang_code = msg?.from?.language_code
    try{
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[lang_code].help.Gnosis1,{parse_mode: 'Markdown', disable_web_page_preview: true})}catch{}})
    } catch(e){
        console.log(e)
    }
}

const helpnotifications = (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const lang_code = msg?.from?.language_code
    try{
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[lang_code].help.Notifications1,{parse_mode: 'Markdown', disable_web_page_preview: true})}catch{}})
    //queue.add(async () => {try{await bot.sendVideo(msg.chat.id, `https://ipfs.kleros.io/ipfs/QmaWKFxR8TNzWW1xDuzXe4XFE5wCFJVuFP6AKCQ3LRAQqB/Screen%20Recording%202022-12-13%20at%209.19.17%20PM(1).mp4`));
    } catch(e){
        console.log(e)
    }
}


const callback = (queue: any, db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    const lang_code = msg?.from?.language_code === "es" ? "es" : "en"

    const opts = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: langJson[lang_code].help.Greeting,
                        callback_data: `3|greeting`
                    }, {
                        text: langJson[lang_code].help.Language,
                        callback_data: `3|language`
                    }, {
                        text: langJson[lang_code].help.Topics,
                        callback_data: `3|topics`
                    }
                ],
                [
                    {
                        text: langJson[lang_code].help.Evidence,
                        callback_data: `3|addevidence`
                    }, {
                        text: langJson[lang_code].help.Report,
                        callback_data: `3|report`
                    }, {
                        text: langJson[lang_code].help.Rules,
                        callback_data: `3|rules`
                    }
                ],
                [
                    {
                        text: langJson[lang_code].help.Court,
                        callback_data: `3|court`
                    }, {
                        text: langJson[lang_code].help.Lawyer,
                        callback_data: `3|lawyer`
                    }, {
                        text: langJson[lang_code].help.Privacy,
                        callback_data: `3|open`
                    }
                ],[
                    {
                        text: langJson[lang_code].help.Notifications,
                        callback_data: `3|notifications`
                    }, {
                        text: langJson[lang_code].help.Federations,
                        callback_data: `3|federation`
                    }, {
                        text: langJson[lang_code].help.Gnosis,
                        callback_data: `3|web2.5`
                    }
                ]
            ]
        }
    }

    if (msg.chat.type !== "private"){
        const opts = msg.chat.is_forum? {
            message_thread_id: msg.message_thread_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                [
                    {
                        text: langJson[lang_code].help.DM,
                        url: `https://t.me/${process.env.BOT_USERNAME}?start=help`
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
                        text: langJson[lang_code].help.DM,
                        url: `https://t.me/${process.env.BOT_USERNAME}?start=help`
                    }
                ]
                ]
            }
        }
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[lang_code].help.DM2, opts)}catch{}});        
        return;
    } else
        queue.add(async () => {try{await bot.sendMessage(msg.chat.id, langJson[lang_code].help.help,opts)}catch{}});        
}

const respond = (queue: any, settings: groupSettings, bot: any, helpType: string, callbackQuery: TelegramBot.CallbackQuery) => {
    const lang_code = callbackQuery?.from?.language_code

    const optsResponse = {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    };
    try{
        if (helpType !== 'back'){
            queue.add(async () => {try{await bot.editMessageReplyMarkup({ inline_keyboard: [[
                {
                    text: 'back',
                    callback_data: `3|back`
                }
            ]]}, optsResponse)}catch{}});
        } else {
            queue.add(async () => {try{await bot.editMessageReplyMarkup({
                inline_keyboard: [
                    [
                        {
                            text: langJson[lang_code].help.Greeting,
                            callback_data: `3|greeting`
                        }, {
                            text: langJson[lang_code].help.Language,
                            callback_data: `3|language`
                        }, {
                            text: langJson[lang_code].help.Topics,
                            callback_data: `3|topics`
                        }
                    ],
                    [
                        {
                            text: langJson[lang_code].help.Evidence,
                            callback_data: `3|addevidence`
                        }, {
                            text: langJson[lang_code].help.Report,
                            callback_data: `3|report`
                        }, {
                            text: langJson[lang_code].help.Rules,
                            callback_data: `3|rules`
                        }
                    ],
                    [
                        {
                            text: langJson[lang_code].help.Court,
                            callback_data: `3|court`
                        }, {
                            text: langJson[lang_code].help.Lawyer,
                            callback_data: `3|lawyer`
                        }, {
                            text: langJson[lang_code].help.Privacy,
                            callback_data: `3|open`
                        }
                    ],[
                        {
                            text: langJson[lang_code].help.Notifications,
                            callback_data: `3|notifications`
                        }, {
                            text: langJson[lang_code].help.Federations,
                            callback_data: `3|federation`
                        }, {
                            text: langJson[lang_code].help.Gnosis,
                            callback_data: `3|web2.5`
                        }
                    ]
                ]}, optsResponse)}catch{}});
            queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.help,optsResponse)}catch{}})
        }
        switch(helpType){
            case 'greeting': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Greeting1,optsResponse)}catch{}})
                break;
            }
            case 'language': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Language1,optsResponse)}catch{}})
                break;
            }
            case 'topics': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Topics1,optsResponse)}catch{}})
                break;
            }
            case 'addevidence': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Evidence1,optsResponse)}catch{}})
                break;
            }
            case 'report': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Report1,optsResponse)}catch{}})
                break;
            }
            case 'rules': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Rules1,optsResponse)}catch{}})
                break;
            }
            case 'notifications': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Notifications1,optsResponse)}catch{}})
                break;
            }
            case 'federation': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Federations1,optsResponse)}catch{}})
                break;
            }
            case 'web2.5': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Gnosis1
                ,optsResponse)}catch{}})
                break;
            }
            case 'court': {
                //https://ipfs.kleros.io/ipfs/QmZwVBdfALRWbjCLtLNSq9YceADCtP96hfPkg3Y6f6xWJk/KlerosModerate.png
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Court1,optsResponse)}catch{}})
                break;
            }
            case 'lawyer': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Lawyer1,optsResponse)}catch{}})
                break;
            }
            case 'open': {
                queue.add(async () => {try{await bot.editMessageText(langJson[lang_code].help.Privacy1
                ,optsResponse)}catch{}})
                break;
                //Susie is [open source](https://github.com/kleros/kleros-moderate). Feel free to make an issue, feature request, bug report, comments, suggests, PRs, forks, etc : )
                //Susie is hosted. You can self-host Susie. A raspberry pi or an old laptop are sufficient to keep your own instance of Susie online. To learn more about self-hosting, guide *coming soon*.
            }
            default: {
                break;
            }
        }
    } catch(e){
        console.log('help response error '+e);
    }
}

//Important: I moderate groups by crowd-sourcing community input with Gnosis Chain. Make sure you or some community members get DAI on Gnosis Chain to participate actively.

export {regexp, callback, respond, helpgnosis, helpnotifications};