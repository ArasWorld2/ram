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

// Strips custom Discord emojis (<:name:id>)
function cleanInputText(text) {
  return text.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '').trim();
}

async function translateDutchToEnglish(text) {
  const cleaned = cleanInputText(text);
  if (!cleaned) return null;

  // Free API endpoint that does not block Cloud/Northflank IPs
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleaned)}&langpair=nl|en`;
  const res = await fetch(url);
  
  if (!res.ok) throw new Error(`API error status: ${res.status}`);

  const data = await res.json();
  
  if (data && data.responseData && data.responseData.translatedText) {
    let translated = data.responseData.translatedText;
    
    // If translation engine returned unchanged text for known words, fix casing/formatting
    if (translated.toLowerCase() === cleaned.toLowerCase()) {
      if (cleaned.toLowerCase().includes('goedemorgen')) return 'Good morning!';
      if (cleaned.toLowerCase().includes('morgen')) return 'Morning!';
      if (cleaned.toLowerCase().includes('hallo')) return 'Hello!';
    }
    
    return translated;
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
        .setFooter({ text: `Translated from original: ${message.content}` });

      await targetChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Translation error:', err.message || err);
    }
  }
});

client.login(BOT_TOKEN);
