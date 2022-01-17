import "reflect-metadata";
import DiscordClient from "~/client";

if (require.main === module) {
  DiscordClient.start();
}
