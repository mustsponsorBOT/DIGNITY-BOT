// dignitybot-fixed.js
// Versão corrigida — ready for Render (usa BOT_TOKEN env var)

const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, PermissionFlagsBits } = require('discord.js');
const moment = require('moment');

// CONFIG
const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_ID = '567293649826873345';
const PREFIX = '!';
const VERIFY_CHANNEL_SUBSTRING = 'regras';        // encontra "📜・regras"
const REGISTER_CHANNEL_SUBSTRING = 'registo';     // encontra "🖊️・registo"
const COMMANDS_CHANNEL_SUBSTRING = 'comandos';    // encontra "‼️・comandos"
const ROLE_UNKNOWN = 'Desconhecido';
const ROLE_MEMBER = 'Membro da Comunidade';
const BANNER_URL = 'https://cdn.discordapp.com/attachments/1195070260017328238/1335249404831070258/banner.png';

// sanity
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN não definido. Define a env var BOT_TOKEN.');
  process.exit(1);
}

// client
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

// helpers
function findChannelBySubstring(guild, sub) {
  if (!guild || !guild.channels) return null;
  const key = (sub||'').toLowerCase();
  return guild.channels.cache.find(c => c.name && c.name.toLowerCase().includes(key));
}

async function safeDM(user, text) {
  try {
    await user.send(text);
    return true;
  } catch (e) {
    return false;
  }
}

// READY
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    if (!guild) {
      console.error('❌ Servidor com esse ID não encontrado.');
      return;
    }
    await guild.roles.fetch().catch(()=>{});
    await guild.channels.fetch().catch(()=>{});

    // ensure roles exist (but não altera posições)
    const rUnknown = guild.roles.cache.find(r => r.name === ROLE_UNKNOWN) || await guild.roles.create({ name: ROLE_UNKNOWN, reason: 'Criado por DignityBot' }).catch(()=>null);
    const rMember = guild.roles.cache.find(r => r.name === ROLE_MEMBER) || await guild.roles.create({ name: ROLE_MEMBER, reason: 'Criado por DignityBot' }).catch(()=>null);

    // locate channels (works with emojis)
    const regrasCh = findChannelBySubstring(guild, VERIFY_CHANNEL_SUBSTRING);
    const registoCh = findChannelBySubstring(guild, REGISTER_CHANNEL_SUBSTRING);
    const comandosCh = findChannelBySubstring(guild, COMMANDS_CHANNEL_SUBSTRING);

    if (!regrasCh) console.warn('⚠️ Canal de regras não encontrado (procure por substring "regras").');
    if (!registoCh) console.warn('⚠️ Canal de registo não encontrado (procure por substring "registo").');
    if (!comandosCh) console.warn('⚠️ Canal de comandos não encontrado (procure por substring "comandos").');

    // Apply basic permission: hide all channels from unknown role except regras
    if (rUnknown) {
      for (const [id,ch] of guild.channels.cache) {
        try {
          if (regrasCh && ch.id === regrasCh.id) {
            await ch.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: true, SendMessages: false }).catch(()=>{});
            await ch.permissionOverwrites.edit(rUnknown.id, { ViewChannel: true, SendMessages: false }).catch(()=>{});
            if (rMember) await ch.permissionOverwrites.edit(rMember.id, { ViewChannel: true }).catch(()=>{});
          } else {
            await ch.permissionOverwrites.edit(rUnknown.id, { ViewChannel: false }).catch(()=>{});
          }
        } catch(e){}
      }
    }

    // Create verification message in regras if not exists
    if (regrasCh && regrasCh.isTextBased()) {
      const messages = await regrasCh.messages.fetch({ limit: 50 }).catch(()=>null);
      const exists = messages && messages.find(m => m.author && m.author.id === client.user.id && m.components && m.components.length);
      if (!exists) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dignity_verify').setLabel('✅ Concordo com as regras').setStyle(ButtonStyle.Success)
        );
        await regrasCh.send({
          content: '👋 **Bem-vindo à Comunidade Dignity!**\nLê as regras abaixo e clica em **✅ Concordo com as regras** para teres acesso ao servidor.',
          components: [row]
        }).catch(e => console.error('Erro a enviar mensagem de verificação:', e));
        console.log('📩 Mensagem de verificação enviada em regras.');
      } else {
        console.log('🔁 Mensagem de verificação já existe em regras.');
      }
    }

    console.log('✅ Setup inicial concluído.');
  } catch (err) {
    console.error('Erro no ready:', err);
  }
});

