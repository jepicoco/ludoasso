/**
 * Historique Emails - Gestion de l'historique des emails envoyés
 */

let currentEmailLogsPage = 1;
const emailLogsPerPage = 50;

/**
 * Charge l'historique des emails
 */
async function loadEmailLogs(page = 1) {
  try {
    currentEmailLogsPage = page;

    // Récupérer les filtres
    const statut = document.getElementById('filter-statut-email')?.value || '';
    const templateCode = document.getElementById('filter-template-email')?.value || '';
    const dateDebut = document.getElementById('filter-date-debut')?.value || '';
    const dateFin = document.getElementById('filter-date-fin')?.value || '';

    // Construire les paramètres de requête
    const params = new URLSearchParams({
      page: currentEmailLogsPage,
      limit: emailLogsPerPage
    });

    if (statut) params.append('statut', statut);
    if (templateCode) params.append('template_code', templateCode);
    if (dateDebut) params.append('date_debut', dateDebut);
    if (dateFin) params.append('date_fin', dateFin);

    const data = await apiRequest(`/email-logs?${params.toString()}`);

    displayEmailLogs(data.emailLogs);
    displayEmailLogsPagination(data.pagination);

  } catch (error) {
    console.error('Erreur chargement logs emails:', error);
    showError('Impossible de charger l\'historique des emails');
  }
}

/**
 * Affiche la liste des logs d'emails
 */
