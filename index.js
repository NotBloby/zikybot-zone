const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  REST, 
  Routes, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  ButtonStyle,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits 
} = require('discord.js');

const { token, welcomeChannelId, guildId, premiumRoleId } = require('./config.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
// Tento import může být duplikován.
// Make sure you have this installed

// Create a single client instance with all needed intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
const cooldowns = new Collection();

const CHANNEL_ID = '1304821530777358336';
const IG_USERNAME = 'ziky_editor';

// Cesta k JSON souboru s konfigurací
const CONFIG_PATH = path.join(process.cwd(), 'config.json');
const TICKET_DATA_PATH = path.join(process.cwd(), 'tickets.json');
const DATA_PATH = path.join(process.cwd(), 'data.json')

// Příklad s použitím asynchronní funkce


// Výchozí konfigurace
const DEFAULT_CONFIG = {
  TICKET_CHANNEL_ID: '1304816241197977621',           // ID kanálu pro ticket panel
  ADMIN_ROLE_ID: '1301288449445462067',               // ID role pro administrátory
  HELPER_ROLE_ID: '1301611458475593769',              // ID role pro helpery
  LOG_CHANNEL_ID: '1349677164420792382',              // ID kanálu pro logy
  TICKET_CATEGORY_ID: '1304126697884356608',          // ID kategorie pro tickety
  PRIMARY_COLOR: 0x5865F2,         // Hlavní barva pro embedy
  ERROR_COLOR: 0xFF0000,           // Barva pro chybové embedy
  SUCCESS_COLOR: 0x00FF00,         // Barva pro úspěšné akce
  EMBED_SENT: false                // Bylo již embed menu posláno?
};

// Načtení nebo vytvoření konfiguračního souboru
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(data);
      return { ...DEFAULT_CONFIG, ...config };
    } else {
      // Vytvořit nový konfigurační soubor s výchozími hodnotami
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      console.log('📝 Vytvořen nový konfigurační soubor config.json');
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error('❌ Chyba při načítání konfigurace:', error);
    return DEFAULT_CONFIG;
  }
}

// Uložení konfigurace do souboru
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Chyba při ukládání konfigurace:', error);
    return false;
  }
}

// Načtení nebo vytvoření dat o ticketech
function loadTicketData() {
  try {
    if (fs.existsSync(TICKET_DATA_PATH)) {
      const data = fs.readFileSync(TICKET_DATA_PATH, 'utf8');
      return JSON.parse(data);
    } else {
      // Vytvořit nový soubor s prázdným polem ticketů
      const initialData = { tickets: [] };
      fs.writeFileSync(TICKET_DATA_PATH, JSON.stringify(initialData, null, 2));
      console.log('📝 Vytvořen nový soubor tickets.json');
      return initialData;
    }
  } catch (error) {
    console.error('❌ Chyba při načítání dat o ticketech:', error);
    return { tickets: [] };
  }
}

