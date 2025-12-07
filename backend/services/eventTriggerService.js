const { EventTrigger, TemplateMessage, ConfigurationSMS, Emprunt, Jeu, Utilisateur } = require('../models');
const emailService = require('./emailService');
const smsService = require('../utils/smsService');
const { Op } = require('sequelize');

/**
 * Service de gestion des déclencheurs d'événements
 * Orchestre l'envoi automatique d'emails/SMS selon les événements
 */
class EventTriggerService {
  /**
   * Déclenche un événement et envoie les communications associées
   * @param {string} eventCode - Code de l'événement (ex: ADHERENT_CREATED)
   * @param {Object} data - Données contextuelles pour l'événement
   * @param {Object} options - Options supplémentaires
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async triggerEvent(eventCode, data, options = {}) {
    try {
      // Récupérer le trigger par code
      const trigger = await EventTrigger.findByCode(eventCode);

      if (!trigger) {
        return { success: false, reason: 'trigger_not_found' };
      }

      const results = {
        eventCode,
        emailSent: false,
        smsSent: false,
        errors: []
      };

      // Évaluer la condition d'envoi
      if (!trigger.evaluateCondition(data)) {
        return { success: false, reason: 'condition_not_met' };
      }

      // Envoyer l'email si activé
      if (trigger.shouldSendEmail()) {
        try {
          await this.sendEmail(trigger, data, options);
          results.emailSent = true;
        } catch (error) {
          console.error(`Erreur email '${eventCode}':`, error.message);
          results.errors.push({ type: 'email', message: error.message });
        }
      }

      // Envoyer le SMS si activé
      if (trigger.shouldSendSMS()) {
        try {
          await this.sendSMS(trigger, data, options);
          results.smsSent = true;
        } catch (error) {
          console.error(`Erreur SMS '${eventCode}':`, error.message);
          results.errors.push({ type: 'sms', message: error.message });
        }
      }

      return {
        success: results.emailSent || results.smsSent,
        ...results
      };
    } catch (error) {
      console.error(`Erreur trigger '${eventCode}':`, error.message);
      return {
        success: false,
        reason: 'trigger_error',
        error: error.message
      };
    }
  }

  /**
   * Envoie un email pour un événement
   * @param {EventTrigger} trigger - Déclencheur d'événement
   * @param {Object} data - Données pour le template
   * @param {Object} options - Options supplémentaires
   */
  async sendEmail(trigger, data, options = {}) {
    if (!trigger.template_email_code) {
      throw new Error('Aucun template email configuré pour cet événement');
    }

    // Récupérer le template
    const template = await TemplateMessage.findByCode(trigger.template_email_code);

    if (!template) {
      throw new Error(`Template email '${trigger.template_email_code}' non trouvé`);
    }

    // Vérifier que le template est compatible email
    if (template.type_message !== 'email' && template.type_message !== 'both') {
      throw new Error('Template non compatible avec l\'email');
    }

    // Extraire l'email du destinataire
    const to = options.to || data.email || data.adherent?.email;

    if (!to) {
      throw new Error('Aucun destinataire spécifié');
    }

    // Préparer les variables pour le template
    const variables = await this.prepareVariables(data);

    // Compiler le template
    const compiled = template.compileEmail(variables);

    // Envoyer l'email via le service email
    return await emailService.sendEmail({
      to,
      subject: compiled.objet,
      html: compiled.corps,
      templateCode: trigger.template_email_code,
      metadata: {
        eventCode: trigger.code,
        destinataire_nom: variables.prenom && variables.nom ? `${variables.prenom} ${variables.nom}` : null,
        variables
      },
      adherentId: data.adherent_id || data.adherent?.id || data.id,
      empruntId: options.empruntId || data.emprunt_id,
      cotisationId: options.cotisationId || data.cotisation_id
    });
  }

