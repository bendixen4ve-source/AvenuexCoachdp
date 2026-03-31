require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  Events,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');
// =========================
// CHANNELS / ROLE IDS
// =========================

// SAUNA DEAL
const ACTIVE_CHANNEL_ID = '1488205171438911619';
const INACTIVE_CHANNEL_ID = '1488205199787950201';
const ROLE_ID = '1488204571238076456';

// CONTENT TRACKERS
const YTSHORTS_CHANNEL_ID = '1488229514428420176';
const REELS_CHANNEL_ID = '1488229499341635795';
const TIKTOK_CHANNEL_ID = '1488229527867101436';
const OVERVIEW_CHANNEL_ID = '1488230830009614426';
const TRANSCRIPT_CHANNEL_ID = '1488235966970855596';
const ALLPLATFORMS_CHANNEL_ID = '1488266081691897986';

// REQUEST SYSTEM
const REQUEST_PANEL_CHANNEL_ID = '1488254021151096983';
const REQUEST_QUEUE_CHANNEL_ID = '1488255805428990074';
const REQUEST_ACTIVE_CHANNEL_ID = '1488252492595593409';
const REQUEST_COMPLETED_CHANNEL_ID = '1488256643505324175';

const DATA_FILE = path.join(__dirname, 'data.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: ['CHANNEL']
});

// =========================
// FILES
// =========================
const IMAGE_PATHS = {
  saunaDeal: path.join(__dirname, 'assets', 'skinsauna.png'),
  ytshorts: path.join(__dirname, 'assets', 'ytshorts.png'),
  reels: path.join(__dirname, 'assets', 'reels.png'),
  tiktok: path.join(__dirname, 'assets', 'tiktok.png'),
  allplatforms: path.join(__dirname, 'assets', 'allplatforms.png')
};

// =========================
// DATA
// =========================
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {
      saunaDeal: {
        count: 0,
        active: true,
        messageId: null,
        channelId: ACTIVE_CHANNEL_ID,
        completedThisMonth: false
      },
      ytshorts: {
        count: 0,
        messageId: null,
        channelId: YTSHORTS_CHANNEL_ID,
        uploads: []
      },
      reels: {
        count: 0,
        messageId: null,
        channelId: REELS_CHANNEL_ID,
        uploads: []
      },
      tiktok: {
        count: 0,
        messageId: null,
        channelId: TIKTOK_CHANNEL_ID,
        uploads: []
      },
      overview: {
        messageId: null,
        channelId: OVERVIEW_CHANNEL_ID
      },
      requests: {
        panelMessageId: null,
        panelChannelId: REQUEST_PANEL_CHANNEL_ID,
        queueChannelId: REQUEST_QUEUE_CHANNEL_ID,
        activeChannelId: REQUEST_ACTIVE_CHANNEL_ID,
        completedChannelId: REQUEST_COMPLETED_CHANNEL_ID,
        items: []
      }
    };
  }

  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

  if (!parsed.requests) {
    parsed.requests = {
      panelMessageId: null,
      panelChannelId: REQUEST_PANEL_CHANNEL_ID,
      queueChannelId: REQUEST_QUEUE_CHANNEL_ID,
      activeChannelId: REQUEST_ACTIVE_CHANNEL_ID,
      completedChannelId: REQUEST_COMPLETED_CHANNEL_ID,
      items: []
    };
  }

  return parsed;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// =========================
// GENERIC HELPERS
// =========================
function progressBar(count, total = 8) {
  const filled = '🟩';
  const empty = '⬛';
  return filled.repeat(Math.min(count, total)) + empty.repeat(Math.max(total - count, 0));
}

function formatUploads(uploads, limit = 8) {
  if (!uploads.length) return 'Ingen uploads endnu.';
  return uploads
    .slice(-limit)
    .reverse()
    .map((u, i) => `**${uploads.length - i}.** ${u.title}\n└ 👤 <@${u.userId}> • <t:${u.timestamp}:f>`)
    .join('\n\n');
}

function getPlatformLabel(type) {
  if (type === 'ytshorts') return 'YouTube Shorts';
  if (type === 'reels') return 'Instagram Reels';
  if (type === 'tiktok') return 'TikTok';
  return 'Ukendt';
}

function getPlatformEmoji(type) {
  if (type === 'ytshorts') return '📺';
  if (type === 'reels') return '📸';
  if (type === 'tiktok') return '🎵';
  return '📌';
}

function getPlatformColor(type) {
  if (type === 'ytshorts') return 0xff0000;
  if (type === 'reels') return 0xe1306c;
  if (type === 'tiktok') return 0x14b8a6;
  return 0x22c55e;
}

function getConfirmRow(type) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_${type}`).setLabel('Ja, fortsæt').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`cancel_${type}`).setLabel('Annullér').setStyle(ButtonStyle.Secondary)
  );
}

// =========================
// SAUNA DEAL
// =========================
function getStatusText(count, total) {
  if (count >= total) return '🏆 **Målet for denne måned er KLARET!**';
  return '🟢 **Aftalen er aktiv lige nu**';
}

function getActiveEmbed(count) {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('🟢 SKINSAUNA x COACHDP — AKTIV AFTALE')
    .setDescription(
      [
        '### 📌 Månedlig TikTok-aftale',
        '**Skinsauna** har en aktiv aftale med **Coachdp**.',
        '',
        '> Der skal uploades **8 TikToks om måneden**.',
        '',
        `## ${count}/8`,
        `**Progress:** ${progressBar(count, 8)}`,
        '',
        `${getStatusText(count, 8)}`,
        '',
        '🟢 **Status:** `LIVE / AKTIV`',
        '📈 **Tracker:** Opdateres via knapperne nedenfor'
      ].join('\n')
    )
    .addFields(
      { name: '🎯 Månedligt mål', value: '8 TikToks', inline: true },
      { name: '📤 Uploadet', value: `${count}/8`, inline: true },
      { name: '📊 Fremgang', value: `${Math.floor((count / 8) * 100)}%`, inline: true }
    )
    .setImage('attachment://skinsauna.png')
    .setFooter({ text: 'Aftalen overvåges live via botten' })
    .setTimestamp();
}

