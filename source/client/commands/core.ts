import { ArgsOf, Client, Discord, On } from "discordx";

@Discord()
export class CoreModule {
  @On("interactionCreate")
  async onInteractionCreate(args: ArgsOf<"interactionCreate">, client: Client) {
    const [interaction] = args;
    await client.executeInteraction(interaction);
  }

  @On("messageCreate")
  async onMessageCreate(args: ArgsOf<"messageCreate">, client: Client) {
    const [message] = args;
    await client.executeCommand(message);
  }
}
