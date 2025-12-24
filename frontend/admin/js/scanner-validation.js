/**
 * Scanner Validation Components
 * Composants UI pour la validation des emprunts avec affichage des limites
 */

// ==================== API HELPERS ====================

/**
 * Recupere le statut complet de l'utilisateur pour le scanner
 */
async function fetchUserStatus(utilisateurId, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/scanner/user-status/${utilisateurId}?structure_id=${structureId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur API');
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur fetchUserStatus:', error);
    return null;
  }
}

/**
 * Valide un emprunt avant creation
 */
async function validateLoan(utilisateurId, articleId, articleType, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/scanner/validate-loan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        utilisateur_id: utilisateurId,
        article_id: articleId,
        article_type: articleType,
        structure_id: structureId
      })
    });
    if (!response.ok) throw new Error('Erreur API');
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur validateLoan:', error);
    return { canProceed: false, blocking: [{ type: 'erreur_api', message: error.message }] };
  }
}

/**
 * Envoie un rappel cotisation/adhesion
 */
async function sendReminder(utilisateurId, type, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/scanner/send-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        utilisateur_id: utilisateurId,
        type,
        structure_id: structureId
      })
    });
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur sendReminder:', error);
    return { success: false, message: error.message };
  }
}

// ==================== UI COMPONENTS ====================

/**
 * Genere le HTML pour une jauge de limite
 */
function renderLimitGauge(current, max, label, isBlocking = true) {
  if (max === null || max === undefined) return '';

  const percentage = Math.min((current / max) * 100, 100);
  let colorClass = 'bg-success';
  let textClass = '';

  if (percentage >= 100) {
    colorClass = 'bg-danger';
    textClass = 'text-danger fw-bold';
  } else if (percentage >= 80) {
    colorClass = 'bg-warning';
    textClass = 'text-warning';
  } else if (percentage >= 60) {
    colorClass = 'bg-info';
  }

  const lockIcon = isBlocking ? '<i class="bi bi-lock-fill ms-1" style="font-size: 0.7rem;"></i>' : '';

  return `
    <div class="limit-gauge mb-2">
      <div class="d-flex justify-content-between align-items-center mb-1" style="font-size: 0.8rem;">
        <span class="${textClass}">${label}</span>
        <span class="${textClass}">${current}/${max}${lockIcon}</span>
      </div>
      <div class="progress" style="height: 6px;">
        <div class="progress-bar ${colorClass}" style="width: ${percentage}%"></div>
      </div>
    </div>
  `;
}

/**
 * Genere le badge de cotisation
 */
function renderCotisationBadge(cotisation) {
  if (!cotisation) return '';

  if (!cotisation.required) {
    return `<span class="badge bg-secondary"><i class="bi bi-credit-card"></i> Non requise</span>`;
  }

  if (cotisation.valide) {
    const dateExp = cotisation.dateExpiration ? new Date(cotisation.dateExpiration).toLocaleDateString('fr-FR') : '';
    const daysLeft = cotisation.joursRestants;

    if (daysLeft <= 7) {
      return `
        <span class="badge bg-warning text-dark">
          <i class="bi bi-exclamation-triangle"></i> Cotisation expire dans ${daysLeft}j (${dateExp})
        </span>
      `;
    }
    return `
      <span class="badge bg-success">
        <i class="bi bi-check-circle"></i> Cotisation valide jusqu'au ${dateExp}
      </span>
    `;
  } else {
    const dateExp = cotisation.dateExpiration ? new Date(cotisation.dateExpiration).toLocaleDateString('fr-FR') : '';
    return `
      <span class="badge bg-danger">
        <i class="bi bi-x-circle"></i> Cotisation expiree${dateExp ? ' le ' + dateExp : ''}
      </span>
    `;
  }
}

/**
 * Genere le badge d'adhesion
 */
function renderAdhesionBadge(adhesion) {
  if (!adhesion) return '';

  if (!adhesion.required) {
    return ''; // Ne pas afficher si non requis
  }

  if (adhesion.valide) {
    return `<span class="badge bg-success"><i class="bi bi-building-check"></i> Adhesion OK</span>`;
  } else {
    return `<span class="badge bg-danger"><i class="bi bi-building-x"></i> Adhesion expiree</span>`;
  }
}

