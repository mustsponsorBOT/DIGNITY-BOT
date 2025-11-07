// dignitybot-full.js
// DIGNITYBOT — Código completo (setup automático de permissões + verificação + comandos)
// 1) Define BOT_TOKEN em Environment Variables (Render / .env): BOT_TOKEN=teu_token_aqui
// 2) Coloca este ficheiro na raiz do projecto. package.json deve apontar para este ficheiro.
// 3) Não partilhes o token publicamente.

const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

// -------- CONFIG --------
const BOT_TOKEN = process.env.BOT_TOKEN; // required
const SERVER_ID = '567293649826873345';   // teu servidor
const PREFIX = '!';
const VERIFIED_FILE = path.join(__dirname, 'verified.json');

// Canais / categorias (procurados por substring, para aceitar emojis/prefixos)
const CATEGORY_NAME_COMUNIDADE = 'comunidade dignity'; // procura case-insensitive
const CHANNEL_NAME_REGRAS = 'regras';
const CHANNEL_NAME_REGISTO = 'registo';
const CHANNEL_NAME_COMANDOS = 'comandos';
const CHANNEL_NAME_LOGS = 'logs'; // opcional: se existir, envia logs de verificação aqui

// Roles (exact names)
const ROLE_DESCONHECIDO = 'Desconhecido';
const ROLE_MEMBRO = 'Membro da Comunidade';
const ROLE_JOIN = 'Join';
const ROLE_MOD = 'Moderador';
const ROLE_ADMIN = 'Admin';
const ROLE_STREAMER = 'STREAMER';

// Banner para embed de boas-vindas (opcional)
const BANNER_URL = 'https://cdn.discordapp.com/attachments/1195070260017328238/1335249404831070258/banner.png';

// LINKS de comandos
const COMMAND_LINKS = {
  steam: 'https://steamcommunity.com/id/musttopzor/',
  faceit: 'https://www.faceit.com/pt/players/MUST',
  tarkov: 'Nome do Tarkov: Mustt',
  donate: 'EM UPDATE',
  twitch: 'https://www.twitch.tv/mustt_tv',
  tiktok: 'https://www.tiktok.com/@must_savage',
  youtube: 'https://www.youtube.com/@Mustyzord',
  instagram: 'https://www.instagram.com/must_savage',
  telegram: 'http://t.me/+qKBbJZ-RQ5FINTE0'
};

// -------- util: verified storage --------
function loadVerified() {
  try {
    if (!fs.existsSync(VERIFIED_FILE)) return {};
    return JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8'));
  } catch (e) {
    console.error('Erro a ler verified.json', e);
    return {};
  }
}
function saveVerified(obj) {
  try {
    fs.writeFileSync(VERIFIED_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error('Erro a gravar verified.json', e);
  }
}

// -------- client --------
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN não definido. Define a variável de ambiente BOT_TOKEN com o token do bot.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel]
});

// helper: find channel by substring (case-insensitive)
function findChannelByName(guild, substring) {
  if (!guild || !guild.channels) return null;
  const key = (substring || '').toLowerCase();
  return guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes(key));
}

// helper: find category by substring (case-insensitive)
function findCategoryByName(guild, substring) {
  if (!guild || !guild.channels) return null;
  const key = (substring || '').toLowerCase();
  return guild.channels.cache.find(c => c.type === 4 && c.name && c.name.toLowerCase().includes(key));
}

// helper: ensure role exists and return it
async function ensureRole(guild, name, options = {}) {
  let r = guild.roles.cache.find(x => x.name === name);
  if (!r) {
    r = await guild.roles.create({ name, ...options, reason: 'Criado pelo DignityBot (setup)' });
    console.log(`🆕 Role criada: ${name}`);
  }
  return r;
}

// helper: apply permission overwrite for a channel object
async function setOverwrite(channel, roleId, allow = [], deny = []) {
  if (!channel || !channel.permissionOverwrites) return;
  try {
    await channel.permissionOverwrites.edit(roleId, { allow, deny }).catch(() => {});
  } catch (e) {
    // ignore
  }
}

