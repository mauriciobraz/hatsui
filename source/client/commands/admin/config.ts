import {
  ApplicationCommandPermissions,
  Channel,
  CommandInteraction,
  Guild,
  MessageEmbed,
} from "discord.js";
import {
  ApplicationCommandMixin,
  Discord,
  Permission,
  SimpleCommandMessage,
  Slash,
  SlashGroup,
  SlashOption,
} from "discordx";

import { getEnv } from "~/helpers";
import { PrismaSingleton } from "~/prisma";

async function AdminPermissionResolver(
  guild: Guild,
  _command: ApplicationCommandMixin | SimpleCommandMessage
): Promise<ApplicationCommandPermissions[]> {
  const adminRoleID = getEnv("DISCORD_ADMIN_ROLES").split(",");

  if (adminRoleID.length < 1)
    throw new Error("You must pass at least one admin role.");

  const guildRoles = adminRoleID
    .map((rid) => guild.roles.cache.get(rid))
    .filter(
      <T>(value: T | null | undefined): value is T =>
        value !== null && value !== undefined
    );

  return guildRoles.map((role) => ({
    permission: true,
    type: "ROLE",
    id: role.id,
  }));
}

@Discord()
@SlashGroup("config")
@Permission(false)
@Permission(AdminPermissionResolver)
export class AdminModule {
  @Slash("setup", {
    description: "Salva configurações essenciais para o servidor.",
  })
  async configureSlash(
    @SlashOption("notes-channel", {
      description: "Canal onde será feito as notas.",
    })
    notesChannel: Channel,
    interaction: CommandInteraction
  ) {
    if (!interaction.guild) return;

    if (!interaction.deferred)
      await interaction.deferReply({
        ephemeral: true,
      });

    const guildConfig = await PrismaSingleton.config.findUnique({
      where: { id: interaction.guild.id },
    });

    if (guildConfig) {
      const alreadyConfiguredEmbed = new MessageEmbed()
        .setColor("RED")
        .setDescription(
          "Esse servidor já está configurado, talvez você queira mudar alguma configuração? Se sim, use `/config <configuração> <...parâmetros>`."
        );

      await interaction.editReply({
        embeds: [alreadyConfiguredEmbed],
      });

      return;
    }

    await PrismaSingleton.config.create({
      data: {
        id: interaction.guild.id,
        notesChannelID: notesChannel.id,
      },
    });

    const successEmbed = new MessageEmbed()
      .setColor("GREEN")
      .setDescription(
        "O servidor está configurado com sucesso, para ver/editar uma configuração em específico use `/config <configuração> [...parâmetros]`."
      );

    await interaction.editReply({
      embeds: [successEmbed],
    });
  }

  @Slash("list-all", {
    description: "Mostra todas as confiugrações deste servidor.",
  })
  async seeSlash(interaction: CommandInteraction) {
    if (!interaction.guild) return;

    if (!interaction.deferred)
      await interaction.deferReply({
        ephemeral: true,
      });

    const guildConfig = await PrismaSingleton.config.findUnique({
      where: { id: interaction.guild.id },
    });

    if (!guildConfig) {
      const embed = new MessageEmbed()
        .setColor("RED")
        .setDescription(
          "Esse servidor ainda não está configurado, utilize `/config setup`."
        );

      await interaction.editReply({
        embeds: [embed],
      });

      return;
    }

    const notesChannel = interaction.guild.channels.cache.get(
      guildConfig.notesChannelID
    );

    const embed = new MessageEmbed()
      .setColor("BLURPLE")
      .setDescription(`Configurações do servidor ${interaction.guild.name}`)
      .addFields([
        {
          name: "Sistema de anotações",
          value: `${
            notesChannel ? `<#${notesChannel.id}>` : "Sem canal de anotações"
          }`,
        },
      ]);

    await interaction.editReply({
      embeds: [embed],
    });
  }

  @Slash("notes-channel", {
    description: "Mostra/edita o canal onde é feita as notas.",
  })
  async notesChannelSlash(
    @SlashOption("new", { required: false, type: "CHANNEL" })
    newChannel: Channel | undefined,
    interaction: CommandInteraction
  ) {
    if (!interaction.guild) return;

    if (!interaction.deferred)
      await interaction.deferReply({
        ephemeral: true,
      });

    if (newChannel) {
      await PrismaSingleton.config.update({
        where: { id: interaction.guild.id },
        data: { notesChannelID: newChannel.id },
      });

      await interaction.editReply(
        `O canal de anotações foi alterado com sucesso para <#${newChannel.id}>`
      );

      return;
    }

    const guildConfig = await PrismaSingleton.config.findUnique({
      where: { id: interaction.guild.id },
    });

    if (!guildConfig) {
      const embed = new MessageEmbed()
        .setColor("RED")
        .setDescription(
          "Esse servidor ainda não está configurado, utilize `/config setup`."
        );

      await interaction.editReply({
        embeds: [embed],
      });

      return;
    }

    const notesChannel = interaction.guild.channels.cache.get(
      guildConfig.notesChannelID
    );

    await interaction.editReply(
      notesChannel
        ? `O canal de anotações está setado para <#${notesChannel.id}>`
        : "Nenhum canal está configurado para enviar as notas, use `/config notes-channel new: #novo-canal` para setar um."
    );
  }
}