function getInactiveEmbed(count, userTag, userId) {
  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle('🔴 SKINSAUNA x COACHDP — INAKTIV AFTALE')
    .setDescription(
      [
        '### ⛔ Aftalen er sat som inaktiv',
        '',
        `**Sidste status:** ${count}/8`,
        `**Progress:** ${progressBar(count, 8)}`,
        '',
        `👤 **Sat inaktiv af:** <@${userId}>`,
        `🧾 **Bruger:** ${userTag}`,
        `📅 **Tidspunkt:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        '',
        '✅ Tryk på knappen nedenfor for at aktivere aftalen igen.'
      ].join('\n')
    )
    .setImage('attachment://skinsauna.png')
    .setFooter({ text: 'Aftalen er arkiveret som inaktiv' })
    .setTimestamp();
}

function getActiveButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('deal_up').setLabel('Tilføj').setEmoji('🔼').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('deal_down').setLabel('Fjern').setEmoji('🔽').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('deal_inactive_confirm').setLabel('Sæt inaktiv').setEmoji('⛔').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('deal_reset_confirm').setLabel('Nulstil').setEmoji('🔄').setStyle(ButtonStyle.Primary)
    )
  ];
}

function getInactiveButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('deal_reactivate_confirm').setLabel('Aktivér igen').setEmoji('✅').setStyle(ButtonStyle.Success)
    )
  ];
}

// =========================
// PLATFORM EMBEDS
// =========================
function getPlatformEmbed(type, platformData) {
  return new EmbedBuilder()
    .setColor(getPlatformColor(type))
    .setTitle(`${getPlatformEmoji(type)} ${getPlatformLabel(type)} — LIVE TRACKER`)
    .setDescription(
      [
        `### 📊 ${getPlatformLabel(type)} overblik`,
        '',
        `## ${platformData.count} uploads`,
        `**Progress:** ${progressBar(Math.min(platformData.count, 8), 8)}`,
        '',
        '🟢 **Status:** `LIVE TRACKING`',
        '',
        '### 📝 Seneste uploads',
        `${formatUploads(platformData.uploads, 8)}`
      ].join('\n')
    )
    .addFields(
      { name: '📤 Uploads', value: `${platformData.count}`, inline: true },
      { name: '🧠 Tracker', value: 'Aktiv', inline: true },
      { name: '📅 Sidst opdateret', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setImage(`attachment://${type}.png`)
    .setFooter({ text: `${getPlatformLabel(type)} overvåges live via botten` })
    .setTimestamp();
}

function getPlatformButtons(type) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${type}_up`).setLabel('Tilføj').setEmoji('🔼').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${type}_down`).setLabel('Fjern').setEmoji('🔽').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`${type}_reset_confirm`).setLabel('Nulstil').setEmoji('🔄').setStyle(ButtonStyle.Primary)
    )
  ];
}

function getAllPlatformsEmbed(platformData) {
  return new EmbedBuilder()
    .setColor(0x06b6d4)
    .setTitle('🌍 ALL PLATFORMS — LIVE TRACKER')
    .setDescription(
      [
        '### 📦 Samlet upload til ALLE platforme',
        '',
        `## ${platformData.count} fælles uploads`,
        `**Progress:** ${progressBar(Math.min(platformData.count, 8), 8)}`,
        '',
        '🟢 **Status:** `LIVE TRACKING`',
        '',
        '### 🚀 Denne tracker gør følgende',
        'Når du tilføjer én video her, bliver den automatisk registreret på:',
        '• 📺 YouTube Shorts',
        '• 📸 Instagram Reels',
        '• 🎵 TikTok',
        '',
        '### 📝 Seneste fælles uploads',
        `${formatUploads(platformData.uploads, 8)}`
      ].join('\n')
    )
    .addFields(
      { name: '📦 Samlede uploads', value: `${platformData.count}`, inline: true },
      { name: '🔁 Synkronisering', value: '3 platforme', inline: true },
      { name: '📅 Sidst opdateret', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setImage('attachment://allplatforms.png')
    .setFooter({ text: '1 upload her = automatisk registrering på alle 3 platforme' })
    .setTimestamp();
}

function getAllPlatformsButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('allplatforms_up').setLabel('Tilføj').setEmoji('🔼').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('allplatforms_down').setLabel('Fjern').setEmoji('🔽').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('allplatforms_reset_confirm').setLabel('Nulstil').setEmoji('🔄').setStyle(ButtonStyle.Primary)
    )
  ];
}

// =========================
// OVERVIEW EMBED
// =========================
function getOverviewEmbed(data) {
  const yt = data.ytshorts;
  const reels = data.reels;
  const tiktok = data.tiktok;
  const total = yt.count + reels.count + tiktok.count;

  return new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle('📊 CONTENT OVERVIEW — LIVE DASHBOARD')
    .setDescription(
      [
        '### 🧾 Samlet overblik over alle content-kanaler',
        '',
        `## Total uploads: **${total}**`,
        '',
        `📺 **YouTube Shorts:** ${yt.count}`,
        `📸 **Instagram Reels:** ${reels.count}`,
        `🎵 **TikTok:** ${tiktok.count}`,
        '',
        '### 🔍 Seneste status',
        `📺 Shorts: ${yt.uploads.length ? yt.uploads[yt.uploads.length - 1].title : 'Ingen uploads endnu'}`,
        `📸 Reels: ${reels.uploads.length ? reels.uploads[reels.uploads.length - 1].title : 'Ingen uploads endnu'}`,
        `🎵 TikTok: ${tiktok.uploads.length ? tiktok.uploads[tiktok.uploads.length - 1].title : 'Ingen uploads endnu'}`
      ].join('\n')
    )
    .addFields(
      { name: '📺 Shorts', value: `${yt.count}`, inline: true },
      { name: '📸 Reels', value: `${reels.count}`, inline: true },
      { name: '🎵 TikTok', value: `${tiktok.count}`, inline: true }
    )
    .setFooter({ text: 'Live content dashboard • Brug 🧾 til månedstranscript' })
    .setTimestamp();
}

function getOverviewButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('overview_transcript').setLabel('Lav transcript').setEmoji('🧾').setStyle(ButtonStyle.Primary)
    )
  ];
}

