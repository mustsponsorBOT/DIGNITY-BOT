// dignitybot.js - Versão completa com regras e gestão de mensagens não-comando

const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  Events 
} = require("discord.js");
const express = require("express");
const moment = require("moment");

// ===============================
// CONFIGURAÇÕES
// ===============================
const BOT_TOKEN = process.env.BOT_TOKEN;
const SERVER_ID = "567293649826873345";
const PREFIX = "!";

// ===============================
// CLIENTE DISCORD
// ===============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

// ===============================
// AO INICIAR O BOT
// ===============================
client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(SERVER_ID);

    // ===============================
    // CRIAR ROLES SE NÃO EXISTIREM
    // ===============================
    const getOrCreateRole = async (name, color, reason) => {
      let role = guild.roles.cache.find(r => r.name === name);
      if (!role) {
        role = await guild.roles.create({ name, color, reason });
        console.log(`🆕 Criada role: ${name}`);
      }
      return role;
    };

    const roleAdmin = await getOrCreateRole("Admin", "Red", "Setup inicial");
    const roleMod = await getOrCreateRole("Moderador", "Blue", "Setup inicial");
    const roleStreamer = await getOrCreateRole("STREAMER", "Green", "Setup inicial");
    const roleMembro = await getOrCreateRole("Membro da Comunidade", "Grey", "Setup inicial");
    const roleDesconhecido = await getOrCreateRole("Desconhecido", "DarkGrey", "Setup inicial");
    const roleJoin = await getOrCreateRole("Join", "Orange", "Acesso total");

    console.log("🎭 Todas as roles foram verificadas ou criadas.");

    // ===============================
    // CANAL DE REGRAS
    // ===============================
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
      console.log("🔐 Permissões aplicadas: 📜・regras");

      // Botão de verificação
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_button")
          .setLabel("✅ Verificar Identidade")
          .setStyle(ButtonStyle.Success)
      );

      const messages = await regrasChannel.messages.fetch({ limit: 20 }).catch(() => new Map());
      const existingMessage = messages.find(m =>
        m.author.id === client.user.id &&
        m.components.length > 0 &&
        ((m.components[0].components?.[0]?.customId === "verify_button") ||
         (m.components[0].components?.[0]?.data?.custom_id === "verify_button"))
      );

      const regrasContent = `
🎮 **REGRAS DO SERVIDOR**  

1️⃣ Respeito acima de tudo! 
Trata todos os membros com respeito. Nada de insultos, racismo, homofobia, ou qualquer tipo de discriminação.  

2️⃣ Sem spam! 
Evita enviar mensagens repetidas, links desnecessários, ou fazer ping em excesso a outros membros ou staff.  

3️⃣ Mantém o conteúdo apropriado! 
Proibido conteúdo ilegal, violento ou ofensivo.  

4️⃣ Respeita as salas e os temas! 
Cada canal tem o seu propósito — usa o canal certo para o tema certo (ex: memes em #memes, clips em #clips).  

5️⃣ Não divulgar sem permissão! 
Proibida a divulgação de outros servidores, canais ou redes sociais sem autorização da staff.  

6️⃣ Evita discussões tóxicas! 
Debates são bem-vindos, mas mantém sempre o fair play. Sem drama, sem flame.  

7️⃣ Segue as indicações dos moderadores! 
As decisões dos moderadores devem ser respeitadas. Se achares que houve um erro, fala em privado com calma.  

8️⃣ Nome e foto de perfil devem ser adequados! 
Nada de nicks ofensivos, imitarem staff ou o streamer. Mantém algo legível e respeitoso.  

9️⃣ Usa o micro com bom senso! 
Durante jogos ou chats de voz, evita gritar, fazer ruído constante ou usar soundboards em excesso.  

🔟 Diverte-te e participa! 
Interage, joga com a malta, partilha clips, memes e momentos do stream. O servidor é da comunidade — faz parte dela!

1️⃣1️⃣ INCOMING

1️⃣2️⃣ INCOMING
      `;

      if (!existingMessage) {
        await regrasChannel.send({ content: regrasContent, components: [row] });
        console.log("📩 Mensagem de verificação enviada em 📜・regras");
      } else console.log("ℹ️ Mensagem de verificação já existe");
    }

    // ===============================
    // CATEGORIA COMUNITÁRIA
    // ===============================
    const canaisComunitarios = ["📸・memes", "🎬・clips", "🔫・airsoft-market", "‼️・comandos"];
    for (const name of canaisComunitarios) {
      const canal = guild.channels.cache.find(c => c.name === name);
      if (!canal) continue;

      let perms = [
        { id: guild.roles.everyone.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
        { id: roleMembro.id, allow: ["ViewChannel"], deny: name === "‼️・comandos" ? ["SendMessages"] : [] },
        { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleStreamer.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleJoin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
      ];

      await canal.permissionOverwrites.set(perms);
      console.log(`🔐 Permissões aplicadas: ${name}`);
    }

    // ===============================
    // CANAIS ADMIN-ONLY
    // ===============================
    const canaisAdminOnly = ["📺・must-setup", "🖊️・registo", "🤝・parcerias"];
    for (const name of canaisAdminOnly) {
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
      console.log(`🔐 Permissões aplicadas (admin-only): ${name}`);
    }

// ===============================
// CATEGORIA ADMIN / MODERADOR → visível apenas para Admin, Mod, STREAMER, Join
// ===============================
const categoriaAdmin = guild.channels.cache.find(
  c => c.name.includes("Admin / Moderador") && c.type === 4 // 4 = Category
);

if (categoriaAdmin) {
  await categoriaAdmin.permissionOverwrites.set([
    { id: guild.roles.everyone.id, deny: ["ViewChannel"] },     // Bloqueia todos por padrão
    { id: roleMembro.id, deny: ["ViewChannel"] },               // Membro da Comunidade não vê
    { id: roleJoin.id, allow: ["ViewChannel"] },                // Join vê
    { id: roleStreamer.id, allow: ["ViewChannel"] },            // STREAMER vê
    { id: roleMod.id, allow: ["ViewChannel"] },                 // Moderador vê
    { id: roleAdmin.id, allow: ["ViewChannel"] },               // Admin vê
    { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageChannels", "ManageRoles"] }
  ]);

  // aplica o mesmo a todos os canais dentro da categoria
  const subCanais = guild.channels.cache.filter(c => c.parentId === categoriaAdmin.id);
  for (const canal of subCanais.values()) {
    await canal.permissionOverwrites.set([
      { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
      { id: roleMembro.id, deny: ["ViewChannel"] },
      { id: roleJoin.id, allow: ["ViewChannel"] },
      { id: roleStreamer.id, allow: ["ViewChannel"] },
      { id: roleMod.id, allow: ["ViewChannel"] },
      { id: roleAdmin.id, allow: ["ViewChannel"] },
      { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageChannels", "ManageRoles"] }
    ]);
  }

  console.log("🔐 Categoria 🔒・Admin / Moderador: invisível para Membro da Comunidade");
}

// ===============================
// NOVO MEMBRO
// ===============================
client.on(Events.GuildMemberAdd, async member => {
  try {
    const roleDesconhecido = member.guild.roles.cache.find(r => r.name === "Desconhecido");
    if (roleDesconhecido) await member.roles.add(roleDesconhecido);
    console.log(`👋 ${member.user.tag} recebeu 'Desconhecido'.`);
  } catch (err) {
    console.error("❌ Erro ao adicionar 'Desconhecido':", err);
  }
});

// ===============================
// BOTÃO DE VERIFICAÇÃO
// ===============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton() || interaction.customId !== "verify_button") return;

  try {
    const guild = interaction.guild; // <-- NECESSÁRIO para usar "guild"
    const member = await guild.members.fetch(interaction.user.id);

    const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
    const roleMembro = guild.roles.cache.find(r => r.name === "Membro da Comunidade");

    if (!roleDesconhecido || !roleMembro) {
      return interaction.reply({ content: "⚠️ Cargos não encontrados.", ephemeral: true });
    }

    await interaction.reply({ content: "⏳ A verificar...", ephemeral: true });

    await member.roles.remove(roleDesconhecido).catch(() => {});
    await member.roles.add(roleMembro).catch(() => {});

    // 🔒 Bloquear Membro da Comunidade na categoria Admin/Mod e sub-canais
    const categoriaAdmin = guild.channels.cache.find(
      c => c.name.includes("Admin / Moderador") && c.type === 4 // 4 = Category
    );

    if (categoriaAdmin) {
      await categoriaAdmin.permissionOverwrites.edit(roleMembro, { ViewChannel: false });

      const subCanais = guild.channels.cache.filter(c => c.parentId === categoriaAdmin.id);
      for (const canal of subCanais.values()) {
        await canal.permissionOverwrites.edit(roleMembro, { ViewChannel: false });
      }

      console.log("🔒 Permissões atualizadas: Membro da Comunidade não vê Admin/Moderador");
    }

    await interaction.editReply({ content: "✅ Verificação concluída com sucesso!" });
  } catch (err) {
    console.error("❌ Erro na verificação:", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Erro ao processar verificação.", ephemeral: true });
    }
  }
});

// ===============================
// MENSAGENS E COMANDOS (INCLUINDO DELEÇÃO AUTOMÁTICA)
// ===============================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const commandChannel = message.guild.channels.cache.find(c => c.name.includes("comandos"));
  const canaisComunitarios = ["📸・memes", "🎬・clips", "🔫・airsoft-market"];
  const canaisAdminOnly = ["📺・must-setup", "🖊️・registo", "🤝・parcerias"];

  // Deleta mensagens na sala ‼️・comandos que não sejam comandos
  if (message.channel.name === "‼️・comandos" && !message.content.startsWith(PREFIX)) {
    await message.delete().catch(()=>{});
    await message.author.send(`${message.author.username}, por favor utiliza a sala ‼️・comandos para o efeito. Assim que enviares um comando nessa sala receberás a resposta por mensagem privada. Obrigada!`);
    return;
  }

  // Bloqueio para admin-only
  if (canaisAdminOnly.includes(message.channel.name)) {
    const roleAdmin = message.guild.roles.cache.find(r => r.name === "Admin");
    if (!message.member.roles.cache.has(roleAdmin?.id)) {
      await message.delete().catch(()=>{});
      await message.author.send(`⚠️ Apenas administradores podem enviar mensagens neste canal.`);
      return;
    }
  }

  // Comandos
  if (message.content.startsWith(PREFIX)) {
    if (message.channel.id !== commandChannel?.id) {
      await message.delete().catch(()=>{});
      await message.author.send(`${message.author.username}, por favor utiliza a sala ‼️・comandos para o efeito. Obrigada!`);
      return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    switch(command) {
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
      case "donate": await message.author.send("💰 Doações em atualização."); break;
      case "twitch": await message.author.send("🎥 Twitch: https://www.twitch.tv/mustt_tv"); break;
      case "tiktok": await message.author.send("🎬 TikTok: https://www.tiktok.com/@must_savage"); break;
      case "youtube": await message.author.send("📺 YouTube: https://www.youtube.com/@Mustyzord"); break;
      case "instagram": await message.author.send("📸 Instagram: https://www.instagram.com/must_savage"); break;
      case "telegram": await message.author.send("✉️ Telegram: https://t.me/+qKBbZ-RQ5FlNTE0"); break;
      default: await message.author.send("❓ Comando desconhecido."); break;
    }

    await message.delete().catch(()=>{});
    console.log(`💬 ${message.author.tag} usou comando ${command}`);
    return;
  }

  // Não apagar mensagens nas salas comunitárias
  if (canaisComunitarios.includes(message.channel.name)) return;
});

// ===============================
// MINI SERVIDOR HTTP PARA RENDER
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot Discord online! ✅"));
app.listen(PORT, () => console.log(`🌐 Servidor web na porta ${PORT}`));

// ===============================
// LOGIN DO BOT
// ===============================
client.login(BOT_TOKEN);
