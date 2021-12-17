import * as TelegramBot from "node-telegram-bot-api";

type CommandCallback = (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => void;