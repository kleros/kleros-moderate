import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";

/*
 * /getrules
 */
const regexp = /\/help/

const callback = (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    if (msg.chat.type !== "private"){
        const opts = msg.chat.is_forum? {
            message_thread_id: msg.message_thread_id,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                [
                    {
                        text: 'Get Help (DM)',
                        url: `tg://user?id=${botId}&start=help`
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
                        url: `https://t.me/KlerosModeratorBot?start=help`
                        //url: `tg://user?id=${botId}&start=help`
                    }
                ]
                ]
            }
        }
        bot.sendMessage(msg.chat.id, `DM me for help : )`, opts);        
        return;
    }
    bot.sendMessage(msg.chat.id, message,opts);        
}

const respond = (settings: groupSettings, bot: any, helpType: string, callbackQuery: TelegramBot.CallbackQuery) => {
    const optsResponse = {
        chat_id: callbackQuery.message.chat.id,
        message_id: callbackQuery.message.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    };
    try{
        if (helpType !== 'back'){
            bot.editMessageReplyMarkup({ inline_keyboard: [[
                {
                    text: 'back',
                    callback_data: `3|back`
                }
            ]]}, optsResponse)
        } else {
            bot.editMessageReplyMarkup({
                inline_keyboard: [
                    [
                        {
                            text: '👋 Greeting',
                            callback_data: `3|greeting`
                        }, {
                            text: '🗣️ Language',
                            callback_data: `3|language`
                        }, {
                            text: 'ℹ️ Topics',
                            callback_data: `3|topics`
                        }
                    ],
                    [
                        {
                            text: '🔍 Evidence',
                            callback_data: `3|addevidence`
                        }, {
                            text: '🚨 Report',
                            callback_data: `3|report`
                        }, {
                            text: '⚖️ Rules',
                            callback_data: `3|rules`
                        }
                    ],
                    [
                        {
                            text: '🔔 Notifications',
                            callback_data: `3|notifications`
                        }, {
                            text: '🌐 Federation',
                            callback_data: `3|federation`
                        }, {
                            text: '⬨ Web 2.5',
                            callback_data: `3|web2.5`
                        }
                    ]
                ]}, optsResponse)
            bot.editMessageText(message,optsResponse)
        }
        switch(helpType){
            case 'greeting': {
                bot.editMessageText(`👋 *Greeting* 👋

Welcome your members with a greeting informing them of the group rules
                
*Admin commands:*
- /welcome : Toggles on/off welcomes messages.
- /captcha : Toggles on/off rules captcha.

When a new person joins, or after 5 minutes, the previous welcome messages will get deleted, but the captchas will remain for up to 5 minutes.
                `,optsResponse)
                break;
            }
            case 'language': {
                bot.editMessageText(`🗣️ *Languages* 🗣️
                
Susie's replies can be changed to one of the languages below.

- EN (English)
- ES (Español) *soon*

*Admin commands*:
- /setlang <language>: Set your preferred language.

Content moderation requires a nuanced understanding of context and language. Setting a language not only changes Susie's responses, but also specifies language skilled jurors.

Please make sure to set the appropriate language for your community for effective moderation.`
                ,optsResponse)
                break;
            }
            case 'topics': {
                bot.editMessageText(`ℹ️ *Topics* ℹ️
                
Topics allow large (>200 member) groups to focus discussion in dedicated **topic** chats. Susie supports topics. When changing a group to topic mode, you will need to /start Susie again.

*Admin commands*:
- /start: Start topic mode.`
                ,optsResponse)
                break;
            }
            case 'addevidence': {
                bot.editMessageText(`🔍 *Evidence* 🔍

To prevent important messages from deletion, pre-emptively, messages can be saved as evidence.

*User commands*:
- /addevidence <by reply> <evidencegroup>: Reply to a message to add it as evidence`
                ,optsResponse)
                break;
            }
            case 'report': {
                bot.editMessageText(`🚨 *Report* 🚨

As groups grow, so do their moderation problems. We're all busy people who don't have time to monitor groups 24/7. Often users dispute moderation actions by admins and have no recourse. Who moderates the moderator?

Presenting Kleros Moderate, a crowd-sourced content moderation tool using Reality.eth and Kleros.

When users are reported, a question is created on Reality.Eth asking 'did the user break the rules?'. The question can be answered yes/no with a bond (5 DAI). Successful reports result in penalties (1 day ban, 1 week ban, 1 year ban).

Answers to reports can be disputed, creating a case in the Kleros court. Refer to the [docs](https://shotaro.gitbook.io/kleros-moderate/products/moderate/susie-or-kleros-moderator) to learn more.

*User commands*:
- /report <by reply>: Reply to a message to report it
- /getreports: Returns active reports
- /getreports <by reply>: Returns active reports`
                ,optsResponse)
                break;
            }
            case 'rules': {
                bot.editMessageText(`⚖️ *Rules* ⚖️

The [Kleros Moderate Community Guidelines](https://ipfs.kleros.io/ipfs/QmYYcNfEYLtxPM8fof4wf9Tqj7gBGMDMmNnBqZKR1zSczX/Kleros%20Moderate%20Community%20Guidelines%20v1.pdf) apply as the default rules. Crafting precise policies can be challenging, if you are certain in setting a new policy, you can set new rules with /setrules

*User commands*:
- /getrules: Returns current rules
*Admin commands*:
- /setrules <url>: Sets the rules to the the url
- /setrules <by reply>: Sets the rules to a replied message`
                ,optsResponse)
                break;
            }
            case 'notifications': {
                bot.editMessageText(`🔔 *Notifications* 🔔

Susie sends notifications about moderation actions and report updates. These notifications are restricted to a separate chat in topic mode. In regular Telegram groups, notifications can be sent to a notification channel to avoid cluttering the main chat.

How to enable notification channels:

1. Make a channel
2. Add Susie
3. Susie will send a channel ID
4. Use that channel ID to set notifications with /setchannel in the original group

*User commands*:
- /getchannel: Returns current notification channel
*Admin commands*:
- /setchannel <channelID>: Sets the rules to the the url`
                ,optsResponse)
                break;
            }
            case 'federation': {
                bot.editMessageText(`🌐 *Federations*

Moderating a single group is hard, but managing multiple is even harder? Do you have to ban spammers manually, in all your groups?

No more! With federations, Susie can enforce a ban on a user in all federate groups.

*User commands*:
- /getfed: Returns current federation
*Admin commands*:
- /newfed: Creates a federation
- /joinfed: Joins the current group to a Federation`
                ,optsResponse)
                break;
            }
            case 'web2.5': {
                bot.editMessageText(`⬨ *Web 2.5* ⬨

Susie uses web3 (Reality.eth and Kleros) with *skin in the game* mechanics to moderate a web2 platform (Telegram). Susie's inner workings are [opensource](https://github.com/kleros/kleros-moderate). Feel free to make an issue, feature request, bug report, comments, suggests, PRs, forks, etc : )

This instance of Susie is hosted as a service. You can self-host the bot, a raspberry pi or an old laptop are sufficient to keep your own instance of Susie online. To learn more about self-hosting, see this [guide](https://github.com/kleros/kleros-moderate/self-hosting.md).`
                ,optsResponse)
                break;
            }
            default: {
                break;
            }
        }
    } catch(e){
        console.log('help response error '+e);
    }
}

