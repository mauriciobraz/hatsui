import { CommandInteraction } from "discord.js";
import { Client, Discord, Slash } from "discordx";

@Discord()
export class ExampleModule {
  @Slash("hello")
  async helloSlash(interaction: CommandInteraction, _client: Client) {
    await interaction.deferReply({
      ephemeral: true,
    });

    await interaction.editReply("Not implemented yet.");
  }
}
