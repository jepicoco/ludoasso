/**
 * Historique SMS - Gestion de l'historique des SMS envoyes
 */

let currentSmsLogsPage = 1;
const smsLogsPerPage = 50;

/**
 * Charge l'historique des SMS
 */
async function loadSmsLogs(page = 1) {
  try {
    currentSmsLogsPage = page;

    // Recuperer les filtres
    const destinataire = document.getElementById('filter-destinataire-sms')?.value || '';
    const statut = document.getElementById('filter-statut-sms')?.value || '';
    const templateCode = document.getElementById('filter-template-sms')?.value || '';
    const provider = document.getElementById('filter-provider-sms')?.value || '';
    const dateDebut = document.getElementById('filter-date-debut')?.value || '';
    const dateFin = document.getElementById('filter-date-fin')?.value || '';

    // Construire les parametres de requete
    const params = new URLSearchParams({
      page: currentSmsLogsPage,
      limit: smsLogsPerPage
    });

    if (destinataire) params.append('destinataire', destinataire);
    if (statut) params.append('statut', statut);
    if (templateCode) params.append('template_code', templateCode);
    if (provider) params.append('provider', provider);
    if (dateDebut) params.append('date_debut', dateDebut);
    if (dateFin) params.append('date_fin', dateFin);

    const data = await apiRequest(`/sms-logs?${params.toString()}`);

    displaySmsLogs(data.smsLogs);
    displaySmsLogsPagination(data.pagination);

  } catch (error) {
    console.error('Erreur chargement logs SMS:', error);
    showError('Impossible de charger l\'historique des SMS');
  }
}

/**
 * Affiche la liste des logs de SMS
 */
