const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { punishmentChannelId } = require('../config'); // ID logovacího kanálu

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Zabanuji rád uživatele, jak tvoji mámu.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Tento musí nejvíc srát.")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("důvod")
                .setDescription("Důvod banu.")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(8),

    async execute(interaction) {
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ content: 'Kámo nemáš permise, co si myslíš, že děláš?', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('důvod') || 'Žádný důvod nebyl zadán.';

        try {
            await interaction.guild.members.ban(user, { reason });

            const embed = new EmbedBuilder()
                .setTitle(`:hammer: ${user.tag} dostal ban.`)
                .setColor(0xFF0000)
                .setDescription(`Úspěšně byl zabanován ${user.tag} z serveru.`)
                .addFields(
                    { 
                      name: '► `📌 ╏ Důvod`',
                      value: reason,
                      inline: false 
                    },
                    { 
                      name: '► `👨🏻‍🏫 ╏ Udělil:`',
                      value: interaction.user.tag, 
                      inline: false 
                    },
                    { 
                      name: '► 👥 ╏ ID uživatele:',
                      value: user.id, 
                      inline: false 
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'ZikyZone Bot • Tvoje máma 😍', iconURL: interaction.client.user.displayAvatarURL() });

            // Tlačítko pro unban
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`unban_${user.id}`)
                    .setLabel('Zrušit ban')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({ embeds: [embed], components: [row] });

            // Poslat embed do logovacího kanálu
            const logChannel = interaction.guild.channels.cache.get(punishmentChannelId);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            } else {
                console.log(`⚠️ Nelze najít trestní kanál s ID: ${punishmentChannelId}`);
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Tohle je banovací systém jak v Minecraftu.', ephemeral: true });
        }
    }
};