// ---------- ON READY: setup roles, perms, message ----------
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    if (!guild) {
      console.error('❌ Servidor não encontrado com o ID fornecido.');
      return;
    }
    await guild.roles.fetch().catch(()=>{});
    await guild.channels.fetch().catch(()=>{});

    // Ensure core roles exist
    const rDesconhecido = await ensureRole(guild, ROLE_DESCONHECIDO);
    const rMembro = await ensureRole(guild, ROLE_MEMBRO);
    const rJoin = await ensureRole(guild, ROLE_JOIN);
    const rMod = await ensureRole(guild, ROLE_MOD);
    const rAdmin = await ensureRole(guild, ROLE_ADMIN);
    await ensureRole(guild, ROLE_STREAMER);

    // Find channels & category (works with emojis because we use includes)
    const categoriaCom = findCategoryByName(guild, CATEGORY_NAME_COMUNIDADE);
    const regrasChannel = findChannelByName(guild, CHANNEL_NAME_REGRAS);
    const registoChannel = findChannelByName(guild, CHANNEL_NAME_REGISTO);
    const comandosChannel = findChannelByName(guild, CHANNEL_NAME_COMANDOS);
    const logsChannel = findChannelByName(guild, CHANNEL_NAME_LOGS);

    if (!regrasChannel) console.warn(`⚠️ Canal contendo "${CHANNEL_NAME_REGRAS}" não encontrado.`);
    if (!registoChannel) console.warn(`⚠️ Canal contendo "${CHANNEL_NAME_REGISTO}" não encontrado.`);
    if (!comandosChannel) console.warn(`⚠️ Canal contendo "${CHANNEL_NAME_COMANDOS}" não encontrado.`);

    // --- PERMISSIONS SETUP: hide everything from Desconhecido except regras ---
    // We'll iterate all channels and set overwrite for Desconhecido to VIEW false (except regras)
    for (const [id, ch] of guild.channels.cache) {
      // skip categories for now
      try {
        if (ch.id === regrasChannel?.id) {
          // regras: everyone VIEW true, Desconhecido VIEW true, disable send for everyone
          await ch.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: true, SendMessages: false }).catch(()=>{});
          await ch.permissionOverwrites.edit(rDesconhecido.id, { ViewChannel: true, SendMessages: false }).catch(()=>{});
          await ch.permissionOverwrites.edit(rMembro.id, { ViewChannel: true }).catch(()=>{});
        } else {
          // hide from Desconhecido
          await ch.permissionOverwrites.edit(rDesconhecido.id, { ViewChannel: false }).catch(()=>{});
        }
      } catch (e) {
        // continue
      }
    }

    // Ensure Join role can view/connect/send everywhere
    for (const [id, ch] of guild.channels.cache) {
      try {
        await ch.permissionOverwrites.edit(rJoin.id, { ViewChannel: true, SendMessages: true, Connect: true, Speak: true }).catch(()=>{});
      } catch(e){}
    }

    // Make sure bot role is above Membro and Desconhecido in hierarchy — we can't change hierarchy programmatically safely here.
    console.log('🔧 Permissões iniciais aplicadas (Desconhecido escondido nas salas, regras visível).');

    // Prepare verification button message in regrasChannel (if found)
    if (regrasChannel && regrasChannel.isTextBased()) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('dignity_verify')
          .setLabel('✅ Concordo com as regras')
          .setStyle(ButtonStyle.Success)
      );

      // Only send if bot hasn't already sent a message with a component there
      const fetched = await regrasChannel.messages.fetch({ limit: 30 }).catch(()=>null);
      const exists = fetched && fetched.find(m => m.author && m.author.id === client.user.id && m.components && m.components.length);
      if (!exists) {
        await regrasChannel.send({
          content: '👋 **Bem-vindo à Comunidade Dignity!**\n\nLê as regras abaixo e clica em **✅ Concordo com as regras** para aceder ao servidor.',
          components: [row]
        }).catch(e => console.error('Erro ao enviar mensagem de verificação:', e));
        console.log('📩 Mensagem de verificação enviada em regras.');
      } else {
        console.log('🔁 Mensagem de verificação já existe em regras.');
      }
    }

    // Log setup complete
    console.log('✅ Setup inicial completo: roles, permissões e mensagem de verificação (se canal encontrado).');

    // Optional: send a message to logs channel that bot restarted
    if (logsChannel && logsChannel.isTextBased()) {
      logsChannel.send(`🔁 DignityBot reiniciado e configurado às ${new Date().toLocaleString()}`).catch(()=>{});
    }

  } catch (err) {
    console.error('Erro no ready handler:', err);
  }
});