  /**
   * Envoie un SMS pour un événement
   * @param {EventTrigger} trigger - Déclencheur d'événement
   * @param {Object} data - Données pour le template
   * @param {Object} options - Options supplémentaires
   */
  async sendSMS(trigger, data, options = {}) {
    if (!trigger.template_sms_code) {
      throw new Error('Aucun template SMS configuré pour cet événement');
    }

    // Récupérer le template
    const template = await TemplateMessage.findByCode(trigger.template_sms_code);

    if (!template) {
      throw new Error(`Template SMS '${trigger.template_sms_code}' non trouvé`);
    }

    // Vérifier que le template est compatible SMS
    if (template.type_message !== 'sms' && template.type_message !== 'both') {
      throw new Error('Template non compatible avec le SMS');
    }

    // Extraire le telephone du destinataire
    const telephone = options.to || data.telephone || data.adherent?.telephone;

    if (!telephone) {
      throw new Error('Aucun numéro de téléphone spécifié');
    }

    // Normaliser le numero au format international
    const phoneNumber = this.normalizePhoneNumber(telephone);

    // Récupérer la configuration SMS active
    const smsConfig = await ConfigurationSMS.findOne({
      where: { actif: true },
      order: [['id', 'ASC']]
    });

    if (!smsConfig) {
      throw new Error('Aucune configuration SMS active');
    }

    // Préparer les variables pour le template
    const variables = await this.prepareVariables(data);

    // Compiler le template
    const smsText = template.compileSMS(variables);

    // Envoyer le SMS via le service
    return await smsService.sendSMS(smsConfig.id, {
      to: phoneNumber,
      text: smsText,
      template_code: trigger.template_sms_code,
      adherent_id: data.adherent_id || data.adherent?.id || data.id,
      destinataire_nom: variables.prenom && variables.nom ? `${variables.prenom} ${variables.nom}` : null,
      emprunt_id: options.empruntId || data.emprunt_id,
      cotisation_id: options.cotisationId || data.cotisation_id
    });
  }

  /**
   * Normalise un numero de telephone au format international
   * @param {string} phone - Numero de telephone
   * @returns {string} - Numero au format +33...
   */
  normalizePhoneNumber(phone) {
    if (!phone) return null;

    // Nettoyer le numero
    let cleaned = phone.replace(/[\s\-\.]/g, '');

    // Si deja au format international
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Numeros francais commencant par 0
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+33' + cleaned.substring(1);
    }

    // Numeros francais sans le 0 initial
    if (cleaned.startsWith('33') && cleaned.length === 11) {
      return '+' + cleaned;
    }

