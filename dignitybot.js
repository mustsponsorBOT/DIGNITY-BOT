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

    // ==== ROLES ====
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

    // Permissões do canal regras
    await regrasChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
    await regrasChannel.permissionOverwrites.edit(roleDesconhecido, { ViewChannel: true, SendMessages: false });
    await regrasChannel.permissionOverwrites.edit(roleMembro, { ViewChannel: true, SendMessages: true });

    // ==== Ocultar outros canais aos Desconhecidos ====
    guild.channels.cache.forEach(channel => {
      if (channel.name !== "📜・regras") {
        channel.permissionOverwrites.edit(roleDesconhecido, { ViewChannel: false }).catch(() => {});
      }
    });

    // ==== Permissões Join ====
    guild.channels.cache.forEach(channel => {
      channel.permissionOverwrites.edit(roleJoin, { ViewChannel: true, Connect: true, Speak: true, SendMessages: true }).catch(()=>{});
    });

    // ==== Botão de verificação ====
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_button")
        .setLabel("✅ Verificar Identidade")
        .setStyle(ButtonStyle.Success)
    );

    // Apaga mensagem antiga (se existir)
    const messages = await regrasChannel.messages.fetch({ limit: 10 });
    const existingMessage = messages.find(m => m.author.id === client.user.id);
    if (existingMessage) await existingMessage.delete();

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

🔟 Diverte-te e participa! 
Interage, joga com a malta, partilha clips, memes e momentos do stream. O servidor é da comunidade — faz parte dela!
`;

    // Envia nova mensagem de regras com botão
    await regrasChannel.send({ content: regrasContent, components: [row] });
    console.log("📩 Mensagem de verificação com regras enviada em 📜・regras.");

    console.log("✅ Setup inicial completo!");
  } catch (err) {
    console.error("❌ Erro no setup:", err);
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
      await interaction.reply({ content: "⚠️ Os cargos necessários não foram encontrados.", ephemeral: true });
      return;
    }

    await member.roles.remove(roleDesconhecido).catch(() => {});
    await member.roles.add(roleMembro).catch(() => {});

    // Responde rapidamente ao botão
    await interaction.reply({ content: "✅ Verificação concluída! Bem-vindo à comunidade Dignity!", ephemeral: true });

    // DM opcional
    member.send(`✅ Foste verificado com sucesso em **${guild.name}**! Bem-vindo à comunidade Dignity!`).catch(() => {
      console.log("⚠️ Não consegui enviar DM ao utilizador.");
    });

    // Canal registo
    const registoChannel = guild.channels.cache.find(c => c.name.includes("registo"));
    if (registoChannel) {
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🎉 Novo membro verificado!")
        .setDescription(`Bem-vindo ${interaction.user}! à comunidade Dignity Esports!`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();
      await registoChannel.send({ embeds: [embed] });
    }

    console.log(`✅ ${member.user.tag} verificado e recebeu 'Membro da Comunidade'.`);
  } catch (err) {
    console.error("❌ Erro ao processar botão:", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Ocorreu um erro ao verificar. Tenta novamente.", ephemeral: true });
    }
  }
});

// ===============================
// 🔹 COMANDOS
// ===============================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const commandChannel = message.guild.channels.cache.find(c => c.name.includes("comandos"));
  if (!commandChannel) return;

  if (message.channel.id !== commandChannel.id && message.content.startsWith(PREFIX)) {
    await message.delete().catch(()=>{});
    await message.author.send(`⚠️ Usa o canal <#${commandChannel.id}> para comandos, por favor!`);
    return;
  }

  const comunidadeCategory = message.guild.channels.cache.find(c => c.name.includes("COMUNIDADE DIGNITY") && c.type === 4);
  if (comunidadeCategory && message.channel.parentId === comunidadeCategory.id && !message.content.startsWith(PREFIX)) {
    await message.delete().catch(()=>{});
    return;
  }

  if (!message.content.startsWith(PREFIX)) return;
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
      await message.author.send(`🕒 Primeiro dia no servidor: ${joinedStr}\n⏱️ Tempo desde então: ${days} dias, ${hours} horas e ${minutes} minutos.`);
      break;
    case "donate": await message.author.send("💰 As doações estão atualmente em atualização."); break;
    case "twitch": await message.author.send("🎥 Twitch: https://www.twitch.tv/mustt_tv"); break;
    case "tiktok": await message.author.send("🎬 TikTok: https://www.tiktok.com/@must_savage"); break;
    case "youtube": await message.author.send("📺 YouTube: https://www.youtube.com/@Mustyzord"); break;
    case "instagram": await message.author.send("📸 Instagram: https://www.instagram.com/must_savage"); break;
    case "telegram": await message.author.send("✉️ Telegram: https://t.me/+qKBbJZ-RQ5FlNTE0"); break;
    default: await message.author.send("❓ Comando desconhecido. Usa apenas comandos válidos no canal #comandos.");
  }

  console.log(`💬 ${message.author.tag} usou o comando: ${command}`);
});

client.login(BOT_TOKEN);

