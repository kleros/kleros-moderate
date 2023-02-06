# Kleros Moderate

The Kleros Moderate service uses a Telegram bot to provide Kleros dispute resolution to Telegram communities. The architecture is based on the battle tested [Reality.eth X Kleros integration](https://kleros.gitbook.io/docs/integrations/types-of-integrations/1.-dispute-resolution-integration-plan/channel-partners/how-to-use-reality.eth-+-kleros-as-an-oracle) and uses solid cryptoeconomics for fair and transparent moderation.

Currently Telegram is supported, with Discord planned.

The bot can be self-hosted, or to use the bot instance that is hosted by the Kleros Cooperative, please apply to [join the beta](https://forms.gle/3Yteu5YFTZoWGhXv7). 

## Installation

Copy `.env.dist` to `.env` and configure the telegram API key.

## Create sqlite database

`yarn create-db`

## Start bot

`yarn start-telegram-bot`

## pm2

### Installation

`yarn global add pm2`

### Commands

```
yarn pm2:start
yarn pm2:stop-all
yarn pm2:delete-all
```


## Telegram Commands

Command | Description | Group Admin | Normal user
--- | --- | --- | ---
/getaccount | Returns the bot address of the current chat | ✅ | ✅
/setrules | `[by reply/username/id]`  Set chat rules from the quoted message | ✅ | ❌
/setrules [url] | Set chat rules from the specified url | ✅ | ❌
/rules | Get chat rules | ✅ | ✅
/report | `[by reply/username/id]`  Reports a user | ✅ | ✅
/evidence [questionId] | `[by reply/username/id]` Adds the quoted message as evidence to the arbitrator of `questionId` | ✅ | ✅

### Attribution

Thanks to @rodsouto and @fnanni-0 for starting an initial [version](https://github.com/rodsouto/kleros-moderator-bot) of this project for telegram.