// Uložení dat o ticketech
function saveTicketData(data) {
  try {
    fs.writeFileSync(TICKET_DATA_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Chyba při ukládání dat o ticketech:', error);
    return false;
  }
}

// Načtení konfigurace
let CONFIG = loadConfig();
let TICKET_DATA = loadTicketData();

// Třída pro správu ticketů
class TicketManager {
  constructor() {
    this.activeTickets = new Map();
    this.loadActiveTickets();
  }

  // Načtení aktivních ticketů z JSON
  loadActiveTickets() {
    if (TICKET_DATA.tickets && Array.isArray(TICKET_DATA.tickets)) {
      TICKET_DATA.tickets.forEach(ticket => {
        if (ticket.status === 'open') {
          this.activeTickets.set(ticket.channelId, ticket);
        }
      });
      console.log(`📋 Načteno ${this.activeTickets.size} aktivních ticketů.`);
    }
  }

  // Funkce pro vytvoření nového ticketu
  async createTicket(interaction, type) {
    const { guild, user } = interaction;
    const username = user.username.toLowerCase().replace(/\s/g, '-');
    const ticketId = Math.floor(1000 + Math.random() * 9000); // 4místné ID
    const ticketName = `ticket-${ticketId}-${username}`;
    
    // Kontrola, zda uživatel již nemá aktivní ticket
    const existingTicket = Array.from(this.activeTickets.values())
      .find(ticket => ticket.userId === user.id);
    
    if (existingTicket) {
      return {
        success: false,
        message: `Již máš otevřený ticket: <#${existingTicket.channelId}>`
      };
    }

    try {
      // Vytvoření kanálu pro ticket
      const channel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: CONFIG.TICKET_CATEGORY_ID || null,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: CONFIG.ADMIN_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages
            ]
          }
        ]
      });

      // Přidání oprávnění pro helpery (pouze pro obecné tickety)
      if (type === 'general' && CONFIG.HELPER_ROLE_ID) {
        await channel.permissionOverwrites.create(CONFIG.HELPER_ROLE_ID, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }

      // Vytvoření nového záznamu o ticketu
      const newTicket = {
        channelId: channel.id,
        userId: user.id,
        username: user.tag,
        type: type,
        createdAt: new Date().toISOString(),
        status: 'open'
      };

      // Uložení informací o ticketu
      this.activeTickets.set(channel.id, newTicket);
      
      // Aktualizace JSON souboru
      TICKET_DATA.tickets.push(newTicket);
      saveTicketData(TICKET_DATA);

      return {
        success: true,
        channel: channel
      };
    } catch (error) {
      console.error("Chyba při vytváření ticketu:", error);
      return {
        success: false,
        message: "Nastala chyba při vytváření ticketu. Zkus to prosím později."
      };
    }
  }

  // Uzavření ticketu
  async closeTicket(channelId, closedBy) {
    const ticket = this.activeTickets.get(channelId);
    if (!ticket) return false;

    // Aktualizace stavu ticketu
    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.closedById = closedBy;
    
    // Odstranění z aktivních ticketů
    this.activeTickets.delete(channelId);
    
    // Aktualizace JSON souboru
    const ticketIndex = TICKET_DATA.tickets.findIndex(t => t.channelId === channelId);
    if (ticketIndex !== -1) {
      TICKET_DATA.tickets[ticketIndex] = ticket;
    }
    saveTicketData(TICKET_DATA);

    return true;
  }

  // Export celého chatu do textového souboru
  async exportTicketChat(channel) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      let chatLog = `=== TICKET CHAT LOG ===\n`;
      chatLog += `Ticket: ${channel.name}\n`;
      chatLog += `Vytvořeno: ${new Date().toLocaleString('cs-CZ')}\n\n`;

      const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      
      for (const message of sortedMessages) {
        const timestamp = message.createdAt.toLocaleString('cs-CZ');
        chatLog += `[${timestamp}] ${message.author.tag}: ${message.content}\n`;
        
        // Přidání příloh, pokud existují
        if (message.attachments.size > 0) {
          message.attachments.forEach(attachment => {
            chatLog += `  📎 Příloha: ${attachment.url}\n`;
          });
        }
      }
      
      return chatLog;
    } catch (error) {
      console.error("Chyba při exportu chatu:", error);
      return null;
    }
  }
}

const ticketManager = new TicketManager(); // Pro sledování Instagram postů

// Načtení event souborů
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log(`Event '${event.name}' byl načten`);
    }
  }
}

// Načtení příkazů
function loadCommands() {
  const commandsPath = path.join(__dirname, 'cmd');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  const commands = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
      console.log(`Příkaz '${command.data.name}' byl načten`);
    } else {
      console.log(`Příkaz v ${filePath} nemá povinné vlastnosti 'data' nebo 'execute'`);
    }
  }
  
  return commands;
}

// Registrace příkazů
async function registerCommands(commands) {
  const rest = new REST({ version: '10' }).setToken(token);
  
  try {
    console.log('Začínám s registrací příkazů...');
    
    const data = await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    
    console.log(`Příkazy byly úspěšně registrovány! (${data.length} příkazů)`);
  } catch (error) {
    console.error('Chyba při registraci příkazů:', error);
  }
}

