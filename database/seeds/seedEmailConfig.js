/**
 * Configuration email de test/développement
 * Utilise Mailtrap ou un serveur SMTP de test
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { ConfigurationEmail } = require('../../backend/models');

async function seedEmailConfig() {
  try {
    console.log('=== Configuration Email ===\n');

    // Désactiver les configurations existantes
    await ConfigurationEmail.update(
      { actif: false },
      { where: {} }
    );

    // Configuration pour Mailtrap (service de test d'emails)
    // Créez un compte gratuit sur https://mailtrap.io/
    const mailtrapConfig = await ConfigurationEmail.findOrCreate({
      where: { libelle: 'Mailtrap (Test)' },
      defaults: {
        libelle: 'Mailtrap (Test)',
        email_expediteur: 'noreply@liberteko.test',
        nom_expediteur: 'Liberteko',
        smtp_host: 'sandbox.smtp.mailtrap.io',
        smtp_port: 2525,
        smtp_secure: false,
        smtp_user: 'VOTRE_USERNAME_MAILTRAP',  // À remplacer
        smtp_password: 'VOTRE_PASSWORD_MAILTRAP',  // À remplacer
        actif: false,  // Désactivé par défaut - à activer après configuration
        par_defaut: true,
        ordre_affichage: 1,
        icone: 'bi-envelope-at',
        couleur: 'primary',
        notes: 'Configuration de test avec Mailtrap. Modifiez les identifiants SMTP avant activation.',
        role_minimum: 'gestionnaire'
      }
    });

    // Configuration Gmail (exemple, nécessite mot de passe d'application)
    const gmailConfig = await ConfigurationEmail.findOrCreate({
      where: { libelle: 'Gmail' },
      defaults: {
        libelle: 'Gmail',
        email_expediteur: 'votre.email@gmail.com',
        nom_expediteur: 'Ludothèque',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: 'votre.email@gmail.com',
        smtp_password: 'votre_mot_de_passe_application',  // Mot de passe d'application Gmail
        actif: false,  // Désactivé par défaut
        par_defaut: false,
        ordre_affichage: 2,
        icone: 'bi-envelope-at',
        couleur: 'danger',
        notes: 'Configuration Gmail. Nécessite un mot de passe d\'application (pas le mot de passe du compte).',
        role_minimum: 'gestionnaire'
      }
    });

    // Configuration Ethereal (service de test automatique)
    // Ethereal génère automatiquement des comptes de test
    const nodemailer = require('nodemailer');

    console.log('Génération d\'un compte de test Ethereal...');
    const testAccount = await nodemailer.createTestAccount();

    const etherealConfig = await ConfigurationEmail.findOrCreate({
      where: { libelle: 'Ethereal (Test Auto)' },
      defaults: {
        libelle: 'Ethereal (Test Auto)',
        email_expediteur: testAccount.user,
        nom_expediteur: 'Ludothèque Test',
        smtp_host: 'smtp.ethereal.email',
        smtp_port: 587,
        smtp_secure: false,
        smtp_user: testAccount.user,
        smtp_password: testAccount.pass,
        actif: true,  // Activé par défaut car génération automatique
        par_defaut: true,
        ordre_affichage: 0,
        icone: 'bi-envelope-at',
        couleur: 'success',
        notes: `Configuration de test automatique. Les emails ne sont pas réellement envoyés mais visibles sur https://ethereal.email/messages`,
        role_minimum: 'gestionnaire'
      }
    });

    console.log('\n✓ Configurations email créées :');
    console.log('  1. Ethereal (Test Auto) - ACTIVÉE');
    console.log(`     - User: ${testAccount.user}`);
    console.log(`     - Pass: ${testAccount.pass}`);
    console.log(`     - Voir les emails: https://ethereal.email/login`);
    console.log('  2. Mailtrap (Test) - Désactivée (à configurer)');
    console.log('  3. Gmail - Désactivée (à configurer)');

    console.log('\n📧 Configuration active : Ethereal (Test Auto)');
    console.log('   Les emails de test seront visibles sur https://ethereal.email');
    console.log('   Utilisez les identifiants ci-dessus pour vous connecter\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

seedEmailConfig();
