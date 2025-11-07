const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder,
} = require("discord.js");
const moment = require("moment");

// ===============================
// 🔹 CONFIGURAÇÕES DO BOT
// ===============================
const BOT_TOKEN = process.env.BOT_TOKEN; // ⚠️ No Render, define isto como variável de ambiente
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

  const guild = await client.guilds.fetch(SERVER_ID);
  console.log(`🔗 Conectado ao servidor: ${guild.name}`);

  // Obter cargos
  const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
  const roleMembro = guild.roles.cache.find(r => r.name === "Membro da Comunidade");

  if (!roleDesconhecido || !roleMembro) {
    console.warn("⚠️ Um dos cargos 'Desconhecido' ou 'Membro da Comunidade' não foi encontrado!");
  }

  // Canal de regras
  const regrasChannel = guild.channels.cache.find(c => c.name === "regras");
  if (!regrasChannel) {
    console.warn("⚠️ Canal #regras não encontrado!");
    return;
  }

  // Botão de verificação
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_button")
      .setLabel("✅ Verificar Identidade")
      .setStyle(ButtonStyle.Success)
  );

  // Enviar mensagem com botão (caso ainda não exista)
  const messages = await regrasChannel.messages.fetch({ limit: 10 });
  const existingMessage = messages.find(m => m.author.id === client.user.id);

  if (!existingMessage) {
    await regrasChannel.send({
      content:
        "👋 **Bem-vindo à Comunidade Dignity!**\n\nLê as regras e clica abaixo para confirmar a tua identidade:",
      components: [row],
    });
    console.log("📩 Mensagem de verificação enviada em #regras.");
  } else {
    console.log("🔁 Mensagem de verificação já existe.");
  }
});

// ===============================
// 🔹 INTERAÇÃO COM O BOTÃO
// ===============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "verify_button") return;

  console.log(`🖱️ ${interaction.user.tag} clicou no botão de verificação.`);

  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const roleDesconhecido = interaction.guild.roles.cache.find(r => r.name === "Desconhecido");
    const roleMembro = interaction.guild.roles.cache.find(r => r.name === "Membro da Comunidade");

    if (!roleDesconhecido || !roleMembro) {
      console.error("❌ Um dos cargos não foi encontrado!");
      await interaction.reply({ content: "Erro interno! Contacta um administrador.", ephemeral: true });
      return;
    }

    await member.roles.remove(roleDesconhecido).catch(err => console.warn("Erro ao remover cargo:", err));
    await member.roles.add(roleMembro).catch(err => console.warn("Erro ao atribuir cargo:", err));

    console.log(`✅ ${member.user.tag} foi verificado e recebeu o cargo 'Membro da Comunidade'.`);

    await interaction.reply({
      content: "✅ Verificação concluída! Bem-vindo à comunidade Dignity!",
      ephemeral: true,
    });

    // Envia mensagem no canal #registo
    const registoChannel = interaction.guild.channels.cache.find(c => c.name === "registo");
    if (registoChannel) {
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🎉 Novo membro verificado!")
        .setDescription(`Bem-vindo ${interaction.user}! à comunidade Dignity Esports!`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await registoChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("❌ Erro na verificação:", error);
    await interaction.reply({
      content: "Ocorreu um erro ao verificar. Tenta novamente ou contacta a administração.",
      ephemeral: true,
    });
  }
});

// ===============================
// 🔹 COMANDOS
// ===============================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  // Bloquear comandos fora do canal de comandos
  const commandChannel = message.guild.channels.cache.find(c => c.name === "comandos");
  if (!commandChannel) return;

  if (message.channel.id !== commandChannel.id && message.content.startsWith(PREFIX)) {
    await message.delete().catch(() => {});
    await message.author.send("⚠️ Usa o canal <#"+commandChannel.id+"> para comandos, por favor!");
    return;
  }

  // Se não for comando, mas estiver em 'comunidade dignity', apagar
  const comunidadeCategory = message.guild.channels.cache.find(c => c.name.toLowerCase() === "comunidade dignity" && c.type === 4);
  if (comunidadeCategory && message.channel.parentId === comunidadeCategory.id && !message.content.startsWith(PREFIX)) {
    await message.delete().catch(() => {});
    return;
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // =================== Comandos ===================
  switch (command) {
    case "steam":
      await message.author.send("🎮 Steam: https://steamcommunity.com/id/musttopzor/");
      break;
    case "faceit":
      await message.author.send("🔥 Faceit: https://www.faceit.com/pt/players/MUST");
      break;
    case "tarkov":
      await message.author.send("🎯 Perfil do Tarkov: Mustt");
      break;
    case "uptime":
      const joinedAt = message.member.joinedAt;
      const duration = moment(joinedAt).fromNow(true);
      await message.author.send(`📅 Entraste no servidor há ${duration}!`);
      break;
    case "donate":
      await message.author.send("💰 As doações estão atualmente em atualização. Obrigado pelo interesse!");
      break;
    case "twitch":
      await message.author.send("🎥 Twitch: https://www.twitch.tv/mustt_tv");
      break;
    case "tiktok":
      await message.author.send("🎬 TikTok: https://www.tiktok.com/@must_savage");
      break;
    case "youtube":
      await message.author.send("📺 YouTube: https://www.youtube.com/@Mustyzord");
      break;
    case "instagram":
      await message.author.send("📸 Instagram: https://www.instagram.com/must_savage");
      break;
    case "telegram":
      await message.author.send("✉️ Telegram: https://t.me/+qKBbJZ-RQ5FlNTE0");
      break;
    default:
      await message.author.send("❓ Comando desconhecido. Usa apenas comandos válidos no canal #comandos.");
  }

  console.log(`💬 ${message.author.tag} usou o comando: ${command}`);
});

client.login(BOT_TOKEN);