// ---------- When new member joins: give Desconhecido and welcome in registo ----------
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    if (member.user.bot) return;
    const guild = member.guild;
    const rDesconhecido = guild.roles.cache.find(r => r.name === ROLE_DESCONHECIDO);
    if (rDesconhecido) {
      await member.roles.add(rDesconhecido).catch(()=>{});
    }

    // send welcome embed in registo channel
    const registoChannel = findChannelByName(guild, CHANNEL_NAME_REGISTO);
    const regrasChannel = findChannelByName(guild, CHANNEL_NAME_REGRAS);
    if (registoChannel && registoChannel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle(`👋 Bem-vindo ${member.user.username}!`)
        .setDescription(`Bem-vindo **${member.user.username}** à **Comunidade Dignity Esports**!\nLê as regras em ${regrasChannel ? `<#${regrasChannel.id}>` : `#${CHANNEL_NAME_REGRAS}`} e clica em **✅ Concordo com as regras** para teres acesso ao servidor.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(BANNER_URL)
        .setColor(0x00ADEF)
        .setTimestamp();
      await registoChannel.send({ embeds: [embed] }).catch(()=>{});
    }
  } catch (e) {
    console.error('Erro em GuildMemberAdd:', e);
  }
});

// ---------- Interaction (button) handler: verification ----------
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "verify_button") return;

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const roleDesconhecido = interaction.guild.roles.cache.find(r => r.name === "Desconhecido");
    const roleMembro = interaction.guild.roles.cache.find(r => r.name === "Membro da Comunidade");

    if (!roleDesconhecido || !roleMembro) {
      return interaction.reply({ content: "❌ Um dos cargos não existe!", ephemeral: true });
    }

    await member.roles.remove(roleDesconhecido).catch(() => {});
    await member.roles.add(roleMembro).catch(() => {});

    // **Responder imediatamente ao Discord**
    await interaction.reply({ content: "✅ Verificação concluída!", ephemeral: true });

    // Enviar mensagem no canal #registo
    const registoChannel = interaction.guild.channels.cache.find(c => c.name === "🖊️・registo");
    if (registoChannel) {
      await registoChannel.send({
        content: `🎉 Bem-vindo ${interaction.user} à comunidade Dignity Esports!`
      });
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Ocorreu um erro, contacta um admin.", ephemeral: true });
    }
  }
});

    console.log(`🖱️ ${interaction.user.tag} clicou no botão de verificação.`);

    // Basic permission check for bot
    const guild = interaction.guild;
    const me = await guild.members.fetch(client.user.id);
    // check if bot can manage roles
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: '❌ Erro: o bot não tem permissão para gerir roles. Contacta um admin.', ephemeral: true });
      console.error('Bot não tem ManageRoles');
      return;
    }

    // fetch member and roles
    const member = await guild.members.fetch(interaction.user.id).catch(()=>null);
    if (!member) {
      await interaction.reply({ content: '❌ Erro: não consegui obter a tua conta no servidor. Tenta de novo.', ephemeral: true });
      return;
    }

    const rDesconhecido = guild.roles.cache.find(r => r.name === ROLE_DESCONHECIDO);
    const rMembro = guild.roles.cache.find(r => r.name === ROLE_MEMBRO);

    if (!rMembro) {
      await interaction.reply({ content: '❌ Erro: cargo "Membro da Comunidade" não encontrado. Contacta um admin.', ephemeral: true });
      return;
    }

    // Attempt to remove unknown and add member role
    if (rDesconhecido && member.roles.cache.has(rDesconhecido.id)) {
      try { await member.roles.remove(rDesconhecido); } catch (e) { console.warn('Falha a remover Desconhecido:', e); }
    }
    if (!member.roles.cache.has(rMembro.id)) {
      try { await member.roles.add(rMembro); } catch (e) { console.warn('Falha a adicionar Membro:', e); }
    }

    // persist verification record
    const verified = loadVerified();
    verified[member.id] = { tag: member.user.tag, verifiedAt: new Date().toISOString() };
    saveVerified(verified);

    await interaction.reply({ content: '✅ Verificação concluída! Bem-vindo à comunidade Dignity.', ephemeral: true });

    // send welcome message in registo
    const registoChannel = findChannelByName(guild, CHANNEL_NAME_REGISTO);
    if (registoChannel && registoChannel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Novo membro verificado!')
        .setDescription(`Bem-vindo <@${member.id}> à **Comunidade Dignity Esports**!`)
        .setImage(BANNER_URL)
        .setColor(0x00FF88)
        .setTimestamp();
      await registoChannel.send({ embeds: [embed] }).catch(()=>{});
    }

    // optional: logs channel
    const logsChannel = findChannelByName(guild, CHANNEL_NAME_LOGS);
    if (logsChannel && logsChannel.isTextBased()) {
      await logsChannel.send(`✅ ${member.user.tag} verificado às ${new Date().toLocaleString()}`).catch(()=>{});
    }

    console.log(`✔️ ${member.user.tag} verificado.`);
  } catch (err) {
    console.error('Erro em InteractionCreate (verify):', err);
    try { if (interaction && interaction.reply) await interaction.reply({ content: '❌ Erro interno durante a verificação.', ephemeral: true }); } catch {}
  }
});

