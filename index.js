const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

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

// Directly query Google Translate API via standard fetch
async function translateDutchToEnglish(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=nl&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = await res.json();
  // Array format: [[[translatedText, originalText, ...]]]
  return data[0].map(item => item[0]).join('');
}

client.once('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.id === SOURCE_CHANNEL_ID) {
    if (!message.content) return;

    try {
      const translatedText = await translateDutchToEnglish(message.content);

      const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
      if (!targetChannel) {
        console.error(`Target channel ${TARGET_CHANNEL_ID} not found.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setDescription(translatedText)
        .setColor(0x3498db)
        .setAuthor({
          name: message.author.displayName || message.author.username,
          iconURL: message.author.displayAvatarURL()
        })
        .setFooter({ text: `Translated from original: ${message.content}` });

      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Translation or delivery error:', err.message || err);
    }
  }
});

client.login(BOT_TOKEN);
