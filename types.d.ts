import * as TelegramBot from "node-telegram-bot-api";

type CommandCallback = (bot: TelegramBot, msg: TelegramBot.Message, match: string[]) => void;
interface groupSettings {
    lang: string;
    rules: string;
    channelID: string;
    thread_id_rules: string;
    thread_id_notifications: string;
    thread_id_welcome: string;
    greeting_mode: boolean;
    admin_reportable: boolean;
    captcha: boolean;
    federation_id: string;
    federation_id_following: string;
  }

  interface groupSettingsUnderspecified {
    lang: string | undefined;
    rules: string | undefined;
    channelID: string | undefined;
    thread_id_rules: string | undefined;
    thread_id_notifications: string | undefined;
    thread_id_welcome: string | undefined;
    greeting_mode: boolean | undefined;
    captcha: boolean | undefined;
    admin_reportable: boolean;
    federation_id: string | undefined;
    federation_id_following: string;
  }