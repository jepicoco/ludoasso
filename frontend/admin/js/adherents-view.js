// ============================================
// Modal de visualisation détaillée d'un adhérent
// ============================================

let viewModalInstance = null;
let currentViewAdherentId = null;

/**
 * Affiche la modal de visualisation détaillée
 */
async function viewAdherent(id) {
  try {
    currentViewAdherentId = id;

    // Récupérer les données
    const [dataResponse, statsResponse] = await Promise.all([
      adherentsAPI.getById(id),
      adherentsAPI.getStats(id)
    ]);

    const adherent = dataResponse.adherent;
    const stats = statsResponse;

    // Remplir la modal
    fillViewModal(adherent, stats);

    // Configurer le chargement des communications au clic sur l'onglet
    setupCommunicationsTab(id);

    // Afficher la modal
    if (!viewModalInstance) {
      viewModalInstance = new bootstrap.Modal(document.getElementById('viewAdherentModal'));
    }
    viewModalInstance.show();
  } catch (error) {
    console.error('Erreur affichage adhérent:', error);
    showToast('Erreur lors du chargement des détails: ' + error.message, 'error');
  }
}

/**
 * Configure le chargement paresseux de l'onglet Communications
 */
function setupCommunicationsTab(adherentId) {
  let communicationsLoaded = false;

  // Trouver le bouton de l'onglet Communications
  const commTab = document.querySelector('[data-bs-target="#view-tab-communications"]');
  if (commTab) {
    // Supprimer les anciens listeners
    const newTab = commTab.cloneNode(true);
    commTab.parentNode.replaceChild(newTab, commTab);

    // Ajouter un listener pour charger les communications au clic
    newTab.addEventListener('shown.bs.tab', () => {
      if (!communicationsLoaded) {
        loadAdherentCommunications(adherentId);
        communicationsLoaded = true;
      }
    });
  }

  // Reinitialiser l'affichage
  document.getElementById('view_communications_loading').style.display = 'block';
  document.getElementById('view_communications_content').style.display = 'none';
}

/**
 * Remplit la modal avec les données
 */
function fillViewModal(adherent, stats) {
  // Photo
  const photoUrl = adherent.photo || 'https://via.placeholder.com/150?text=Pas+de+photo';
  document.getElementById('view_photo').src = photoUrl;

  // Nom et informations principales
  document.getElementById('view_nom_prenom').textContent = `${adherent.prenom} ${adherent.nom}`;
  document.getElementById('view_code_barre').textContent = adherent.code_barre || 'N/A';

  // Badge statut
  const statutBadge = document.getElementById('view_statut_badge');
  const statutClass = adherent.statut === 'actif' ? 'bg-success' :
                      adherent.statut === 'suspendu' ? 'bg-danger' : 'bg-warning';
  const statutText = adherent.statut.charAt(0).toUpperCase() + adherent.statut.slice(1);
  statutBadge.innerHTML = `<span class="badge ${statutClass}">${statutText}</span>`;

  // Onglet Infos
  document.getElementById('view_email').textContent = adherent.email || '-';
  document.getElementById('view_telephone').textContent = adherent.telephone || '-';

  // Date de naissance avec âge
  if (adherent.date_naissance) {
    const age = calculateAge(adherent.date_naissance);
    const dateFormatted = new Date(adherent.date_naissance).toLocaleDateString('fr-FR');
    document.getElementById('view_date_naissance').textContent = `${dateFormatted} (${age} ans)`;
  } else {
    document.getElementById('view_date_naissance').textContent = '-';
  }

  // Adresse complète
  let adresseComplete = '';
  if (adherent.adresse) adresseComplete += adherent.adresse;
  if (adherent.code_postal || adherent.ville) {
    if (adresseComplete) adresseComplete += '<br>';
    adresseComplete += `${adherent.code_postal || ''} ${adherent.ville || ''}`.trim();
  }
  document.getElementById('view_adresse_complete').innerHTML = adresseComplete || '-';

  // Rôle
  const roleBadgeColors = {
    'administrateur': 'bg-danger',
    'comptable': 'bg-warning',
    'gestionnaire': 'bg-info',
    'benevole': 'bg-primary',
    'usager': 'bg-secondary'
  };
  const roleText = adherent.role ? adherent.role.charAt(0).toUpperCase() + adherent.role.slice(1) : 'Usager';
  const roleColor = roleBadgeColors[adherent.role] || 'bg-secondary';
  document.getElementById('view_role').className = `badge ${roleColor}`;
  document.getElementById('view_role').textContent = roleText;

  // Dates adhésion
  if (adherent.date_adhesion) {
    const dateAdh = new Date(adherent.date_adhesion).toLocaleDateString('fr-FR');
    document.getElementById('view_date_adhesion').textContent = dateAdh;
  } else {
    document.getElementById('view_date_adhesion').textContent = '-';
  }

  // Membre association
  document.getElementById('view_adhesion_association').innerHTML =
    adherent.adhesion_association
      ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Oui</span>'
      : '<span class="badge bg-secondary"><i class="bi bi-x-circle"></i> Non</span>';

  // Notes
  const notesSection = document.getElementById('view_notes_section');
  if (adherent.notes && adherent.notes.trim()) {
    notesSection.style.display = 'block';
    document.getElementById('view_notes').textContent = adherent.notes;
  } else {
    notesSection.style.display = 'none';
  }

  // Statistiques emprunts
  if (stats.stats) {
    document.getElementById('view_stat_emprunts_total').textContent = stats.stats.totalEmprunts || 0;
    document.getElementById('view_stat_emprunts_en_cours').textContent = stats.stats.empruntsEnCours || 0;
    document.getElementById('view_stat_emprunts_retard').textContent = stats.stats.empruntsEnRetard || 0;
  }

  // Cotisations (TODO: à implémenter quand API disponible)
  document.getElementById('view_cotisations_list').innerHTML =
    '<p class="text-muted"><i class="bi bi-info-circle"></i> Fonctionnalité à venir</p>';

  // Configuration des boutons d'action
  setupViewModalActions(adherent);
}