function displayEmailLogs(logs) {
  const container = document.getElementById('liste-email-logs');

  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i> Aucun email trouvé avec les filtres sélectionnés.
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Date</th>
            <th>Destinataire</th>
            <th>Template</th>
            <th>Objet</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  logs.forEach(log => {
    const dateEnvoi = new Date(log.date_envoi).toLocaleString('fr-FR');
    const statutBadge = getStatutBadge(log.statut);
    const adherentInfo = log.adherent ?
      `${log.adherent.prenom} ${log.adherent.nom}` :
      log.destinataire_nom || '';

    html += `
      <tr>
        <td>${dateEnvoi}</td>
        <td>
          <div>${log.destinataire}</div>
          ${adherentInfo ? `<small class="text-muted">${adherentInfo}</small>` : ''}
        </td>
        <td>
          ${log.template_code ?
            `<span class="badge bg-info">${log.template_code}</span>` :
            '<span class="text-muted">-</span>'}
        </td>
        <td>
          <div class="text-truncate" style="max-width: 300px;">
            ${log.objet}
          </div>
        </td>
        <td>${statutBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="viewEmailLogDetails(${log.id})">
            <i class="bi bi-eye"></i> Détails
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Affiche la pagination des logs
 */
function displayEmailLogsPagination(pagination) {
  const container = document.getElementById('email-logs-pagination');

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <nav>
      <ul class="pagination justify-content-center">
        <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="loadEmailLogs(${pagination.page - 1}); return false;">
            Précédent
          </a>
        </li>
  `;

  // Afficher les numéros de page
  const maxPages = 5;
  let startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
  let endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);

  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === pagination.page ? 'active' : ''}">
        <a class="page-link" href="#" onclick="loadEmailLogs(${i}); return false;">${i}</a>
      </li>
    `;
  }

  html += `
        <li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="loadEmailLogs(${pagination.page + 1}); return false;">
            Suivant
          </a>
        </li>
      </ul>
    </nav>
    <div class="text-center text-muted">
      <small>
        Affichage de ${((pagination.page - 1) * pagination.limit) + 1} à
        ${Math.min(pagination.page * pagination.limit, pagination.total)} sur ${pagination.total} emails
      </small>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Retourne le badge HTML pour un statut
 */
function getStatutBadge(statut) {
  const badges = {
    'envoye': '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Envoyé</span>',
    'erreur': '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Erreur</span>',
    'en_attente': '<span class="badge bg-warning"><i class="bi bi-clock"></i> En attente</span>'
  };

  return badges[statut] || `<span class="badge bg-secondary">${statut}</span>`;
}

/**
 * Affiche les détails d'un log d'email
 */
async function viewEmailLogDetails(logId) {
  try {
    const log = await apiRequest(`/email-logs/${logId}`);

    const content = document.getElementById('email-log-details-content');
    const dateEnvoi = new Date(log.date_envoi).toLocaleString('fr-FR');
    const statutBadge = getStatutBadge(log.statut);

    let html = `
      <div class="row">
        <div class="col-md-6 mb-3">
          <h6><i class="bi bi-calendar"></i> Date d'envoi</h6>
          <p>${dateEnvoi}</p>
        </div>
        <div class="col-md-6 mb-3">
          <h6><i class="bi bi-flag"></i> Statut</h6>
          <p>${statutBadge}</p>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6 mb-3">
          <h6><i class="bi bi-person"></i> Destinataire</h6>
          <p>${log.destinataire}</p>
          ${log.destinataire_nom ? `<small class="text-muted">${log.destinataire_nom}</small>` : ''}
        </div>
        <div class="col-md-6 mb-3">
          <h6><i class="bi bi-file-text"></i> Template</h6>
          <p>${log.template_code ? `<span class="badge bg-info">${log.template_code}</span>` : '<span class="text-muted">Aucun</span>'}</p>
        </div>
      </div>

      <div class="mb-3">
        <h6><i class="bi bi-envelope"></i> Objet</h6>
        <p>${log.objet}</p>
      </div>

      <div class="mb-3">
        <h6><i class="bi bi-file-code"></i> Corps de l'email</h6>
        <div class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
          ${log.corps}
        </div>
      </div>
    `;

    if (log.message_id) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-hash"></i> Message ID</h6>
          <p><code>${log.message_id}</code></p>
        </div>
      `;
    }

    if (log.erreur_message) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-exclamation-triangle text-danger"></i> Message d'erreur</h6>
          <div class="alert alert-danger">
            ${log.erreur_message}
          </div>
        </div>
      `;
    }

    if (log.adherent) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-person-badge"></i> Adhérent lié</h6>
          <p>
            ${log.adherent.prenom} ${log.adherent.nom}
            <br>
            <small class="text-muted">ID: ${log.adherent.id} - ${log.adherent.email}</small>
          </p>
        </div>
      `;
    }

    if (log.metadata) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-code-square"></i> Métadonnées</h6>
          <pre class="bg-light p-3 rounded"><code>${JSON.stringify(log.metadata, null, 2)}</code></pre>
        </div>
      `;
    }

    content.innerHTML = html;

    const modal = new bootstrap.Modal(document.getElementById('modalEmailLogDetails'));
    modal.show();

  } catch (error) {
    console.error('Erreur chargement détails log:', error);
    showError('Impossible de charger les détails de l\'email');
  }
}

/**
 * Charge les statistiques des emails
 */
