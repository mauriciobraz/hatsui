import { APIInteractionGuildMember } from 'discord-api-types';
import {
  CommandInteraction,
  GuildMember,
  GuildMemberRoleManager,
} from 'discord.js';
import { Discord, Guard, Slash, SlashOption } from 'discordx';

import { normalize } from '~/helpers/strings';

import AuthorizationGuard from '../../guards/Authorization';

@Discord()
@Guard(AuthorizationGuard('CHANGE_NICKNAME'))
export class DecancerModule {
  @Slash('decancer')
  async cleanNameSlash(
    @SlashOption('member') member: GuildMember,
    interaction: CommandInteraction
  ) {
    if (!(interaction.guild && interaction.member)) return;
    if (!interaction.deferred)
      await interaction.deferReply({
        ephemeral: true,
      });

    if (!this._hasGreaterRolePosition(interaction.member, member))
      return await interaction.editReply(
        'Você não possui permissões suficientes para usar este comando em cima deste usuário.'
      );

    const clientMember = interaction.guild.members.cache.get(
      interaction.client.user?.id || ''
    );

    if (!clientMember)
      return await interaction.editReply('Houve um erro inesperado');

    if (!this._hasGreaterRolePosition(clientMember, member))
      return await interaction.editReply(
        'Eu não possuo permissões suficientes para alterar o apelido deste usuário.'
      );

    const sanitizedNickname =
      normalize(member.nickname || member.user.username) || 'hatsui';

    await member.setNickname(
      sanitizedNickname,
      `Name sanitized by ${interaction.member.user.id}`
    );

    await interaction.editReply(
      `O apelido de <@${member.id}> foi alterado com sucesso.`
    );
  }

  /**
   * Check two-member role position.
   * @param author The user who needs to have the top role.
   * @param member The member who needs to have the lowest role.
   * @returns A boolean indicating whether the first user has a higher role.
   */
  private _hasGreaterRolePosition(
    author: APIInteractionGuildMember | GuildMember,
    member: GuildMember
  ) {
    if (author.roles instanceof GuildMemberRoleManager)
      return author.roles.highest.comparePositionTo(member.roles.highest) > 1;
    else return new Error('Not supported');
  }
}