// Kontrola Instagram
async function checkInstagram() {
  try {
    const res = await fetch(`https://api.instaloader.org/json/${IG_USERNAME}`);
    const data = await res.json();

    // Logování odpovědi pro lepší kontrolu dat
    console.log(data);

    if (!data || !data.latest_posts || data.latest_posts.length === 0) return;

    const latest = data.latest_posts[0];

    // Logování posledního příspěvku pro kontrolu
    console.log('Poslední příspěvek:', latest);

    if (latest.id !== lastPostId) {
      lastPostId = latest.id;

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📝 Nový příspěvek od @ziky_editor')
        .setDescription(latest.caption || '(bez popisku)')
        .setImage(latest.display_url)
        .setFooter({ text: 'Instagram Notifikace', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

      const channel = await client.channels.fetch(CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        channel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Chyba při načítání IG:', err);
  }
}

// Kontrola expirace premium rolí
function setupPremiumRoleCheck() {
  setInterval(async () => {
    const data = fs.existsSync(DATA_PATH)
      ? JSON.parse(fs.readFileSync(DATA_PATH, 'utf8') || '{}')
      : {};

    const now = Date.now();

    for (const userId in data) {
      const { expires } = data[userId];
      if (now >= expires) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;

        try {
          const member = await guild.members.fetch(userId);
          await member.roles.remove(premiumRoleId);
          console.log(`Premium role odebrána uživateli ${member.user.tag}`);
          delete data[userId];
          fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        } catch (err) {
          console.error(`Chyba při odebírání role uživateli ${userId}:`, err);
        }
      }
    }
  }, 60 * 1000); // každou minutu
}

  // Registrace příkazů po připojení bot
// Event listener pro připojení bota
// Sjednocení na jednu proměnnou client
// Event listener pro připojení bota
// Event listener pro připojení bota
client.once('ready', async () => {
  console.log(`✅ Přihlášen jako ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'ZikyZone', type: 3 }],
    status: 'online',
  });
  
  // Načtení událostí a příkazů
  loadEvents();
  const commands = loadCommands();
  registerCommands(commands);
  
  // Nastavení kontroly premium rolí
  setupPremiumRoleCheck();
  
  // Spuštění kontroly Instagramu
  checkInstagram();
  setInterval(checkInstagram, 5 * 60 * 1000); // každých 5 minut
  
  // Odeslání ticket embedu, pokud ještě nebyl odeslán
  try {
    // Kontrola zda je nastaveno ID ticket kanálu
    const channelId = CONFIG.TICKET_CHANNEL_ID;
    if (!channelId) {
      console.error("❌ Není nastaveno ID ticket kanálu v config.json!");
      console.log("📝 Prosím, otevři config.json soubor a zadej všechny potřebné hodnoty.");
      return;
    }
    
    // Kontrola zda je nastaven token
    if (!token) {
      console.error("❌ Není nastaven token v konfiguraci!");
      return;
    }
    
    // Získání kanálu
    const ticketChannel = await client.channels.fetch(channelId);
    if (!ticketChannel) {
      console.error("❌ Kanál s daným ID nebyl nalezen!");
      return;
    }

    // Kontrola, zda už byl embed poslán (podle nastavení v JSON)
    if (CONFIG.EMBED_SENT) {
      console.log('📨 Ticket embed už byl poslán a nebude znovu odeslán.');
      return;
    }

    // Vytvoření nového embedu
    const embed = new EmbedBuilder()
      .setTitle('🎟️ Ticket zóna | ZikyZone')
      .setDescription('Ahoj a vítej v ticket zóně ZikyZone! Vyber si kategorii pro vytvoření nového ticketu.\n\n**📂 Dostupné kategorie:**\n✅ **Prémium zakoupení** - Pro nákup nebo dotazy k prémium funkcím\n💬 **Obecné dotazy** - Pro běžné otázky a pomoc\n\nDalší kategorie budou přidány v budoucnu.')
      .setColor(CONFIG.PRIMARY_COLOR)
      .setFooter({ text: 'ZikyZone Ticket Systém | v2.0' })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('👉 Vyber si kategorii ticketu')
      .addOptions([
        {
          label: 'Prémium zaplacení',
          description: 'Vytvoř ticket pro zakoupení nebo dotazy k prémium funkcím',
          value: 'premium',
          emoji: '✅'
        },
        {
          label: 'Problém & Obecné dotazy',
          description: 'Vytvoř ticket pro obecné dotazy nebo pomoc',
          value: 'general',
          emoji: '💬'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await ticketChannel.send({ embeds: [embed], components: [row] });
    console.log('📨 Ticket embed úspěšně poslán!');
    
    // Aktualizace konfigurace - nastavení EMBED_SENT na true
    CONFIG.EMBED_SENT = true;
    saveConfig(CONFIG);
    console.log('💾 Konfigurace aktualizována - embed byl odeslán.');
  } catch (error) {
    console.error("Chyba při inicializaci:", error);
  }
  
  console.log(`🟢 ${client.user.tag} je online!`);
  console.log(`Počet dostupných příkazů: ${client.commands.size}`);
});
// Event handler pro interakce
client.on('interactionCreate', async (interaction) => {
  try {
    // Obsluha příkazů (slashkomand)
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }
      
      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;
      
      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return interaction.reply({
            content: `Počkej prosím ještě ${timeLeft.toFixed(1)} sekund před použitím příkazu ${command.data.name}.`,
            ephemeral: true
          });
        }
      }
      
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
      
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Chyba při provádění příkazu ${interaction.commandName}:`, error);
        const errorMessage = {
          content: '❌ Při vykonávání příkazu nastala chyba.',
          ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
      return;
    }

    // Obsluha výběru kategorie ticketu
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
      const type = interaction.values[0];
      
      // Vytvoření ticketu
      const result = await ticketManager.createTicket(interaction, type);
      
      if (!result.success) {
        return interaction.reply({ 
          content: `❌ ${result.message}`, 
          ephemeral: true 
        });
      }
      
      const channel = result.channel;
      
      // Vytvoření tlačítek pro ticket
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_modal')
          .setLabel('📝 Napsat problém')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Uzavřít ticket')
          .setStyle(ButtonStyle.Danger)
      );

      // Vytvoření embedu pro uvítací zprávu
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎫 Nový ticket vytvořen')
        .setDescription(`Ahoj <@${interaction.user.id}>, vítej v tvém novém ticketu!\n\nPro popis tvého problému klikni na tlačítko **📝 Napsat problém**.\nTento ticket bude zobrazen pouze tobě a administrátorům.`)
        .setColor(CONFIG.PRIMARY_COLOR)
        .setFooter({ text: 'Pro uzavření ticketu použij tlačítko níže' })
        .setTimestamp();

      await channel.send({
        content: `<@${interaction.user.id}> <@&${CONFIG.ADMIN_ROLE_ID}>`,
        embeds: [welcomeEmbed],
        components: [buttons]
      });

      // Odeslání potvrzení
      await interaction.reply({ 
        content: `✅ Tvůj ticket byl úspěšně vytvořen: ${channel}`,
        ephemeral: true 
      });

      // Logování
      if (CONFIG.LOG_CHANNEL_ID) {
        try {
          const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('📢 Nový ticket vytvořen')
              .setDescription(`**Uživatel:** <@${interaction.user.id}>\n**Kategorie:** ${type === 'premium' ? 'Prémium zaplacení' : 'Obecné dotazy'}\n**Kanál:** ${channel}`)
              .setColor(CONFIG.SUCCESS_COLOR)
              .setTimestamp();
            
            await logChannel.send({ embeds: [logEmbed] });
          }
        } catch (error) {
          console.error("Chyba při logování:", error);
        }
      }
    }

    // Obsluha tlačítka pro otevření modálního okna
    if (interaction.isButton() && interaction.customId === 'open_modal') {
      const modal = new ModalBuilder()
        .setCustomId('ticket_modal')
        .setTitle('📝 Popiš svůj problém');

      const problemInput = new TextInputBuilder()
        .setCustomId('problem_description')
        .setLabel('Popiš svůj problém co nejpřesněji')
        .setPlaceholder('Napiš co nejvíce detailů, abychom ti mohli lépe pomoci...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);

      const row = new ActionRowBuilder().addComponents(problemInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    // Obsluha tlačítka pro uzavření ticketu
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      // Kontrola, zda má uživatel oprávnění uzavřít ticket
      const isAdmin = interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE_ID);
      const isTicketCreator = ticketManager.activeTickets.get(interaction.channelId)?.userId === interaction.user.id;
      
      if (!isAdmin && !isTicketCreator) {
        return interaction.reply({
          content: '❌ Nemáš oprávnění uzavřít tento ticket!',
          ephemeral: true
        });
      }

      // Potvrzení uzavření
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_close')
          .setLabel('✅ Ano, uzavřít')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_close')
          .setLabel('❌ Ne, neuzavírat')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        content: '🔒 Opravdu chceš uzavřít tento ticket?',
        components: [confirmRow],
        ephemeral: true
      });
    }

    // Potvrzení uzavření ticketu
    if (interaction.isButton() && interaction.customId === 'confirm_close') {
      await interaction.update({
        content: '⏳ Uzavírám ticket...',
        components: [],
        ephemeral: true
      });

      // Export chatu před uzavřením
      const chatLog = await ticketManager.exportTicketChat(interaction.channel);
      
      // Uzavření ticketu
      await ticketManager.closeTicket(interaction.channelId, interaction.user.id);
      
      // Vytvoření rozlučkového embedu
      const closingEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket uzavřen')
        .setDescription(`Ticket byl uzavřen uživatelem <@${interaction.user.id}>.\nTento kanál bude smazán za 10 sekund.`)
        .setColor(CONFIG.ERROR_COLOR)
        .setTimestamp();
      
      await interaction.channel.send({ embeds: [closingEmbed] });
      
      // Logování uzavření ticketu
      if (CONFIG.LOG_CHANNEL_ID) {
        try {
          const logChannel = await client.channels.fetch(CONFIG.LOG_CHANNEL_ID);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('🔒 Ticket uzavřen')
              .setDescription(`**Ticket:** ${interaction.channel.name}\n**Uzavřel:** <@${interaction.user.id}>\n**Vytvořeno:** <t:${Math.floor(interaction.channel.createdTimestamp / 1000)}:R>`)
              .setColor(CONFIG.ERROR_COLOR)
              .setTimestamp();
            
            // Uložení chat logu
            if (chatLog) {
              await logChannel.send({ 
                embeds: [logEmbed],
                files: [{
                  attachment: Buffer.from(chatLog, 'utf-8'),
                  name: `ticket-${interaction.channel.name}.txt`
                }]
              });
            } else {
              await logChannel.send({ embeds: [logEmbed] });
            }
          }
        } catch (error) {
          console.error("Chyba při logování:", error);
        }
      }
      
      // Odstranění kanálu po 10 sekundách
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (error) {
          console.error("Chyba při mazání kanálu:", error);
        }
      }, 10000);
    }

    // Zrušení uzavření ticketu
    if (interaction.isButton() && interaction.customId === 'cancel_close') {
      await interaction.update({
        content: '✅ Uzavření ticketu bylo zrušeno.',
        components: [],
        ephemeral: true
      });
    }

    // Zpracování odeslání modálního okna
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
      const description = interaction.fields.getTextInputValue('problem_description');

      // Potvrzení uživateli
      await interaction.reply({
        content: '✅ Tvůj problém byl úspěšně odeslán!',
        ephemeral: true
      });

      // Vytvoření embedu s problémem
      const problemEmbed = new EmbedBuilder()
        .setTitle('📬 Popis problému')
        .setDescription(description)
        .setColor(CONFIG.PRIMARY_COLOR)
        .setFooter({ text: `Odesláno uživatelem ${interaction.user.tag}` })
        .setTimestamp();

      // Přidání tlačítek pro správu ticketu pro adminy
      const adminButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_claim')
          .setLabel('👤 Převzít ticket')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('ticket_priority')
          .setLabel('🔴 Vysoká priorita')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.channel.send({
        content: `<@${interaction.user.id}> <@&${CONFIG.ADMIN_ROLE_ID}>`,
        embeds: [problemEmbed],
        components: [adminButtons]
      });
    }

    // Převzetí ticketu adminem
    if (interaction.isButton() && interaction.customId === 'ticket_claim') {
      // Kontrola, zda má uživatel oprávnění
      const isAdmin = interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE_ID);
      const isHelper = interaction.member.roles.cache.has(CONFIG.HELPER_ROLE_ID);
      
      if (!isAdmin && !isHelper) {
        return interaction.reply({
          content: '❌ Nemáš oprávnění převzít tento ticket!',
          ephemeral: true
        });
      }

      await interaction.update({
        components: []
      });

      const claimEmbed = new EmbedBuilder()
        .setTitle('👤 Ticket převzat')
        .setDescription(`Tento ticket byl převzat uživatelem <@${interaction.user.id}>. Brzy se ti ozve.`)
        .setColor(CONFIG.SUCCESS_COLOR)
        .setTimestamp();

      await interaction.channel.send({ embeds: [claimEmbed] });

      // Přejmenování kanálu
      try {
        await interaction.channel.setName(`claimed-${interaction.channel.name.split('-').slice(1).join('-')}`);
      } catch (error) {
        console.error("Chyba při přejmenování kanálu:", error);
      }
    }

    // Nastavení vysoké priority
    if (interaction.isButton() && interaction.customId === 'ticket_priority') {
      // Kontrola, zda má uživatel oprávnění
      if (!interaction.member.roles.cache.has(CONFIG.ADMIN_ROLE_ID)) {
        return interaction.reply({
          content: '❌ Nemáš oprávnění nastavit prioritu!',
          ephemeral: true
        });
      }

      await interaction.update({
        components: []
      });

      const priorityEmbed = new EmbedBuilder()
        .setTitle('🔴 VYSOKÁ PRIORITA')
        .setDescription(`Ticket byl označen jako **VYSOKÁ PRIORITA** administrátorem <@${interaction.user.id}>.`)
        .setColor(0xFF0000)
        .setTimestamp();

      await interaction.channel.send({ 
        content: `<@&${CONFIG.ADMIN_ROLE_ID}>`,
        embeds: [priorityEmbed] 
      });

      // Přejmenování kanálu
      try {
        await interaction.channel.setName(`URGENT-${interaction.channel.name}`);
      } catch (error) {
        console.error("Chyba při přejmenování kanálu:", error);
      }
    }
  } catch (error) {
    console.error("Chyba při zpracování interakce:", error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Nastala neočekávaná chyba. Zkus to prosím později.',
          ephemeral: true
        });
      }
    } catch {}
  }
});

