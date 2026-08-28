const { Client, GatewayIntentBits } = require('discord.js');
const { buildNotificationText, buildSlackPayload, sendToSlack } = require('./notification');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let lastCount = null;

client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.channelId !== TARGET_CHANNEL_ID &&
      newState.channelId !== TARGET_CHANNEL_ID) return;

  const channel = client.channels.cache.get(TARGET_CHANNEL_ID);
  if (!channel) return;

  const members = channel.members.filter(m => !m.user.bot);
  const count = members.size;

  if (count === lastCount) return;
  const previousCount = lastCount;
  lastCount = count;

  const memberInfos = members.map(m => ({
    name: m.displayName || m.user?.username,
    avatarUrl: m.displayAvatarURL ? m.displayAvatarURL({ size: 64 }) : undefined,
  }));
  // 表示名が取れないメンバーは除外する（人数のみへのフォールバックはbuildNotificationText側で処理）
  const memberNames = memberInfos.map(m => m.name).filter(Boolean);

  const text = buildNotificationText({ count, previousCount, memberNames });
  const payload = buildSlackPayload({ text, members: memberInfos });
  sendToSlack(SLACK_WEBHOOK, payload).catch(console.error);
});

client.once('clientReady', () => console.log(`Logged in as ${client.user.tag}`));
client.login(DISCORD_TOKEN);