// =========================
// REQUEST SYSTEM
// =========================
function requestProgressBar(percent = 0) {
  const total = 10;
  const filledCount = Math.round(percent / 10);
  const filled = '🟩'.repeat(filledCount);
  const empty = '⬛'.repeat(total - filledCount);
  return `${filled}${empty} **${percent}%**`;
}

function generateRequestId() {
  return `REQ-${Date.now().toString().slice(-6)}`;
}

function getRequestPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle('📢 REQUEST OPERATING SYSTEM')
    .setDescription(
      [
        '### Indsend et nyt request / projekt',
        '',
        'Brug knappen nedenfor for at oprette et nyt request.',
        '',
        '**Du kan bl.a. indsende:**',
        '• VOD review',
        '• TikTok idé',
        '• Thumbnail request',
        '• Content opgave',
        '• Diverse opgaver',
        '',
        '📌 Systemet håndterer automatisk:',
        '• Queue',
        '• Godkendelse / afvisning',
        '• Aktiv progression',
        '• Færdiggørelse'
      ].join('\n')
    )
    .setFooter({ text: 'Tryk på 📢 for at indsende et request' })
    .setTimestamp();
}

function getRequestPanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('request_create')
        .setLabel('Opret request')
        .setEmoji('📢')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function getQueueEmbed(item) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`📥 REQUEST I QUEUE — ${item.title}`)
    .setDescription(
      [
        `### 🧾 Request ID: \`${item.id}\``,
        '',
        `👤 **Oprettet af:** <@${item.userId}>`,
        `📅 **Oprettet:** <t:${item.createdAt}:F>`,
        `⏳ **Tidsbegrænset:** ${item.isLimited ? 'Ja' : 'Nej'}`,
        item.deadline ? `🗓️ **Deadline:** ${item.deadline}` : '🗓️ **Deadline:** Ikke sat',
        '',
        '### 📝 Beskrivelse',
        item.description || 'Ingen beskrivelse angivet.'
      ].join('\n')
    )
    .setFooter({ text: 'Afventer godkendelse eller afvisning' })
    .setTimestamp();
}

function getQueueButtons(itemId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`request_approve_${itemId}`)
        .setLabel('Godkend')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`request_reject_${itemId}`)
        .setLabel('Afvis')
        .setEmoji('⛔')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function getActiveRequestEmbed(item) {
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle(`🟢 AKTIVT PROJEKT — ${item.title}`)
    .setDescription(
      [
        `### 🧾 Request ID: \`${item.id}\``,
        '',
        `👤 **Oprettet af:** <@${item.userId}>`,
        `📅 **Oprettet:** <t:${item.createdAt}:F>`,
        `✅ **Godkendt af:** ${item.approvedBy ? `<@${item.approvedBy}>` : 'Ukendt'}`,
        `⏳ **Tidsbegrænset:** ${item.isLimited ? 'Ja' : 'Nej'}`,
        item.deadline ? `🗓️ **Deadline:** ${item.deadline}` : '🗓️ **Deadline:** Ikke sat',
        '',
        `### 🏧 Fremgang`,
        requestProgressBar(item.progress || 0),
        '',
        '### 📝 Beskrivelse',
        item.description || 'Ingen beskrivelse angivet.'
      ].join('\n')
    )
    .setFooter({ text: 'Projektet er aktivt og i gang' })
    .setTimestamp();
}

function getActiveRequestButtons(itemId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`request_complete_confirm_${itemId}`)
        .setLabel('Færdig')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`request_progress_${itemId}`)
        .setLabel('Opdater progress')
        .setEmoji('🏧')
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function getCompletedRequestEmbed(item) {
  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(`🏁 PROJEKT FÆRDIGT — ${item.title}`)
    .setDescription(
      [
        `### 🧾 Request ID: \`${item.id}\``,
        '',
        `👤 **Oprettet af:** <@${item.userId}>`,
        `📅 **Oprettet:** <t:${item.createdAt}:F>`,
        `✅ **Godkendt af:** ${item.approvedBy ? `<@${item.approvedBy}>` : 'Ukendt'}`,
        `🏁 **Færdiggjort af:** ${item.completedBy ? `<@${item.completedBy}>` : 'Ukendt'}`,
        `📆 **Færdiggjort:** ${item.completedAt ? `<t:${item.completedAt}:F>` : 'Ukendt'}`,
        item.deadline ? `🗓️ **Deadline:** ${item.deadline}` : '🗓️ **Deadline:** Ikke sat',
        '',
        `### 🏧 Endelig fremgang`,
        requestProgressBar(item.progress || 100),
        '',
        '### 📝 Beskrivelse',
        item.description || 'Ingen beskrivelse angivet.'
      ].join('\n')
    )
    .setFooter({ text: 'Projektet er nu afsluttet' })
    .setTimestamp();
}

function findRequestItem(data, itemId) {
  return data.requests.items.find(r => r.id === itemId);
}

function saveRequestItem(data, item) {
  const index = data.requests.items.findIndex(r => r.id === item.id);
  if (index === -1) {
    data.requests.items.push(item);
  } else {
    data.requests.items[index] = item;
  }
  saveData(data);
}

function removeRequestItem(data, itemId) {
  data.requests.items = data.requests.items.filter(r => r.id !== itemId);
  saveData(data);
}

// =========================
// UPDATE FUNCTIONS
// =========================
async function sendGoalReachedMessage(guild) {
  try {
    const channel = await guild.channels.fetch(ACTIVE_CHANNEL_ID);
    if (!channel) return;

    const msg = await channel.send({
      content: `<@&${ROLE_ID}> 🎉 **Vi nåede målet for denne måned! 8/8 TikToks er klaret!**`
    });

    setTimeout(async () => {
      try {
        await msg.delete();
      } catch {}
    }, 24 * 60 * 60 * 1000);
  } catch (err) {
    console.error(err);
  }
}

