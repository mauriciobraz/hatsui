import { Prisma } from "@prisma/client";

import { PrismaSingleton } from "~/prisma";

export async function upsertGuild(guildId: string, select: Prisma.GuildSelect) {
  const guild = await PrismaSingleton.guild.upsert({
    create: { id: guildId },
    where: { id: guildId },
    update: {},
    select: {},
  });

  return guild;
}
