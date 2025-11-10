// dignitybot.js (versão consolidada e corrigida)

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder,
} = require("discord.js");
const moment = require("moment");

// ===============================
// 🔹 CONFIGURAÇÕES
// ===============================
const BOT_TOKEN = process.env.BOT_TOKEN; // ⚠️ Definir no Render
const SERVER_ID = "567293649826873345"; // teu ID de servidor
const PREFIX = "!";

// ===============================
// 🔹 CLIENTE DISCORD
// ===============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ===============================
// 🔹 AO INICIAR O BOT
// ===============================
client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(SERVER_ID);

    // ==== ROLES (cria se não existir) ====
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

    // ==== CANAL 📜・regras ====
    const regrasChannel = guild.channels.cache.find(c => c.name.includes("regras"));
    if (!regrasChannel) {
      console.warn("⚠️ Canal 📜・regras não encontrado!");
      return;
    }

    // ==== BOTÃO DE VERIFICAÇÃO (apenas UMA declaração) ====
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_button")
        .setLabel("✅ Verificar Identidade")
        .setStyle(ButtonStyle.Success)
    );

    // Busca se já existe uma mensagem com o botão
    const messages = await regrasChannel.messages.fetch({ limit: 20 }).catch(() => ({}));
    const existingMessage = messages && messages.find ? messages.find(m =>
      m.author.id === client.user.id &&
      m.components.length > 0 &&
      ((m.components[0].components && m.components[0].components[0]?.customId) === "verify_button" ||
       (m.components[0].components && m.components[0].components[0]?.data?.custom_id === "verify_button"))
    ) : null;

    // Conteúdo das regras
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

1️⃣0️⃣ Diverte-te e participa! 
Interage, joga com a malta, partilha clips, memes e momentos do stream. O servidor é da comunidade — faz parte dela!

1️⃣1️⃣  Incoming  