async function updateDealMessage(guild) {
  const data = loadData();
  const deal = data.saunaDeal;
  if (!deal.messageId || !deal.channelId || !deal.active) return;

  try {
    const channel = await guild.channels.fetch(deal.channelId);
    const message = await channel.messages.fetch(deal.messageId);
    const attachment = new AttachmentBuilder(IMAGE_PATHS.saunaDeal, { name: 'skinsauna.png' });

    await message.edit({
      embeds: [getActiveEmbed(deal.count)],
      components: getActiveButtons(),
      files: [attachment]
    });
  } catch (err) {
    console.error('Kunne ikke opdatere sauna deal:', err);
  }
}

async function updatePlatformMessage(guild, type) {
  const data = loadData();
  const platformData = data[type];
  if (!platformData.messageId || !platformData.channelId) return;

  try {
    const channel = await guild.channels.fetch(platformData.channelId);
    const message = await channel.messages.fetch(platformData.messageId);
    const attachment = new AttachmentBuilder(IMAGE_PATHS[type], { name: `${type}.png` });

    await message.edit({
      embeds: [getPlatformEmbed(type, platformData)],
      components: getPlatformButtons(type),
      files: [attachment]
    });
  } catch (err) {
    console.error(`Kunne ikke opdatere ${type}:`, err);
  }

  await updateOverviewMessage(guild);
}

async function updateAllPlatformsMessage(guild) {
  const data = loadData();
  const platformData = data.allplatforms;
  if (!platformData.messageId || !platformData.channelId) return;

  try {
    const channel = await guild.channels.fetch(platformData.channelId);
    const message = await channel.messages.fetch(platformData.messageId);
    const attachment = new AttachmentBuilder(IMAGE_PATHS.allplatforms, { name: 'allplatforms.png' });

    await message.edit({
      embeds: [getAllPlatformsEmbed(platformData)],
      components: getAllPlatformsButtons(),
      files: [attachment]
    });
  } catch (err) {
    console.error('Kunne ikke opdatere allplatforms:', err);
  }
}

async function updateOverviewMessage(guild) {
  const data = loadData();
  const overview = data.overview;
  if (!overview.messageId || !overview.channelId) return;

  try {
    const channel = await guild.channels.fetch(overview.channelId);
    const message = await channel.messages.fetch(overview.messageId);

    await message.edit({
      embeds: [getOverviewEmbed(data)],
      components: getOverviewButtons()
    });
  } catch (err) {
    console.error('Kunne ikke opdatere overview:', err);
  }
}

