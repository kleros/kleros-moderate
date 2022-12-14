import * as TelegramBot from "node-telegram-bot-api";
import langJson from "../assets/lang.json";
import { groupSettings } from "../../../types";

/*
 * /help
 */
const regexp = /\/help/

const helpgnosis = (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        bot.sendMessage(msg.chat.id, `⛓️ *Gnosis Chain* ⛓️

Susie uses [xDAI](https://docs.gnosischain.com/about/tokens/xdai), a stable coin, on [Gnosis Chain](https://www.gnosis.io/). Don't know what that means? It means Susie uses a cheap and fast decentralized tool to coordinate moderation fairly and transparently.

What's crypto? I heard about that on the news, I don't want anything to do with crypto. No problem, you can ask for help from freelance moderators in @KlerosModerateGuildOfJustice.

Don't have any xDAI on Gnosis Chain? No problem, there's a (cheap, fast) [bridge](https://bridge.connext.network/?receivingChainId=100&receivingAssetId=0x0000000000000000000000000000000000000000) for that. 

Don't have any cryptocurrency? No problem, there's a convinient [fiat on-ramp](https://www.mtpelerin.com/buy-xdai) (credit card or bank transfer) to buy DAI on Gnosis Chain.

Need help adding the Gnosis Chain network to your wallet? Don't worry, there's a [guide](https://docs.gnosischain.com/tools/wallets/metamask#2-configure) for that.

Need more help? Don't worry, there's a @SusieSupport group for that`
                        ,{parse_mode: 'Markdown', disable_web_page_preview: true})
    } catch(e){
        console.log(e)
    }
}

