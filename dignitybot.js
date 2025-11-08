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
const BOT_TOKEN = process.env.BOT_TOKEN; // ⚠️ Define esta variável no Render
const SERVER_ID = "567293649826873345";
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

  // Cargos
  const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
  const roleMembro = guild.roles.cache.find(r => r.name === "Membro da Comunidade");

  if (!roleDesconhecido || !roleMembro) {
    console.warn("⚠️ Cargos 'Desconhecido' ou 'Membro da Comunidade' não encontrados!");
  }

  // Canal de regras
  const regrasChannel = guild.channels.cache.find(c => c.name === "📜・regras");
  if (!regrasChannel) {
    console.warn("⚠️ Canal 📜・regras não encontrado!");
    return;
  }

  // Criar botão de verificação
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_button")
      .setLabel("✅ Verificar Identidade")
      .setStyle(ButtonStyle.Success)
  );

  // Verificar se já existe mensagem do bot
  const messages = await regrasChannel.messages.fetch({ limit: 10 });
  const existing = messages.find(m => m.author.id === client.user.id);

  if (!existing) {
    await regrasChannel.send({
      content: "👋 **Bem-vindo à Comunidade Dignity!**\n\nLê as regras e clica abaixo para confirmar a tua identidade:",
      components: [row],
    });
    console.log("📩 Mensagem de verificação enviada em 📜・regras.");
  } else {
    console.log("🔁 Mensagem de verificação já existe.");
  }

  console.log("✅ Setup inicial completo: roles, permissões e mensagem de verificação.");
});

// ✅ Sistema de verificação de botão
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    if (interaction.customId === "verify_button") {
      const guild = interaction.guild;
      const member = guild.members.cache.get(interaction.user.id);

      const verifiedRole = guild.roles.cache.find(r => r.name === "Membro da Comunidade");
      const unverifiedRole = guild.roles.cache.find(r => r.name === "Desconhecido");

      if (!verifiedRole || !unverifiedRole) {
        return interaction.reply({ 
          content: "⚠️ Os cargos 'Membro da Comunidade' e/ou 'Desconhecido' não foram encontrados no servidor. Verifica se existem com esses nomes exatos.", 
          ephemeral: true 
        });
      }

      // Remove role de não verificado e adiciona o de membro
      await member.roles.remove(unverifiedRole).catch(() => {});
      await member.roles.add(verifiedRole).catch(() => {});

      await interaction.reply({ 
        content: "✅ Verificação concluída! Já tens acesso à comunidade.", 
        ephemeral: true 
      });
    }
  } catch (err) {
    console.error("Erro na interação:", err);
    if (interaction.replied || interaction.deferred) return;
    interaction.reply({ 
      content: "⚠️ Ocorreu um erro ao processar a tua verificação.", 
      ephemeral: true 
    }).catch(() => {});
  }
});

// Envia mensagem de boas-vindas
    const registoChannel = interaction.guild.channels.cache.find(c => c.name === "🖊️・registo");
    if (registoChannel) {
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🎉 Novo membro verificado!")
        .setDescription(`Bem-vindo ${interaction.user} à comunidade Dignity Esports!`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

      await registoChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error("❌ Erro na verificação:", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Erro na verificação. Contacta a administração.", ephemeral: true });
    }
  }
});

// ===============================
// 🔹 COMANDOS
// ===============================
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const guild = message.guild;
  if (!guild) return;

  const comandosChannel = guild.channels.cache.find(c => c.name === "‼️・comandos");
  const comunidadeCategory = guild.channels.cache.find(c => c.name === "💬・COMUNIDADE DIGNITY" && c.type === 4);

  if (!comandosChannel) return;

  // 🔒 Bloqueia mensagens fora do canal de comandos
  if (message.channel.id !== comandosChannel.id && message.content.startsWith(PREFIX)) {
    await message.delete().catch(() => {});
    return await message.author.send(`⚠️ Usa o canal ${comandosChannel} para comandos!`);
  }

  // 🔒 Impede mensagens normais dentro da categoria comunidade
  if (comunidadeCategory && message.channel.parentId === comunidadeCategory.id && !message.content.startsWith(PREFIX)) {
    await message.delete().catch(() => {});
    return;
  }

  // Ignorar se não for comando
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
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
      case "uptime": {
        const joinedAt = message.member.joinedAt;
        const joinedStr = moment(joinedAt).format("DD/MM/YYYY HH:mm");
        const now = moment();
        const duration = moment.duration(now.diff(joinedAt));
        const days = duration.asDays().toFixed(0);
        const hours = duration.hours();
        const minutes = duration.minutes();
        try {
  await message.author.send(`🕒 Primeiro dia no servidor: ${joinedStr}\n⏱️ Tempo desde então: ${days} dias, ${hours} horas e ${minutes} minutos.`);
} catch {
  await message.reply('❌ Não consegui enviar DM.');
}
        break;
      }
      case "donate":
        await message.author.send("💰 As doações estão atualmente em atualização. Obrigado pelo apoio!");
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
        await message.author.send("❓ Comando desconhecido. Usa apenas comandos válidos no canal ‼️・comandos.");
    }

    console.log(`💬 ${message.author.tag} usou o comando: ${command}`);
  } catch (err) {
    console.error("Erro ao executar comando:", err);
  }
});

// ===============================
// 🔹 LOGIN
// ===============================
client.login(BOT_TOKEN);




