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
// BLOCO CATEGORIA MAPAS TARKOV
// ===============================

const categoriaMapas = guild.channels.cache.find(
  c => c.name.includes("🗺️・MAPAS TARKOV") && c.type === 4
);

if (categoriaMapas) {
  const subCanais = guild.channels.cache.filter(c => c.parentId === categoriaMapas.id);

  for (const canal of subCanais.values()) {
    if (canal.name === "chat-tarkov") {
      await canal.permissionOverwrites.set([
        { id: guild.roles.everyone.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
        { id: roleMembro.id, allow: ["ViewChannel", "SendMessages"] }, // só neste canal pode escrever
        { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleStreamer.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleJoin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
      ]);
    } else {
      await canal.permissionOverwrites.set([
        { id: guild.roles.everyone.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
        { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
        { id: roleMembro.id, allow: ["ViewChannel"], deny: ["SendMessages"] }, // só vê
        { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleStreamer.id, allow: ["ViewChannel", "SendMessages"] },
        { id: roleJoin.id, allow: ["ViewChannel", "SendMessages"] },
        { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
      ]);
    }
    console.log(`🔐 Permissões aplicadas: ${canal.name} (Mapas Tarkov)`);
  }
}
    
    // ===============================
    // CANAL DE REGRAS
    // ===============================
const regrasChannel = guild.channels.cache.find(c => c.name.includes("regras"));
if (regrasChannel) {
  await regrasChannel.permissionOverwrites.set([
    { id: guild.roles.everyone.id, deny: ["ViewChannel", "SendMessages"] },
    { id: roleDesconhecido.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
    { id: roleMembro.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
    { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
    { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
    { id: roleStreamer.id, allow: ["ViewChannel", "SendMessages"] },
    { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
  ]);
  console.log("🔐 Permissões aplicadas: 📜・regras");
}

      // Botão de verificação
const rowVerify = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("verify_button")
    .setLabel("✅ Verificar Identidade")
    .setStyle(ButtonStyle.Success)
);

      const messages = await regrasChannel.messages.fetch({ limit: 20 }).catch(() => new Map());
      const existingMessage = messages.find(m => {
  if (m.author.id !== client.user.id) return false;
  if (m.components.length === 0) return false;
  const comp0 = m.components[0].components?.[0];
  return comp0?.customId === "verify_button" || comp0?.data?.custom_id === "verify_button";
});

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

1️⃣1️⃣ Cria uma sala temporária!
Podes criar a tua própria sala, de modo tempoário, a mesma é automáticamente movida para o final do servidor e apagada se não estiver nenhum membro online há mais de 5 minutos+

1️⃣2️⃣ Movido para AFK
Se estiveres sem registo de voz há mais de 15 minutos és automáticamente movido para o canal AFK.`;

if (!existingMessage) {
  await regrasChannel.send({ content: regrasContent, components: [rowVerify] });
  console.log("📩 Mensagem de verificação enviada em 📜・regras");
} else {
  console.log("ℹ️ Mensagem de verificação já existe");
}

    // ===============================
    // CATEGORIA COMUNITÁRIA
    // ===============================
const canaisComunitarios = ["📸・memes", "🎬・clips", "🔫・airsoft-market", "‼️・comandos"];
for (const name of canaisComunitarios) {
  const canal = guild.channels.cache.find(c => c.name === name);
  if (!canal) continue;

  let perms = [
    { id: guild.roles.everyone.id, deny: ["ViewChannel", "SendMessages"] },
    { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
    { id: roleMembro.id, allow: ["ViewChannel", "SendMessages"] },
    { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
    { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
    { id: roleStreamer.id, allow: ["ViewChannel", "SendMessages"] },
    { id: roleJoin.id, allow: ["ViewChannel", "SendMessages"] },
    { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
  ];

  await canal.permissionOverwrites.set(perms);
  console.log(`🔐 Permissões aplicadas: ${name} (COMUNIDADE DIGNITY)`);
}

// ===============================
// BLOCO AFK + SALAS TEMPORÁRIAS
// ===============================

const afkCategory = guild.channels.cache.find(c => c.name === "💨・AFK" && c.type === 4)
  || await guild.channels.create({ name: "💨・AFK", type: 4, reason: "Categoria AFK" });

let afkChannel = guild.channels.cache.find(
  c => c.name === "AFK" && c.type === 2 && c.parentId === afkCategory.id
);

if (!afkChannel) {
  afkChannel = await guild.channels.create({
    name: "AFK",
    type: 2, // GUILD_VOICE
    parent: afkCategory.id,
    reason: "Canal AFK para usuários inativos",
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
      { id: roleDesconhecido.id, deny: ["ViewChannel"] },
      { id: roleMembro.id, allow: ["Connect"] }, // pode entrar
      { id: client.user.id, allow: ["Connect", "ManageChannels"] },
    ],
  });
  console.log("🆕 Canal AFK criado");
}

// Define o canal AFK do servidor
await guild.edit({ afkChannel: afkChannel.id, afkTimeout: 900 });
console.log("⏱️ Configuração AFK aplicada: canal AFK + timeout 15 minutos");

// ===============================
// BLOCO SALAS TEMPORÁRIAS
// ===============================

const categoriaTempRooms = guild.channels.cache.find(
  c => c.name.includes("SALAS TEMPORÁRIAS") && c.type === 4
) || await guild.channels.create({
  name: "SALAS TEMPORÁRIAS",
  type: 4, // Categoria
  reason: "Categoria para salas temporárias"
});

console.log("🆕 Categoria SALAS TEMPORÁRIAS verificada ou criada");

let tempRoomChannel = guild.channels.cache.find(
  c => c.name === "🎛️・criar-sala-temporaria" && c.parentId === categoriaTempRooms.id
);

if (!tempRoomChannel) {
  tempRoomChannel = await guild.channels.create({
    name: "🎛️・criar-sala-temporaria",
    type: 0, // GUILD_TEXT
    parent: categoriaTempRooms.id,
    reason: "Canal para criar salas temporárias",
    permissionOverwrites: [
      { id: guild.roles.everyone.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
      { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
      { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
    ],
  });

  console.log("🆕 Canal de criar sala temporária criado na categoria SALAS TEMPORÁRIAS");
}

// Mensagem com botão de criar sala
const tempRoomRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("create_temp_room")
    .setLabel("📌 Criar Sala Temporária")
    .setStyle(ButtonStyle.Primary)
);

await tempRoomChannel.send({
  content: "Clique no botão para criar a sua sala temporária:",
  components: [tempRoomRow]
});

    // ===============================
    // CANAIS ADMIN-ONLY
    // ===============================
const canaisAdminOnly = ["🖊️・registo", "🤝・parcerias", "📺・must-setup", "🎛️・criar-sala-temporaria"];
for (const name of canaisAdminOnly) {
  const canal = guild.channels.cache.find(c => c.name === name);
  if (!canal) continue;

  await canal.permissionOverwrites.set([
    { id: guild.roles.everyone.id, deny: ["ViewChannel", "SendMessages"] },
    { id: roleDesconhecido.id, deny: ["ViewChannel", "SendMessages"] },
    { id: roleMembro.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
    { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
    { id: roleMod.id, deny: ["ViewChannel", "SendMessages"] },
    { id: roleStreamer.id, deny: ["ViewChannel", "SendMessages"] },
    { id: roleJoin.id, deny: ["ViewChannel", "SendMessages"] },
    { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
  ]);

  console.log(`🔐 Permissões aplicadas (admin-only): ${name}`);
}

// ===============================
// CATEGORIA ADMIN / MODERADOR → visível apenas para Admin, Mod, STREAMER, Join
// ===============================
let categoriaAdmin = guild.channels.cache.find(
  c => c.name.includes("🔒・Admin / Moderador") && c.type === 4
);

if (!categoriaAdmin) {
  categoriaAdmin = await guild.channels.create({
    name: "🔒・Admin / Moderador",
    type: 4, // Category
    reason: "Categoria para canais Admin / Moderador"
  });
  console.log("🆕 Categoria 🔒・Admin / Moderador criada");
}

// Agora aplica as permissões
await categoriaAdmin.permissionOverwrites.set([
  { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
  { id: roleMembro.id, deny: ["ViewChannel"] },
  { id: roleJoin.id, allow: ["ViewChannel"] },
  { id: roleStreamer.id, allow: ["ViewChannel"] },
  { id: roleMod.id, allow: ["ViewChannel"] },
  { id: roleAdmin.id, allow: ["ViewChannel"] },
  { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageChannels", "ManageRoles"] }
]);

// Aplica o mesmo a todos os canais dentro da categoria
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

console.log("🔐 Categoria 🔒・Admin / Moderador pronta e permissões aplicadas");

} catch (err) {
    console.error("❌ Erro no setup inicial:", err);
}
}); // fecha client.once("ready")

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
// INTERAÇÃO DO BOTÃO PARA CRIAR SALA TEMPORÁRIA
// ===============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "create_temp_room") {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);
    const categoriaComunitaria = guild.channels.cache.find(
      c => c.name.includes("COMUNIDADE DIGNITY") && c.type === 4
    );

    if (!categoriaComunitaria) {
      return interaction.reply({ content: "⚠️ Categoria comunitária não encontrada.", ephemeral: true });
    }

// Pega a categoria de SALAS TEMPORÁRIAS
const categoriaTempRooms = guild.channels.cache.find(
  c => c.name.includes("SALAS TEMPORÁRIAS") && c.type === 4
) || await guild.channels.create({
  name: "SALAS TEMPORÁRIAS",
  type: 4,
  reason: "Categoria para salas temporárias"
});

const tempVoiceChannel = await guild.channels.create({
  name: `🔊・${member.user.username}`,
  type: 2, // GUILD_VOICE
  parent: categoriaTempRooms.id, // ← agora vai para a categoria certa
  reason: "Sala temporária criada pelo usuário"
});

// Move a sala temporária para o final do servidor, antes da categoria AFK
const afkChannel = guild.channels.cache.find(c => c.name === "💨・AFK" && c.type === 2);
if (afkChannel) {
  await tempVoiceChannel.setPosition(afkChannel.position - 1).catch(() => {});
}

    await tempVoiceChannel.permissionOverwrites.create(member.id, { Connect: true, ManageChannels: true });

    await interaction.reply({ content: `✅ Sala temporária criada: ${tempVoiceChannel.name}`, ephemeral: true });

    console.log(`🆕 Sala temporária criada: ${tempVoiceChannel.name} por ${member.user.tag}`);

    // Remove a sala após 5 minutos se estiver vazia
    setTimeout(async () => {
      const channel = guild.channels.cache.get(tempVoiceChannel.id);
      if (channel && channel.members.size === 0) {
        await channel.delete().catch(() => {});
        console.log(`🗑️ Sala temporária removida: ${tempVoiceChannel.name}`);
      }
    }, 300000); // 5 minutos
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