// assign unknown role to new members
client.on('guildMemberAdd', async (member) => {
  try {
    if (member.user.bot) return;
    const rUnknown = member.guild.roles.cache.find(r => r.name === ROLE_UNKNOWN);
    if (rUnknown && !member.roles.cache.has(rUnknown.id)) {
      await member.roles.add(rUnknown).catch(e => console.warn('Falha a atribuir Desconhecido:', e));
    }
    // welcome in registo
    const registoCh = findChannelBySubstring(member.guild, REGISTER_CHANNEL_SUBSTRING);
    const regrasCh = findChannelBySubstring(member.guild, VERIFY_CHANNEL_SUBSTRING);
    if (registoCh && registoCh.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle(`👋 Bem-vindo ${member.user.username}!`)
        .setDescription(`Bem-vindo **${member.user.username}** à **Comunidade Dignity Esports**!\nLê as regras em ${regrasCh?`<#${regrasCh.id}>`:'#regras'} e confirma a tua identidade.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setImage(BANNER_URL)
        .setColor(0x00ADEF)
        .setTimestamp();
      await registoCh.send({ embeds: [embed] }).catch(()=>{});
    }
  } catch(e){
    console.error('Erro em guildMemberAdd:', e);
  }
});

// Interaction handler — verify button
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'dignity_verify') return;

  // Defer reply to avoid "interaction failed"
  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (e) {
    // can't defer — still attempt a reply
  }

  try {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id).catch(()=>null);
    if (!member) {
      if (!interaction.replied) await interaction.editReply?.({ content: '❌ Não consegui obter a tua conta no servidor.' }).catch(()=>{});
      return;
    }

    // ensure roles exist
    const rUnknown = guild.roles.cache.find(r => r.name === ROLE_UNKNOWN);
    const rMember = guild.roles.cache.find(r => r.name === ROLE_MEMBER);

    if (!rMember) {
      if (!interaction.replied) await interaction.editReply?.({ content: '❌ Cargo "Membro da Comunidade" não encontrado. Contacta um admin.' }).catch(()=>{});
      return;
    }

    // check bot permissions and role position
    const me = await guild.members.fetch(client.user.id);
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      if (!interaction.replied) await interaction.editReply?.({ content: '❌ O bot não tem permissão Manage Roles. Contacta um admin.' }).catch(()=>{});
      console.error('Bot sem ManageRoles');
      return;
    }
    // ensure bot role higher than rMember
    const botRolePos = me.roles.highest.position;
    const targetPos = rMember.position;
    if (botRolePos <= targetPos) {
      if (!interaction.replied) await interaction.editReply?.({ content: '❌ O cargo do bot está abaixo do cargo que pretende gerir. Move o cargo do bot para cima.' }).catch(()=>{});
      console.error('Bot role abaixo de target role');
      return;
    }

    // change roles quickly
    if (rUnknown && member.roles.cache.has(rUnknown.id)) {
      await member.roles.remove(rUnknown).catch(e => console.warn('Falha ao remover Desconhecido:', e));
    }
    if (!member.roles.cache.has(rMember.id)) {
      await member.roles.add(rMember).catch(e => console.warn('Falha ao adicionar Membro:', e));
    }

    // final reply
    if (interaction.deferred) {
      await interaction.editReply({ content: '✅ Verificação concluída! Bem-vindo à comunidade Dignity.' }).catch(()=>{});
    } else {
      await interaction.reply({ content: '✅ Verificação concluída! Bem-vindo à comunidade Dignity.', ephemeral: true }).catch(()=>{});
    }

    // notify registo channel
    const regCh = findChannelBySubstring(guild, REGISTER_CHANNEL_SUBSTRING);
    if (regCh && regCh.isTextBased()) {
      await regCh.send({ embeds: [ new EmbedBuilder().setTitle('🎉 Novo membro verificado!').setDescription(`<@${member.id}> foi verificado.`).setColor(0x00FF88).setTimestamp() ] }).catch(()=>{});
    }

    console.log(`${member.user.tag} verificado com sucesso.`);
  } catch (err) {
    console.error('Erro ao processar interação:', err);
    try {
      if (interaction.deferred) await interaction.editReply({ content: '❌ Ocorreu um erro interno.' }).catch(()=>{});
      else if (!interaction.replied) await interaction.reply({ content: '❌ Ocorreu um erro interno.', ephemeral: true }).catch(()=>{});
    } catch {}
  }
});

