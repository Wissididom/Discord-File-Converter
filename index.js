import "dotenv/config";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "fs/promises";
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.User,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
  ],
});

function isImage(contentType) {
  return contentType.startsWith("image/");
}

function isAudio(contentType) {
  return contentType.startsWith("audio/");
}

function isVideo(contentType) {
  return contentType.startsWith("video/");
}

async function convert(buffer, extension) {
  const tempFileName = `${randomUUID()}.${extension}`;
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ["-i", "-", tempFileName]);
    ffmpeg.stdin.write(buffer);
    ffmpeg.stdin.end();
    ffmpeg.stderr.pipe(process.stdout);
    ffmpeg.on("close", (code) => resolve(code));
    ffmpeg.on("error", (err) => reject(err));
  });
  const resultBuffer = await readFile(tempFileName);
  await unlink(tempFileName);
  return resultBuffer;
}

async function getResponseForContextMenu(contextMenuCommandInteraction) {
  // https://discord.js.org/#/docs/collection/stable/class/Collection
  const message = contextMenuCommandInteraction.targetMessage;
  let content =
    message.attachments.size > 0 ? "" : "No attachments/files found!";
  const files = [];
  for (let i = 0; i < message.attachments.size; i++) {
    const attachment = message.attachments.at(i);
    let extension = null;
    if (isImage(attachment.contentType)) {
      extension = process.env.TARGET_IMAGE_FORMAT;
    } else if (isAudio(attachment.contentType)) {
      extension = process.env.TARGET_AUDIO_FORMAT;
    } else if (isVideo(attachment.contentType)) {
      extension = process.env.TARGET_VIDEO_FORMAT;
    } else {
      content = `${i + 1}. Neither audio, video nor image!`;
    }
    if (extension) {
      const fetchResponse = await fetch(attachment.url);
      try {
        const buffer = await convert(
          Buffer.from(await fetchResponse.arrayBuffer()),
          extension,
        );
        files.push({
          attachment: buffer,
          name: `${attachment.name}.${extension}`,
        });
      } catch (e) {
        console.log(e);
      }
    }
  }
  if (message.attachments.size > 0 && files.length < 1) {
    content =
      "Failed to convert files, likely one of the files has an unsupported format";
  }
  return {
    content: content.trim(),
    files,
  };
}

async function getResponseForSlashCommand(slashCommandInteraction) {
  // https://discord.js.org/#/docs/collection/stable/class/Collection
  const attachment = slashCommandInteraction.options.getAttachment("file");
  if (attachment) {
    let extension = null;
    if (isImage(attachment.contentType)) {
      extension = process.env.TARGET_IMAGE_FORMAT;
    } else if (isAudio(attachment.contentType)) {
      extension = process.env.TARGET_AUDIO_FORMAT;
    } else if (isVideo(attachment.contentType)) {
      extension = process.env.TARGET_VIDEO_FORMAT;
    } else {
      content = `${i + 1}. Neither audio, video nor image!`;
    }
    if (extension) {
      const fetchResponse = await fetch(attachment.url);
      try {
        const buffer = await convert(
          Buffer.from(await fetchResponse.arrayBuffer()),
          extension,
        );
        return {
          files: [
            {
              attachment: buffer,
              name: `${attachment.name}.${extension}`,
            },
          ],
        };
      } catch (e) {
        console.log(e);
        return {
          content:
            "Failed to convert file, likely it has an unsupported format",
        };
      }
    }
  }
  return {
    content: "No attachments/files found!",
  };
}

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`); // Logging
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isMessageContextMenuCommand()) {
    if (interaction.commandName == "publicconvert") {
      await interaction.deferReply();
    } else {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply(await getResponseForContextMenu(interaction));
  } else if (interaction.isChatInputCommand()) {
    if (interaction.options.getBoolean("public") == true) {
      await interaction.deferReply();
    } else {
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });
    }
    await interaction.editReply(await getResponseForSlashCommand(interaction));
  }
});

client.login(process.env.TOKEN);
