const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const translate = require('@vitalets/google-translate-api');

const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const BOT_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.id === SOURCE_CHANNEL_ID) {
    if (!message.content) return;

    try {
      const res = await translate(message.content, { from: 'nl', to: 'en' });

      const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
      if (!targetChannel) return;

      const embed = new EmbedBuilder()
        .setDescription(res.text)
        .setColor(0x3498db)
        .setAuthor({
          name: message.author.displayName || message.author.username,
          iconURL: message.author.displayAvatarURL()
        })
        .setFooter({ text: `Translated from original: ${message.content}` });

      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Translation error:', err);
    }
  }
});

client.login(BOT_TOKEN);
