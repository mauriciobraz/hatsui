import glob from "glob";
import { resolve } from "path";
import { BitFieldResolvable, IntentsString } from "discord.js";
import { Client, IGuild } from "discordx";
import { getEnv } from "../helpers";

// This array should contain all the intents that discord.js will use.
// See more on https://discordjs.guide/popular-topics/intents.html
const Intents: BitFieldResolvable<IntentsString, number> = [
  "GUILDS",
  "GUILD_MESSAGES",
];

const CommandsGlobPath = resolve(__dirname, "commands", "**", "*.{ts,js}");

export default class DiscordClient {
  static async start(): Promise<void> {
    // For quick registration of slash commands
    const cachedGuildIDs: IGuild = (client) =>
      client.guilds.cache.map((g) => g.id);

    const client = new Client({
      intents: Intents,
      botGuilds: [cachedGuildIDs],
    });

    // Initialize all commands and their permissions.
    client.on("ready", async () => {
      await client.initApplicationCommands();
      await client.initApplicationPermissions();
    });

    // Import all files that are in commands folders.
    const paths = glob.sync(CommandsGlobPath);
    await Promise.all(paths.map((path) => import(path)));

    await client.login(getEnv("DISCORD_TOKEN"));
  }
}
