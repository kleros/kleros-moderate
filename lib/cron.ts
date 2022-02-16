require('dotenv').config()
const ModeratorBot = require('node-telegram-bot-api');
import {getDisputedBans, setBan} from "./db";
import request from "graphql-request";
import {BigNumber} from "ethers";

(async ()=> {
    const bot = new ModeratorBot(process.env.BOT_TOKEN, {polling: false});

    const bans = {};

    (await getDisputedBans()).forEach((ban) => {
        bans[ban.question_id] = ban;
    });

    const query = `{
  questions(
    where: { 
        id_in: ${JSON.stringify(Object.keys(bans))},
        answer_not: null
    }
  ) {
    id
    answer
    finalize_ts
  }
}`;

    const result = await request(
        'https://api.thegraph.com/subgraphs/name/rodsouto/telegram-moderator-bot',
        query
    )

    for (const question of result.questions) {

        const answer = BigNumber.from(question.answer);

        if (!answer.eq(0) && !answer.eq(1)) {
            // "Invalid" or "Answered too soon"
            // TODO: what should we do?
            continue;
        }

        const latestBanState = answer.toNumber();

        const ban = bans[question.id];

        if (latestBanState !== ban.active) {

            const finalized = question.finalize_ts <= Math.ceil(+new Date() / 1000);

            console.log(
                `${latestBanState ? 'ban' : 'unban'}: ${question.id} for ${ban.app_type} - group ${ban.app_group_id} - user ${ban.app_user_id}`
            );

            if (latestBanState === 1) {
                // ban
                await setBan(question.id, true, finalized);

                if (ban.app_type === 'telegram') {
                    // @ts-ignore
                    await bot.banChatMember(ban.app_group_id, ban.app_user_id, {revoke_messages: false});
                } else {
                    console.error(`Invalid app_type: ${ban.app_type}`);
                }

            } else {
                // unban
                await setBan(question.id, false, finalized);

                if (ban.app_type === 'telegram') {
                    // @ts-ignore
                    await bot.unbanChatMember(ban.app_group_id, ban.app_user_id, {only_if_banned: true});
                } else {
                    console.error(`Invalid app_type: ${ban.app_type}`);
                }
            }
        }
    }
})()