/**
 * Configure les boutons d'action de la modal
 */
function setupViewModalActions(adherent) {
  // Bouton modifier
  document.getElementById('btn_view_edit').onclick = () => {
    viewModalInstance.hide();
    editAdherent(adherent.id);
  };

  // Bouton imprimer carte
  document.getElementById('btn_view_print').onclick = () => {
    printCard(adherent.id);
  };

  // Bouton envoyer email
  document.getElementById('btn_send_email').onclick = () => {
    viewModalInstance.hide();
    openSendEmailModal(adherent);
  };

  // Bouton envoyer SMS
  document.getElementById('btn_send_sms').onclick = () => {
    viewModalInstance.hide();
    openSendSmsModal(adherent);
  };

  // Bouton nouvelle cotisation
  document.getElementById('btn_new_cotisation').onclick = () => {
    createCotisationForAdherent(adherent);
  };

  // Bouton nouveau prêt
  document.getElementById('btn_new_emprunt').onclick = () => {
    createEmpruntForAdherent(adherent);
  };
}

// ============================================
// ACTIONS RAPIDES
// ============================================

/**
 * Envoie un email à un adhérent
 */
async function sendEmailToAdherent(adherent) {
  const result = await Swal.fire({
    title: 'Envoyer un email',
    html: `
      <p>Destinataire: <strong>${adherent.prenom} ${adherent.nom}</strong> (${adherent.email})</p>
      <div class="text-start">
        <div class="mb-3">
          <label class="form-label">Objet</label>
          <input type="text" id="email_objet" class="form-control" placeholder="Objet de l'email">
        </div>
        <div class="mb-3">
          <label class="form-label">Message</label>
          <textarea id="email_message" class="form-control" rows="5" placeholder="Votre message..."></textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-send"></i> Envoyer',
    cancelButtonText: 'Annuler',
    width: '600px',
    preConfirm: () => {
      const objet = document.getElementById('email_objet').value;
      const message = document.getElementById('email_message').value;

      if (!objet || !message) {
        Swal.showValidationMessage('Veuillez remplir tous les champs');
        return false;
      }

      return { objet, message };
    }
  });

  if (result.isConfirmed) {
    // TODO: Appel API pour envoyer l'email
    showToast(`Email envoyé à ${adherent.email}`, 'success');
    console.log('Envoi email:', result.value);
  }
}

/**
 * Envoie un SMS à un adhérent
 */
async function sendSMSToAdherent(adherent) {
  if (!adherent.telephone) {
    showToast('Cet adhérent n\'a pas de numéro de téléphone', 'warning');
    return;
  }

  const result = await Swal.fire({
    title: 'Envoyer un SMS',
    html: `
      <p>Destinataire: <strong>${adherent.prenom} ${adherent.nom}</strong> (${adherent.telephone})</p>
      <div class="text-start">
        <div class="mb-3">
          <label class="form-label">Message (max 160 caractères)</label>
          <textarea id="sms_message" class="form-control" rows="4" maxlength="160" placeholder="Votre message..."></textarea>
          <small class="text-muted"><span id="sms_count">0</span>/160 caractères</small>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-phone"></i> Envoyer',
    cancelButtonText: 'Annuler',
    width: '500px',
    didOpen: () => {
      const textarea = document.getElementById('sms_message');
      const counter = document.getElementById('sms_count');
      textarea.addEventListener('input', () => {
        counter.textContent = textarea.value.length;
      });
    },
    preConfirm: () => {
      const message = document.getElementById('sms_message').value;

      if (!message) {
        Swal.showValidationMessage('Veuillez saisir un message');
        return false;
      }

      return { message };
    }
  });

  if (result.isConfirmed) {
    // TODO: Appel API pour envoyer le SMS
    showToast(`SMS envoyé au ${adherent.telephone}`, 'success');
    console.log('Envoi SMS:', result.value);
  }
}

/**
 * Crée une cotisation pour l'adhérent
 */