// Příkaz pro resetování odeslání embedu (pro administrátory)
client.on('messageCreate', async (message) => {
  // Kontrola, zda jde o příkaz !resetembed
  if (message.content === '!resetembed' && message.member?.roles.cache.has(CONFIG.ADMIN_ROLE_ID)) {
    CONFIG.EMBED_SENT = false;
    if (saveConfig(CONFIG)) {
      await message.reply('✅ Nastavení pro odeslání embedu bylo resetováno. Při příštím spuštění bude embed znovu odeslán.');
    } else {
      await message.reply('❌ Nastala chyba při resetování nastavení.');
    }
  }
});

// Pro uložení posledního postu
let lastPostId = null;

// Funkce pro registraci příkazů
function registerCommands(commands) {
  const rest = new REST({ version: '10' }).setToken(token);
  
  (async () => {
    try {
      console.log('Začínám s registrací příkazů...');
      
      const data = await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      
      console.log(`Příkazy byly úspěšně registrovány! (${data.length} příkazů)`);
    } catch (error) {
      console.error('Chyba při registraci příkazů:', error);
    }
  })();
}

async function getLatestInstagramPost() {
  try {
    const response = await axios.get(`https://www.instagram.com/${IG_USERNAME}/`);
    const $ = cheerio.load(response.data);
    const scriptTag = $('script[type="text/javascript"]').first().html();

    const match = scriptTag.match(/window\._sharedData = ({.*?});<\/script>/s);
    if (!match) {
      throw new Error('Nebylo možné najít data z Instagramu.');
    }

    const jsonData = match[1];
    const data = JSON.parse(jsonData);

    // Kontrola existence potřebných dat
    const latestPost = data.entry_data.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges?.[0]?.node;
    if (!latestPost) {
      throw new Error('Nebylo nalezeno žádné média na Instagramovém profilu.');
    }

    return latestPost;
  } catch (error) {
    console.error('Chyba při získávání nejnovějšího příspěvku z Instagramu:', error);
    return null;
  }
}

