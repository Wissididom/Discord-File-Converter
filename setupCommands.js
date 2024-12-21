import "dotenv/config";
import {
  REST,
  Routes,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  ApplicationCommandType,
} from "discord.js";

const token = process.env.TOKEN;
const rest = new REST().setToken(token);

let commands = [
  new ContextMenuCommandBuilder()
    .setName("convert")
    .setNameLocalizations({
      de: "konverieren",
    })
    .setType(ApplicationCommandType.Message),
  new ContextMenuCommandBuilder()
    .setName("publicconvert")
    .setNameLocalizations({
      de: "oeffentlichkonvertieren",
    })
    .setType(ApplicationCommandType.Message),
  new SlashCommandBuilder()
    .setName("uploadconvert")
    .setNameLocalizations({
      de: "hochladenkonvertieren",
    })
    .setDescription("Upload a file and convert it")
    .setDescriptionLocalizations({
      de: "Eine Datei hochladen und konvertieren",
    })
    .addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("The file you want to convert")
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("public")
        .setDescription("Whether you want to share the response publicly")
        .setRequired(false),
    ),
];

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application commands.`);
    for (let i = 0; i < commands.length; i++) {
      commands[i] = commands[i].toJSON();
      commands[i].integration_types = [
        0, // Guild Install
        1, // User Install
      ];
      commands[i].contexts = [
        0, // Guild
        1, // Bot DM
        2, // Private Channel
      ];
    }
    const userData = await rest.get(Routes.user());
    const userId = userData.id;
    const data = await rest.put(Routes.applicationCommands(userId), {
      body: commands,
    });
    console.log(`Successfully reloaded ${data.length} application commands.`);
  } catch (err) {
    console.error(err);
  }
})();