function displaySmsLogs(logs) {
  const container = document.getElementById('liste-sms-logs');

  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i> Aucun SMS trouve avec les filtres selectionnes.
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
            <th>Message</th>
            <th>Segments</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  logs.forEach(log => {
    const dateEnvoi = new Date(log.date_envoi).toLocaleString('fr-FR');
    const statutBadge = getSmsStatutBadge(log.statut);
    const adherentInfo = log.adherent ?
      `${log.adherent.prenom} ${log.adherent.nom}` :
      log.destinataire_nom || '';

    // Tronquer le message pour l'affichage
    const messagePreview = log.message ?
      (log.message.length > 50 ? log.message.substring(0, 50) + '...' : log.message) :
      '-';

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
          <div class="text-truncate" style="max-width: 200px;" title="${log.message || ''}">
            ${messagePreview}
          </div>
        </td>
        <td>
          <span class="badge bg-secondary">${log.nb_segments || 1}</span>
        </td>
        <td>${statutBadge}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="viewSmsLogDetails(${log.id})">
            <i class="bi bi-eye"></i> Details
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
function displaySmsLogsPagination(pagination) {
  const container = document.getElementById('sms-logs-pagination');

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <nav>
      <ul class="pagination justify-content-center">
        <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="loadSmsLogs(${pagination.page - 1}); return false;">
            Precedent
          </a>
        </li>
  `;

  // Afficher les numeros de page
  const maxPages = 5;
  let startPage = Math.max(1, pagination.page - Math.floor(maxPages / 2));
  let endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);

  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === pagination.page ? 'active' : ''}">
        <a class="page-link" href="#" onclick="loadSmsLogs(${i}); return false;">${i}</a>
      </li>
    `;
  }

  html += `
        <li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
          <a class="page-link" href="#" onclick="loadSmsLogs(${pagination.page + 1}); return false;">
            Suivant
          </a>
        </li>
      </ul>
    </nav>
    <div class="text-center text-muted">
      <small>
        Affichage de ${((pagination.page - 1) * pagination.limit) + 1} a
        ${Math.min(pagination.page * pagination.limit, pagination.total)} sur ${pagination.total} SMS
      </small>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Retourne le badge HTML pour un statut SMS
 */
function getSmsStatutBadge(statut) {
  const badges = {
    'envoye': '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Envoye</span>',
    'delivre': '<span class="badge bg-primary"><i class="bi bi-check2-circle"></i> Delivre</span>',
    'erreur': '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Erreur</span>',
    'echec_livraison': '<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle"></i> Echec livraison</span>',
    'en_attente': '<span class="badge bg-secondary"><i class="bi bi-clock"></i> En attente</span>'
  };

  return badges[statut] || `<span class="badge bg-secondary">${statut}</span>`;
}

/**
 * Affiche les details d'un log de SMS
 */
async function viewSmsLogDetails(logId) {
  try {
    const log = await apiRequest(`/sms-logs/${logId}`);

    const content = document.getElementById('sms-log-details-content');
    const dateEnvoi = new Date(log.date_envoi).toLocaleString('fr-FR');
    const dateLivraison = log.date_livraison ? new Date(log.date_livraison).toLocaleString('fr-FR') : null;
    const statutBadge = getSmsStatutBadge(log.statut);

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
          <h6><i class="bi bi-phone"></i> Destinataire</h6>
          <p>${log.destinataire}</p>
          ${log.destinataire_nom ? `<small class="text-muted">${log.destinataire_nom}</small>` : ''}
        </div>
        <div class="col-md-6 mb-3">
          <h6><i class="bi bi-file-text"></i> Template</h6>
          <p>${log.template_code ? `<span class="badge bg-info">${log.template_code}</span>` : '<span class="text-muted">Aucun</span>'}</p>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6 mb-3">
          <h6><i class="bi bi-layers"></i> Segments</h6>
          <p><span class="badge bg-secondary">${log.nb_segments || 1} segment(s)</span></p>
        </div>
        <div class="col-md-6 mb-3">
          <h6><i class="bi bi-building"></i> Provider</h6>
          <p>${log.provider ? `<span class="badge bg-primary">${log.provider}</span>` : '<span class="text-muted">Non specifie</span>'}</p>
        </div>
      </div>

      <div class="mb-3">
        <h6><i class="bi bi-chat-text"></i> Message</h6>
        <div class="border rounded p-3 bg-light">
          ${log.message || '<span class="text-muted">Aucun message</span>'}
        </div>
        <small class="text-muted">${(log.message || '').length} caracteres</small>
      </div>
    `;

    if (dateLivraison) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-check2-all text-success"></i> Date de livraison</h6>
          <p>${dateLivraison}</p>
        </div>
      `;
    }

    if (log.message_id) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-hash"></i> Message ID</h6>
          <p><code>${log.message_id}</code></p>
        </div>
      `;
    }

    if (log.cout) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-currency-euro"></i> Cout</h6>
          <p>${parseFloat(log.cout).toFixed(4)} EUR</p>
        </div>
      `;
    }

    if (log.erreur_code || log.erreur_message) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-exclamation-triangle text-danger"></i> Erreur</h6>
          <div class="alert alert-danger">
            ${log.erreur_code ? `<strong>Code:</strong> ${log.erreur_code}<br>` : ''}
            ${log.erreur_message || 'Erreur inconnue'}
          </div>
        </div>
      `;
    }

    if (log.adherent) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-person-badge"></i> Adherent lie</h6>
          <p>
            ${log.adherent.prenom} ${log.adherent.nom}
            <br>
            <small class="text-muted">ID: ${log.adherent.id} - ${log.adherent.telephone || 'Pas de telephone'}</small>
          </p>
        </div>
      `;
    }

    if (log.metadata) {
      html += `
        <div class="mb-3">
          <h6><i class="bi bi-code-square"></i> Metadonnees</h6>
          <pre class="bg-light p-3 rounded"><code>${JSON.stringify(log.metadata, null, 2)}</code></pre>
        </div>
      `;
    }

    content.innerHTML = html;

    const modal = new bootstrap.Modal(document.getElementById('modalSmsLogDetails'));
    modal.show();

  } catch (error) {
    console.error('Erreur chargement details log:', error);
    showError('Impossible de charger les details du SMS');
  }
}

/**
 * Charge les statistiques des SMS
 */
async function loadSmsStatistics() {
  try {
    const data = await apiRequest('/sms-logs/statistics');

    displaySmsStatistics(data);

  } catch (error) {
    console.error('Erreur chargement statistiques:', error);
    document.getElementById('sms-statistics').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> Erreur lors du chargement des statistiques
      </div>
    `;
  }
}

/**
 * Affiche les statistiques des SMS
 */
