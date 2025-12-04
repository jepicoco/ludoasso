const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { ConfigurationEmail, TemplateMessage, EmailLog } = require('../models');

// Configuration du chiffrement AES-256-CBC pour les mots de passe SMTP
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(process.env.EMAIL_ENCRYPTION_KEY || '', 'hex');

if (ENCRYPTION_KEY.length !== 32) {
  console.warn('⚠️  EMAIL_ENCRYPTION_KEY must be 32 bytes (64 hex chars). Email password encryption may not work properly.');
}

/**
 * Service d'envoi d'emails
 * Singleton gérant l'envoi d'emails avec templates, logging et chiffrement des mots de passe
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.defaultConfig = null;
  }

  /**
   * Chiffre un mot de passe avec AES-256-CBC
   * @param {string} password - Mot de passe en clair
   * @returns {string} - Format: iv:encryptedData (hex)
   */
  encryptPassword(password) {
    if (!password) return '';

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error('Erreur de chiffrement du mot de passe');
    }
  }

  /**
   * Déchiffre un mot de passe
   * @param {string} encrypted - Format: iv:encryptedData (hex)
   * @returns {string} - Mot de passe en clair
   */
  decryptPassword(encrypted) {
    if (!encrypted) return '';

    try {
      const parts = encrypted.split(':');
      if (parts.length !== 2) {
        throw new Error('Format de mot de passe chiffré invalide');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Erreur de déchiffrement du mot de passe');
    }
  }

  /**
   * Initialise le transporteur avec la configuration active
   */
  async initialize() {
    try {
      // Récupérer la configuration active
      this.defaultConfig = await ConfigurationEmail.findOne({
        where: { actif: true },
        order: [['id', 'DESC']]
      });

      if (!this.defaultConfig) {
        // Pas de configuration email active
        return false;
      }

      // Créer le transporteur
      this.transporter = nodemailer.createTransport({
        host: this.defaultConfig.smtp_host,
        port: this.defaultConfig.smtp_port,
        secure: this.defaultConfig.smtp_secure,
        auth: {
          user: this.defaultConfig.smtp_user,
          pass: this.defaultConfig.smtp_password
        },
        tls: {
          rejectUnauthorized: false // Pour les serveurs de test
        }
      });

      // Vérifier la connexion (mais ne pas bloquer si ça échoue)
      try {
        await this.transporter.verify();
        return true;
      } catch (verifyError) {
        console.error('Erreur SMTP:', verifyError.message);
        // Ne pas réinitialiser le transporteur, il pourra peut-être fonctionner quand même
        return false;
      }
    } catch (error) {
      console.error('Erreur init email:', error.message);
      return false;
    }
  }

  /**
   * Récupère un template d'email par code
   */
  async getTemplate(code) {
    const template = await TemplateMessage.findOne({
      where: {
        code,
        canal: 'email',
        actif: true
      }
    });

    if (!template) {
      throw new Error(`Template email '${code}' non trouvé`);
    }

    return template;
  }

  /**
   * Remplace les variables dans un template
   */
  replaceVariables(template, variables) {
    let content = template;

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, variables[key] || '');
    });

    return content;
  }

  /**
   * Envoie un email
   */
  async sendEmail({ to, subject, html, from = null, templateCode = null, metadata = null, adherentId = null, empruntId = null, cotisationId = null }) {
    if (!this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      throw new Error('Service email non initialisé');
    }

    const mailOptions = {
      from: from || this.defaultConfig.email_expediteur,
      to,
      subject,
      html
    };

    // Créer le log avant l'envoi
    const emailLog = await EmailLog.create({
      template_code: templateCode,
      destinataire: to,
      destinataire_nom: metadata?.destinataire_nom || null,
      objet: subject,
      corps: html,
      statut: 'en_attente',
      date_envoi: new Date(),
      adherent_id: adherentId,
      emprunt_id: empruntId,
      cotisation_id: cotisationId,
      metadata: metadata
    });

    try {
      const info = await this.transporter.sendMail(mailOptions);

      // Mettre à jour le log avec succès
      await emailLog.update({
        statut: 'envoye',
        message_id: info.messageId
      });

      return { success: true, messageId: info.messageId, logId: emailLog.id };
    } catch (error) {
      console.error('Erreur envoi email:', error.message);

      // Mettre à jour le log avec l'erreur
      await emailLog.update({
        statut: 'erreur',
        erreur_message: error.message
      });

      throw error;
    }
  }

  /**
   * Envoie un email depuis un template
   */
  async sendTemplateEmail(templateCode, to, variables = {}, options = {}) {
    try {
      const template = await this.getTemplate(templateCode);

      const subject = this.replaceVariables(template.objet, variables);
      const html = this.replaceVariables(template.contenu, variables);

      return await this.sendEmail({
        to,
        subject,
        html,
        templateCode,
        metadata: {
          destinataire_nom: variables.prenom && variables.nom ? `${variables.prenom} ${variables.nom}` : null,
          variables
        },
        ...options
      });
    } catch (error) {
      console.error(`Erreur template '${templateCode}':`, error.message);
      throw error;
    }
  }

  /**
   * Email de bienvenue pour un nouvel adhérent
   */
  async sendWelcomeEmail(adherent) {
    const variables = {
      prenom: adherent.prenom,
      nom: adherent.nom,
      email: adherent.email,
      code_barre: adherent.code_barre,
      date_adhesion: new Date(adherent.date_adhesion).toLocaleDateString('fr-FR')
    };

    return await this.sendTemplateEmail('ADHERENT_CREATION', adherent.email, variables, {
      adherentId: adherent.id
    });
  }

  /**
   * Email de confirmation d'emprunt
   */
  async sendEmpruntConfirmation(emprunt, adherent, jeu) {
    const dateEmprunt = new Date(emprunt.date_emprunt).toLocaleDateString('fr-FR');
    const dateRetourPrevue = new Date(emprunt.date_retour_prevue).toLocaleDateString('fr-FR');

    const variables = {
      prenom: adherent.prenom,
      nom: adherent.nom,
      titre_jeu: jeu.titre,
      date_emprunt: dateEmprunt,
      date_retour_prevue: dateRetourPrevue,
      duree_jours: Math.ceil((new Date(emprunt.date_retour_prevue) - new Date(emprunt.date_emprunt)) / (1000 * 60 * 60 * 24))
    };

    return await this.sendTemplateEmail('EMPRUNT_CONFIRMATION', adherent.email, variables, {
      adherentId: adherent.id,
      empruntId: emprunt.id
    });
  }

  /**
   * Email de rappel avant échéance (J-3)
   */
  async sendRappelAvantEcheance(emprunt, adherent, jeu) {
    const dateRetourPrevue = new Date(emprunt.date_retour_prevue).toLocaleDateString('fr-FR');
    const joursRestants = Math.ceil((new Date(emprunt.date_retour_prevue) - new Date()) / (1000 * 60 * 60 * 24));

    const variables = {
      prenom: adherent.prenom,
      nom: adherent.nom,
      titre_jeu: jeu.titre,
      date_retour_prevue: dateRetourPrevue,
      jours_restants: joursRestants
    };

    return await this.sendTemplateEmail('EMPRUNT_RAPPEL_AVANT', adherent.email, variables, {
      adherentId: adherent.id,
      empruntId: emprunt.id
    });
  }

  /**
   * Email de rappel à l'échéance (jour J)
   */
  async sendRappelEcheance(emprunt, adherent, jeu) {
    const dateRetourPrevue = new Date(emprunt.date_retour_prevue).toLocaleDateString('fr-FR');

    const variables = {
      prenom: adherent.prenom,
      nom: adherent.nom,
      titre_jeu: jeu.titre,
      date_retour_prevue: dateRetourPrevue
    };

    return await this.sendTemplateEmail('EMPRUNT_RAPPEL_ECHEANCE', adherent.email, variables, {
      adherentId: adherent.id,
      empruntId: emprunt.id
    });
  }

  /**
   * Email de relance pour retard
   */
  async sendRelanceRetard(emprunt, adherent, jeu) {
    const dateRetourPrevue = new Date(emprunt.date_retour_prevue).toLocaleDateString('fr-FR');
    const joursRetard = Math.ceil((new Date() - new Date(emprunt.date_retour_prevue)) / (1000 * 60 * 60 * 24));

    const variables = {
      prenom: adherent.prenom,
      nom: adherent.nom,
      titre_jeu: jeu.titre,
      date_retour_prevue: dateRetourPrevue,
      jours_retard: joursRetard
    };

    return await this.sendTemplateEmail('EMPRUNT_RELANCE_RETARD', adherent.email, variables, {
      adherentId: adherent.id,
      empruntId: emprunt.id
    });
  }

  /**
   * Email de confirmation de cotisation
   */
  async sendCotisationConfirmation(cotisation, adherent) {
    const datePaiement = new Date(cotisation.date_paiement).toLocaleDateString('fr-FR');

    const variables = {
      prenom: adherent.prenom,
      nom: adherent.nom,
      montant: cotisation.montant.toFixed(2),
      date_paiement: datePaiement,
      mode_paiement: cotisation.mode_paiement,
      annee: new Date(cotisation.date_paiement).getFullYear()
    };

    return await this.sendTemplateEmail('COTISATION_CONFIRMATION', adherent.email, variables, {
      adherentId: adherent.id,
      cotisationId: cotisation.id
    });
  }

  /**
   * Email de rappel de renouvellement de cotisation
   */
  async sendCotisationRappel(adherent, dateExpiration) {
    const dateExp = new Date(dateExpiration).toLocaleDateString('fr-FR');
    const joursRestants = Math.ceil((new Date(dateExpiration) - new Date()) / (1000 * 60 * 60 * 24));

    const variables = {
      prenom: adherent.prenom,
      nom: adherent.nom,
      date_expiration: dateExp,
      jours_restants: joursRestants
    };

    return await this.sendTemplateEmail('COTISATION_RAPPEL', adherent.email, variables, {
      adherentId: adherent.id
    });
  }

  /**
   * Teste une configuration SMTP
   * @param {Object} config - Configuration email (instance ConfigurationEmail ou objet)
   * @returns {Promise<Object>} - {success: boolean, message: string}
   */
  async testConfiguration(config) {
    try {
      const nodemailer = require('nodemailer');

      // Déchiffrer le mot de passe si nécessaire
      let smtpPassword = config.smtp_password;
      if (smtpPassword && smtpPassword.includes(':')) {
        try {
          smtpPassword = this.decryptPassword(smtpPassword);
        } catch (decryptError) {
          // Si le déchiffrement échoue, le mot de passe est peut-être en clair
        }
      }

      // Créer un transporteur temporaire
      const testTransporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_secure || false,
        requireTLS: config.smtp_require_tls !== false,
        auth: {
          user: config.smtp_user,
          pass: smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: config.smtp_timeout || 10000
      });

      // Tester la connexion
      await testTransporter.verify();

      return {
        success: true,
        message: 'Connexion SMTP réussie'
      };
    } catch (error) {
      console.error('Erreur test SMTP:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Export singleton
module.exports = new EmailService();
