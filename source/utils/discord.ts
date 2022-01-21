import { CommandInteraction, InteractionDeferReplyOptions } from "discord.js";

export default class DiscordUtils {
  static async deferReplyIfNeeded(
    interaction: CommandInteraction,
    options?: InteractionDeferReplyOptions
  ): Promise<void> {
    if (!interaction.deferred) await interaction.deferReply(options);
  }
}
