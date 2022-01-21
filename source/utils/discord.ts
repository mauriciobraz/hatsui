import { CommandInteraction, InteractionDeferReplyOptions } from 'discord.js';

export default class DiscordUtils {
  /**
   * Defer a interaction reply if it's not deferred.
   * @param interaction The interaction to defer the reply.
   * @param options The interaction defer reply options.
   */
  static async deferReplyIfNeeded(
    interaction: CommandInteraction,
    options?: InteractionDeferReplyOptions
  ): Promise<void> {
    if (!interaction.deferred) await interaction.deferReply(options);
  }
}
