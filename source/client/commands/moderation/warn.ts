import {
  ApplicationCommandParams,
  Discord,
  Guard,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
  SimpleCommandParams,
  Slash,
  SlashOption,
  SlashOptionParams,
} from 'discordx';
import {
  CommandInteraction,
  Guild,
  GuildMember,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  User,
} from 'discord.js';

import AuthorizationGuard from '@guards/Authorization';
import { CannotSendDM, UserNotFound } from '@errors';
import { PrismaSingleton } from '~/prisma';
import { APPEAL_BTN_ID } from './appeal';

const Texts = {
  RootDescription: 'Aplica um aviso a um usuário',
  MemberParamDescription: 'O membro que receberá esta punição',
  ReasonParamDescription:
    'A razão no qual o membro está recebendo esta punição.',
  ProofParamDescription:
    'URL contendo algum dos seguintes tipos de mídia comprovando o ocorrido: vídeo, imagem e/ou áudio.',
};

@Discord()
@Guard(AuthorizationGuard('VIEW_AUDIT_LOG'))
export class WarnModule {
  private _mediaURLRegex =
    /(http[s]*:\/\/)([a-z\-_0-9\/.]+)\.([a-z.]{2,3})\/([a-z0-9\-_\/._~:?#\[\]@!$&'()*+,;=%]*)([a-z0-9]+\.)(jpg|jpeg|png|mp4|mp3)/i;

  // Embed that will be sent in the user's DM notifying him about the warn.
  private _notifyOnDMEmbed = (guild: Guild, reason: string, proof: string) =>
    new MessageEmbed()
      .setColor('BLURPLE')
      .setDescription(`Você recebeu um aviso: *${reason}*`)
      .setImage(proof)
      .setFooter({
        text: `${guild.name}・discord.gg/hatsui`,
        iconURL: guild.iconURL() || '',
      });

  @Slash('warn', { description: Texts.RootDescription })
  async createWarnSlash(
    @SlashOption('member', { description: Texts.MemberParamDescription })
    member: GuildMember,

    @SlashOption('reason', { description: Texts.ReasonParamDescription })
    reason: string,

    @SlashOption('proof', { description: Texts.ProofParamDescription })
    proof: string,

    interaction: CommandInteraction<'present'>
  ): Promise<void> {
    if (!(interaction.guild && interaction.member)) return;
    if (!interaction.deferred)
      await interaction.deferReply({
        ephemeral: true,
      });

    if (!this._mediaURLRegex.test(proof)) {
      await interaction.editReply(
        'A prova precisa obrigatoriamente ser uma URL algum tipo de mídia (ex. imagem, vídeo ou áudio).'
      );

      return;
    }

    const warnSuccessfullyRegistered = await this._registerWarn(
      member,
      interaction.user,
      reason,
      proof
    );

    if (!warnSuccessfullyRegistered) {
      await interaction.editReply(
        'Houve um erro na hora de registrar o warn, tente novamente, caso o erro persistir, entre em contato com o desenvolvedor.'
      );

      return;
    }

    const notifyOnDMResult = await this._notifyOnDM(
      member.user,
      this._notifyOnDMEmbed(interaction.guild, reason, proof)
    );

    if (notifyOnDMResult instanceof UserNotFound) {
      await interaction.editReply(
        `O usuário (${member.id}) não foi encontrado, esse é um erro inesperado.`
      );

      return;
    } else if (notifyOnDMResult instanceof CannotSendDM) {
      await interaction.editReply(
        `O warn foi registrado, porém, <@${member.id}> possuí a DM fechada e eu não pude avisá-lo.`
      );

      return;
    }

    await interaction.editReply(
      `Warn registrado com sucesso, e <@${member.id}> foi avisado na DM.`
    );
  }

  @SimpleCommand('warn', {
    aliases: ['avisar', 'w'],
    description: Texts.RootDescription,
    directMessage: false,
    argSplitter: ';',
  })
  async createWarnSimple(
    @SimpleCommandOption('member', {
      description: Texts.MemberParamDescription,
      type: 'USER',
    })
    member: GuildMember | undefined,

    @SimpleCommandOption('reason', {
      description: Texts.ReasonParamDescription,
      type: 'STRING',
    })
    reason: string | undefined,

    @SimpleCommandOption('proof', {
      description: Texts.ProofParamDescription,
      type: 'STRING',
    })
    proof: string | undefined,

    command: SimpleCommandMessage
  ) {
    await command.message.reply('cooooooooooo');

    if (!command.message.guild) return;

    if (!(member && reason && proof)) {
      await command.sendUsageSyntax();

      return;
    }

    const message = await command.message.reply('...');

    if (!this._mediaURLRegex.test(proof)) {
      await message.edit(
        'A prova precisa obrigatoriamente ser uma URL algum tipo de mídia (ex. imagem, vídeo ou áudio).'
      );

      return;
    }

    const warnSuccessfullyRegistered = await this._registerWarn(
      member,
      command.message.author,
      reason,
      proof
    );

    if (!warnSuccessfullyRegistered) {
      await message.edit(
        'Houve um erro na hora de registrar o warn, tente novamente, caso o erro persistir, entre em contato com o desenvolvedor.'
      );

      return;
    }

    const notifyOnDMResult = await this._notifyOnDM(
      member.user,
      this._notifyOnDMEmbed(command.message.guild, reason, proof)
    );

    if (notifyOnDMResult instanceof UserNotFound) {
      await message.edit(
        `O usuário (${member.id}) não foi encontrado, esse é um erro inesperado.`
      );

      return;
    } else if (notifyOnDMResult instanceof CannotSendDM) {
      await message.edit(
        `O warn foi registrado, porém, <@${member.id}> possuí a DM fechada e eu não pude avisá-lo.`
      );

      return;
    }

    await message.edit(
      `Warn registrado com sucesso, e <@${member.id}> foi avisado na DM.`
    );
  }

  /**
   * Register a warn to the user on the database.
   * @returns True if everything happened successfully, false if there is an error.
   */
  private async _registerWarn(
    user: User | GuildMember,
    author: User | GuildMember,
    reason: string,
    proof?: string
  ): Promise<boolean> {
    return await PrismaSingleton.punishment
      .create({
        data: {
          belongsTo: {
            connectOrCreate: {
              create: { id: user.id },
              where: { id: user.id },
            },
          },
          author: {
            connectOrCreate: {
              create: { id: author.id },
              where: { id: author.id },
            },
          },
          type: 'WARN',
          reason,
          proof,
        },
      })
      .catch(() => false)
      .then(() => true);
  }

  /**
   * Sends a message notifying the user that he has received a warn.
   * @throws An error if user not found or unable to send the message to him.
   */
  private async _notifyOnDM(
    user: User,
    embed: MessageEmbed
  ): Promise<UserNotFound | CannotSendDM> {
    const appealButton = new MessageButton()
      .setStyle('SUCCESS')
      .setCustomId(APPEAL_BTN_ID)
      .setLabel('Pedir revisão')
      .setEmoji('👀');

    const actionRow = new MessageActionRow({
      components: [appealButton],
    });

    return await user
      .send({ components: [actionRow], embeds: [embed] })
      .catch(() => new CannotSendDM())
      .then();
  }
}
