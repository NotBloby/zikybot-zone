const { SlashCommandBuilder, EmbedBuilder} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ig')
    .setDescription('Zobrazí Instagram Ziky_Editor.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xE1306C) // Barva Instagramu
      .setTitle('📸 Instagram Ziky_Editor')
      .setDescription('Sleduj mě na Instagramu!')
      .addFields(
        { 
            name: '🌐 Odkaz:',
            value: 'https://www.instagram.com/ziky_editor',
            inline: false 

        }
    )
      .setTimestamp()
      .setFooter({ text: 'ZikyZone Bot', iconURL: interaction.client.user.displayAvatarURL() });

    return interaction.reply({ embeds: [embed] });
  },
};
