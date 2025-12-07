/**
 * Gestion des communications (emails et SMS) pour les usagers
 */

let emailModalInstance = null;
let smsModalInstance = null;
let currentAdherent = null;
let emailTemplates = [];
let smsTemplates = [];

// ============================================
// Initialisation
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Initialiser les modals
  const emailModalEl = document.getElementById('sendEmailModal');
  if (emailModalEl) {
    emailModalInstance = new bootstrap.Modal(emailModalEl);
  }

  const smsModalEl = document.getElementById('sendSmsModal');
  if (smsModalEl) {
    smsModalInstance = new bootstrap.Modal(smsModalEl);
  }

  // Gestion du changement de mode email
  document.querySelectorAll('input[name="email-mode"]').forEach(radio => {
    radio.addEventListener('change', function() {
      toggleEmailMode(this.value);
    });
  });

  // Gestion du changement de mode SMS
  document.querySelectorAll('input[name="sms-mode"]').forEach(radio => {
    radio.addEventListener('change', function() {
      toggleSmsMode(this.value);
    });
  });

  // Prévisualisation template email
  const emailTemplateSelect = document.getElementById('email-template-select');
  if (emailTemplateSelect) {
    emailTemplateSelect.addEventListener('change', function() {
      previewEmailTemplate(this.value);
    });
  }

  // Prévisualisation template SMS
  const smsTemplateSelect = document.getElementById('sms-template-select');
  if (smsTemplateSelect) {
    smsTemplateSelect.addEventListener('change', function() {
      previewSmsTemplate(this.value);
    });
  }

  // Compteur de caractères SMS
  const smsBodyInput = document.getElementById('sms-body');
  if (smsBodyInput) {
    smsBodyInput.addEventListener('input', function() {
      document.getElementById('sms-char-count').textContent = this.value.length;
    });
  }
});

// ============================================
// Ouverture des modals
// ============================================

/**
 * Ouvre le modal d'envoi d'email
 */
async function openSendEmailModal(adherent) {
  currentAdherent = adherent;

  // Réinitialiser le formulaire d'abord
  document.getElementById('emailForm').reset();
  document.getElementById('email-mode-template').checked = true;
  toggleEmailMode('template');

  // Remplir les infos du destinataire APRÈS le reset
  document.getElementById('email-adherent-id').value = adherent.id;
  document.getElementById('email-destinataire').value = `${adherent.prenom} ${adherent.nom} <${adherent.email}>`;

  // Masquer la prévisualisation
  document.getElementById('email-template-preview').style.display = 'none';

  // Charger les templates
  await loadEmailTemplates();

  // Afficher le modal
  emailModalInstance.show();
}

/**
 * Ouvre le modal d'envoi de SMS
 */
async function openSendSmsModal(adherent) {
  currentAdherent = adherent;

  if (!adherent.telephone) {
    showToast('Cet usager n\'a pas de numero de telephone', 'error');
    return;
  }

  // Réinitialiser le formulaire d'abord
  document.getElementById('smsForm').reset();
  document.getElementById('sms-mode-template').checked = true;
  toggleSmsMode('template');
  document.getElementById('sms-char-count').textContent = '0';

  // Remplir les infos du destinataire APRÈS le reset
  document.getElementById('sms-adherent-id').value = adherent.id;
  document.getElementById('sms-destinataire').value = `${adherent.prenom} ${adherent.nom} <${adherent.telephone}>`;

  // Masquer la prévisualisation
  document.getElementById('sms-template-preview').style.display = 'none';

  // Charger les templates
  await loadSmsTemplates();

  // Afficher le modal
  smsModalInstance.show();
}

// ============================================
// Gestion des modes (template / manuel)
// ============================================

/**
 * Bascule entre mode template et mode manuel pour l'email
 */
function toggleEmailMode(mode) {
  const templateSection = document.getElementById('email-template-section');
  const manualSection = document.getElementById('email-manual-section');

  if (mode === 'template') {
    templateSection.style.display = 'block';
    manualSection.style.display = 'none';
  } else {
    templateSection.style.display = 'none';
    manualSection.style.display = 'block';
  }
}

