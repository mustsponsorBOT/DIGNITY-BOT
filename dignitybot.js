const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder
} = require("discord.js");

const TOKEN = process.env.BOT_TOKEN;
const SERVER_ID = "567293649826873345";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// === QUANDO O BOT ARRANCA ===
client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  const guild = await client.guilds.fetch(SERVER_ID);

  // === Roles ===
  const getOrCreateRole = async (name, color, reason) => {
    let role = guild.roles.cache.find(r => r.name === name);
    if (!role) role = await guild.roles.create({ name, color, reason });
    return role;
  };

  const roleAdmin = await getOrCreateRole("Admin", "Red");
  const roleMod = await getOrCreateRole("Moderador", "Blue");
  const roleStreamer = await getOrCreateRole("STREAMER", "Green");
  const roleMembro = await getOrCreateRole("Membro da Comunidade", "Grey");
  const roleDesconhecido = await getOrCreateRole("Desconhecido", "DarkGrey");
  const roleJoin = await getOrCreateRole("Join", "Orange");

  const regrasChannel = guild.channels.cache.find(c => c.name === "regras");
  const registoChannel = guild.channels.cache.find(c => c.name === "registo");

  if (!regrasChannel) return console.warn("⚠️ Canal #regras não encontrado!");
  if (!registoChannel) return console.warn("⚠️ Canal #registo não encontrado!");

  // Permissões do canal regras
  await regrasChannel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: true,
    SendMessages: false,
  });

  // Ocultar canais para Desconhecido
  for (const [id, channel] of guild.channels.cache) {
    if (channel.name !== "regras") {
      await channel.permissionOverwrites.edit(roleDesconhecido, {
        ViewChannel: false,
      });
    }
  }

  // Permissões da role Join
  for (const [id, channel] of guild.channels.cache) {
    await channel.permissionOverwrites.edit(roleJoin, {
      ViewChannel: true,
      Connect: true,
      Speak: true,
      SendMessages: true,
    });
  }

  // Mensagem de verificação
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_button")
      .setLabel("✅ Verificar Identidade")
      .setStyle(ButtonStyle.Success)
  );

  const messages = await regrasChannel.messages.fetch({ limit: 10 });
  const existingMessage = messages.find(m => m.author.id === client.user.id);

  if (!existingMessage) {
    await regrasChannel.send({
      content: "👋 **Bem-vindo à Comunidade Dignity!**\n\nPara desbloquear o acesso ao servidor, lê as regras e clica abaixo para confirmar a tua identidade:",
      components: [row],
    });
  }

  console.log("✅ Configuração inicial concluída!");
});

// === NOVO UTILIZADOR ENTRA ===
client.on(Events.GuildMemberAdd, async member => {
  const guild = member.guild;
  const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
  const registoChannel = guild.channels.cache.find(c => c.name === "registo");

  if (roleDesconhecido) await member.roles.add(roleDesconhecido);

  if (registoChannel) {
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("🎉 Bem-vindo à Comunidade Dignity Esports!")
      .setDescription(`👋 Olá ${member}, lê as regras em <#${guild.channels.cache.find(c => c.name === "regras").id}> e confirma a tua identidade para aceder ao servidor!`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await registoChannel.send({ embeds: [embed] });
  }

  console.log(`👤 Novo utilizador entrou: ${member.user.tag}`);
});

// === CLIQUE NO BOTÃO DE VERIFICAÇÃO ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "verify_button") return;

  const member = interaction.member;
  const guild = interaction.guild;
  const roleDesconhecido = guild.roles.cache.find(r => r.name === "Desconhecido");
  const roleMembro = guild.roles.cache.find(r => r.name === "Membro da Comunidade");

  if (roleDesconhecido) await member.roles.remove(roleDesconhecido);
  if (roleMembro) await member.roles.add(roleMembro);

  await interaction.reply({
    content: "✅ Identidade verificada! Agora tens acesso à comunidade.",
    ephemeral: true,
  });

  console.log(`✔️ ${member.user.tag} foi verificado.`);
});

// === COMANDOS ===
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const commands = {
    "!steam": "Steam: https://steamcommunity.com/id/musttopzor/",
    "!twitch": "Twitch: https://www.twitch.tv/mustt_tv",
    "!tiktok": "TikTok: https://www.tiktok.com/@must_savage",
    "!youtube": "YouTube: https://www.youtube.com/@Mustyzord",
    "!instagram": "Instagram: https://www.instagram.com/must_savage",
    "!!telegram": "Airsoft Telegram: http://t.me/+qKBbJZ-RQ5FINTE0"
  };

  const command = message.content.toLowerCase();
  if (commands[command]) {
    try {
      await message.author.send(commands[command]);
      await message.delete().catch(() => {});
      console.log(`📩 Enviado comando ${command} por DM a ${message.author.tag}`);
    } catch {
      console.log(`⚠️ Não foi possível enviar DM a ${message.author.tag}`);
    }
  }
});

client.login(TOKEN);
