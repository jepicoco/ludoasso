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
