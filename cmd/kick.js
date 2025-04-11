const { SlashCommandBuilder, EmbedBuilder} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Vyhodí uživatele ze serveru.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Uživatel, kterého chceš vyhodit')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('důvod')
        .setDescription('Důvod pro vyhození uživatele')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('důvod') || 'Důvod nebyl poskytnut.';

    if (!interaction.member.permissions.has('KICK_MEMBERS')) {
      return interaction.reply({ content: 'Nemáš oprávnění vyhazovat uživatele!', ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has('KICK_MEMBERS')) {
      return interaction.reply({ content: 'Bot nemá oprávnění vyhazovat uživatele!', ephemeral: true });
    }

    try {
      await interaction.guild.members.kick(user.id, { reason: reason });

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`<:Door:1352336414708207646> ${user.tag} byl vyhozen!`)
        .setDescription(`Uživatel **${user.tag}** byl úspěšně vyhozen ze serveru.`)
        .addFields(
        { 
            name: '► `📑 ╏ Důvod:`',
            value: reason,
            inline: false 
        },
        { 
            name: '► `👥 ╏ Udělil:`',
            value: interaction.user.tag,
            inline: false 
        }
        )
        .setTimestamp()
        .setFooter({ text: 'ZikyZone Bot • Tvoje máma 😍', iconURL: interaction.client.user.displayAvatarURL() });

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: 'Něco se pokazilo při pokusu o vyhození uživatele!', ephemeral: true });
    }
  },
};
