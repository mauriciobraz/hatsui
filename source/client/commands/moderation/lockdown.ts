import {
  CommandInteraction,
  Guild,
  GuildBasedChannel,
  MessageOptions,
  MessagePayload,
  PermissionString,
  Role,
} from "discord.js";
import { Discord, Slash, SlashGroup } from "discordx";

import DiscordUtils from "@utils/discord";
import { GenericUtils } from "~/utils/generic";
import { PrismaSingleton } from "~/prisma";

// All permissions that grant access to the server.
// See more on https://discordjs.guide/popular-topics/permissions.html
const GUILD_ACCESS_PERMISSIONS: PermissionString[] = [
  "SEND_MESSAGES",
  "READ_MESSAGE_HISTORY",
  "VIEW_CHANNEL",
];

@Discord()
@SlashGroup("lockdown", {
  description: "Ativa ou desativa o lockdown do servidor.",
})
export class LockdownModule {
  @Slash("enable", { description: "Ativa o lockdown do servidor." })
  async activateLockdown(interaction: CommandInteraction) {
    if (!(interaction.guild && interaction.member)) return;
    await DiscordUtils.deferReplyIfNeeded(interaction);

    const guildLockdown = await this._getGuildLockdown(interaction.guild.id);

    if (guildLockdown.locked)
      return await interaction.editReply(
        "O servidor já está em quarentena, talvez você queira desativar? Use `/lockdown off`."
      );

    const lockedChannelsIds = await this._toggleLockdownGuildMode(
      interaction.guild,
      false
    );

    const defaultWarnMessage = "O servidor está em quarentena.";
    const warnMessageFromDatabase =
      guildLockdown.warnMessage || defaultWarnMessage;

    const warnChannelId = await this._createWarningChannel(
      interaction,
      warnMessageFromDatabase
    );

    await PrismaSingleton.guildLockdown.update({
      data: {
        locked: true,
        ignoreChannelsIds: lockedChannelsIds,
        warnChannelId,
      },
      where: { guildId: interaction.guild.id },
    });

    await interaction.editReply(
      `Modo quarentena ativado, ${lockedChannelsIds.length} canais bloqueados. Para desativar, use \`/lockdown disable\`.`
    );
  }

  @Slash("disable", { description: "Desativa o lockdown do servidor." })
  async disableLockdown(interaction: CommandInteraction) {
    if (!(interaction.guild && interaction.member)) return;
    await DiscordUtils.deferReplyIfNeeded(interaction);

    const guildLockdown = await this._getGuildLockdown(interaction.guild.id);

    if (!guildLockdown.locked)
      return await interaction.editReply(
        "O servidor não está em quarentena. Talvez você queira ativar, se sim, use `/lockdown on`."
      );

    await interaction.guild.channels.cache
      .find((c) => c.id === guildLockdown.warnChannelId)
      ?.delete();

    const unlockedChannelsIds = await this._toggleLockdownGuildMode(
      interaction.guild,
      true
    );

    await PrismaSingleton.guildLockdown.update({
      data: { locked: false, ignoreChannelsIds: [] },
      where: { guildId: interaction.guild.id },
    });

    await interaction.editReply(
      `O modo quarentena foi desativado, ${unlockedChannelsIds.length} canais foram liberados.`
    );
  }

  /**
   * Gets or create it if not exists the guild lockdown.
   * @returns Returns the guild lockdown object.
   */
  async _getGuildLockdown(guildId: string) {
    return await PrismaSingleton.guildLockdown.upsert({
      create: { guild: { create: { id: guildId } } },
      update: {},
      where: { guildId: guildId },
      select: {
        locked: true,
        ignoreChannelsIds: true,
        warnChannelId: true,
        warnMessage: true,
      },
    });
  }

  /**
   * Toggle the guild channels access permissions for everyone role.
   * @returns Returns all the channels ids that were successfully locked.
   */
  async _toggleLockdownGuildMode(
    guild: Guild,
    switcher: boolean
  ): Promise<string[]> {
    const everyoneRole = guild.roles.everyone;
    const newEveryoneRolePermissions = switcher
      ? everyoneRole.permissions.add(GUILD_ACCESS_PERMISSIONS)
      : everyoneRole.permissions.remove(GUILD_ACCESS_PERMISSIONS);

    await everyoneRole.setPermissions(
      newEveryoneRolePermissions,
      "Server lockdown toggled."
    );

    // Clear all permissions on channels that grant @everyone access to them.
    const clearedChannles = await Promise.all(
      guild.channels.cache
        .filter((channel) => {
          if (channel.isThread()) return false;

          const channelPermissions = channel.permissionOverwrites.cache.get(
            everyoneRole.id
          );

          return channelPermissions
            ? channelPermissions.allow.has("VIEW_CHANNEL")
            : false;
        })
        .map((channel) => {
          if (channel.isThread()) return;

          channel.permissionOverwrites.edit(
            everyoneRole,
            { VIEW_CHANNEL: switcher },
            { reason: "Server lockdown toggled." }
          );

          return channel;
        })
        .filter(GenericUtils.ensureNotNull)
    );

    return clearedChannles.map((channel) => channel.id);
  }

  /**
   * Creates a new channel to warn users about lockdown.
   * @returns Returns the channel id.
   */
  async _createWarningChannel(
    interaction: CommandInteraction,
    message: string | MessagePayload | MessageOptions
  ) {
    if (!interaction.guild) return;

    const channel = await interaction.guild.channels.create("lockdown", {
      permissionOverwrites: [
        {
          type: "role",
          id: interaction.guild.roles.everyone.id,
          allow: ["VIEW_CHANNEL", "READ_MESSAGE_HISTORY"],
        },
      ],
    });

    if (channel.isText()) {
      await channel.send(message);
    }

    return channel.id;
  }
}