function createCotisationForAdherent(adherent) {
  showToast('Redirection vers la création de cotisation...', 'info');
  // TODO: Rediriger vers page cotisations avec pré-remplissage adherent_id
  console.log('Créer cotisation pour:', adherent.id);
  window.location.href = `/admin/cotisations.html?adherent_id=${adherent.id}`;
}

/**
 * Crée un emprunt pour l'adhérent
 */
function createEmpruntForAdherent(adherent) {
  showToast('Redirection vers la création d\'emprunt...', 'info');
  // TODO: Rediriger vers page emprunts avec pré-remplissage adherent_id
  console.log('Créer emprunt pour:', adherent.id);
  window.location.href = `/admin/emprunts.html?adherent_id=${adherent.id}`;
}

// ============================================
// HISTORIQUE COMMUNICATIONS
// ============================================

/**
 * Charge l'historique des communications pour un adhérent
 */
async function loadAdherentCommunications(adherentId) {
  try {
    // Afficher le loader
    document.getElementById('view_communications_loading').style.display = 'block';
    document.getElementById('view_communications_content').style.display = 'none';

    // Charger les emails et SMS en parallèle
    const [emailsData, smsData] = await Promise.all([
      apiRequest(`/email-logs?adherent_id=${adherentId}&limit=20`),
      apiRequest(`/sms-logs?adherent_id=${adherentId}&limit=20`)
    ]);

    // Afficher les emails
    displayAdherentEmails(emailsData.emailLogs || []);

    // Afficher les SMS
    displayAdherentSms(smsData.smsLogs || []);

    // Masquer le loader et afficher le contenu
    document.getElementById('view_communications_loading').style.display = 'none';
    document.getElementById('view_communications_content').style.display = 'block';

  } catch (error) {
    console.error('Erreur chargement communications:', error);
    document.getElementById('view_communications_loading').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Erreur lors du chargement
      </div>
    `;
  }
}

/**
 * Affiche la liste des emails
 */
function displayAdherentEmails(emails) {
  const container = document.getElementById('view_emails_list');
  const countBadge = document.getElementById('view_emails_count');

  countBadge.textContent = emails.length;

  if (!emails || emails.length === 0) {
    container.innerHTML = '<p class="text-muted small mb-0">Aucun email envoye</p>';
    return;
  }

  let html = '<div class="list-group list-group-flush">';

  emails.forEach(email => {
    const dateEnvoi = new Date(email.date_envoi).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statutBadge = getCommunicationStatutBadge(email.statut);

    html += `
      <div class="list-group-item px-0 py-2">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="small text-muted">${dateEnvoi}</div>
            <div class="fw-medium text-truncate" style="max-width: 300px;" title="${email.objet || ''}">${email.objet || '-'}</div>
            ${email.template_code ? `<span class="badge bg-info badge-sm">${email.template_code}</span>` : ''}
          </div>
          <div>${statutBadge}</div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Affiche la liste des SMS
 */
function displayAdherentSms(smsList) {
  const container = document.getElementById('view_sms_list');
  const countBadge = document.getElementById('view_sms_count');

  countBadge.textContent = smsList.length;

  if (!smsList || smsList.length === 0) {
    container.innerHTML = '<p class="text-muted small mb-0">Aucun SMS envoye</p>';
    return;
  }

  let html = '<div class="list-group list-group-flush">';

  smsList.forEach(sms => {
    const dateEnvoi = new Date(sms.date_envoi).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statutBadge = getSmsStatutBadgeCompact(sms.statut);
    const messagePreview = sms.message ?
      (sms.message.length > 50 ? sms.message.substring(0, 50) + '...' : sms.message) :
      '-';

    html += `
      <div class="list-group-item px-0 py-2">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="small text-muted">${dateEnvoi}</div>
            <div class="small text-truncate" style="max-width: 300px;" title="${sms.message || ''}">${messagePreview}</div>
            ${sms.template_code ? `<span class="badge bg-info badge-sm">${sms.template_code}</span>` : ''}
          </div>
          <div>${statutBadge}</div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Retourne un badge compact pour le statut email
 */
function getCommunicationStatutBadge(statut) {
  const badges = {
    'envoye': '<span class="badge bg-success badge-sm">Envoye</span>',
    'erreur': '<span class="badge bg-danger badge-sm">Erreur</span>',
    'en_attente': '<span class="badge bg-warning badge-sm">Attente</span>'
  };
  return badges[statut] || `<span class="badge bg-secondary badge-sm">${statut || '-'}</span>`;
}

/**
 * Retourne un badge compact pour le statut SMS
 */
function getSmsStatutBadgeCompact(statut) {
  const badges = {
    'envoye': '<span class="badge bg-success badge-sm">Envoye</span>',
    'delivre': '<span class="badge bg-primary badge-sm">Delivre</span>',
    'erreur': '<span class="badge bg-danger badge-sm">Erreur</span>',
    'echec_livraison': '<span class="badge bg-warning badge-sm">Echec</span>',
    'en_attente': '<span class="badge bg-secondary badge-sm">Attente</span>'
  };
  return badges[statut] || `<span class="badge bg-secondary badge-sm">${statut || '-'}</span>`;
}
