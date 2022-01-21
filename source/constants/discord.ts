import { MessageEmbed } from 'discord.js';

export const BaseEmbed = (title: string, emoji?: string) =>
  new MessageEmbed()
    .setColor('BLURPLE')
    .setTitle(`${emoji && `──  ${emoji}  `}${title}`);