async function loadEmailStatistics() {
  try {
    const data = await apiRequest('/email-logs/statistics');

    displayEmailStatistics(data);

  } catch (error) {
    console.error('Erreur chargement statistiques:', error);
    document.getElementById('email-statistics').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Erreur lors du chargement des statistiques
      </div>
    `;
  }
}

/**
 * Affiche les statistiques des emails
 */
function displayEmailStatistics(data) {
  const container = document.getElementById('email-statistics');

  let html = `
    <div class="row">
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-primary">${data.statistiquesGenerales.total}</h3>
            <p class="text-muted mb-0">Total emails</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-success">${data.statistiquesGenerales.envoyes}</h3>
            <p class="text-muted mb-0">Envoyés</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-danger">${data.statistiquesGenerales.erreurs}</h3>
            <p class="text-muted mb-0">Erreurs</p>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-info">${data.statistiquesGenerales.tauxReussite}%</h3>
            <p class="text-muted mb-0">Taux de réussite</p>
          </div>
        </div>
      </div>
    </div>

    <div class="row mt-4">
      <div class="col-md-6">
        <h6><i class="bi bi-file-text"></i> Top templates</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Template</th>
                <th>Total</th>
                <th>Envoyés</th>
                <th>Erreurs</th>
              </tr>
            </thead>
            <tbody>
  `;

  if (data.parTemplate && data.parTemplate.length > 0) {
    data.parTemplate.forEach(item => {
      html += `
        <tr>
          <td><span class="badge bg-info">${item.template_code}</span></td>
          <td>${item.total}</td>
          <td><span class="text-success">${item.envoyes}</span></td>
          <td><span class="text-danger">${item.erreurs}</span></td>
        </tr>
      `;
    });
  } else {
    html += `<tr><td colspan="4" class="text-center text-muted">Aucune donnée</td></tr>`;
  }

  html += `
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-md-6">
        <h6><i class="bi bi-calendar-week"></i> Activité des 7 derniers jours</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Total</th>
                <th>Envoyés</th>
                <th>Erreurs</th>
              </tr>
            </thead>
            <tbody>
  `;

  if (data.parJour && data.parJour.length > 0) {
    data.parJour.forEach(item => {
      const date = new Date(item.jour).toLocaleDateString('fr-FR');
      html += `
        <tr>
          <td>${date}</td>
          <td>${item.total}</td>
          <td><span class="text-success">${item.envoyes}</span></td>
          <td><span class="text-danger">${item.erreurs}</span></td>
        </tr>
      `;
    });
  } else {
    html += `<tr><td colspan="4" class="text-center text-muted">Aucune donnée</td></tr>`;
  }

  html += `
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Charge la liste des templates pour le filtre
 */
async function loadTemplatesFilter() {
  try {
    const templates = await apiRequest('/email-logs/templates');

    const select = document.getElementById('filter-template-email');
    if (!select) return;

    templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.template_code;
      option.textContent = `${template.template_code} (${template.total})`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Erreur chargement templates:', error);
  }
}

/**
 * Réinitialise les filtres
 */
function resetFiltersEmailLogs() {
  document.getElementById('filter-statut-email').value = '';
  document.getElementById('filter-template-email').value = '';
  document.getElementById('filter-date-debut').value = '';
  document.getElementById('filter-date-fin').value = '';
  loadEmailLogs(1);
}

/**
 * Affiche la modal de purge
 */
function showPurgeModal() {
  const modal = new bootstrap.Modal(document.getElementById('modalPurgeLogs'));
  modal.show();
}

/**
 * Gère la soumission du formulaire de purge
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-purge-logs');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const jours = parseInt(document.getElementById('purge_jours').value);

      if (jours < 1) {
        showError('Le nombre de jours doit être supérieur à 0');
        return;
      }

      if (!confirm(`Êtes-vous sûr de vouloir supprimer tous les logs de plus de ${jours} jours ?`)) {
        return;
      }

      try {
        const data = await apiRequest('/email-logs/purge', {
          method: 'POST',
          body: JSON.stringify({ jours })
        });

        showSuccess(data.message);

        // Fermer la modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalPurgeLogs'));
        modal.hide();

        // Recharger les données
        loadEmailLogs(1);
        loadEmailStatistics();

      } catch (error) {
        console.error('Erreur purge logs:', error);
        showError('Impossible de purger les logs');
      }
    });
  }
});

/**
 * Helper pour afficher un message de succès
 */
function showSuccess(message) {
  Swal.fire({
    icon: 'success',
    title: 'Succès',
    text: message,
    timer: 3000,
    timerProgressBar: true
  });
}

/**
 * Helper pour afficher un message d'erreur
 */
function showError(message) {
  Swal.fire({
    icon: 'error',
    title: 'Erreur',
    text: message
  });
}
