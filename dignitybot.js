// dignitybot.js — Código completo DIGNITYBOT (verificação + comandos)
// Usa variável de ambiente BOT_TOKEN -> process.env.BOT_TOKEN

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
  EmbedBuilder
} = require('discord.js');

const TOKEN = process.env.BOT_TOKEN; // <-- AQUI está a linha que pediste
const SERVER_ID = "567293649826873345";

// Se preferires usar IDs em vez de nomes, coloca os IDs aqui.
// Exemplo: const CHANNEL_ID_REGRAS = "123456789012345678";
const CHANNEL_NAME_REGRAS = "regras";
const CHANNEL_NAME_REGISTO = "registo";
const CHANNEL_NAME_COMANDOS = "comandos";

// Banner para embed de boas-vindas (pode substituir por outro link)
const BANNER_URL = "https://cdn.discordapp.com/attachments/1195070260017328238/1335249404831070258/banner.png";

// ficheiro para guardar verificações (opcional)
const VERIFIED_FILE = path.join(__dirname, 'verified.json');
function loadVerified() {
  try { if (!fs.existsSync(VERIFIED_FILE)) return {}; return JSON.parse(fs.readFileSync(VERIFIED_FILE,'utf8')); }
  catch (e) { return {}; }
}
function saveVerified(obj) {
  try { fs.writeFileSync(VERIFIED_FILE, JSON.stringify(obj, null, 2), 'utf8'); }
  catch (e) { console.error('Erro a gravar verified.json', e); }
}

// Links/respostas dos comandos
const COMMAND_LINKS = {
  steam: "https://steamcommunity.com/id/musttopzor/",
  faceit: "https://www.faceit.com/pt/players/MUST",
  tarkov: "Nome do Tarkov: Mustt",
  donate: "EM UPDATE",
  twitch: "https://www.twitch.tv/mustt_tv",
  tiktok: "https://www.tiktok.com/@must_savage",
  youtube: "https://www.youtube.com/@Mustyzord",
  instagram: "https://www.instagram.com/must_savage",
  telegram: "http://t.me/+qKBbJZ-RQ5FINTE0"
};

// cria cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// util para encontrar canal por nome (case-insensitive, procura inclui)
function findChannelByName(guild, name) {
  if (!guild || !guild.channels) return null;
  name = (name || "").toLowerCase();
  return guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes(name));
}

// === evento ready ===
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    await guild.roles.fetch().catch(()=>{});
    await guild.channels.fetch().catch(()=>{});

    // garante roles existam
    const ensureRole = async (name) => {
      let r = guild.roles.cache.find(x => x.name === name);
      if (!r) r = await guild.roles.create({ name, reason: 'Criado por DignityBot (setup)' });
      return r;
    };

    const roleDesconhecido = await ensureRole("Desconhecido");
    const roleMembro = await ensureRole("Membro da Comunidade");
    const roleJoin = await ensureRole("Join");
    // (outros roles se necessário)

    // prepara mensagem de verificação no canal regras
    const regrasChannel = findChannelByName(guild, CHANNEL_NAME_REGRAS);
    if (!regrasChannel) {
      console.warn(`⚠️ Canal com nome incluindo "${CHANNEL_NAME_REGRAS}" não encontrado. Cria um canal com esse nome.`);
    } else {
      // tornar canal de regras visível a todos e sem enviar
      await regrasChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true, SendMessages: false }).catch(()=>{});
      await regrasChannel.permissionOverwrites.edit(roleDesconhecido, { ViewChannel: true, SendMessages: false }).catch(()=>{});
      await regrasChannel.permissionOverwrites.edit(roleMembro, { ViewChannel: true }).catch(()=>{});

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dignity_verify').setLabel('✅ Concordo com as regras').setStyle(ButtonStyle.Success)
      );

      const msgs = await regrasChannel.messages.fetch({ limit: 30 }).catch(()=>null);
      const exists = msgs && msgs.find(m => m.author && m.author.id === client.user.id && m.components && m.components.length);
      if (!exists) {
        await regrasChannel.send({
          content: "👋 **Bem-vindo à Comunidade Dignity!**\n\nLê as regras e clica abaixo para confirmares a tua identidade e desbloqueares o resto do servidor.",
          components: [row]
        }).catch(e => console.error('Erro a enviar mensagem de verificação:', e));
        console.log('📩 Mensagem de verificação publicada em regras.');
      } else {
        console.log('🔁 Mensagem de verificação já existe em regras.');
      }
    }

    // Aplica permissões iniciais: esconde todos os canais ao role "Desconhecido" exceto regras
    for (const [id, channel] of guild.channels.cache) {
      if (!channel || !channel.name) continue;
      if (channel.name.toLowerCase().includes(CHANNEL_NAME_REGRAS)) continue; // deixa regras visível
      await channel.permissionOverwrites.edit(roleDesconhecido, { ViewChannel: false }).catch(()=>{});
    }

    // Garante que role Join tem acesso total (view/send/connect)
    for (const [id, channel] of guild.channels.cache) {
      await channel.permissionOverwrites.edit(roleJoin, { ViewChannel: true, SendMessages: true, Connect: true, Speak: true }).catch(()=>{});
    }

    console.log('✅ Setup inicial concluído (roles, permissões e mensagem de verificação).');
  } catch (err) {
    console.error('Erro no ready:', err);
  }
});