const eventsPath = path.join(__dirname, 'events');
function loadEvents() {
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log(`Event '${event.name}' byl načten`);
    }
  }
}

const dataPath = path.join(__dirname, 'data.json');
const commandsPath = path.join(__dirname, 'cmd');

function loadCommands() {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  const commands = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      client.commands.set(command.data.name, command);
      console.log(`Příkaz '${command.data.name}' byl načten`);
    } else {
      console.log(`Příkaz v ${filePath} nemá povinné vlastnosti 'data' nebo 'execute'`);
    }
  }
  
  return commands;
}

function setupPremiumRoleCheck() {
  setInterval(async () => {
    const data = fs.existsSync(dataPath)
      ? JSON.parse(fs.readFileSync(dataPath, 'utf8') || '{}')
      : {};

    const now = Date.now();

    for (const userId in data) {
      const { expires } = data[userId];
      if (now >= expires) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;

        try {
          const member = await guild.members.fetch(userId);
          await member.roles.remove(premiumRoleId);
          console.log(`Premium role odebrána uživateli ${member.user.tag}`);
          delete data[userId];
          fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        } catch (err) {
          console.error(`Chyba při odebírání role uživateli ${userId}:`, err);
        }
      }
    }
  }, 60 * 1000); // každou minutu
}

