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
/newaccount | Creates a new bot account | ✅ | ❌
/setaccount [address]| Sets the bot address of the current chat | ✅ | ❌
/getaccount | Returns the bot address of the current chat | ✅ | ✅
/setrules | `[by reply/username/id]`  Set chat rules from the quoted message | ✅ | ❌
/setrules [url] | Set chat rules from the specified url | ✅ | ❌
/getrules | Get chat rules | ✅ | ✅
/report | `[by reply/username/id]`  Reports a user | ✅ | ❌
/addevidence [questionId] | `[by reply/username/id]` Adds the quoted message as evidence to the arbitrator of `questionId` | ✅ | ✅

### Attribution

Thanks to @rodsouto and @fnanni-0 for starting an initial [version](https://github.com/rodsouto/kleros-moderator-bot) of this project for telegram.