// Message handler — commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const guild = message.guild;
  const comandosCh = findChannelBySubstring(guild, COMMANDS_CHANNEL_SUBSTRING);
  const comunidadeCat = guild.channels.cache.find(c => c.type === 4 && c.name && c.name.toLowerCase().includes('comunidade dignity'));

  // if commands channel missing, ignore commands
  if (!comandosCh) return;

  // redirect commands used outside comandosCh
  if (message.content.startsWith(PREFIX) && message.channel.id !== comandosCh.id) {
    await message.delete().catch(()=>{});
    await safeDM(message.author, `⚠️ Usa o canal ${comandosCh.toString()} para comandos.`).catch(()=>{});
    return;
  }

  // block non-commands in community category (except regras/registo/comandos)
  if (comunidadeCat && message.channel.parentId === comunidadeCat.id && !message.content.startsWith(PREFIX)) {
    const chName = (message.channel.name||'').toLowerCase();
    if (!chName.includes('regras') && !chName.includes('registo') && !chName.includes('comandos')) {
      await message.delete().catch(()=>{});
      return;
    }
  }

  if (!message.content.startsWith(PREFIX)) return;
  const parts = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = parts.shift().toLowerCase();

  try {
    switch (cmd) {
      case 'steam':
        await safeDM(message.author, `🎮 Steam: https://steamcommunity.com/id/musttopzor/`);
        break;
      case 'faceit':
        await safeDM(message.author, `🔥 Faceit: https://www.faceit.com/pt/players/MUST`);
        break;
      case 'tarkov':
        await safeDM(message.author, `🎯 Nome no Tarkov: Mustt`);
        break;
      case 'uptime':
        (async () => {
          try {
            const member = message.member;
            if (!member || !member.joinedAt) { await safeDM(message.author, '❌ Não consegui obter a data de entrada.'); return; }
            const joined = member.joinedAt;
            const now = new Date();
            const diffMs = now - joined;
            const days = Math.floor(diffMs / (1000*60*60*24));
            const hours = Math.floor((diffMs / (1000*60*60)) % 24);
            const mins = Math.floor((diffMs / (1000*60)) % 60);
            const joinedStr = joined.toLocaleString('pt-PT');
            await safeDM(message.author, `🕒 Primeiro dia no servidor: ${joinedStr}\n⏱️ Tempo desde então: ${days} dias, ${hours} horas e ${mins} minutos.`);
          } catch(e){ console.error('uptime err', e); }
        })();
        break;
      case 'donate':
        await safeDM(message.author, `💸 Donate: EM UPDATE`);
        break;
      case 'twitch':
        await safeDM(message.author, `📺 Twitch: https://www.twitch.tv/mustt_tv`);
        break;
      case 'tiktok':
        await safeDM(message.author, `🎬 TikTok: https://www.tiktok.com/@must_savage`);
        break;
      case 'youtube':
        await safeDM(message.author, `📺 YouTube: https://www.youtube.com/@Mustyzord`);
        break;
      case 'instagram':
        await safeDM(message.author, `📸 Instagram: https://www.instagram.com/must_savage`);
        break;
      case 'telegram':
        await safeDM(message.author, `💬 Telegram: http://t.me/+qKBbJZ-RQ5FINTE0`);
        break;
      default:
        await safeDM(message.author, '❓ Comando não reconhecido. Usa: !steam, !faceit, !tarkov, !uptime, !donate, !twitch, !tiktok, !youtube, !instagram, !telegram');
    }
  } catch (err) {
    console.error('Erro ao processar comando:', err);
  } finally {
    // delete the original command to keep channel clean
    if (message.deletable) await message.delete().catch(()=>{});
  }
});

// login
client.login(BOT_TOKEN).then(() => console.log('login ok')).catch(e => console.error('Erro no login:', e));