/**
 * Affiche les jauges de limite pour un adherent
 */
function renderLimitsPanel(limites) {
  if (!limites || !limites.modules) return '';

  let html = '<div class="limits-panel mt-3" style="font-size: 0.85rem;">';

  for (const [module, data] of Object.entries(limites.modules)) {
    const isAtLimit = data.generale.current >= data.generale.max;
    const cardClass = isAtLimit ? 'border-danger' : 'border-0';

    html += `
      <div class="card ${cardClass} bg-transparent mb-2">
        <div class="card-body py-2 px-3">
          <div class="fw-bold mb-2" style="color: var(--scanner-text);">
            ${getModuleIcon(module)} ${data.label}
          </div>
          ${renderLimitGauge(data.generale.current, data.generale.max, 'Emprunts', data.generale.bloquante)}
          ${renderLimitGauge(data.nouveautes.current, data.nouveautes.max, 'Nouveautes', data.generale.bloquante)}
          ${data.genres.map(g => renderLimitGauge(g.current, g.max, g.nom, data.generale.bloquante)).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

function getModuleIcon(module) {
  const icons = {
    ludotheque: '<i class="bi bi-dice-5 text-success"></i>',
    bibliotheque: '<i class="bi bi-book text-primary"></i>',
    filmotheque: '<i class="bi bi-film text-danger"></i>',
    discotheque: '<i class="bi bi-disc text-warning"></i>'
  };
  return icons[module] || '<i class="bi bi-collection"></i>';
}

/**
 * Affiche un adherent avec ses limites et statuts
 */
async function displayAdherentWithStatus(adherent, structureId) {
  const container = document.getElementById('adherent-display');
  const initials = (adherent.prenom[0] + adherent.nom[0]).toUpperCase();
  const badgeClass = `badge-${adherent.statut}`;

  // Afficher d'abord les infos de base
  container.innerHTML = `
    <div class="adherent-info">
      <div class="adherent-avatar">${initials}</div>
      <div class="adherent-details" style="flex: 1;">
        <h4>${adherent.prenom} ${adherent.nom}</h4>
        <p>${adherent.email || 'Pas d\'email'}</p>
        <span class="badge-statut ${badgeClass}">${adherent.statut}</span>
        <div id="adherent-status-badges" class="mt-2"></div>
      </div>
      <button class="btn-clear-adherent" onclick="clearAdherent()">
        <i class="bi bi-x-lg"></i> Terminer
      </button>
    </div>
    <div id="adherent-limits-panel">
      <div class="text-center py-2" style="color: #888;">
        <i class="bi bi-hourglass-split"></i> Chargement des limites...
      </div>
    </div>
  `;

  // Charger le statut complet en arriere-plan
  const status = await fetchUserStatus(adherent.id, structureId);

  if (status) {
    // Mettre a jour les badges
    const badgesContainer = document.getElementById('adherent-status-badges');
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        ${renderCotisationBadge(status.cotisation)}
        ${renderAdhesionBadge(status.adhesion)}
      `;
    }

    // Mettre a jour les limites
    const limitsContainer = document.getElementById('adherent-limits-panel');
    if (limitsContainer) {
      limitsContainer.innerHTML = renderLimitsPanel(status.limites);
    }
  }
}

// ==================== VALIDATION MODAL ====================

/**
 * Affiche une modal de validation avec les avertissements/blocages
 * @returns {Promise<{proceed: boolean, sendReminders: {cotisation: boolean, adhesion: boolean}, overrideReservation: boolean}>}
 */
