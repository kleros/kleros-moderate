## Installation

Copy `.env.dist` to `.env` and configure the telegram API key.

## Create sqlite database

`yarn create-db`

## Start bot

`yarn start-bot`

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
/addmod [username] | Promotes a user to moderator | ✅ | ❌
/removemod [username] | Demotes a user from moderator | ✅ | ❌
/ban | `[by reply/username/id]`  Bans a user | ✅ | ❌
/addevidence [questionId] | `[by reply/username/id]` Adds the quoted message as evidence to the arbitrator of `questionId` | ✅ | ✅
/setlanguage | Sets the current chat language | ✅ | ❌