const helpnotifications = (db: any, settings: groupSettings, bot: any, botId: number, msg: any) => {
    try{
        bot.sendMessage(msg.chat.id, `🔔 *Notifications* 🔔

Susie sends notifications about moderation actions and report updates. These notifications are restricted to a separate chat in topic mode. In regular Telegram groups, notifications can be sent to a notification channel to avoid cluttering the main chat.

How to enable notification channels:

1. Make a channel
2. Add Susie
3. Susie will send a channel ID
4. Use that channel ID to set notifications with /setchannel in the original group

*User commands*:
- /notifications: Returns current notification channel
*Admin commands*:
- /setchannel <channelID>: Sets the notification channel to the specified channel id`
                        ,{parse_mode: 'Markdown', disable_web_page_preview: true})
    bot.sendVideo(msg.chat.id, `https://ipfs.kleros.io/ipfs/QmaWKFxR8TNzWW1xDuzXe4XFE5wCFJVuFP6AKCQ3LRAQqB/Screen%20Recording%202022-12-13%20at%209.19.17%20PM(1).mp4`);
    } catch(e){
        console.log(e)
    }
}


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
                        text: 'Get Help (DM)',
                        url: `https://t.me/${process.env.BOT_USERNAME}?start=help`
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
                            text: '📄 Rules',
                            callback_data: `3|rules`
                        }
                    ],
                    [
                        {
                            text: '⚖️ Court',
                            callback_data: `3|court`
                        }, {
                            text: '🧑‍⚖️ Lawyer',
                            callback_data: `3|lawyer`
                        }, {
                            text: '✨ Open',
                            callback_data: `3|open`
                        }
                    ],[
                        {
                            text: '🔔 Notifications',
                            callback_data: `3|notifications`
                        }, {
                            text: '🌐 Federation',
                            callback_data: `3|federation`
                        }, {
                            text: '⛓️ Gnosis',
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

When a new person joins, or after 5 minutes, the previous welcome messages will get deleted\n\nCaptchas remain for up to 5 minutes. If a user forgets to respond within 5 minutes, they should rejoin the group to prompt a new captcha.
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
- /addevidence <by reply> <evidencegroup>\n\nReply to a message to add it as evidence`
                ,optsResponse)
                break;
            }
            case 'report': {
                bot.editMessageText(`🚨 *Report* 🚨

As groups grow, so do their moderation problems. We're all busy people who don't have time to monitor groups 24/7. Users often complain about admin abuse and have no recourse. Who moderates the moderator?

Presenting [Kleros Moderate](https://kleros.io/moderate), a crowd-sourced content moderation tool using [Reality.eth](https://reality.eth.limo/) and [Kleros](https://kleros.gitbook.io/docs/) on [Gnosis Chain](https://www.gnosis.io/).

When users are reported, a question is created on Reality.Eth asking 'did the user break the rules?'. The question can be answered yes/no with a bond (5 DAI). Successful reports result in penalties,

- 1st Report: 1 day ban
- 2nd Report: 1 week ban
- 3rd Report: 1 year ban

Answers to reports can be disputed, creating a case in the Kleros court. Refer to the [docs](https://shotaro.gitbook.io/kleros-moderate/products/moderate/susie-or-kleros-moderator) to learn more.

*User commands*:
- /report <by reply>: Reply to a message to report it
- /getreports: Returns active reports
- /getreports <by reply>: Returns active reports for user`
                ,optsResponse)
                break;
            }
            case 'rules': {
                bot.editMessageText(`⚖️ *Rules* ⚖️

The Kleros Moderate Community Guidelines apply as the [default rules]((https://ipfs.kleros.io/ipfs/QmYYcNfEYLtxPM8fof4wf9Tqj7gBGMDMmNnBqZKR1zSczX/Kleros%20Moderate%20Community%20Guidelines%20v1.pdf)). Crafting precise policies can be challenging, if you are certain in setting a new policy, you can set new rules with /setrules

*User commands*:
- /rules: Returns current rules
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
- /notifications: Returns current notification channel
*Admin commands*:
- /setchannel <channelID>: Sets the notification channel to the specified channel id`
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
                bot.editMessageText(`⛓️ *Gnosis Chain* ⛓️

Susie uses [xDAI](https://docs.gnosischain.com/about/tokens/xdai), a stable coin, on [Gnosis Chain](https://www.gnosis.io/). Don't know what that means? It means Susie uses a cheap and fast public ledger to coordinate moderation fairly and transparently.

Don't have any xDAI on Gnosis Chain? No problem, there's a (cheap, fast) [bridge](https://bridge.connext.network/?receivingChainId=100&receivingAssetId=0x0000000000000000000000000000000000000000) for that. 

What's crypto? I heard about that on the news, I don't want anything to do with crypto. No problem, you can ask for help from freelance moderators in @KlerosModerateGuildOfJustice.

Don't have any cryptocurrency? No problem, there's a convinient [fiat on-ramp](https://www.mtpelerin.com/buy-xdai) (credit card or bank transfer) to buy DAI on Gnosis Chain.

Need help adding the Gnosis Chain network to your wallet? Don't worry, there's a [guide](https://docs.gnosischain.com/tools/wallets/metamask#2-configure) for that.

Need more help? Don't worry, there's a @SusieSupport group for that`
                ,optsResponse)
                break;
            }
            case 'court': {
                bot.editMessageText(`⚖️ *Court* ⚖️

Disputes are resolved by the [Kleros Court](https://kleros.gitbook.io/docs/) with a randomly selected jury. If the jury made a mistake, the case can be appealed, drawing a larger pool of random jurors and providing an opportunity to provide more context, analysis, and arguments.

If you would like a chance to serve as a jury member, buy PNK ([Gnosis Chain](https://swapr.eth.link/#/swap?chainId=100) or [Mainnet](https://app.uniswap.org/#/swap?outputCurrency=0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d&inputCurrency=ETH)) and [stake](https://court.kleros.io/) in the curation subcourt of the Kleros Court on Gnosis Chain.

To discuss the merits of a dispute, see @klerosjuror.`
                ,optsResponse)
                break;
            }
            case 'lawyer': {
                bot.editMessageText(`🧑‍⚖️ *Find a Lawyer* 🧑‍⚖️

Disputes over reported behavior can be complicated and nuanced. Often, disputes resolve on the merits of the message and rules alone. In some cases, disputes are better resolved by presenting the court with analysis and arguments.

If you would like to offer your services as a lawyer or solicit services, please join this [group](https://t.me/+9fvGGkGfSZ1hZDBk).
                
`
                ,optsResponse)
                break;
            }
            case 'open': {
                bot.editMessageText(`✨ *Open Source* ✨

Susie is [open source](https://github.com/kleros/kleros-moderate). Feel free to make an issue, feature request, bug report, comments, suggests, PRs, forks, etc : )
`
                ,optsResponse)
                break;
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

const message = `*Help*\n\nHi! My name is Susie. I'm a [Kleros Moderate](https://kleros.io/moderate) bot, here to help you manage your groups!
    
I have lots of handy features, such as crowd-sourced user reporting.
    
Helpful commands:
    - /start: Starts me. You've probably already used this.
    - /help: Sends this message and I'll tell you more about myself.
    
Select a feature to learn more. My [documentation](https://shotaro.gitbook.io/kleros-moderate/products/moderate/susie-or-kleros-moderator) is also helpful, or ask a question in @SusieSupport.`;

//Important: I moderate groups by crowd-sourcing community input with Gnosis Chain. Make sure you or some community members get DAI on Gnosis Chain to participate actively.

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
                    text: '📄 Rules',
                    callback_data: `3|rules`
                }
            ],
            [
                {
                    text: '⚖️ Court',
                    callback_data: `3|court`
                }, {
                    text: '🧑‍⚖️ Lawyer',
                    callback_data: `3|lawyer`
                }, {
                    text: '✨ Open',
                    callback_data: `3|open`
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
                    text: '⛓️ Gnosis',
                    callback_data: `3|web2.5`
                }
            ]
        ]
    }
}

export {regexp, callback, respond, helpgnosis, helpnotifications};