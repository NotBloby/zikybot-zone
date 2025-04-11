const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');

let warnHistory = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historie')
    .setDescription('Zobrazí historii varování pro uživatele.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Uživatel, jehož historii varování chceš zobrazit')
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user');

    // Zkontroluj, zda uživatel má varování v historii
    if (!warnHistory[user.id] || warnHistory[user.id].length === 0) {
      return interaction.reply({ content: `${user.tag} nemá žádnou historii varování. To asi musel být hodnej`, ephemeral: true });
    }

    // Formátování varování pro embed
    const formattedWarnings = warnHistory[user.id].map((warn, index) => {
      const formattedDate = new Date(warn.timestamp).toLocaleDateString('cs-CZ'); // Formátování data
      return `Varování ${index + 1}: **Důvod**: ${warn.reason} - **Datum**: ${formattedDate}`;
    }).join('\n');

    // Vytvoření embed zprávy
    const embed = new EmbedBuilder()
      .setColor(0xFFFF00)
      .setTitle(`:x: Historie varování pro uživatele ${user.tag}`)
      .setDescription(`Hledej si varování, ať nedostaneš druhej ${user.tag}.`)
      .addFields(
        {
          name: '► 📌 | Varování:',
          value: formattedWarnings,  // Použijeme správně formátovaná varování
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: 'ZikyZone Bot • Tvoje máma 😍', iconURL: interaction.client.user.displayAvatarURL() });

    // Odpověď s embedem
    return interaction.reply({ embeds: [embed] });
  },
};