function displaySmsStatistics(data) {
  const container = document.getElementById('sms-statistics');

  let html = `
    <div class="row">
      <div class="col-md-2">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-primary">${data.statistiquesGenerales.total}</h3>
            <p class="text-muted mb-0">Total SMS</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-success">${data.statistiquesGenerales.envoyes}</h3>
            <p class="text-muted mb-0">Envoyes</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-primary">${data.statistiquesGenerales.delivres}</h3>
            <p class="text-muted mb-0">Delivres</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-danger">${data.statistiquesGenerales.erreurs}</h3>
            <p class="text-muted mb-0">Erreurs</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-info">${data.statistiquesGenerales.tauxReussite}%</h3>
            <p class="text-muted mb-0">Taux reussite</p>
          </div>
        </div>
      </div>
      <div class="col-md-2">
        <div class="card text-center">
          <div class="card-body">
            <h3 class="text-warning">${data.statistiquesGenerales.coutTotal} EUR</h3>
            <p class="text-muted mb-0">Cout total</p>
          </div>
        </div>
      </div>
    </div>

    <div class="row mt-4">
      <div class="col-md-4">
        <h6><i class="bi bi-file-text"></i> Top templates</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Template</th>
                <th>Total</th>
                <th>OK</th>
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
    html += `<tr><td colspan="4" class="text-center text-muted">Aucune donnee</td></tr>`;
  }

  html += `
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-md-4">
        <h6><i class="bi bi-building"></i> Par provider</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Total</th>
                <th>Cout</th>
              </tr>
            </thead>
            <tbody>
  `;

  if (data.parProvider && data.parProvider.length > 0) {
    data.parProvider.forEach(item => {
      html += `
        <tr>
          <td><span class="badge bg-primary">${item.provider || 'Non specifie'}</span></td>
          <td>${item.total}</td>
          <td>${item.cout_total ? parseFloat(item.cout_total).toFixed(2) + ' EUR' : '-'}</td>
        </tr>
      `;
    });
  } else {
    html += `<tr><td colspan="3" class="text-center text-muted">Aucune donnee</td></tr>`;
  }

  html += `
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-md-4">
        <h6><i class="bi bi-calendar-week"></i> 7 derniers jours</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Total</th>
                <th>OK</th>
                <th>Segments</th>
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
          <td>${item.segments || 0}</td>
        </tr>
      `;
    });
  } else {
    html += `<tr><td colspan="4" class="text-center text-muted">Aucune donnee</td></tr>`;
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
    const templates = await apiRequest('/sms-logs/templates');

    const select = document.getElementById('filter-template-sms');
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
 * Charge la liste des providers pour le filtre
 */
async function loadProvidersFilter() {
  try {
    const providers = await apiRequest('/sms-logs/providers');

    const select = document.getElementById('filter-provider-sms');
    if (!select) return;

    providers.forEach(provider => {
      const option = document.createElement('option');
      option.value = provider.provider;
      option.textContent = `${provider.provider} (${provider.total})`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Erreur chargement providers:', error);
  }
}

/**
 * Reinitialise les filtres
 */
function resetFiltersSmsLogs() {
  document.getElementById('filter-destinataire-sms').value = '';
  document.getElementById('filter-statut-sms').value = '';
  document.getElementById('filter-template-sms').value = '';
  document.getElementById('filter-provider-sms').value = '';
  document.getElementById('filter-date-debut').value = '';
  document.getElementById('filter-date-fin').value = '';
  loadSmsLogs(1);
}

/**
 * Affiche la modal de purge
 */
function showPurgeModal() {
  const modal = new bootstrap.Modal(document.getElementById('modalPurgeLogs'));
  modal.show();
}

/**
 * Gere la soumission du formulaire de purge
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-purge-logs');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const jours = parseInt(document.getElementById('purge_jours').value);

      if (jours < 1) {
        showError('Le nombre de jours doit etre superieur a 0');
        return;
      }

      if (!confirm(`Etes-vous sur de vouloir supprimer tous les logs de plus de ${jours} jours ?`)) {
        return;
      }

      try {
        const data = await apiRequest('/sms-logs/purge', {
          method: 'POST',
          body: JSON.stringify({ jours })
        });

        showSuccess(data.message);

        // Fermer la modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalPurgeLogs'));
        modal.hide();

        // Recharger les donnees
        loadSmsLogs(1);
        loadSmsStatistics();

      } catch (error) {
        console.error('Erreur purge logs:', error);
        showError('Impossible de purger les logs');
      }
    });
  }
});

/**
 * Helper pour afficher un message de succes
 */
function showSuccess(message) {
  Swal.fire({
    icon: 'success',
    title: 'Succes',
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