1️⃣2️⃣  Incoming  
`;

    if (!existingMessage) {
      await regrasChannel.send({ content: regrasContent, components: [row] });
      console.log("📩 Mensagem de verificação com regras enviada em 📜・regras.");
    } else {
      console.log("ℹ️ Mensagem de verificação já existente — não foi recriada.");
    }

    // ===============================
    // 🔐 PERMISSÕES
    // ===============================

    // 1) 📜・regras: visível apenas para Desconhecido, membros e staff
    await regrasChannel.permissionOverwrites.set([
      { id: guild.roles.everyone.id, deny: ["ViewChannel", "SendMessages"] },
      { id: roleDesconhecido.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
      { id: roleMembro.id, allow: ["ViewChannel", "SendMessages"] },
      { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
      { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
      { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
    ]);
    console.log("🔐 Permissões aplicadas: 📜・regras");

    // 2) Canais comunitários
    const canaisComunitarios = ["📸・memes", "🎬・clips", "🔫・airsoft-market"];
    for (const name of canaisComunitarios) {
      const canal = guild.channels.cache.find(c => c.name === name);
      if (!canal) continue;
      try {
        await canal.permissionOverwrites.set([
          { id: guild.roles.everyone.id, deny: ["SendMessages"] },
          { id: roleMembro.id, allow: ["ViewChannel", "SendMessages"] },
          { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
          { id: roleMod.id, allow: ["ViewChannel", "SendMessages"] },
          { id: roleStreamer.id, allow: ["ViewChannel", "SendMessages"] },
          { id: roleJoin.id, allow: ["ViewChannel", "SendMessages", "Connect", "Speak"] },
          { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
        ]);
        console.log(`🔐 Permissões aplicadas: ${name}`);
      } catch (e) {
        console.error(`❌ Falha ao definir permissões para ${name}:`, e);
      }
    }

    // 3) Canais Admin-only
    const canaisAdminOnly = ["📺・must-setup", "🖊️・registo", "🤝・parcerias"];
    for (const name of canaisAdminOnly) {
      const canal = guild.channels.cache.find(c => c.name === name);
      if (!canal) continue;
      try {
        await canal.permissionOverwrites.set([
          { id: guild.roles.everyone.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
          { id: roleDesconhecido.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
          { id: roleMembro.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
          { id: roleAdmin.id, allow: ["ViewChannel", "SendMessages"] },
          { id: roleMod.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
          { id: roleStreamer.id, allow: ["ViewChannel"], deny: ["SendMessages"] },
          { id: client.user.id, allow: ["ViewChannel", "SendMessages", "ManageMessages"] },
        ]);
        console.log(`🔐 Permissões aplicadas (admin-only): ${name}`);
      } catch (e) {
        console.error(`❌ Falha ao definir permissões para ${name}:`, e);
      }
    }

    console.log("✅ Setup inicial de roles e permissões completo!");
  } catch (err) {
    console.error("❌ Erro no setup inicial:", err);
  }
});

// ===============================
// 🔹 NOVO MEMBRO ENTRA
// ===============================
client.on(Events.GuildMemberAdd, async member => {
  try {
    const guild = member.guild;
    const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
    if (roleDesconhecido) await member.roles.add(roleDesconhecido);
    console.log(`👋 ${member.user.tag} recebeu 'Desconhecido'.`);
  } catch (err) {
    console.error("❌ Erro ao adicionar 'Desconhecido':", err);
  }
});

// ===============================
// 🔹 INTERAÇÃO COM BOTÃO
// ===============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "verify_button") return;

  try {
    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);
    const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
    const roleMembro = guild.roles.cache.find(r => r.name === "Membro da Comunidade");

    if (!roleDesconhecido || !roleMembro) {
      return await interaction.reply({ content: "⚠️ Cargos não encontrados.", ephemeral: true });
    }

    await interaction.reply({ content: "⏳ A verificar...", ephemeral: true });

    const beforeRoles = member.roles.cache.map(r => r.name);
    await member.roles.remove(roleDesconhecido).catch(()=>{});
    await member.roles.add(roleMembro).catch(()=>{});
    await interaction.editReply({ content: "✅ Verificado!" }).catch(()=>{});

    console.log(`🧾 ${member.user.tag}: roles antes: ${beforeRoles.join(", ")} | agora: ${member.roles.cache.map(r=>r.name).join(", ")}`);
  } catch (err) {
    console.error("❌ Botão falhou:", err);
    try { await interaction.followUp({ content: "❌ Erro ao verificar.", ephemeral: true }); } catch(e){};
  }
});

// ===============================
// 🔹 COMANDOS
// ===============================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const commandChannel = message.guild.channels.cache.find(c => c.name.includes("comandos"));
  const canaisComunitarios = ["📸・memes", "🎬・clips", "🔫・airsoft-market"];
  const canaisAdminOnly = ["📺・must-setup", "🤝・parcerias"];

  // SE COMANDO FOR ENVIADO FORA DO CANAL DE COMANDOS
  if (message.content.startsWith(PREFIX) && message.channel.id !== commandChannel.id) {
    await message.delete().catch(()=>{});
    await message.author.send(`${message.author}, por favor utiliza a sala ‼️・comandos para o efeito, assim que enviares um comando nessa sala receberás a resposta por mensagem privada. Obrigada!`);
    return;
  }

  // BLOQUEIO PARA CANAIS ADMIN-ONLY (apenas Admin pode escrever)
  if (canaisAdminOnly.includes(message.channel.name)) {
    const roleAdmin = message.guild.roles.cache.find(r => r.name === "Admin");
    if (!message.member.roles.cache.has(roleAdmin?.id)) {
      await message.delete().catch(()=>{});
      await message.author.send(`⚠️ Apenas administradores podem enviar mensagens neste canal.`);
      return;
    }
  }

  // BLOQUEIO PARA CANAIS COMUNITÁRIOS (não apagar nada — mensagens de qualquer cargo são permitidas)
  if (canaisComunitarios.includes(message.channel.name)) {
    return; // não faz nada, todas as mensagens são permitidas
  }

  // PROCESSAR COMANDOS APENAS NO CANAL DE COMANDOS
  if (!message.content.startsWith(PREFIX) || message.channel.id !== commandChannel.id) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
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
    default: await message.author.send("❓ Comando desconhecido.");
  }

  // Apaga a mensagem do canal após enviar DM
  await message.delete().catch(()=>{});
  console.log(`💬 ${message.author.tag} usou: ${command} (mensagem apagada)`);
});

// ===============================
// 🔹 MINI SERVIDOR HTTP PARA RENDER
// ===============================
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot Discord online! ✅"));
app.listen(PORT, () => console.log(`🌐 Servidor web na porta ${PORT}`));

client.login(BOT_TOKEN);