function showValidationModal(validation) {
  return new Promise((resolve) => {
    // Determiner le type de modal
    const hasBlocking = validation.blocking && validation.blocking.length > 0;
    const hasWarnings = validation.warnings && validation.warnings.length > 0;
    const hasInfo = validation.info;

    // Si tout va bien, pas de modal
    if (!hasBlocking && !hasWarnings && !hasInfo) {
      resolve({ proceed: true, sendReminders: {}, overrideReservation: false });
      return;
    }

    // Construire le contenu
    let title, iconClass, headerClass;
    if (hasBlocking) {
      title = 'Emprunt impossible';
      iconClass = 'bi-x-circle-fill text-danger';
      headerClass = 'bg-danger text-white';
    } else if (hasWarnings) {
      title = 'Attention';
      iconClass = 'bi-exclamation-triangle-fill text-warning';
      headerClass = 'bg-warning';
    } else {
      title = 'Information';
      iconClass = 'bi-info-circle-fill text-info';
      headerClass = 'bg-info text-white';
    }

    let bodyHtml = '';

    // Article info
    if (validation.article) {
      bodyHtml += `
        <div class="alert alert-secondary py-2 mb-3">
          <strong>${validation.article.titre}</strong>
          ${validation.article.estNouveaute ? '<span class="badge bg-warning text-dark ms-2">Nouveaute</span>' : ''}
        </div>
      `;
    }

    // Blocages
    if (hasBlocking) {
      bodyHtml += '<div class="mb-3"><strong class="text-danger">Blocages :</strong><ul class="mb-0">';
      for (const b of validation.blocking) {
        bodyHtml += `<li class="text-danger"><i class="bi bi-x-circle me-1"></i>${b.message}</li>`;
      }
      bodyHtml += '</ul></div>';
    }

    // Avertissements
    if (hasWarnings) {
      bodyHtml += '<div class="mb-3"><strong class="text-warning">Avertissements :</strong><ul class="mb-0">';
      for (const w of validation.warnings) {
        const canOverride = w.canOverride ? '' : ' (non contournable)';
        bodyHtml += `<li class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>${w.message}${canOverride}</li>`;
      }
      bodyHtml += '</ul></div>';
    }

    // Info
    if (hasInfo) {
      bodyHtml += `<div class="alert alert-info py-2"><i class="bi bi-info-circle me-2"></i>${validation.info}</div>`;
    }

    // Options (rappels)
    const hasRemindableWarnings = validation.warnings?.some(w => w.canSendReminder);
    if (hasRemindableWarnings) {
      bodyHtml += `
        <div class="form-check mt-3">
          <input class="form-check-input" type="checkbox" id="sendReminderCheck">
          <label class="form-check-label" for="sendReminderCheck">
            <i class="bi bi-envelope"></i> Envoyer un rappel par email
          </label>
        </div>
      `;
    }

    // Creer ou recuperer la modal
    let modal = document.getElementById('validationModal');
    if (!modal) {
      const modalHtml = `
        <div class="modal fade" id="validationModal" tabindex="-1" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header" id="validationModalHeader">
                <h5 class="modal-title" id="validationModalTitle"></h5>
              </div>
              <div class="modal-body" id="validationModalBody"></div>
              <div class="modal-footer" id="validationModalFooter"></div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('validationModal');
    }

    // Mettre a jour le contenu
    document.getElementById('validationModalHeader').className = `modal-header ${headerClass}`;
    document.getElementById('validationModalTitle').innerHTML = `<i class="bi ${iconClass} me-2"></i>${title}`;
    document.getElementById('validationModalBody').innerHTML = bodyHtml;

    // Boutons
    let footerHtml = '';
    if (hasBlocking) {
      // Blocage : seulement fermer
      footerHtml = `<button type="button" class="btn btn-secondary" id="btnValidationClose">Fermer</button>`;
    } else {
      // Avertissements : annuler ou confirmer
      footerHtml = `
        <button type="button" class="btn btn-secondary" id="btnValidationCancel">Annuler</button>
        <button type="button" class="btn btn-warning" id="btnValidationProceed">
          <i class="bi bi-exclamation-triangle me-1"></i>Confirmer quand meme
        </button>
      `;
    }
    document.getElementById('validationModalFooter').innerHTML = footerHtml;

    // Afficher la modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Event listeners
    const closeBtn = document.getElementById('btnValidationClose');
    const cancelBtn = document.getElementById('btnValidationCancel');
    const proceedBtn = document.getElementById('btnValidationProceed');

    function cleanup() {
      bsModal.hide();
      if (closeBtn) closeBtn.removeEventListener('click', handleClose);
      if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
      if (proceedBtn) proceedBtn.removeEventListener('click', handleProceed);
    }

    function handleClose() {
      cleanup();
      resolve({ proceed: false });
    }

    function handleCancel() {
      cleanup();
      resolve({ proceed: false });
    }

    function handleProceed() {
      const sendReminder = document.getElementById('sendReminderCheck')?.checked || false;

      // Determiner quel type de rappel envoyer
      const sendReminders = {
        cotisation: sendReminder && validation.warnings?.some(w => w.type === 'cotisation_expiree'),
        adhesion: sendReminder && validation.warnings?.some(w => w.type === 'adhesion_expiree')
      };

      // Verifier s'il y a une reservation a outrepasser
      const overrideReservation = validation.warnings?.some(w => w.type === 'reserve_autre');

      cleanup();
      resolve({
        proceed: true,
        sendReminders,
        overrideReservation,
        reservationId: validation.reservation?.reservationId
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', handleClose);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (proceedBtn) proceedBtn.addEventListener('click', handleProceed);
  });
}

// ==================== INTEGRATION ====================

/**
 * Valide et cree un emprunt avec gestion des avertissements
 * Remplace la fonction createEmprunt originale
 */
async function createEmpruntWithValidation(article, articleType, currentAdherent, structureId) {
  // 1. Valider l'emprunt
  const validation = await validateLoan(currentAdherent.id, article.id, articleType, structureId);

  // 2. Si tout va bien, creer directement
  if (validation.canProceed && !validation.warnings?.length && !validation.info) {
    return { validated: true, proceed: true };
  }

  // 3. Sinon, afficher la modal de validation
  const result = await showValidationModal(validation);

  if (!result.proceed) {
    return { validated: true, proceed: false };
  }

  // 4. Envoyer les rappels si demande
  if (result.sendReminders?.cotisation) {
    await sendReminder(currentAdherent.id, 'cotisation', structureId);
  }
  if (result.sendReminders?.adhesion) {
    await sendReminder(currentAdherent.id, 'adhesion', structureId);
  }

  return {
    validated: true,
    proceed: true,
    overrideReservation: result.overrideReservation,
    reservationId: result.reservationId
  };
}

// ==================== RETURN FLOW ====================

// Etat de la session de retours
let sessionUsers = [];
let currentReturnInfo = null;
let activeSessionUserId = null;

/**
 * Recupere les infos de retour pour un article
 */
async function fetchReturnInfo(articleType, articleId, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/scanner/return-info/${articleType}/${articleId}?structure_id=${structureId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur API');
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur fetchReturnInfo:', error);
    return { found: false };
  }
}

/**
 * Recupere le resume d'un utilisateur
 */
async function fetchUserSummary(utilisateurId, structureId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/scanner/user-summary/${utilisateurId}?structure_id=${structureId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur API');
    return await response.json();
  } catch (error) {
    console.error('[ScannerValidation] Erreur fetchUserSummary:', error);
    return null;
  }
}

/**
 * Affiche les informations de retour dans la zone dediee
 */
function displayReturnInfo(info) {
  currentReturnInfo = info;

  const zone = document.getElementById('return-zone');
  if (!zone) return;

  // Activer la zone
  zone.classList.add('active');
  zone.classList.remove('has-warning', 'has-error');

  if (info.emprunt?.enRetard) {
    zone.classList.add(info.emprunt.retardJours >= 7 ? 'has-error' : 'has-warning');
  }

  // Icone article
  const iconEl = document.getElementById('return-article-icon');
  const icons = { jeu: 'bi-dice-5', livre: 'bi-book', film: 'bi-film', disque: 'bi-disc' };
  iconEl.innerHTML = `<i class="bi ${icons[info.article?.type] || 'bi-box'}"></i>`;

  // Titre article
  document.getElementById('return-article-title').textContent = info.article?.titre || 'Article inconnu';

  // Dates
  const dateEmprunt = formatDateShort(info.emprunt?.dateEmprunt);
  const dateRetour = formatDateShort(info.emprunt?.dateRetourPrevue);
  document.getElementById('return-dates-info').innerHTML = `
    <i class="bi bi-calendar-event"></i> ${dateEmprunt} → ${dateRetour}
    <span style="margin-left: 10px;"><i class="bi bi-clock"></i> ${info.emprunt?.dureeJours || 0}j</span>
  `;

  // Badge retard
  const badgeEl = document.getElementById('return-retard-badge');
  if (info.emprunt?.enRetard) {
    const severity = info.emprunt.retardJours >= 7 ? 'danger' : 'warning';
    badgeEl.className = `return-retard-badge ${severity}`;
    badgeEl.innerHTML = `<i class="bi bi-exclamation-triangle"></i> Retard ${info.emprunt.retardJours}j`;
  } else {
    badgeEl.className = 'return-retard-badge ok';
    badgeEl.innerHTML = `<i class="bi bi-check-circle"></i> A l'heure`;
  }

  // Emprunteur
  const initials = (info.emprunteur?.prenom?.[0] || '') + (info.emprunteur?.nom?.[0] || '');
  document.getElementById('return-emprunteur-avatar').textContent = initials.toUpperCase();
  document.getElementById('return-emprunteur-name').textContent = `${info.emprunteur?.prenom || ''} ${info.emprunteur?.nom || ''}`;

  // Badges emprunteur
  const badgesEl = document.getElementById('return-emprunteur-badges');
  let badgesHtml = '';

  // Badge cotisation
  const cotis = info.emprunteur?.cotisation;
  if (cotis?.required) {
    if (cotis.statut === 'ok') {
      badgesHtml += `<span class="badge bg-success">Cotis OK</span>`;
    } else if (cotis.statut === 'warning') {
      badgesHtml += `<span class="badge bg-warning text-dark">Cotis ${cotis.joursRestants}j</span>`;
    } else {
      badgesHtml += `<span class="badge bg-danger">Cotis expiree</span>`;
    }
  }

  // Badge adhesion
  const adhesion = info.emprunteur?.adhesion;
  if (adhesion?.required && adhesion.statut === 'expired') {
    badgesHtml += `<span class="badge bg-danger">Adhesion expiree</span>`;
  }

  badgesEl.innerHTML = badgesHtml;

  // Emprunts restants
  const restants = info.empruntsEnCours?.length || 0;
  document.getElementById('return-emprunts-restants').textContent = `${restants} restant${restants > 1 ? 's' : ''}`;

  // Reservation article
  const resaAlert = document.getElementById('return-reservation-alert');
  if (info.articleReservePar?.exists) {
    resaAlert.style.display = 'block';
    const reservataire = info.articleReservePar.reservataire;
    document.getElementById('return-reservation-info').innerHTML = `
      <i class="bi bi-person"></i> ${reservataire?.prenom || ''} ${reservataire?.nom || ''} attend cet article
    `;
  } else {
    resaAlert.style.display = 'none';
  }

  // Afficher la zone session
  document.getElementById('session-zone').style.display = 'grid';
}

/**
 * Met a jour ou ajoute un utilisateur dans la liste de session
 */
async function updateSessionUser(userId, structureId, setActive = true) {
  const summary = await fetchUserSummary(userId, structureId);
  if (!summary) return;

  // Verifier si l'utilisateur existe deja
  const existingIndex = sessionUsers.findIndex(u => u.id === userId);
  if (existingIndex >= 0) {
    sessionUsers[existingIndex] = summary;
  } else {
    sessionUsers.unshift(summary);
  }

  if (setActive) {
    activeSessionUserId = userId;
  }

  renderSessionUsersList();
}

/**
 * Affiche la liste des usagers de la session
 */
function renderSessionUsersList() {
  const listEl = document.getElementById('session-users-list');
  const countEl = document.getElementById('session-users-count');

  if (!listEl) return;

  countEl.textContent = sessionUsers.length;

  if (sessionUsers.length === 0) {
    listEl.innerHTML = `
      <div class="session-empty">
        <i class="bi bi-inbox"></i><br>
        Aucun retour effectue
      </div>
    `;
    return;
  }

  listEl.innerHTML = sessionUsers.map(user => {
    const isActive = user.id === activeSessionUserId;
    const cotisClass = user.cotisationStatut === 'not_required' ? 'not-required' : user.cotisationStatut;
    const adhesionClass = user.adhesionStatut === 'not_required' ? 'not-required' : user.adhesionStatut;

    return `
      <div class="session-user-item ${isActive ? 'active' : ''}" onclick="selectSessionUser(${user.id})">
        <div class="status-icons">
          <span class="status-icon ${cotisClass}" title="Cotisation"></span>
          <span class="status-icon ${adhesionClass}" title="Adhesion"></span>
        </div>
        <div class="initials">${user.initiales}</div>
        <div class="user-info">
          <div class="user-name">${user.prenom} ${user.nom}</div>
          <div class="user-counts">
            <i class="bi bi-box"></i> ${user.empruntsCount}
            <i class="bi bi-bookmark ms-2"></i> ${user.reservationsCount}
          </div>
        </div>
        ${isActive ? '<i class="bi bi-chevron-left active-marker"></i>' : ''}
      </div>
    `;
  }).join('');
}

/**
 * Selectionne un utilisateur de la session et affiche ses details
 */
async function selectSessionUser(userId) {
  activeSessionUserId = userId;
  renderSessionUsersList();

  // Charger les details complets
  const structureId = window.currentStructureId || 1;
  const status = await fetchUserStatus(userId, structureId);

  if (!status) return;

  displaySessionUserDetails(status);
}

/**
 * Affiche les details d'un utilisateur selectionne
 */
function displaySessionUserDetails(status) {
  const container = document.getElementById('session-details-content');
  if (!container) return;

  const user = status.utilisateur;
  const initials = (user?.prenom?.[0] || '') + (user?.nom?.[0] || '');

  // Emprunts en cours - utiliser les donnees de status ou fallback sur currentReturnInfo
  let emprunts = status.empruntsEnCours || [];
  if (emprunts.length === 0 && currentReturnInfo?.emprunteur?.id === user?.id) {
    emprunts = currentReturnInfo.empruntsEnCours || [];
  }

  // Reservations - utiliser les donnees de status ou fallback sur currentReturnInfo
  let reservations = status.reservationsActives || [];
  if (reservations.length === 0 && currentReturnInfo?.emprunteur?.id === user?.id) {
    reservations = currentReturnInfo.reservations || [];
  }

  // Cotisation info
  const cotis = status.cotisation;
  let cotisHtml = '';
  if (cotis?.required) {
    if (cotis.valide) {
      const dateExp = formatDateShort(cotis.dateExpiration);
      cotisHtml = `<span class="text-success"><i class="bi bi-check-circle"></i> Cotis valide jusqu'au ${dateExp} (${cotis.joursRestants}j)</span>`;
    } else {
      const dateExp = cotis.dateExpiration ? formatDateShort(cotis.dateExpiration) : '';
      cotisHtml = `<span class="text-danger"><i class="bi bi-x-circle"></i> Cotis expiree${dateExp ? ' le ' + dateExp : ''}</span>`;
    }
  } else {
    cotisHtml = `<span class="text-muted"><i class="bi bi-dash-circle"></i> Cotisation non requise</span>`;
  }

  container.innerHTML = `
    <div class="session-details-header">
      <div class="avatar">${initials.toUpperCase()}</div>
      <div class="info">
        <h4>${user?.prenom || ''} ${user?.nom || ''}</h4>
        <p>${cotisHtml}</p>
      </div>
    </div>

    <div class="session-details-section">
      <h6><i class="bi bi-box"></i> Emprunts en cours (${emprunts.length})</h6>
      <div class="session-details-list">
        ${emprunts.length === 0 ? '<div class="session-empty" style="padding: 10px;">Aucun emprunt</div>' :
          emprunts.map(e => `
            <div class="session-details-item">
              <i class="bi ${getTypeIcon(e.type)}"></i>
              <span class="title">${e.titre}</span>
              <span class="text-muted">${formatDateShort(e.dateRetour)}</span>
              ${e.enRetard ? `<span class="retard ${e.retardJours >= 7 ? 'danger' : ''}">${e.retardJours}j</span>` : ''}
            </div>
          `).join('')
        }
      </div>
    </div>

    <div class="session-details-section">
      <h6><i class="bi bi-bookmark"></i> Reservations (${reservations.length})</h6>
      <div class="session-details-list">
        ${reservations.length === 0 ? '<div class="session-empty" style="padding: 10px;">Aucune reservation</div>' :
          reservations.map(r => `
            <div class="session-details-item">
              <i class="bi ${getTypeIcon(r.type)}"></i>
              <span class="title">${r.titre}</span>
              <span class="badge bg-${r.statut === 'prete' ? 'success' : 'secondary'}">${r.statut === 'prete' ? 'Pret' : r.position ? '#' + r.position : 'En attente'}</span>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

/**
 * Vide la liste des usagers de la session
 */
function clearSessionUsers() {
  sessionUsers = [];
  activeSessionUserId = null;
  currentReturnInfo = null;

  renderSessionUsersList();

  const detailsEl = document.getElementById('session-details-content');
  if (detailsEl) {
    detailsEl.innerHTML = `
      <div class="session-empty">
        <i class="bi bi-hand-index"></i><br>
        Cliquez sur un usager
      </div>
    `;
  }

  // Masquer la zone retour
  const returnZone = document.getElementById('return-zone');
  if (returnZone) {
    returnZone.classList.remove('active');
  }
}

/**
 * Cache la zone de retour
 */
function hideReturnZone() {
  const zone = document.getElementById('return-zone');
  if (zone) {
    zone.classList.remove('active');
  }
}

// Helpers
function formatDateShort(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function getTypeIcon(type) {
  const icons = { jeu: 'bi-dice-5 text-success', livre: 'bi-book text-primary', film: 'bi-film text-danger', disque: 'bi-disc text-warning' };
  return icons[type] || 'bi-box';
}

// ==================== CONTROL ZONE (MISE EN RAYON) ====================

let currentControlArticle = null;

/**
 * Affiche la zone de controle pour un article en 'en_controle'
 */
async function displayControlZone(article, articleType) {
  currentControlArticle = { article, articleType };

  const zone = document.getElementById('control-zone');
  if (!zone) {
    console.warn('[ScannerValidation] Zone de controle non trouvee');
    return;
  }

  // Charger les infos de l'article avec reservation eventuelle
  const token = localStorage.getItem('token');
  let articleInfo = null;

  try {
    const response = await fetch(`/api/scanner/article-info/${articleType}/${article.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      articleInfo = await response.json();
    }
  } catch (e) {
    console.error('[ScannerValidation] Erreur chargement info article:', e);
  }

  // Activer la zone
  zone.classList.add('active');

  // Icone article
  const iconEl = document.getElementById('control-article-icon');
  const icons = { jeu: 'bi-dice-5', livre: 'bi-book', film: 'bi-film', disque: 'bi-disc' };
  iconEl.innerHTML = `<i class="bi ${icons[articleType] || 'bi-box'}"></i>`;

  // Titre et code
  document.getElementById('control-article-title').textContent = article.titre || 'Article inconnu';
  document.getElementById('control-article-code').textContent = article.code_barre || '';

  // Etat actuel
  const etatSelect = document.getElementById('control-etat-select');
  if (etatSelect) {
    etatSelect.value = article.etat || 'bon';
  }

  // Notes
  const notesInput = document.getElementById('control-notes');
  if (notesInput) {
    notesInput.value = '';
  }

  // Reservation en attente
  const resaAlert = document.getElementById('control-reservation-alert');
  if (articleInfo?.hasReservation) {
    resaAlert.style.display = 'block';
    const reservataire = articleInfo.reservation?.utilisateur;
    document.getElementById('control-reservation-info').innerHTML = `
      <i class="bi bi-person"></i> ${reservataire?.prenom || ''} ${reservataire?.nom || ''} attend cet article
    `;
  } else {
    resaAlert.style.display = 'none';
  }
}

/**
 * Cache la zone de controle
 */
function hideControlZone() {
  const zone = document.getElementById('control-zone');
  if (zone) {
    zone.classList.remove('active');
  }
  currentControlArticle = null;
}

/**
 * Effectue la mise en rayon de l'article en controle
 */
async function confirmMiseEnRayon() {
  if (!currentControlArticle) return;

  const { article, articleType } = currentControlArticle;

  // Recuperer les options
  const etatSelect = document.getElementById('control-etat-select');
  const notesInput = document.getElementById('control-notes');

  const nouvelEtat = etatSelect?.value;
  const notes = notesInput?.value?.trim();

  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/scanner/mise-en-rayon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        article_type: articleType,
        article_id: article.id,
        nouvel_etat: nouvelEtat,
        notes,
        structure_id: window.currentStructureId || 1
      })
    });

    const result = await response.json();

    if (result.success) {
      // Feedback
      if (typeof playSound === 'function') playSound('success');
      if (typeof flashZone === 'function') flashZone('success');

      const statusLabel = result.articleStatut === 'reserve' ? 'Mis de cote (reservation)' : 'Remis en rayon';
      if (typeof updateStatus === 'function') {
        updateStatus(`${article.titre} - ${statusLabel}`, 'success');
      }
      if (typeof addToHistory === 'function') {
        addToHistory('success', 'Mise en rayon', `${article.titre} - ${nouvelEtat || 'etat inchange'}`, article.code_barre);
      }

      hideControlZone();
    } else {
      throw new Error(result.error || 'Erreur mise en rayon');
    }
  } catch (error) {
    console.error('[ScannerValidation] Erreur confirmMiseEnRayon:', error);
    if (typeof playSound === 'function') playSound('error');
    if (typeof updateStatus === 'function') {
      updateStatus('Erreur: ' + error.message, 'error');
    }
  }
}

/**
 * Envoie l'article en reparation
 */
async function sendToRepair() {
  if (!currentControlArticle) return;

  const { article, articleType } = currentControlArticle;

  // Recuperer les options
  const etatSelect = document.getElementById('control-etat-select');
  const notesInput = document.getElementById('control-notes');

  const nouvelEtat = etatSelect?.value;
  const notes = notesInput?.value?.trim() || 'Envoi en reparation';

  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/scanner/mise-en-rayon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        article_type: articleType,
        article_id: article.id,
        nouvel_etat: nouvelEtat,
        notes,
        envoyer_en_reparation: true,
        structure_id: window.currentStructureId || 1
      })
    });

    const result = await response.json();

    if (result.success) {
      if (typeof playSound === 'function') playSound('success');
      if (typeof flashZone === 'function') flashZone('success');
      if (typeof updateStatus === 'function') {
        updateStatus(`${article.titre} - Envoye en reparation`, 'warning');
      }
      if (typeof addToHistory === 'function') {
        addToHistory('info', 'Reparation', `${article.titre}`, article.code_barre);
      }

      hideControlZone();
    } else {
      throw new Error(result.error || 'Erreur');
    }
  } catch (error) {
    console.error('[ScannerValidation] Erreur sendToRepair:', error);
    if (typeof playSound === 'function') playSound('error');
    if (typeof updateStatus === 'function') {
      updateStatus('Erreur: ' + error.message, 'error');
    }
  }
}

// Export pour utilisation globale
window.fetchUserStatus = fetchUserStatus;
window.validateLoan = validateLoan;
window.sendReminder = sendReminder;
window.displayAdherentWithStatus = displayAdherentWithStatus;
window.showValidationModal = showValidationModal;
window.createEmpruntWithValidation = createEmpruntWithValidation;
window.fetchReturnInfo = fetchReturnInfo;
window.fetchUserSummary = fetchUserSummary;
window.displayReturnInfo = displayReturnInfo;
window.updateSessionUser = updateSessionUser;
window.selectSessionUser = selectSessionUser;
window.clearSessionUsers = clearSessionUsers;
window.hideReturnZone = hideReturnZone;
window.displayControlZone = displayControlZone;
window.hideControlZone = hideControlZone;
window.confirmMiseEnRayon = confirmMiseEnRayon;
window.sendToRepair = sendToRepair;
window.currentReturnInfo = null; // Expose pour scanner.js
window.getReturnInfo = () => currentReturnInfo;