// =========================
// COMMANDS
// =========================
const commands = [
  new SlashCommandBuilder()
    .setName('postsaunadeal')
    .setDescription('Poster den aktive Skinsauna deal embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('postytshort')
    .setDescription('Poster YouTube Shorts tracker embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('postreels')
    .setDescription('Poster Reels tracker embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('posttiktok')
    .setDescription('Poster TikTok tracker embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('postallplatforms')
    .setDescription('Poster samlet all-platforms tracker embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('postcontentoverview')
    .setDescription('Poster samlet content overview embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('postrequestpanel')
    .setDescription('Poster request system embed')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

// =========================
// READY
// =========================
client.once('ready', async () => {
  console.log(`Botten er online som ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Registrerer slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registreret.');
  } catch (error) {
    console.error(error);
  }
});

// =========================
// INTERACTIONS
// =========================
client.on(Events.InteractionCreate, async interaction => {
  const data = loadData();

  // =========================
  // SLASH COMMANDS
  // =========================
  if (interaction.isChatInputCommand()) {
    // SAUNA
    if (interaction.commandName === 'postsaunadeal') {
      const attachment = new AttachmentBuilder(IMAGE_PATHS.saunaDeal, { name: 'skinsauna.png' });
      const channel = await interaction.guild.channels.fetch(ACTIVE_CHANNEL_ID);

      const msg = await channel.send({
        embeds: [getActiveEmbed(data.saunaDeal.count)],
        components: getActiveButtons(),
        files: [attachment]
      });

      data.saunaDeal.messageId = msg.id;
      data.saunaDeal.channelId = ACTIVE_CHANNEL_ID;
      data.saunaDeal.active = true;
      saveData(data);

      return interaction.reply({ content: '✅ Sauna deal embed postet.', ephemeral: true });
    }

    // YT SHORTS
    if (interaction.commandName === 'postytshort') {
      const attachment = new AttachmentBuilder(IMAGE_PATHS.ytshorts, { name: 'ytshorts.png' });
      const channel = await interaction.guild.channels.fetch(YTSHORTS_CHANNEL_ID);

      const msg = await channel.send({
        embeds: [getPlatformEmbed('ytshorts', data.ytshorts)],
        components: getPlatformButtons('ytshorts'),
        files: [attachment]
      });

      data.ytshorts.messageId = msg.id;
      data.ytshorts.channelId = YTSHORTS_CHANNEL_ID;
      saveData(data);

      return interaction.reply({ content: '✅ YouTube Shorts embed postet.', ephemeral: true });
    }

    // REELS
    if (interaction.commandName === 'postreels') {
      const attachment = new AttachmentBuilder(IMAGE_PATHS.reels, { name: 'reels.png' });
      const channel = await interaction.guild.channels.fetch(REELS_CHANNEL_ID);

      const msg = await channel.send({
        embeds: [getPlatformEmbed('reels', data.reels)],
        components: getPlatformButtons('reels'),
        files: [attachment]
      });

      data.reels.messageId = msg.id;
      data.reels.channelId = REELS_CHANNEL_ID;
      saveData(data);

      return interaction.reply({ content: '✅ Reels embed postet.', ephemeral: true });
    }

    // TIKTOK
    if (interaction.commandName === 'posttiktok') {
      const attachment = new AttachmentBuilder(IMAGE_PATHS.tiktok, { name: 'tiktok.png' });
      const channel = await interaction.guild.channels.fetch(TIKTOK_CHANNEL_ID);

      const msg = await channel.send({
        embeds: [getPlatformEmbed('tiktok', data.tiktok)],
        components: getPlatformButtons('tiktok'),
        files: [attachment]
      });

      data.tiktok.messageId = msg.id;
      data.tiktok.channelId = TIKTOK_CHANNEL_ID;
      saveData(data);

      return interaction.reply({ content: '✅ TikTok embed postet.', ephemeral: true });
    }

    // ALL PLATFORMS
if (interaction.commandName === 'postallplatforms') {
  const attachment = new AttachmentBuilder(IMAGE_PATHS.allplatforms, { name: 'allplatforms.png' });
  const channel = await interaction.guild.channels.fetch(ALLPLATFORMS_CHANNEL_ID);

  const msg = await channel.send({
    embeds: [getAllPlatformsEmbed(data.allplatforms)],
    components: getAllPlatformsButtons(),
    files: [attachment]
  });

  data.allplatforms.messageId = msg.id;
  data.allplatforms.channelId = ALLPLATFORMS_CHANNEL_ID;
  saveData(data);

  return interaction.reply({ content: '✅ All Platforms embed postet.', ephemeral: true });
}

    // OVERVIEW
    if (interaction.commandName === 'postcontentoverview') {
      const channel = await interaction.guild.channels.fetch(OVERVIEW_CHANNEL_ID);

      const msg = await channel.send({
        embeds: [getOverviewEmbed(data)],
        components: getOverviewButtons()
      });

      data.overview.messageId = msg.id;
      data.overview.channelId = OVERVIEW_CHANNEL_ID;
      saveData(data);

      return interaction.reply({ content: '✅ Content overview embed postet.', ephemeral: true });
    }

    // REQUEST PANEL
    if (interaction.commandName === 'postrequestpanel') {
      const channel = await interaction.guild.channels.fetch(REQUEST_PANEL_CHANNEL_ID);

      const msg = await channel.send({
        embeds: [getRequestPanelEmbed()],
        components: getRequestPanelButtons()
      });

      data.requests.panelMessageId = msg.id;
      data.requests.panelChannelId = REQUEST_PANEL_CHANNEL_ID;
      saveData(data);

      return interaction.reply({ content: '✅ Request panel postet.', ephemeral: true });
    }
  }

  // =========================
  // BUTTONS
  // =========================
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // ---------- SAUNA ----------
    if (customId === 'deal_up') {
      if (!data.saunaDeal.active) return interaction.reply({ content: '⛔ Aftalen er ikke aktiv.', ephemeral: true });
      if (data.saunaDeal.count >= 8) return interaction.reply({ content: '⚠️ Du kan ikke gå over 8/8.', ephemeral: true });

      data.saunaDeal.count += 1;

      if (data.saunaDeal.count >= 8 && !data.saunaDeal.completedThisMonth) {
        data.saunaDeal.completedThisMonth = true;
        saveData(data);
        await updateDealMessage(interaction.guild);
        await sendGoalReachedMessage(interaction.guild);
        return interaction.reply({ content: '🎉 Aftalen er nu på **8/8** — målet er nået!', ephemeral: true });
      }

      saveData(data);
      await updateDealMessage(interaction.guild);
      return interaction.reply({ content: `✅ Talt op til **${data.saunaDeal.count}/8**`, ephemeral: true });
    }

    if (customId === 'deal_down') {
      if (!data.saunaDeal.active) return interaction.reply({ content: '⛔ Aftalen er ikke aktiv.', ephemeral: true });
      if (data.saunaDeal.count <= 0) return interaction.reply({ content: '⚠️ Du kan ikke gå under 0/8.', ephemeral: true });

      data.saunaDeal.count -= 1;
      if (data.saunaDeal.count < 8) data.saunaDeal.completedThisMonth = false;

      saveData(data);
      await updateDealMessage(interaction.guild);
      return interaction.reply({ content: `🔽 Talt ned til **${data.saunaDeal.count}/8**`, ephemeral: true });
    }

    if (customId === 'deal_inactive_confirm') {
      return interaction.reply({
        content: '⚠️ Er du sikker på at du vil sætte aftalen som **inaktiv**?',
        components: [getConfirmRow('inactive')],
        ephemeral: true
      });
    }

    if (customId === 'deal_reset_confirm') {
      return interaction.reply({
        content: '⚠️ Er du sikker på at du vil **nulstille aftalen** tilbage til **0/8**?',
        components: [getConfirmRow('reset')],
        ephemeral: true
      });
    }

    if (customId === 'deal_reactivate_confirm') {
      return interaction.reply({
        content: '⚠️ Er du sikker på at du vil **aktivere aftalen igen**?',
        components: [getConfirmRow('reactivate')],
        ephemeral: true
      });
    }

    if (customId === 'confirm_inactive') {
      try {
        const oldChannel = await interaction.guild.channels.fetch(data.saunaDeal.channelId);
        const oldMessage = await oldChannel.messages.fetch(data.saunaDeal.messageId);

        const inactiveChannel = await interaction.guild.channels.fetch(INACTIVE_CHANNEL_ID);
        const attachment = new AttachmentBuilder(IMAGE_PATHS.saunaDeal, { name: 'skinsauna.png' });

        const newMsg = await inactiveChannel.send({
          embeds: [getInactiveEmbed(data.saunaDeal.count, interaction.user.tag, interaction.user.id)],
          components: getInactiveButtons(),
          files: [attachment]
        });

        await oldMessage.delete().catch(() => {});

        data.saunaDeal.active = false;
        data.saunaDeal.messageId = newMsg.id;
        data.saunaDeal.channelId = INACTIVE_CHANNEL_ID;
        saveData(data);

        return interaction.update({
          content: '⛔ Aftalen er nu sat som **inaktiv**.',
          components: []
        });
      } catch (err) {
        console.error(err);
        return interaction.update({ content: '❌ Noget gik galt.', components: [] });
      }
    }

    if (customId === 'confirm_reset') {
      data.saunaDeal.count = 0;
      data.saunaDeal.completedThisMonth = false;
      saveData(data);
      await updateDealMessage(interaction.guild);

      return interaction.update({
        content: '🔄 Aftalen er blevet **nulstillet til 0/8**.',
        components: []
      });
    }

    if (customId === 'confirm_reactivate') {
      try {
        const oldChannel = await interaction.guild.channels.fetch(data.saunaDeal.channelId);
        const oldMessage = await oldChannel.messages.fetch(data.saunaDeal.messageId);

        const activeChannel = await interaction.guild.channels.fetch(ACTIVE_CHANNEL_ID);
        const attachment = new AttachmentBuilder(IMAGE_PATHS.saunaDeal, { name: 'skinsauna.png' });

        const newMsg = await activeChannel.send({
          embeds: [getActiveEmbed(data.saunaDeal.count)],
          components: getActiveButtons(),
          files: [attachment]
        });

        await oldMessage.delete().catch(() => {});

        data.saunaDeal.active = true;
        data.saunaDeal.messageId = newMsg.id;
        data.saunaDeal.channelId = ACTIVE_CHANNEL_ID;
        saveData(data);

        return interaction.update({
          content: '✅ Aftalen er nu **aktiv igen**.',
          components: []
        });
      } catch (err) {
        console.error(err);
        return interaction.update({ content: '❌ Noget gik galt.', components: [] });
      }
    }

    // ---------- PLATFORM ADD ----------
if (['ytshorts_up', 'reels_up', 'tiktok_up', 'allplatforms_up'].includes(customId)) {
  const type = customId.replace('_up', '');

  const modal = new ModalBuilder()
    .setCustomId(`modal_add_${type}`)
    .setTitle(
      type === 'allplatforms'
        ? 'Tilføj upload til ALLE platforme'
        : `Tilføj ${getPlatformLabel(type)} upload`
    );

  const titleInput = new TextInputBuilder()
    .setCustomId('upload_title')
    .setLabel('Navn på upload')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Fx. KNIFE GIVEAWAY');

  modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
  return interaction.showModal(modal);
}

    // ---------- PLATFORM REMOVE ----------
if (['ytshorts_down', 'reels_down', 'tiktok_down', 'allplatforms_down'].includes(customId)) {
  const type = customId.replace('_down', '');
  const uploads = data[type].uploads;

  if (!uploads.length) {
    return interaction.reply({ content: '⚠️ Der er ingen uploads at fjerne.', ephemeral: true });
  }

  const options = uploads.slice(-25).reverse().map((u) => ({
    label: u.title.slice(0, 100),
    description: `Tilføjet af ${u.userTag} • ${new Date(u.timestamp * 1000).toLocaleDateString('da-DK')}`,
    value: u.id
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(`remove_select_${type}`)
    .setPlaceholder('Vælg upload der skal fjernes')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  return interaction.reply({
    content: type === 'allplatforms'
      ? '🗑️ Vælg hvilken fælles upload der skal fjernes fra ALLE platforme:'
      : `🗑️ Vælg hvilken ${getPlatformLabel(type)} upload der skal fjernes:`,
    components: [row],
    ephemeral: true
  });
}

    // ---------- PLATFORM RESET ----------
if (['ytshorts_reset_confirm', 'reels_reset_confirm', 'tiktok_reset_confirm', 'allplatforms_reset_confirm'].includes(customId)) {
  const type = customId.replace('_reset_confirm', '');
  return interaction.reply({
    content: `⚠️ Er du sikker på at du vil **nulstille ${type === 'allplatforms' ? 'All Platforms' : getPlatformLabel(type)} trackeren**?`,
    components: [getConfirmRow(`platformreset_${type}`)],
    ephemeral: true
  });
}

if (customId.startsWith('confirm_platformreset_')) {
  const type = customId.replace('confirm_platformreset_', '');

  if (type === 'allplatforms') {
    data.allplatforms.count = 0;
    data.allplatforms.uploads = [];

    data.ytshorts.count = 0;
    data.ytshorts.uploads = [];

    data.reels.count = 0;
    data.reels.uploads = [];

    data.tiktok.count = 0;
    data.tiktok.uploads = [];

    saveData(data);

    await updateAllPlatformsMessage(interaction.guild);
    await updatePlatformMessage(interaction.guild, 'ytshorts');
    await updatePlatformMessage(interaction.guild, 'reels');
    await updatePlatformMessage(interaction.guild, 'tiktok');
    await updateOverviewMessage(interaction.guild);

    return interaction.update({
      content: `🔄 All Platforms trackeren og alle 3 platforme er blevet nulstillet.`,
      components: []
    });
  }

  data[type].count = 0;
  data[type].uploads = [];
  saveData(data);

  await updatePlatformMessage(interaction.guild, type);

  return interaction.update({
    content: `🔄 ${getPlatformLabel(type)} trackeren er blevet nulstillet.`,
    components: []
  });
}

    // ---------- OVERVIEW ----------
    if (customId === 'overview_transcript') {
      const modal = new ModalBuilder()
        .setCustomId('modal_overview_transcript')
        .setTitle('Lav månedstranscript');

      const monthInput = new TextInputBuilder()
        .setCustomId('transcript_month')
        .setLabel('Skriv måned (fx MARTS)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('MARTS');

      modal.addComponents(new ActionRowBuilder().addComponents(monthInput));
      return interaction.showModal(modal);
    }

    // ---------- REQUEST SYSTEM ----------
    if (customId === 'request_create') {
      const modal = new ModalBuilder()
        .setCustomId('modal_request_create')
        .setTitle('Opret nyt request');

      const titleInput = new TextInputBuilder()
        .setCustomId('request_title')
        .setLabel('Navn på request')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Fx. Tjek vod fra tidligere');

      const limitedInput = new TextInputBuilder()
        .setCustomId('request_limited')
        .setLabel('Tidsbegrænset? (Ja / Nej)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Skriv Ja eller Nej');

      const deadlineInput = new TextInputBuilder()
        .setCustomId('request_deadline')
        .setLabel('Deadline (kun hvis begrænset)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('Fx. 12/04/2026');

      const descriptionInput = new TextInputBuilder()
        .setCustomId('request_description')
        .setLabel('Beskrivelse')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('Skriv en kort beskrivelse af opgaven');

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(limitedInput),
        new ActionRowBuilder().addComponents(deadlineInput),
        new ActionRowBuilder().addComponents(descriptionInput)
      );

      return interaction.showModal(modal);
    }

    if (customId.startsWith('request_approve_')) {
      const itemId = customId.replace('request_approve_', '');
      return interaction.reply({
        content: '⚠️ Er du sikker på at du vil **godkende dette request**?',
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`confirm_request_approve_${itemId}`)
              .setLabel('Ja, godkend')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`cancel_request_approve_${itemId}`)
              .setLabel('Annullér')
              .setStyle(ButtonStyle.Secondary)
          )
        ],
        ephemeral: true
      });
    }

    if (customId.startsWith('request_reject_')) {
      const itemId = customId.replace('request_reject_', '');

      const modal = new ModalBuilder()
        .setCustomId(`modal_request_reject_${itemId}`)
        .setTitle('Afvis request');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reject_reason')
        .setLabel('Begrundelse for afvisning')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Skriv hvorfor requestet bliver afvist');

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }

    if (customId.startsWith('cancel_request_approve_')) {
      return interaction.update({
        content: '❌ Godkendelse annulleret.',
        components: []
      });
    }

    if (customId.startsWith('confirm_request_approve_')) {
      const itemId = customId.replace('confirm_request_approve_', '');
      const item = findRequestItem(data, itemId);

      if (!item) {
        return interaction.update({
          content: '❌ Kunne ikke finde request.',
          components: []
        });
      }

      try {
        const queueChannel = await interaction.guild.channels.fetch(REQUEST_QUEUE_CHANNEL_ID);
        const activeChannel = await interaction.guild.channels.fetch(REQUEST_ACTIVE_CHANNEL_ID);

        const oldMessage = await queueChannel.messages.fetch(item.messageId).catch(() => null);

        item.status = 'active';
        item.approvedBy = interaction.user.id;
        item.approvedAt = Math.floor(Date.now() / 1000);

        const newMsg = await activeChannel.send({
          embeds: [getActiveRequestEmbed(item)],
          components: getActiveRequestButtons(item.id)
        });

        item.messageId = newMsg.id;
        item.channelId = REQUEST_ACTIVE_CHANNEL_ID;

        saveRequestItem(data, item);

        if (oldMessage) await oldMessage.delete().catch(() => {});

        return interaction.update({
          content: `✅ Request **${item.title}** blev godkendt og flyttet til aktiv.`,
          components: []
        });
      } catch (err) {
        console.error(err);
        return interaction.update({
          content: '❌ Noget gik galt ved godkendelse.',
          components: []
        });
      }
    }

    if (customId.startsWith('request_progress_')) {
      const itemId = customId.replace('request_progress_', '');

      const modal = new ModalBuilder()
        .setCustomId(`modal_request_progress_${itemId}`)
        .setTitle('Opdater progress');

      const progressInput = new TextInputBuilder()
        .setCustomId('progress_percent')
        .setLabel('Skriv procent (0-100)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('Fx. 20');

      modal.addComponents(new ActionRowBuilder().addComponents(progressInput));
      return interaction.showModal(modal);
    }

    if (customId.startsWith('request_complete_confirm_')) {
      const itemId = customId.replace('request_complete_confirm_', '');

      return interaction.reply({
        content: '⚠️ Er du sikker på at du vil markere projektet som **færdigt**?',
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`confirm_request_complete_${itemId}`)
              .setLabel('Ja, færdiggør')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`cancel_request_complete_${itemId}`)
              .setLabel('Annullér')
              .setStyle(ButtonStyle.Secondary)
          )
        ],
        ephemeral: true
      });
    }

    if (customId.startsWith('cancel_request_complete_')) {
      return interaction.update({
        content: '❌ Færdiggørelse annulleret.',
        components: []
      });
    }

    if (customId.startsWith('confirm_request_complete_')) {
      const itemId = customId.replace('confirm_request_complete_', '');
      const item = findRequestItem(data, itemId);

      if (!item) {
        return interaction.update({
          content: '❌ Kunne ikke finde projektet.',
          components: []
        });
      }

      try {
        const activeChannel = await interaction.guild.channels.fetch(REQUEST_ACTIVE_CHANNEL_ID);
        const completedChannel = await interaction.guild.channels.fetch(REQUEST_COMPLETED_CHANNEL_ID);

        const oldMessage = await activeChannel.messages.fetch(item.messageId).catch(() => null);

        item.status = 'completed';
        item.progress = 100;
        item.completedBy = interaction.user.id;
        item.completedAt = Math.floor(Date.now() / 1000);

        const newMsg = await completedChannel.send({
          content: `<@&${ROLE_ID}> 🏁 **Et projekt er nu færdigt!**`,
          embeds: [getCompletedRequestEmbed(item)]
        });

        item.messageId = newMsg.id;
        item.channelId = REQUEST_COMPLETED_CHANNEL_ID;

        saveRequestItem(data, item);

        if (oldMessage) await oldMessage.delete().catch(() => {});

        return interaction.update({
          content: `🏁 Projekt **${item.title}** er nu markeret som færdigt.`,
          components: []
        });
      } catch (err) {
        console.error(err);
        return interaction.update({
          content: '❌ Noget gik galt ved færdiggørelse.',
          components: []
        });
      }
    }

    // ---------- GENERIC CANCEL ----------
    if (customId.startsWith('cancel_')) {
      return interaction.update({
        content: '❌ Handlingen blev annulleret.',
        components: []
      });
    }
  }

  // =========================
  // MODALS
  // =========================
  if (interaction.isModalSubmit()) {
    // ---------- PLATFORM ADD ----------
    if (interaction.customId.startsWith('modal_add_')) {
      const type = interaction.customId.replace('modal_add_', '');
      const title = interaction.fields.getTextInputValue('upload_title');

      const upload = {
        id: `${Date.now()}`,
        title,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        timestamp: Math.floor(Date.now() / 1000)
      };

      data[type].uploads.push(upload);
      data[type].count = data[type].uploads.length;
      saveData(data);

      await updatePlatformMessage(interaction.guild, type);

      return interaction.reply({
        content: `✅ **${title}** blev tilføjet til ${getPlatformLabel(type)} trackeren.`,
        ephemeral: true
      });
    }

    // ---------- OVERVIEW TRANSCRIPT ----------
    if (interaction.customId === 'modal_overview_transcript') {
      const month = interaction.fields.getTextInputValue('transcript_month').toUpperCase();

      const transcriptEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`🧾 CONTENT TRANSCRIPT — ${month}`)
        .setDescription(
          [
            `### Månedligt content-overblik for **${month}**`,
            '',
            `📺 **YouTube Shorts:** ${data.ytshorts.count}`,
            `${data.ytshorts.uploads.length ? data.ytshorts.uploads.map(u => `• ${u.title}`).join('\n') : '• Ingen uploads'}`,
            '',
            `📸 **Instagram Reels:** ${data.reels.count}`,
            `${data.reels.uploads.length ? data.reels.uploads.map(u => `• ${u.title}`).join('\n') : '• Ingen uploads'}`,
            '',
            `🎵 **TikTok:** ${data.tiktok.count}`,
            `${data.tiktok.uploads.length ? data.tiktok.uploads.map(u => `• ${u.title}`).join('\n') : '• Ingen uploads'}`
          ].join('\n')
        )
        .setFooter({ text: `Genereret af ${interaction.user.tag}` })
        .setTimestamp();

      const transcriptChannel = await interaction.guild.channels.fetch(TRANSCRIPT_CHANNEL_ID);

      await transcriptChannel.send({
        content: `<@&${ROLE_ID}> 🧾 **Content transcript for ${month} er nu klar.**`,
        embeds: [transcriptEmbed]
      });

      return interaction.reply({
        content: `✅ Transcript for **${month}** blev sendt.`,
        ephemeral: true
      });
    }

    // ---------- REQUEST CREATE ----------
    if (interaction.customId === 'modal_request_create') {
      const title = interaction.fields.getTextInputValue('request_title');
      const limitedRaw = interaction.fields.getTextInputValue('request_limited').toLowerCase();
      const deadline = interaction.fields.getTextInputValue('request_deadline') || null;
      const description = interaction.fields.getTextInputValue('request_description') || 'Ingen beskrivelse angivet.';

      const isLimited = ['ja', 'yes', 'begrænset', 'begranset'].includes(limitedRaw);

      const item = {
        id: generateRequestId(),
        title,
        userId: interaction.user.id,
        createdAt: Math.floor(Date.now() / 1000),
        isLimited,
        deadline: isLimited ? (deadline || 'Ikke angivet') : null,
        description,
        status: 'queue',
        progress: 0,
        approvedBy: null,
        approvedAt: null,
        completedBy: null,
        completedAt: null,
        messageId: null,
        channelId: REQUEST_QUEUE_CHANNEL_ID
      };

      try {
        const queueChannel = await interaction.guild.channels.fetch(REQUEST_QUEUE_CHANNEL_ID);

        const msg = await queueChannel.send({
          embeds: [getQueueEmbed(item)],
          components: getQueueButtons(item.id)
        });

        item.messageId = msg.id;
        saveRequestItem(data, item);

        return interaction.reply({
          content: `✅ Dit request **${title}** blev sendt til køen.`,
          ephemeral: true
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: '❌ Noget gik galt ved oprettelse af request.',
          ephemeral: true
        });
      }
    }

    // ---------- REQUEST REJECT ----------
    if (interaction.customId.startsWith('modal_request_reject_')) {
      const itemId = interaction.customId.replace('modal_request_reject_', '');
      const item = findRequestItem(data, itemId);

      if (!item) {
        return interaction.reply({
          content: '❌ Kunne ikke finde request.',
          ephemeral: true
        });
      }

      const reason = interaction.fields.getTextInputValue('reject_reason');

      try {
        const queueChannel = await interaction.guild.channels.fetch(REQUEST_QUEUE_CHANNEL_ID);
        const oldMessage = await queueChannel.messages.fetch(item.messageId).catch(() => null);

        const user = await client.users.fetch(item.userId).catch(() => null);

        if (user) {
          await user.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('⛔ Dit request blev afvist')
                .setDescription(
                  [
                    `### ${item.title}`,
                    '',
                    `**Begrundelse:**`,
                    `${reason}`
                  ].join('\n')
                )
                .setTimestamp()
            ]
          }).catch(() => {});
        }

        if (oldMessage) await oldMessage.delete().catch(() => {});
        removeRequestItem(data, item.id);

        return interaction.reply({
          content: `⛔ Request **${item.title}** blev afvist.`,
          ephemeral: true
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: '❌ Noget gik galt ved afvisning.',
          ephemeral: true
        });
      }
    }

    // ---------- REQUEST PROGRESS ----------
    if (interaction.customId.startsWith('modal_request_progress_')) {
      const itemId = interaction.customId.replace('modal_request_progress_', '');
      const item = findRequestItem(data, itemId);

      if (!item) {
        return interaction.reply({
          content: '❌ Kunne ikke finde projekt.',
          ephemeral: true
        });
      }

      const raw = interaction.fields.getTextInputValue('progress_percent');
      const percent = parseInt(raw);

      if (isNaN(percent) || percent < 0 || percent > 100) {
        return interaction.reply({
          content: '⚠️ Du skal skrive et tal mellem **0 og 100**.',
          ephemeral: true
        });
      }

      item.progress = percent;
      saveRequestItem(data, item);

      try {
        const activeChannel = await interaction.guild.channels.fetch(REQUEST_ACTIVE_CHANNEL_ID);
        const msg = await activeChannel.messages.fetch(item.messageId);

        await msg.edit({
          embeds: [getActiveRequestEmbed(item)],
          components: getActiveRequestButtons(item.id)
        });

        return interaction.reply({
          content: `🏧 Progress for **${item.title}** blev opdateret til **${percent}%**.`,
          ephemeral: true
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content: '❌ Kunne ikke opdatere progress.',
          ephemeral: true
        });
      }
    }
  }

  // =========================
  // SELECT MENUS
  // =========================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('remove_select_')) {
      const type = interaction.customId.replace('remove_select_', '');
      const selectedId = interaction.values[0];

      const index = data[type].uploads.findIndex(u => u.id === selectedId);
      if (index === -1) {
        return interaction.update({
          content: '❌ Kunne ikke finde den valgte upload.',
          components: []
        });
      }

      const removed = data[type].uploads[index];
      data[type].uploads.splice(index, 1);
      data[type].count = data[type].uploads.length;
      saveData(data);

      await updatePlatformMessage(interaction.guild, type);

      return interaction.update({
        content: `🗑️ **${removed.title}** blev fjernet fra ${getPlatformLabel(type)} trackeren.`,
        components: []
      });
    }
  }
});

client.login(process.env.TOKEN);