// ---------- Message handler: commands and enforcement ----------
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return; // ignore DMs here (commands are DM responses)

    const guild = message.guild;

    // find channels and category by includes (works with emojis)
    const comandosChannel = findChannelByName(guild, CHANNEL_NAME_COMANDOS); // e.g., "‼️・comandos"
    const comunidadeCategory = findCategoryByName(guild, CATEGORY_NAME_COMUNIDADE); // e.g., "💬・COMUNIDADE DIGNITY"

    // If message is a command (starts with !)
    if (message.content.startsWith(PREFIX)) {
      // If comandos channel exists and message not in that channel -> delete + DM redirect
      if (comandosChannel && message.channel.id !== comandosChannel.id) {
        await message.delete().catch(()=>{});
        try {
          await message.author.send(`⚠️ Os comandos só podem ser utilizados em ${comandosChannel}. Por favor usa esse canal.`).catch(()=>{});
        } catch {}
        return;
      }

      // If comandosChannel is not found, allow (but recommend to create)
      if (!comandosChannel) {
        await message.author.send('⚠️ Canal de comandos não configurado no servidor. Contacta um admin.').catch(()=>{});
        await message.delete().catch(()=>{});
        return;
      }

      // Process commands (only when inside comandosChannel)
      const raw = message.content.trim();
      const args = raw.slice(PREFIX.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      // Map commands to DM responses
      switch (cmd) {
        case 'steam':
          await message.author.send(`🎮 Steam: ${COMMAND_LINKS.steam}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'faceit':
          await message.author.send(`🔥 Faceit: ${COMMAND_LINKS.faceit}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'tarkov':
          await message.author.send(`🪖 ${COMMAND_LINKS.tarkov}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'uptime':
          {
            const member = message.member;
            if (!member || !member.joinedAt) {
              await message.author.send('❌ Não consegui obter a data de entrada no servidor.').catch(()=>{});
              break;
            }
            const joined = member.joinedAt;
            const now = new Date();
            const diffMs = now - joined;
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
            const joinedStr = joined.toLocaleString('pt-PT');
            try {
  await message.author.send(`🕒 Primeiro dia no servidor: ${joinedStr}\n⏱️ Tempo desde então: ${days} dias, ${hours} horas e ${minutes} minutos.`);
} catch (err) {
  message.reply('❌ Não consegui enviar DM.');
}
          }
          break;
        case 'donate':
          await message.author.send(`💸 Donate: ${COMMAND_LINKS.donate}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'twitch':
          await message.author.send(`📺 Twitch: ${COMMAND_LINKS.twitch}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'tiktok':
          await message.author.send(`🎬 TikTok: ${COMMAND_LINKS.tiktok}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'youtube':
          await message.author.send(`▶️ YouTube: ${COMMAND_LINKS.youtube}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'instagram':
          await message.author.send(`📸 Instagram: ${COMMAND_LINKS.instagram}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        case 'telegram':
        case '!telegram':
        case '!!telegram':
          await message.author.send(`💬 Telegram: ${COMMAND_LINKS.telegram}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
          break;
        default:
          await message.author.send('❓ Comando não reconhecido. Usa: !steam, !faceit, !tarkov, !uptime, !donate, !twitch, !tiktok, !youtube, !instagram, !telegram.').catch(()=>{});
          break;
      }

      // delete the command message to keep history clean
      await message.delete().catch(()=>{});

      console.log(`📩 Comando ${cmd} usado por ${message.author.tag}`);
      return;
    } // end processing commands

    // If it's a normal message inside COMUNIDADE DIGNITY category -> delete (only allow commands there)
    if (comunidadeCategory && message.channel.parentId === comunidadeCategory.id) {
      // allow bots & allow messages in registo/regras/comandos but others are removed
      const channelNameLower = (message.channel.name || '').toLowerCase();
      if (!channelNameLower.includes('regras') && !channelNameLower.includes('registo') && !channelNameLower.includes('comandos')) {
        await message.delete().catch(()=>{});
        return;
      }
    }

  } catch (err) {
    console.error('Erro em MessageCreate:', err);
  }
});

// ---------- final: login ----------
client.login(BOT_TOKEN).then(() => {
  console.log('Log in initiated...');
}).catch(err => {
  console.error('Erro ao iniciar sessão do bot (Token inválido?):', err);
});