/**
 * Bascule entre mode template et mode manuel pour le SMS
 */
function toggleSmsMode(mode) {
  const templateSection = document.getElementById('sms-template-section');
  const manualSection = document.getElementById('sms-manual-section');

  if (mode === 'template') {
    templateSection.style.display = 'block';
    manualSection.style.display = 'none';
  } else {
    templateSection.style.display = 'none';
    manualSection.style.display = 'block';
  }
}

// ============================================
// Chargement des templates
// ============================================

/**
 * Charge les templates email disponibles
 */
async function loadEmailTemplates() {
  try {
    const response = await apiRequest('/event-triggers/templates?type=email');

    if (response.success && response.data) {
      emailTemplates = response.data;
      const select = document.getElementById('email-template-select');
      select.innerHTML = '<option value="">-- Sélectionner un template --</option>';

      emailTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.code;
        option.textContent = template.libelle;
        option.dataset.template = JSON.stringify(template);
        select.appendChild(option);
      });

      if (emailTemplates.length === 0) {
        select.innerHTML = '<option value="">Aucun template disponible</option>';
      }
    } else {
      console.warn('Réponse API templates email invalide:', response);
      document.getElementById('email-template-select').innerHTML = '<option value="">Aucun template disponible</option>';
    }
  } catch (error) {
    console.error('Erreur chargement templates email:', error);
    document.getElementById('email-template-select').innerHTML = '<option value="">Erreur de chargement</option>';
    showToast('Erreur lors du chargement des templates', 'error');
  }
}

/**
 * Charge les templates SMS disponibles
 */
async function loadSmsTemplates() {
  try {
    const response = await apiRequest('/event-triggers/templates?type=sms');

    if (response.success && response.data) {
      smsTemplates = response.data;
      const select = document.getElementById('sms-template-select');
      select.innerHTML = '<option value="">-- Sélectionner un template --</option>';

      smsTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.code;
        option.textContent = template.libelle;
        option.dataset.template = JSON.stringify(template);
        select.appendChild(option);
      });

      if (smsTemplates.length === 0) {
        select.innerHTML = '<option value="">Aucun template disponible</option>';
      }
    } else {
      console.warn('Réponse API templates SMS invalide:', response);
      document.getElementById('sms-template-select').innerHTML = '<option value="">Aucun template disponible</option>';
    }
  } catch (error) {
    console.error('Erreur chargement templates SMS:', error);
    document.getElementById('sms-template-select').innerHTML = '<option value="">Erreur de chargement</option>';
    showToast('Erreur lors du chargement des templates', 'error');
  }
}

// ============================================
// Prévisualisation des templates
// ============================================

/**
 * Previsualise un template email avec les variables de l'usager
 */
function previewEmailTemplate(templateCode) {
  const previewDiv = document.getElementById('email-template-preview');

  if (!templateCode) {
    previewDiv.style.display = 'none';
    return;
  }

  const template = emailTemplates.find(t => t.code === templateCode);
  if (!template) return;

  // Remplacer les variables avec les données de l'adhérent
  const subject = replaceVariables(template.email_objet, currentAdherent);
  const body = replaceVariables(template.email_corps, currentAdherent);

  document.getElementById('email-preview-subject').textContent = subject;
  document.getElementById('email-preview-body').innerHTML = body;
  previewDiv.style.display = 'block';
}

/**
 * Previsualise un template SMS avec les variables de l'usager
 */
function previewSmsTemplate(templateCode) {
  const previewDiv = document.getElementById('sms-template-preview');

  if (!templateCode) {
    previewDiv.style.display = 'none';
    return;
  }

  const template = smsTemplates.find(t => t.code === templateCode);
  if (!template) return;

  // Remplacer les variables avec les données de l'adhérent
  const body = replaceVariables(template.sms_corps, currentAdherent);

  document.getElementById('sms-preview-body').textContent = body;
  previewDiv.style.display = 'block';
}

/**
 * Remplace les variables {{variable}} dans un texte
 */
