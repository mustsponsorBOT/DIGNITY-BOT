const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  AttachmentBuilder,
} = require("discord.js");
const path = require("path");

const TOKEN = process.env.BOT_TOKEN;

const SERVER_ID = "567293649826873345"; // ID do servidor

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    console.log(`🔗 Conectado ao servidor: ${guild.name}`);

    // === Criar ou obter roles ===
    const getOrCreateRole = async (name, color, reason) => {
      let role = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
      if (!role) {
        role = await guild.roles.create({ name, color, reason });
        console.log(`🆕 Criada role: ${name}`);
      } else {
        console.log(`✅ Role já existe: ${name}`);
      }
      return role;
    };

    const roleAdmin = await getOrCreateRole("Admin", "Red");
    const roleMod = await getOrCreateRole("Moderador", "Blue");
    const roleStreamer = await getOrCreateRole("STREAMER", "Green");
    const roleMembro = await getOrCreateRole("Membro da Comunidade", "Grey");
    const roleDesconhecido = await getOrCreateRole("Desconhecido", "DarkGrey");
    const roleJoin = await getOrCreateRole("Join", "Orange");

    console.log("🎭 Todas as roles foram verificadas ou criadas.");

    // === Procurar ou criar canal de regras ===
    let regrasChannel = guild.channels.cache.find(c =>
      c.name.toLowerCase().includes("regras")
    );

    if (!regrasChannel) {
      console.log("📜 Canal #regras não encontrado, criando...");
      regrasChannel = await guild.channels.create({
        name: "regras",
        type: 0, // Canal de texto
        topic: "Regras oficiais da Comunidade Dignity Esports",
      });
    }

    console.log(`⚙️ A aplicar permissões no canal #${regrasChannel.name}...`);

    // Permissões do canal de regras
    await regrasChannel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: true,
      SendMessages: false,
    });

    await regrasChannel.permissionOverwrites.edit(roleDesconhecido, {
      ViewChannel: true,
      SendMessages: false,
    });

    await regrasChannel.permissionOverwrites.edit(roleMembro, {
      ViewChannel: true,
      SendMessages: true,
    });

    // === Ocultar todos os outros canais dos Desconhecidos ===
    const otherChannels = guild.channels.cache.filter(
      c => c.id !== regrasChannel.id && c.type === 0
    );

    for (const [id, channel] of otherChannels) {
      await channel.permissionOverwrites.edit(roleDesconhecido, {
        ViewChannel: false,
      });
    }

    console.log("🔒 Todos os canais (exceto #regras) estão invisíveis para Desconhecidos.");

    // === Permissões da role Join ===
    console.log("🔑 Configurando permissões da role Join...");
    for (const [id, channel] of guild.channels.cache) {
      await channel.permissionOverwrites.edit(roleJoin, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        SendMessages: true,
      });
    }

    // === Botão de Verificação ===
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
        content:
          "👋 **Bem-vindo à Comunidade Dignity Esports!**\n\nPara desbloquear o acesso ao servidor, lê as regras e clica abaixo para confirmar a tua identidade:",
        components: [row],
      });
      console.log("📩 Mensagem de verificação enviada em #regras.");
    } else {
      console.log("🔁 Mensagem de verificação já existe.");
    }

    console.log("✅ Configuração concluída com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao configurar servidor:", err);
  }
});

// === Ao clicar no botão ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "verify_button") {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const roleDesconhecido = interaction.guild.roles.cache.find(r => r.name === "Desconhecido");
    const roleMembro = interaction.guild.roles.cache.find(r => r.name === "Membro da Comunidade");

    await member.roles.remove(roleDesconhecido).catch(() => {});
    await member.roles.add(roleMembro);

    await interaction.reply({
      content: "✅ Identidade verificada! Agora tens acesso à comunidade.",
      ephemeral: true,
    });

    // === Canal de registo ===
    const registoChannel = interaction.guild.channels.cache.find(c =>
      c.name.toLowerCase().includes("registo")
    );
    if (registoChannel) {
      const imagePath = path.join(__dirname, "2.png");
      const file = new AttachmentBuilder(imagePath);
      await registoChannel.send({
        content: `🎉 **Bem-vindo ${interaction.user.username} à comunidade Dignity Esports!**`,
        files: [file],
      });
    }

    console.log(`👤 ${member.user.tag} foi verificado e recebeu o cargo 'Membro da Comunidade'.`);
  }
});

client.login(TOKEN);
