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

// Primary: Lingva Translate API (Cloud-friendly)
// Fallback: MyMemory API
async function translateDutchToEnglish(text) {
  try {
    const lingvaUrl = `https://lingva.ml/api/v1/nl/en/${encodeURIComponent(text)}`;
    const res = await fetch(lingvaUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.translation) return data.translation;
    }
  } catch (err) {
    console.log('Lingva failed, switching to MyMemory fallback...');
  }

  // Fallback API if Lingva fails or throttles
  const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=nl|en`;
  const res = await fetch(myMemoryUrl);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = await res.json();
  if (data && data.responseData && data.responseData.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error('Translation returned empty response');
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
      console.error('Translation error:', err.message || err);
    }
  }
});

client.login(BOT_TOKEN);
