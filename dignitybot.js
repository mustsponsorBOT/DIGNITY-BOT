// dignitybot.js

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const moment = require("moment");
const express = require("express");

// ===============================
// CONFIGURAÇÕES
// ===============================
const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_ID = "567293649826873345";
const PREFIX = "!";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===============================
// INICIALIZAÇÃO DO BOT
// ===============================
client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(SERVER_ID);

    // ===== ROLES =====
    const getOrCreateRole = async (name, color) => {
      let role = guild.roles.cache.find(r => r.name === name);
      if (!role) role = await guild.roles.create({ name, color, reason: "Setup inicial" });
      return role;
    };

    const roleAdmin = await getOrCreateRole("Admin", "Red");
    const roleMod = await getOrCreateRole("Moderador", "Blue");
    const roleStreamer = await getOrCreateRole("STREAMER", "Green");
    const roleMembro = await getOrCreateRole("Membro da Comunidade", "Grey");
    const roleDesconhecido = await getOrCreateRole("Desconhecido", "DarkGrey");
    const roleJoin = await getOrCreateRole("Join", "Orange");

    console.log("🎭 Roles verificadas/criadas.");

    // ===== CANAL REGRAS =====
    const regrasChannel = guild.channels.cache.find(c => c.name.includes("regras"));
    if (regrasChannel) {
      await regrasChannel.permissionOverwrites.set([
        { id: guild.roles.everyone.id, deny: ["ViewChannel", "SendMessages"] },
        { id: roleDesconhecido.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleMembro.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleAdmin.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleMod.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleStreamer.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
      ]);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_button")
          .setLabel("✅ Verificar Identidade")
          .setStyle(ButtonStyle.Success)
      );

      const messages = await regrasChannel.messages.fetch({ limit: 20 }).catch(() => new Map());
      const existingMessage = messages.find(m => m.author.id === client.user.id && m.components.length > 0);
      if (!existingMessage) await regrasChannel.send({ content: "🎮 **REGRAS DO SERVIDOR**\n\nSiga as regras!", components: [row] });
    }

    // ===== CATEGORIAS E CANAIS =====
    const categorias = {
      comunidade: ["📸・memes", "🎬・clips", "🔫・airsoft-market", "‼️・comandos"],
      admin: ["📺・must-setup", "🖊️・registo", "🤝・parcerias"]
    };

    // Categoria 🔒・Admin / Moderador
    const categoriaAdmin = guild.channels.cache.find(c => c.name.includes("Admin / Moderador") && c.type === 4);
    if (categoriaAdmin) {
      await categoriaAdmin.permissionOverwrites.set([
        { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
        { id: roleDesconhecido.id, deny: ["ViewChannel"] },
        { id: roleMembro.id, deny: ["ViewChannel"] },
        { id: roleAdmin.id, allow: ["ViewChannel"] },
        { id: roleMod.id, allow: ["ViewChannel"] },
        { id: roleStreamer.id, allow: ["ViewChannel"] },
        { id: roleJoin.id, allow: ["ViewChannel"] },
      ]);
    }

    // Canais comunitários
    for (const name of categorias.comunidade) {
      const canal = guild.channels.cache.find(c => c.name === name);
      if (!canal) continue;
      await canal.permissionOverwrites.set([
        { id: guild.roles.everyone.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
        { id: roleMembro.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleStreamer.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleJoin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
      ]);
    }

    // Canais admin-only
    for (const name of categorias.admin) {
      const canal = guild.channels.cache.find(c => c.name === name);
      if (!canal) continue;
      await canal.permissionOverwrites.set([
        { id: guild.roles.everyone.id, deny: ["ViewChannel", "SendMessages"] },
        { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
        { id: roleMembro.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleMod.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleStreamer.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleJoin.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
      ]);
    }

    console.log("✅ Setup inicial completo!");
  } catch (err) {
    console.error("❌ Erro no setup inicial:", err);
  }
});

// ===============================
// NOVO MEMBRO
// ===============================
client.on(Events.GuildMemberAdd, async member => {
  const roleDesconhecido = member.guild.roles.cache.find(r => r.name === "Desconhecido");
  if (roleDesconhecido) await member.roles.add(roleDesconhecido);
  console.log(`👋 ${member.user.tag} recebeu 'Desconhecido'.`);
});

// ===============================
// BOTÃO DE VERIFICAÇÃO
// ===============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton() || interaction.customId !== "verify_button") return;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const roleDesconhecido = interaction.guild.roles.cache.find(r => r.name === "Desconhecido");
  const roleMembro = interaction.guild.roles.cache.find(r => r.name === "Membro da Comunidade");
  if (roleDesconhecido) await member.roles.remove(roleDesconhecido).catch(()=>{});
  if (roleMembro) await member.roles.add(roleMembro).catch(()=>{});
  await interaction.reply({ content: "✅ Verificado!", ephemeral: true });
});

// ===============================
// BLOQUEIO DE MENSAGENS
// ===============================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const comandoSala = message.guild.channels.cache.find(c => c.name === "‼️・comandos");
  const canaisComunitarios = ["📸・memes", "🎬・clips", "🔫・airsoft-market"];
  const canaisAdminOnly = ["📺・must-setup", "🖊️・registo", "🤝・parcerias"];

  // Sala comandos: deleta mensagens que não começam com !
  if (message.channel.name === "‼️・comandos" && !message.content.startsWith(PREFIX)) {
    await message.delete().catch(()=>{});
    await message.author.send(`${message.author}, por favor utiliza a sala ‼️・comandos para comandos apenas.`);
    return;
  }

  // Apenas Admin pode enviar nos canais admin-only
  if (canaisAdminOnly.includes(message.channel.name)) {
    const roleAdmin = message.guild.roles.cache.find(r => r.name === "Admin");
    if (!message.member.roles.cache.has(roleAdmin?.id)) {
      await message.delete().catch(()=>{});
      await message.author.send("⚠️ Apenas administradores podem enviar mensagens neste canal.");
      return;
    }
  }

  // 💬・COMUNIDADE DIGNITY: apenas regras específicas
  if (canaisComunitarios.includes(message.channel.name)) return;

  // Apagar comandos fora do canal
  if (message.content.startsWith(PREFIX) && message.channel.id !== comandoSala?.id) {
    await message.delete().catch(()=>{});
    await message.author.send("⚠️ Usa o canal ‼️・comandos para enviar comandos.");
    return;
  }

  // Processar comandos
  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  switch (cmd) {
    case "steam": await message.author.send("🎮 Steam: https://steamcommunity.com/id/musttopzor/"); break;
    case "faceit": await message.author.send("🔥 Faceit: https://www.faceit.com/pt/players/MUST"); break;
    case "tarkov": await message.author.send("🎯 Perfil do Tarkov: Mustt"); break;
    case "uptime":
      const joinedAt = message.member.joinedAt;
      const diff = Date.now() - joinedAt;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const joinedStr = moment(joinedAt).format("DD/MM/YYYY HH:mm");
      await message.author.send(`🕒 Primeiro dia: ${joinedStr}\n⏱️ Tempo: ${days}d ${hours}h ${minutes}m`);
      break;
    default: await message.author.send("❓ Comando desconhecido.");
  }

  await message.delete().catch(()=>{});
});

// ===============================
// MINI SERVIDOR HTTP PARA RENDER
// ===============================
const app = express();
app.get("/", (req, res) => res.send("Bot Discord online! ✅"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 Servidor web ativo"));

client.login(BOT_TOKEN);
