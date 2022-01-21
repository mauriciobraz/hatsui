import {
  Guild,
  ApplicationCommandPermissions,
  CommandInteraction,
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

import DiscordUtils from "@utils/discord";
import { GenericUtils } from "~/utils/generic";
import { PrismaSingleton } from "~/prisma";
import { getEnv } from "~/helpers";

async function AdminPermissionResolver(
  guild: Guild,
  _command: ApplicationCommandMixin | SimpleCommandMessage
): Promise<ApplicationCommandPermissions[]> {
  const adminRoleID = getEnv("DISCORD_ADMIN_ROLES").split(",");

  if (adminRoleID.length < 1)
    throw new Error("You must pass at least one admin role.");

  const guildRoles = adminRoleID
    .map((rid) => guild.roles.cache.get(rid))
    .filter(GenericUtils.ensureNotNull);

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
export class ConfigModule {
  @Slash("lockdown-message")
  async lockdownMessage(
    @SlashOption("message") message: string,
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
        updatedGuildLockdown?.warnMessage || "padrão."
      }\``
    );
  }
}
