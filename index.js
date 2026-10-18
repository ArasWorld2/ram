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

// Strips custom Discord emojis (<:name:id>) so Google doesn't corrupt them
function cleanInputText(text) {
  return text.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '').trim();
}

// Queries Google's public translation endpoint directly
async function translateDutchToEnglish(text) {
  const cleaned = cleanInputText(text);
  if (!cleaned) return null; // Skip if message only contained custom emojis

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=nl&tl=en&dt=t&q=${encodeURIComponent(cleaned)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });

  if (!res.ok) throw new Error(`Google API status: ${res.status}`);

  const data = await res.json();
  if (data && data[0]) {
    // Collect translated segments
    const translation = data[0].map(item => item[0]).join('');
    return translation;
  }
  
  throw new Error('Translation returned empty payload');
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

      // If text was only custom emojis, ignore
      if (!translatedText) return;

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
        .setFooter({ text: `Original Dutch: ${message.content}` });

      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Translation error:', err.message || err);
    }
  }
});

client.login(BOT_TOKEN);
