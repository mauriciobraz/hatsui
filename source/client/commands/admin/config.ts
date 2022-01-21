import { CommandInteraction } from 'discord.js';
import { Discord, Guard, Slash, SlashGroup, SlashOption } from 'discordx';

import { PrismaSingleton } from '~/prisma';
import DiscordUtils from '~/utils/discord';

import AuthorizationGuard from '../../guards/Authorization';

@Discord()
@SlashGroup('config')
@Guard(AuthorizationGuard('ADMINISTRATOR'))
export class ConfigModule {
  @Slash('lockdown-message')
  async lockdownMessage(
    @SlashOption('message') message: string,
    interaction: CommandInteraction
  ) {
    if (!(interaction.guild && interaction.member)) return;
    await DiscordUtils.deferReplyIfNeeded(interaction);

    const { warnMessage } = await PrismaSingleton.guildLockdown.upsert({
      create: {
        guild: {
          connectOrCreate: {
            create: { id: interaction.guild.id },
            where: { id: interaction.guild.id },
          },
        },
        warnMessage: message,
      },
      update: {},
      where: { guildId: interaction.guild.id },
      select: {
        warnMessage: true,
      },
    });

    if (!warnMessage) {
      await PrismaSingleton.guildLockdown.update({
        data: {
          warnMessage: message,
        },
        where: { guildId: interaction.guild.id },
      });
    }

    const updatedGuildLockdown = await PrismaSingleton.guildLockdown.findUnique(
      {
        where: { guildId: interaction.guild.id },
        select: { warnMessage: true },
      }
    );

    await interaction.editReply(
      `Mensagem de aviso atualizado para: \`${
        updatedGuildLockdown?.warnMessage || 'padrão.'
      }\``
    );
  }
}