function replaceVariables(text, data) {
  if (!text) return '';

  let result = text;

  // Variables communes
  result = result.replace(/\{\{prenom\}\}/g, data.prenom || '');
  result = result.replace(/\{\{nom\}\}/g, data.nom || '');
  result = result.replace(/\{\{email\}\}/g, data.email || '');
  result = result.replace(/\{\{telephone\}\}/g, data.telephone || '');
  result = result.replace(/\{\{code_barre\}\}/g, data.code_barre || '');
  result = result.replace(/\{\{date_adhesion\}\}/g, data.date_adhesion ? new Date(data.date_adhesion).toLocaleDateString('fr-FR') : '');

  return result;
}

// ============================================
// Envoi des messages
// ============================================

/**
 * Envoie un email a l'usager
 */
async function sendEmailToAdherent() {
  try {
    const mode = document.querySelector('input[name="email-mode"]:checked').value;
    const adherentId = document.getElementById('email-adherent-id').value;

    let data = {
      adherentId: parseInt(adherentId),
      to: currentAdherent.email
    };

    if (mode === 'template') {
      const templateCode = document.getElementById('email-template-select').value;

      if (!templateCode) {
        showToast('Veuillez sélectionner un template', 'error');
        return;
      }

      data.templateCode = templateCode;
      data.mode = 'template';
    } else {
      const subject = document.getElementById('email-subject').value.trim();
      const body = document.getElementById('email-body').value.trim();

      if (!subject || !body) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
      }

      data.subject = subject;
      data.body = body;
      data.mode = 'manual';
    }

    // Remplacer les variables
    data.variables = {
      prenom: currentAdherent.prenom,
      nom: currentAdherent.nom,
      email: currentAdherent.email,
      code_barre: currentAdherent.code_barre,
      date_adhesion: currentAdherent.date_adhesion
    };

    const response = await apiRequest(`/adherents/${adherentId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (response.success) {
      showToast('Email envoyé avec succès', 'success');
      emailModalInstance.hide();
    } else {
      showToast(response.message || 'Erreur lors de l\'envoi', 'error');
    }
  } catch (error) {
    console.error('Erreur envoi email:', error);
    showToast('Erreur lors de l\'envoi de l\'email', 'error');
  }
}

/**
 * Envoie un SMS a l'usager
 */
async function sendSmsToAdherent() {
  try {
    const mode = document.querySelector('input[name="sms-mode"]:checked').value;
    const adherentId = document.getElementById('sms-adherent-id').value;

    if (!currentAdherent.telephone) {
      showToast('Cet adhérent n\'a pas de numéro de téléphone', 'error');
      return;
    }

    let data = {
      adherentId: parseInt(adherentId),
      to: currentAdherent.telephone
    };

    if (mode === 'template') {
      const templateCode = document.getElementById('sms-template-select').value;

      if (!templateCode) {
        showToast('Veuillez sélectionner un template', 'error');
        return;
      }

      data.templateCode = templateCode;
      data.mode = 'template';
    } else {
      const body = document.getElementById('sms-body').value.trim();

      if (!body) {
        showToast('Veuillez saisir un message', 'error');
        return;
      }

      if (body.length > 160) {
        showToast('Le message ne peut pas dépasser 160 caractères', 'error');
        return;
      }

      data.body = body;
      data.mode = 'manual';
    }

    // Remplacer les variables
    data.variables = {
      prenom: currentAdherent.prenom,
      nom: currentAdherent.nom,
      telephone: currentAdherent.telephone
    };

    const response = await apiRequest(`/adherents/${adherentId}/send-sms`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (response.success) {
      showToast('SMS envoyé avec succès', 'success');
      smsModalInstance.hide();
    } else {
      showToast(response.message || 'Erreur lors de l\'envoi', 'error');
    }
  } catch (error) {
    console.error('Erreur envoi SMS:', error);
    showToast('Erreur lors de l\'envoi du SMS', 'error');
  }
}

/**
 * Affiche un toast de notification
 */
function showToast(message, type = 'info') {
  Swal.fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
    title: message
  });
}