// === novo membro entra ===
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const guild = member.guild;
    const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
    if (roleDesconhecido) await member.roles.add(roleDesconhecido).catch(()=>{});

    // send welcome embed in registo
    const registo = findChannelByName(guild, CHANNEL_NAME_REGISTO);
    const regras = findChannelByName(guild, CHANNEL_NAME_REGRAS);
    if (registo && registo.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle(`👋 Bem-vindo ${member.user.username}!`)
        .setDescription(`Bem-vindo **${member.user.username}** à **Comunidade Dignity Esports**!\nLê as regras em ${regras ? `<#${regras.id}>` : '`#regras`'} e confirma a tua identidade.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(BANNER_URL)
        .setColor(0x00ADEF)
        .setTimestamp();
      await registo.send({ embeds: [embed] }).catch(()=>{ console.warn('Não foi possível enviar embed de registo'); });
    }
  } catch (e) {
    console.error('Erro em GuildMemberAdd:', e);
  }
});

// === clique no botão de verificação ===
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'dignity_verify') return;

    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);
    const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
    const roleMembro = guild.roles.cache.find(r => r.name === "Membro da Comunidade");

    if (!roleMembro) {
      await interaction.reply({ content: '❌ Role "Membro da Comunidade" não encontrada. Contacta um admin.', ephemeral: true });
      return;
    }

    if (roleDesconhecido && member.roles.cache.has(roleDesconhecido.id)) {
      await member.roles.remove(roleDesconhecido).catch(()=>{});
    }
    if (!member.roles.cache.has(roleMembro.id)) {
      await member.roles.add(roleMembro).catch(()=>{});
    }

    // save verified
    const verified = loadVerified();
    verified[member.id] = { tag: member.user.tag, verifiedAt: new Date().toISOString() };
    saveVerified(verified);

    await interaction.reply({ content: '✅ Verificação concluída! Bem-vindo à comunidade Dignity.', ephemeral: true });

    // send confirmation in registo
    const registo = findChannelByName(guild, CHANNEL_NAME_REGISTO);
    if (registo && registo.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Novo membro verificado!')
        .setDescription(`Bem-vindo <@${member.id}> à **Comunidade Dignity Esports**!`)
        .setImage(BANNER_URL)
        .setColor(0x00FF88)
        .setTimestamp();
      await registo.send({ embeds: [embed] }).catch(()=>{});
    }

    console.log(`✔️ ${member.user.tag} verificado.`);
  } catch (err) {
    console.error('Erro em InteractionCreate:', err);
    try { if (interaction && interaction.reply) await interaction.reply({ content: '❌ Erro interno.', ephemeral: true }); } catch {}
  }
});

// === comandos (apenas no canal "comandos") ===
client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guild = message.guild;
    const comandosChannel = findChannelByName(guild, CHANNEL_NAME_COMANDOS);
    if (!comandosChannel) {
      // se canal de comandos não existir, ignora (ou podes avisar)
      console.warn(`Canal de comandos (${CHANNEL_NAME_COMANDOS}) não encontrado.`);
      return;
    }

    const content = message.content.trim();
    if (!content.startsWith('!')) return;

    // se mensagem foi enviada fora do canal de comandos -> apagar e DM redirecionamento
    if (message.channel.id !== comandosChannel.id) {
      await message.delete().catch(()=>{});
      try {
        await message.author.send(`⚠️ Os comandos só funcionam no canal ${comandosChannel}. Por favor usa esse canal.`).catch(()=>{});
      } catch {}
      return;
    }

    const cmd = content.toLowerCase();

    // comandos que enviam DM com links/info
    if (cmd === '!steam') {
      await message.author.send(`🎮 Steam: ${COMMAND_LINKS.steam}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!faceit') {
      await message.author.send(`🔥 Faceit: ${COMMAND_LINKS.faceit}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!tarkov') {
      await message.author.send(`🪖 ${COMMAND_LINKS.tarkov}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!donate') {
      await message.author.send(`💸 Donate: ${COMMAND_LINKS.donate}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!twitch') {
      await message.author.send(`📺 Twitch: ${COMMAND_LINKS.twitch}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!tiktok') {
      await message.author.send(`🎬 TikTok: ${COMMAND_LINKS.tiktok}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!youtube') {
      await message.author.send(`▶️ YouTube: ${COMMAND_LINKS.youtube}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!instagram') {
      await message.author.send(`📸 Instagram: ${COMMAND_LINKS.instagram}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    if (cmd === '!telegram' || cmd === '!!telegram') {
      await message.author.send(`💬 Telegram: ${COMMAND_LINKS.telegram}`).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    // uptime: calcula tempo desde que entrou no servidor
    if (cmd === '!uptime') {
      const member = message.member;
      if (!member || !member.joinedAt) {
        await message.author.send('❌ Não consegui obter a data de entrada no servidor.').catch(()=>{});
        await message.delete().catch(()=>{});
        return;
      }
      const joined = member.joinedAt;
      const now = new Date();
      const diffMs = now - joined;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const joinedStr = joined.toLocaleString('pt-PT');
      const reply = `🕒 Primeiro dia no servidor: ${joinedStr}\n⏱️ Tempo desde então: ${days} dias, ${hours} horas e ${minutes} minutos.`;
      await message.author.send(reply).catch(async ()=> { await message.reply('❌ Não consegui enviar DM.'); });
      await message.delete().catch(()=>{});
      return;
    }

    // comando desconhecido
    await message.author.send('❌ Comando não reconhecido. Comandos válidos: !steam, !faceit, !tarkov, !uptime, !donate, !twitch, !tiktok, !youtube, !instagram, !telegram.').catch(()=>{});
    await message.delete().catch(()=>{});
    return;

  } catch (e) {
    console.error('Erro em MessageCreate:', e);
  }
});

// login
if (!TOKEN) {
  console.error('❌ BOT_TOKEN não definido. Define a variável de ambiente BOT_TOKEN com o token do bot.');
  process.exit(1);
}
client.login(TOKEN).catch(err => {
  console.error('Erro ao iniciar sessão do bot (Token inválido?):', err);
});