const message = `*Help*\n\nHi! My name is Susie. I'm a [Kleros Moderate](https://kleros.io/moderate) bot, here to help you manage your groups!
    
I have lots of handy features, such as crowd-sourced user reporting.
    
Helpful commands:
    - /start: Starts me. You've probably already used this.
    - /help: Sends this message and I'll tell you more about myself.
    
Select a feature to learn more. My [documentation](https://shotaro.gitbook.io/kleros-moderate/products/moderate/susie-or-kleros-moderator) is also helpful, or ask a question in @SusieSupport.`;

const opts = {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: {
        inline_keyboard: [
            [
                {
                    text: '👋 Greeting',
                    callback_data: `3|greeting`
                }, {
                    text: '🗣️ Language',
                    callback_data: `3|language`
                }, {
                    text: 'ℹ️ Topics',
                    callback_data: `3|topics`
                }
            ],
            [
                {
                    text: '🔍 Evidence',
                    callback_data: `3|addevidence`
                }, {
                    text: '🚨 Report',
                    callback_data: `3|report`
                }, {
                    text: '⚖️ Rules',
                    callback_data: `3|rules`
                }
            ],
            [
                {
                    text: '🔔 Notifications',
                    callback_data: `3|notifications`
                }, {
                    text: '🌐 Federation',
                    callback_data: `3|federation`
                }, {
                    text: '⬨ Web 2.5',
                    callback_data: `3|web2.5`
                }
            ]
        ]
    }
}

export {regexp, callback, respond};