client.on('guildMemberAdd', async member => {
  const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
  if (!welcomeChannel) {
    console.log(`Nelze najít welcome kanál s ID: ${welcomeChannelId}`);
    return;
  }
  
  const embed = {
    title: ':wave: Nový člen na serveru!',
    color: 0x3cb043,
    description: `Ahoj, ${member.toString()}! Vítej na **${member.guild.name}**!`,
    fields: [
      { 
        name: '► 📌 | Počet členů',
        value: `${member.guild.memberCount}`,
        inline: true 
      },
      { 
        name: '► 📑 | Tip',
        value: 'Podívej se na pravidla a přidej se do konverzace!',
        inline: false 
      }
    ],
    timestamp: new Date(),
    footer: { text: 'ZikyZone Bot • Tvoje máma 😍', icon_url: client.user.displayAvatarURL() },
  };
  
  try {
    await welcomeChannel.send({ embeds: [embed] });
    console.log(`Uvítací zpráva byla odeslána pro uživatele ${member.user.tag}`);
  } catch (error) {
    console.error('Chyba při odesílání uvítací zprávy:', error);
  }
});

client.on('guildMemberRemove', async member => {
  const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
  if (!welcomeChannel) {
    console.log(`Nelze najít welcome kanál s ID: ${welcomeChannelId}`);
    return;
  }

  const embed = {
    title: ':wave: Už nás opustil!',
    color: 0xff0000,
    description: `${member.user.tag} opustil server **${member.guild.name}**.`,
    fields: [
      { 
        name: '► 📌 | Počet členů',
        value: `${member.guild.memberCount}`,
        inline: true 
      }
    ],
    timestamp: new Date(),
    footer: { text: 'ZikyZone Bot • Tvoje máma 😍', icon_url: client.user.displayAvatarURL() },
  };
  
  try {
    await welcomeChannel.send({ embeds: [embed] });
    console.log(`Zpráva o odchodu byla odeslána pro uživatele ${member.user.tag}`);
  } catch (error) {
    console.error('Chyba při odesílání zprávy o odchodu:', error);
  }
});

