import { ButtonInteraction } from 'discord.js';
import { ButtonComponent, Discord } from 'discordx';

export const APPEAL_BTN_ID = 'appeal-btn-id';

@Discord()
export class AppealModule {
  @ButtonComponent(APPEAL_BTN_ID)
  async appealInteraction(interaction: ButtonInteraction) {
    if (!interaction.deferred)
      await interaction.deferReply({
        ephemeral: true,
      });

    await interaction.editReply('Função não implementada ainda.');
  }
}
