const { EventTrigger, TemplateMessage } = require('../models');
const emailService = require('./emailService');

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
      console.log(`[EventTrigger] Déclenchement de l'événement: ${eventCode}`);

      // Récupérer le trigger par code
      const trigger = await EventTrigger.findByCode(eventCode);

      if (!trigger) {
        console.warn(`[EventTrigger] ❌ Event trigger '${eventCode}' non trouvé`);
        return { success: false, reason: 'trigger_not_found' };
      }

      console.log(`[EventTrigger] ✓ Trigger trouvé: ${trigger.libelle}`);
      console.log(`[EventTrigger]   - Email actif: ${trigger.email_actif}`);
      console.log(`[EventTrigger]   - SMS actif: ${trigger.sms_actif}`);
      console.log(`[EventTrigger]   - Template email: ${trigger.template_email_code || '(aucun)'}`);

      const results = {
        eventCode,
        emailSent: false,
        smsSent: false,
        errors: []
      };

      // Évaluer la condition d'envoi
      if (!trigger.evaluateCondition(data)) {
        console.log(`[EventTrigger] ⚠ Condition d'envoi non satisfaite pour '${eventCode}'`);
        return { success: false, reason: 'condition_not_met' };
      }

      console.log(`[EventTrigger] ✓ Condition d'envoi satisfaite`);

      // Gérer le délai d'envoi
      if (trigger.delai_envoi && trigger.delai_envoi > 0) {
        // TODO: Implémenter un système de queue pour les envois différés
        console.log(`Envoi différé de ${trigger.delai_envoi} minutes pour '${eventCode}'`);
      }

      // Envoyer l'email si activé
      if (trigger.shouldSendEmail()) {
        console.log(`[EventTrigger] → Envoi de l'email...`);
        try {
          const emailResult = await this.sendEmail(trigger, data, options);
          results.emailSent = true;
          console.log(`[EventTrigger] ✓ Email envoyé avec succès`);
        } catch (error) {
          console.error(`[EventTrigger] ❌ Erreur envoi email pour '${eventCode}':`, error.message);
          results.errors.push({ type: 'email', message: error.message });
        }
      } else {
        console.log(`[EventTrigger] ⊘ Envoi d'email non activé ou pas de template configuré`);
      }

      // Envoyer le SMS si activé
      if (trigger.shouldSendSMS()) {
        try {
          await this.sendSMS(trigger, data, options);
          results.smsSent = true;
        } catch (error) {
          console.error(`Erreur envoi SMS pour '${eventCode}':`, error);
          results.errors.push({ type: 'sms', message: error.message });
        }
      }

      return {
        success: results.emailSent || results.smsSent,
        ...results
      };
    } catch (error) {
      console.error(`Erreur lors du déclenchement de l'événement '${eventCode}':`, error);
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
    const variables = this.prepareVariables(data);

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

    // TODO: Implémenter l'envoi de SMS
    console.log(`Envoi SMS pour '${trigger.code}' - À implémenter`);

    // Pour l'instant, on simule un succès
    return { success: true, reason: 'sms_not_implemented' };
  }

  /**
   * Prépare les variables pour les templates
   * @param {Object} data - Données brutes
   * @returns {Object} - Variables formatées
   */
  prepareVariables(data) {
    const variables = {};

    // Si les données sont directement un adhérent
    if (data.prenom && data.nom && data.email) {
      variables.prenom = data.prenom;
      variables.nom = data.nom;
      variables.email = data.email;
      variables.code_barre = data.code_barre;
    }

    // Si les données contiennent un adhérent imbriqué
    if (data.adherent) {
      variables.prenom = data.adherent.prenom;
      variables.nom = data.adherent.nom;
      variables.email = data.adherent.email;
      variables.code_barre = data.adherent.code_barre;
    }

    // Si les données contiennent un jeu
    if (data.jeu) {
      variables.titre_jeu = data.jeu.titre;
      variables.editeur = data.jeu.editeur;
    }

    // Si les données contiennent un emprunt
    if (data.date_emprunt) {
      variables.date_emprunt = new Date(data.date_emprunt).toLocaleDateString('fr-FR');
    }
    if (data.date_retour_prevue) {
      variables.date_retour_prevue = new Date(data.date_retour_prevue).toLocaleDateString('fr-FR');
    }

    // Si les données contiennent une cotisation
    if (data.montant_paye !== undefined) {
      variables.montant = data.montant_paye.toFixed(2);
    }
    if (data.periode_debut) {
      variables.periode_debut = new Date(data.periode_debut).toLocaleDateString('fr-FR');
    }
    if (data.periode_fin) {
      variables.periode_fin = new Date(data.periode_fin).toLocaleDateString('fr-FR');
    }
    if (data.mode_paiement) {
      variables.mode_paiement = data.mode_paiement;
    }

    // Copier toutes les autres propriétés
    Object.keys(data).forEach(key => {
      if (!variables[key] && typeof data[key] !== 'object') {
        variables[key] = data[key];
      }
    });

    return variables;
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