const targetChannelId = '1304815292643541102'; // ID cílového kanálu

let repliedUsers = new Set(); // Sada pro sledování odpovědí na zprávy

client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Neodpovídat na zprávy od botů

  // Zkontrolujeme, zda zpráva byla ve správném kanálu
  if (message.channel.id !== targetChannelId) return;

  const msg = message.content.toLowerCase();

  // Pokud už bot odpověděl na daného uživatele, neodpovídat znovu
  if (repliedUsers.has(message.author.id)) return;

  try {
    // Pozdrav
    if (/(^|\s)(ahoj|čau|nazdar|čus)(\s|$)/.test(msg)) {
      const greetings = [
        `Nazdárek ${message.author.username}! Jak se ti dneska vede?`,
        `Čauko ${message.author.username}, jak to jde?`,
        `Ahoj ${message.author.username}, jaký to bylo dnes?`
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      await message.reply(randomGreeting);
      repliedUsers.add(message.author.id);  // Přidáme uživatele do setu
    }

    // Jak se máš
    if (msg.includes('jak se máš') || msg.includes('jak to jde')) {
      const moodResponses = [
        'Díky za optání! Mám se skvěle, dneska je fajn den. Co ty?',
        'Jsem v pohodě, díky! Jak to jde u tebe?',
        'Mám se super! A ty, co nového u tebe?'
      ];
      const randomMood = moodResponses[Math.floor(Math.random() * moodResponses.length)];
      await message.reply(randomMood);
      repliedUsers.add(message.author.id);  // Přidáme uživatele do setu
    }

    // Má se dobře
    if (/(mám se|je mi|cítím se).*(dobře|skvěle|v pohodě)/.test(msg)) {
      const goodMoodResponses = [
        'To rád slyším! 🟢',
        'Super, že se máš dobře! 😊',
        'Skvěle! Jsem rád, že ti to jde dobře. 🟢'
      ];
      const randomGoodMood = goodMoodResponses[Math.floor(Math.random() * goodMoodResponses.length)];
      await message.reply(randomGoodMood);
      repliedUsers.add(message.author.id);  // Přidáme uživatele do setu
    }
  } catch (error) {
    console.error('Chyba při odpovědi na zprávu:', error);
  }
});

client.login(token);
