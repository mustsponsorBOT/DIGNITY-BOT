// =========================
// DIGNITYBOT - VERSÃO COMPLETA E FINAL
// =========================

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const moment = require('moment');

// =========================
// CONFIGURAÇÕES GERAIS
// =========================
const PREFIX = '!';
const CANAL_REGRAS = 'regras';
const CANAL_REGISTO = 'registo';
const CANAL_COMANDOS = 'comandos';

// === CARGOS ===
const cargos = {
  admin: 'Admin',
  moderador: 'Moderador',
  streamer: 'STREAMER',
  membro: 'Membro da Comunidade',
  desconhecido: 'Desconhecido',
  join: 'Join'
};

// =========================
// INICIALIZAÇÃO DO CLIENTE
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// =========================
// BOT ONLINE
// =========================
client.once('ready', async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  console.log(`🔗 Conectado a ${client.guilds.cache.size} servidor(es)`);

  client.guilds.cache.forEach(async guild => {
    console.log(`🔗 Conectado ao servidor: ${guild.name}`);

    for (const key in cargos) {
      let role = guild.roles.cache.find(r => r.name === cargos[key]);
      if (!role) {
        role = await guild.roles.create({
          name: cargos[key],
          color: key === 'join' ? 'Gold' : 'Default',
          reason: 'Criar cargo necessário',
        });
        console.log(`✅ Cargo criado: ${cargos[key]}`);
      } else {
        console.log(`✅ Role já existe: ${cargos[key]}`);
      }
    }
  });
});

// =========================
// NOVO MEMBRO ENTRA
// =========================
client.on('guildMemberAdd', async member => {
  const cargoDesconhecido = member.guild.roles.cache.find(r => r.name === cargos.desconhecido);
  await member.roles.add(cargoDesconhecido);

  const canalRegisto = member.guild.channels.cache.find(c => c.name === CANAL_REGISTO);
  if (!canalRegisto) return;

  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle(`👋 Bem-vindo à comunidade Dignity Esports, ${member.user.username}!`)
    .setDescription('Para teres acesso ao servidor, lê as regras e confirma a tua identidade abaixo 👇')
    .setImage('https://i.imgur.com/Uue1yCk.png')
    .setTimestamp();

  const botao = new ButtonBuilder()
    .setCustomId('verificar')
    .setLabel('✅ Verificar Identidade')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(botao);

  await canalRegisto.send({ embeds: [embed], components: [row] });
});

// =========================
// CLIQUE NO BOTÃO DE VERIFICAÇÃO
// =========================
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'verificar') {
    const membro = interaction.member;
    const cargoDesconhecido = membro.guild.roles.cache.find(r => r.name === cargos.desconhecido);
    const cargoMembro = membro.guild.roles.cache.find(r => r.name === cargos.membro);

    await membro.roles.remove(cargoDesconhecido).catch(() => {});
    await membro.roles.add(cargoMembro).catch(() => {});

    await interaction.reply({ content: '✅ Verificação concluída! Bem-vindo à comunidade Dignity Esports!', ephemeral: true });
  }
});

// =========================
// COMANDOS
// =========================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const canalComandos = message.guild.channels.cache.find(c => c.name === CANAL_COMANDOS);
  if (!canalComandos) return;

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  // Se o comando for usado fora do canal correto
  if (message.channel.id !== canalComandos.id) {
    await message.delete().catch(() => {});
    return message.author.send(`⚠️ Usa os comandos apenas no canal **#${CANAL_COMANDOS}**.`);
  }

  switch (command) {
    case 'steam':
      return message.author.send('🎮 Steam: https://steamcommunity.com/id/musttopzor/');
    case 'faceit':
      return message.author.send('🔥 Faceit: https://www.faceit.com/pt/players/MUST');
    case 'tarkov':
      return message.author.send('🎯 Nome no Tarkov: Mustt');
    case 'donate':
      return message.author.send('💰 Donate: EM UPDATE');
    case 'twitch':
      return message.author.send('📺 Twitch: https://www.twitch.tv/mustt_tv');
    case 'tiktok':
      return message.author.send('🎬 TikTok: https://www.tiktok.com/@must_savage');
    case 'youtube':
      return message.author.send('▶️ YouTube: https://www.youtube.com/@Mustyzord');
    case 'instagram':
      return message.author.send('📸 Instagram: https://www.instagram.com/must_savage');
    case 'telegram':
      return message.author.send('💬 Telegram: https://t.me/+qKBbJZ-RQ5FlNTE0');
    case 'uptime': {
      const joinedAt = message.member.joinedAt;
      const agora = new Date();
      const diff = moment.duration(agora - joinedAt);
      const dias = diff.asDays().toFixed(0);
      return message.reply(`🕓 Entraste no servidor em **${moment(joinedAt).format('DD/MM/YYYY')}** — há aproximadamente **${dias} dias**!`);
    }
    default:
      return message.reply('❌ Comando inválido. Usa apenas os comandos disponíveis no canal de comandos.');
  }
});

// =========================
// TOKEN DO BOT
// =========================
// ⚠️ SUBSTITUI AQUI PELO TEU TOKEN REAL DO DISCORD ⚠️
client.login("BOT_TOKEN");