    return '+' + cleaned;
  }

  /**
   * Prépare les variables pour les templates
   * @param {Object} data - Données brutes
   * @returns {Promise<Object>} - Variables formatées
   */
  async prepareVariables(data) {
    const variables = {};

    // ============================================
    // Variables de structure (depuis parametres)
    // ============================================
    const structureVars = this.getStructureVariables();
    Object.assign(variables, structureVars);

    // ============================================
    // Variable systeme
    // ============================================
    variables.date_jour = new Date().toLocaleDateString('fr-FR');

    // ============================================
    // Variables adherent
    // ============================================
    let adherentId = null;

    // Si les données sont directement un adhérent
    if (data.prenom && data.nom && data.email) {
      variables.prenom = data.prenom;
      variables.nom = data.nom;
      variables.email = data.email;
      variables.telephone = data.telephone;
      variables.code_barre = data.code_barre;
      variables.date_adhesion = data.date_adhesion ? new Date(data.date_adhesion).toLocaleDateString('fr-FR') : '';
      variables.adresse = data.adresse || '';
      variables.ville = data.ville || '';
      variables.code_postal = data.code_postal || '';
      adherentId = data.id;
    }

    // Si les données contiennent un adhérent imbriqué
    if (data.adherent) {
      variables.prenom = data.adherent.prenom;
      variables.nom = data.adherent.nom;
      variables.email = data.adherent.email;
      variables.telephone = data.adherent.telephone;
      variables.code_barre = data.adherent.code_barre;
      variables.date_adhesion = data.adherent.date_adhesion ? new Date(data.adherent.date_adhesion).toLocaleDateString('fr-FR') : '';
      variables.adresse = data.adherent.adresse || '';
      variables.ville = data.adherent.ville || '';
      variables.code_postal = data.adherent.code_postal || '';
      adherentId = data.adherent.id || data.adherent_id;
    }

    // ============================================
    // Variables emprunt (jeu unique)
    // ============================================
    // Si les données contiennent un jeu
    if (data.jeu) {
      variables.jeu_titre = data.jeu.titre;
      variables.editeur = data.jeu.editeur;
    }

    // Si les données contiennent un emprunt
    if (data.date_emprunt) {
      variables.date_emprunt = new Date(data.date_emprunt).toLocaleDateString('fr-FR');
    }
    if (data.date_retour_prevue) {
      variables.date_retour_prevue = new Date(data.date_retour_prevue).toLocaleDateString('fr-FR');
    }
    // Calculer les jours de retard si applicable
    if (data.date_retour_prevue && !data.date_retour_effective) {
      const dateRetour = new Date(data.date_retour_prevue);
      const aujourdhui = new Date();
      const diffTime = aujourdhui - dateRetour;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      variables.jours_retard = diffDays > 0 ? diffDays : 0;
    }

    // ============================================
    // Variables listes d'emprunts (jeux multiples)
    // ============================================
    if (adherentId) {
      const empruntsVars = await this.prepareEmpruntsVariables(adherentId);
      Object.assign(variables, empruntsVars);
    }

    // ============================================
    // Variables cotisation
    // ============================================
    if (data.montant_paye !== undefined) {
      variables.montant = Number(data.montant_paye).toFixed(2) + ' €';
    }
    if (data.periode_debut) {
      variables.date_debut = new Date(data.periode_debut).toLocaleDateString('fr-FR');
    }
    if (data.periode_fin) {
      variables.date_fin = new Date(data.periode_fin).toLocaleDateString('fr-FR');
    }
    if (data.mode_paiement) {
      variables.mode_paiement = data.mode_paiement;
    }
    // Tarif libelle depuis la cotisation ou le tarif
    if (data.tarifCotisation) {
      variables.tarif_libelle = data.tarifCotisation.libelle;
    } else if (data.tarif) {
      variables.tarif_libelle = data.tarif.libelle;
    }

    // Copier toutes les autres propriétés non-objets
    Object.keys(data).forEach(key => {
      if (!variables[key] && typeof data[key] !== 'object') {
        variables[key] = data[key];
      }
    });

    return variables;
  }

  /**
   * Prepare les variables pour les listes d'emprunts d'un adherent
   * @param {number} adherentId - ID de l'adherent
   * @returns {Promise<Object>} - Variables jeux_en_cours et jeux_non_rendus (HTML et SMS)
   */
  async prepareEmpruntsVariables(adherentId) {
    const variables = {
      jeux_en_cours: '',
      jeux_en_cours_sms: '',
      jeux_non_rendus: '',
      jeux_non_rendus_sms: '',
      nb_jeux_en_cours: 0,
      nb_jeux_non_rendus: 0
    };

    try {
      // Recuperer tous les emprunts en cours de l'adherent
      const empruntsEnCours = await Emprunt.findAll({
        where: {
          adherent_id: adherentId,
          statut: 'en_cours'
        },
        include: [{
          model: Jeu,
          as: 'jeu',
          attributes: ['id', 'titre']
        }],
        order: [['date_retour_prevue', 'ASC']]
      });

      if (empruntsEnCours.length === 0) {
        variables.jeux_en_cours = '<p>Aucun emprunt en cours</p>';
        variables.jeux_en_cours_sms = 'Aucun emprunt en cours';
        variables.jeux_non_rendus = '<p>Aucun jeu en retard</p>';
        variables.jeux_non_rendus_sms = 'Aucun jeu en retard';
        return variables;
      }

      const aujourdhui = new Date();
      aujourdhui.setHours(0, 0, 0, 0);

      const jeuxEnCours = [];
      const jeuxEnRetard = [];

      empruntsEnCours.forEach(emprunt => {
        const dateRetour = new Date(emprunt.date_retour_prevue);
        dateRetour.setHours(0, 0, 0, 0);
        const dateRetourStr = dateRetour.toLocaleDateString('fr-FR');
        const jeuTitre = emprunt.jeu?.titre || 'Jeu inconnu';

        // Calculer les jours de retard
        const diffTime = aujourdhui - dateRetour;
        const joursRetard = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        jeuxEnCours.push({
          titre: jeuTitre,
          dateRetour: dateRetourStr,
          joursRetard: joursRetard > 0 ? joursRetard : 0
        });

        if (joursRetard > 0) {
          jeuxEnRetard.push({
            titre: jeuTitre,
            dateRetour: dateRetourStr,
            joursRetard: joursRetard
          });
        }
      });

      // Generer les variables pour jeux_en_cours
      variables.nb_jeux_en_cours = jeuxEnCours.length;
      variables.jeux_en_cours = this.generateEmpruntsTableHTML(jeuxEnCours, false);
      variables.jeux_en_cours_sms = this.generateEmpruntsListeSMS(jeuxEnCours, false);

      // Generer les variables pour jeux_non_rendus
      variables.nb_jeux_non_rendus = jeuxEnRetard.length;
      if (jeuxEnRetard.length > 0) {
        variables.jeux_non_rendus = this.generateEmpruntsTableHTML(jeuxEnRetard, true);
        variables.jeux_non_rendus_sms = this.generateEmpruntsListeSMS(jeuxEnRetard, true);
      } else {
        variables.jeux_non_rendus = '<p>Aucun jeu en retard</p>';
        variables.jeux_non_rendus_sms = 'Aucun jeu en retard';
      }

    } catch (error) {
      console.error('Erreur preparation variables emprunts:', error);
    }

    return variables;
  }

  /**
   * Genere un tableau HTML pour les emprunts
   * @param {Array} jeux - Liste des jeux avec titre, dateRetour, joursRetard
   * @param {boolean} showRetard - Afficher la colonne jours de retard
   * @returns {string} - HTML du tableau
   */
  generateEmpruntsTableHTML(jeux, showRetard) {
    if (jeux.length === 0) return '';

    let html = '<table style="width:100%; border-collapse:collapse; margin:10px 0;">';
    html += '<thead><tr style="background-color:#f8f9fa;">';
    html += '<th style="border:1px solid #dee2e6; padding:8px; text-align:left;">Jeu</th>';
    html += '<th style="border:1px solid #dee2e6; padding:8px; text-align:left;">Date de retour</th>';
    if (showRetard) {
      html += '<th style="border:1px solid #dee2e6; padding:8px; text-align:center;">Jours de retard</th>';
    }
    html += '</tr></thead><tbody>';

    jeux.forEach(jeu => {
      const retardStyle = jeu.joursRetard > 0 ? 'color:#dc3545; font-weight:bold;' : '';
      html += '<tr>';
      html += `<td style="border:1px solid #dee2e6; padding:8px;">${jeu.titre}</td>`;
      html += `<td style="border:1px solid #dee2e6; padding:8px; ${retardStyle}">${jeu.dateRetour}</td>`;
      if (showRetard) {
        html += `<td style="border:1px solid #dee2e6; padding:8px; text-align:center; ${retardStyle}">${jeu.joursRetard} jour${jeu.joursRetard > 1 ? 's' : ''}</td>`;
      }
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Genere une liste texte pour SMS des emprunts
   * @param {Array} jeux - Liste des jeux avec titre, dateRetour, joursRetard
   * @param {boolean} showRetard - Afficher les jours de retard au lieu de la date
   * @returns {string} - Liste texte pour SMS
   */
  generateEmpruntsListeSMS(jeux, showRetard) {
    if (jeux.length === 0) return '';

    return jeux.map(jeu => {
      if (showRetard) {
        return `${jeu.titre} : ${jeu.joursRetard} jour${jeu.joursRetard > 1 ? 's' : ''}`;
      } else {
        return `${jeu.titre} : retour prevu le ${jeu.dateRetour}`;
      }
    }).join(', ');
  }

  /**
   * Recupere les variables de structure depuis les parametres
   * @returns {Object} - Variables de structure
   */
  getStructureVariables() {
    // TODO: Charger depuis la table Parametrage quand elle existera
    // Pour l'instant, utiliser des valeurs par defaut ou des variables d'environnement
    return {
      structure_nom: process.env.STRUCTURE_NOM || 'Ludotheque',
      structure_adresse: process.env.STRUCTURE_ADRESSE || '',
      structure_email: process.env.STRUCTURE_EMAIL || '',
      structure_telephone: process.env.STRUCTURE_TELEPHONE || ''
    };
  }

  /**
   * Déclenche l'événement de création d'adhérent
   * @param {Object} adherent - Instance d'adhérent
   */
  async triggerAdherentCreated(adherent) {
    return await this.triggerEvent('ADHERENT_CREATED', adherent);
  }

  /**
   * Déclenche l'événement de modification d'adhérent
   * @param {Object} adherent - Instance d'adhérent
   */
  async triggerAdherentUpdated(adherent) {
    return await this.triggerEvent('ADHERENT_UPDATED', adherent);
  }

  /**
   * Déclenche l'événement de suspension d'adhérent
   * @param {Object} adherent - Instance d'adhérent
   */
  async triggerAdherentSuspended(adherent) {
    return await this.triggerEvent('ADHERENT_SUSPENDED', adherent);
  }

  /**
   * Déclenche l'événement de création d'emprunt
   * @param {Object} emprunt - Instance d'emprunt
   * @param {Object} adherent - Instance d'adhérent
   * @param {Object} jeu - Instance de jeu
   */
  async triggerEmpruntCreated(emprunt, adherent, jeu) {
    return await this.triggerEvent('EMPRUNT_CREATED', {
      ...emprunt.toJSON(),
      adherent: adherent.toJSON(),
      jeu: jeu.toJSON(),
      email: adherent.email
    }, {
      empruntId: emprunt.id
    });
  }

  /**
   * Déclenche l'événement de retour d'emprunt
   * @param {Object} emprunt - Instance d'emprunt
   * @param {Object} adherent - Instance d'adhérent
   * @param {Object} jeu - Instance de jeu
   */
  async triggerEmpruntReturned(emprunt, adherent, jeu) {
    return await this.triggerEvent('EMPRUNT_RETURNED', {
      ...emprunt.toJSON(),
      adherent: adherent.toJSON(),
      jeu: jeu.toJSON(),
      email: adherent.email
    }, {
      empruntId: emprunt.id
    });
  }

  /**
   * Déclenche l'événement de création de cotisation
   * @param {Object} cotisation - Instance de cotisation
   * @param {Object} adherent - Instance d'adhérent
   */
  async triggerCotisationCreated(cotisation, adherent) {
    return await this.triggerEvent('COTISATION_CREATED', {
      ...cotisation.toJSON(),
      adherent: adherent.toJSON(),
      email: adherent.email
    }, {
      cotisationId: cotisation.id
    });
  }
}

// Export singleton
module.exports = new EventTriggerService();
