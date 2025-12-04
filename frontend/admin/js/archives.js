// ============================================
// Gestion des archives adhérents (RGPD)
// ============================================

let currentArchivePage = 1;
let archiveSearchTerm = '';
let archiveFilterAnonymise = '';
let modalArchiveDetail = null;

// Charger les statistiques des archives
async function loadArchivesStats() {
  try {
    const response = await apiRequest('/archives/stats');
    if (response.success) {
      document.getElementById('archives-stat-total').textContent = response.data.total;
      document.getElementById('archives-stat-anonymisees').textContent = response.data.anonymisees;
      document.getElementById('archives-stat-non-anonymisees').textContent = response.data.nonAnonymisees;
      document.getElementById('archives-stat-actifs').textContent = response.data.adherentsActifs;
    }
  } catch (error) {
    console.error('Erreur chargement stats archives:', error);
  }
}

// Charger la liste des archives
async function loadArchives(page = 1) {
  currentArchivePage = page;

  try {
    let url = `/archives?page=${page}&limit=20`;
    if (archiveSearchTerm) url += `&search=${encodeURIComponent(archiveSearchTerm)}`;
    if (archiveFilterAnonymise) url += `&anonymise=${archiveFilterAnonymise}`;

    const response = await apiRequest(url);

    if (response.success) {
      renderArchives(response.data, response.pagination);
    } else {
      document.getElementById('liste-archives').innerHTML =
        '<p class="text-center text-danger">Erreur de chargement</p>';
    }
  } catch (error) {
    console.error('Erreur chargement archives:', error);
    document.getElementById('liste-archives').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

// Afficher les archives
function renderArchives(archives, pagination) {
  const container = document.getElementById('liste-archives');

  if (!archives || archives.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucune archive trouvée</p>';
    document.getElementById('archives-pagination').innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom / Prénom</th>
            <th>Email</th>
            <th>Date archivage</th>
            <th>Dernière activité</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${archives.map(a => renderArchiveRow(a)).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Pagination
  renderArchivesPagination(pagination);
}

// Créer une ligne d'archive
function renderArchiveRow(archive) {
  const dateArchivage = archive.date_archivage
    ? new Date(archive.date_archivage).toLocaleDateString('fr-FR')
    : '-';
  const derniereActivite = archive.derniere_activite
    ? new Date(archive.derniere_activite).toLocaleDateString('fr-FR')
    : 'Aucune';

  const statutBadge = archive.est_anonymise
    ? '<span class="badge bg-secondary">Anonymisé</span>'
    : '<span class="badge bg-info">Archivé</span>';

  const nomAffiche = archive.est_anonymise
    ? '<span class="text-muted">*****</span>'
    : `${archive.nom} ${archive.prenom}`;

  const emailAffiche = archive.est_anonymise
    ? '<span class="text-muted">*****</span>'
    : archive.email;

  return `
    <tr>
      <td><code>${archive.adherent_id}</code></td>
      <td>${nomAffiche}</td>
      <td>${emailAffiche}</td>
      <td>${dateArchivage}</td>
      <td>${derniereActivite}</td>
      <td>${statutBadge}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="voirArchive(${archive.id})" title="Voir détails">
          <i class="bi bi-eye"></i>
        </button>
        ${!archive.est_anonymise ? `
          <button class="btn btn-sm btn-outline-warning" onclick="anonymiserArchive(${archive.id})" title="Anonymiser">
            <i class="bi bi-shield-lock"></i>
          </button>
        ` : ''}
      </td>
    </tr>
  `;
}

// Pagination
function renderArchivesPagination(pagination) {
  const container = document.getElementById('archives-pagination');
  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center">';

  // Bouton précédent
  html += `
    <li class="page-item ${pagination.page === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="loadArchives(${pagination.page - 1}); return false;">
        <i class="bi bi-chevron-left"></i>
      </a>
    </li>
  `;

  // Pages
  for (let i = 1; i <= pagination.totalPages; i++) {
    if (i === 1 || i === pagination.totalPages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
      html += `
        <li class="page-item ${i === pagination.page ? 'active' : ''}">
          <a class="page-link" href="#" onclick="loadArchives(${i}); return false;">${i}</a>
        </li>
      `;
    } else if (i === pagination.page - 3 || i === pagination.page + 3) {
      html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }

  // Bouton suivant
  html += `
    <li class="page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="loadArchives(${pagination.page + 1}); return false;">
        <i class="bi bi-chevron-right"></i>
      </a>
    </li>
  `;

  html += '</ul></nav>';
  container.innerHTML = html;
}

// Recherche dans les archives
function searchArchives() {
  archiveSearchTerm = document.getElementById('archive-search').value;
  loadArchives(1);
}

// Filtrer par statut anonymisé
function filterArchivesByAnonymise(value) {
  archiveFilterAnonymise = value;
  loadArchives(1);
}

// Voir le détail d'une archive
async function voirArchive(id) {
  try {
    const response = await apiRequest(`/archives/${id}`);

    if (response.success) {
      const { archive, historique } = response.data;

      // Remplir le modal
      document.getElementById('archive-detail-id').textContent = archive.adherent_id;
      document.getElementById('archive-detail-code').textContent = archive.code_barre || '-';
      document.getElementById('archive-detail-nom').textContent = `${archive.prenom || ''} ${archive.nom || ''}`;
      document.getElementById('archive-detail-email').textContent = archive.email || '-';
      document.getElementById('archive-detail-telephone').textContent = archive.telephone || '-';
      document.getElementById('archive-detail-adresse').textContent = archive.adresse || '-';
      document.getElementById('archive-detail-ville').textContent = archive.ville || '-';
      document.getElementById('archive-detail-naissance').textContent = archive.date_naissance
        ? new Date(archive.date_naissance).toLocaleDateString('fr-FR') : '-';
      document.getElementById('archive-detail-adhesion').textContent = archive.date_adhesion
        ? new Date(archive.date_adhesion).toLocaleDateString('fr-FR') : '-';
      document.getElementById('archive-detail-archivage').textContent = archive.date_archivage
        ? new Date(archive.date_archivage).toLocaleDateString('fr-FR') : '-';
      document.getElementById('archive-detail-motif').textContent = archive.motif_archivage || '-';

      // Statut
      const statutHtml = archive.est_anonymise
        ? '<span class="badge bg-secondary">Anonymisé le ' + new Date(archive.date_anonymisation).toLocaleDateString('fr-FR') + '</span>'
        : '<span class="badge bg-info">Archivé</span>';
      document.getElementById('archive-detail-statut').innerHTML = statutHtml;

      // Historique emprunts
      const empruntsHtml = historique.emprunts.length > 0
        ? `<table class="table table-sm">
            <thead><tr><th>Jeu</th><th>Date</th><th>Retour</th><th>Statut</th></tr></thead>
            <tbody>
              ${historique.emprunts.slice(0, 10).map(e => `
                <tr>
                  <td>${e.jeu?.titre || 'Jeu supprimé'}</td>
                  <td>${new Date(e.date_emprunt).toLocaleDateString('fr-FR')}</td>
                  <td>${e.date_retour_effective ? new Date(e.date_retour_effective).toLocaleDateString('fr-FR') : '-'}</td>
                  <td><span class="badge bg-${e.statut === 'retourne' ? 'success' : 'warning'}">${e.statut}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${historique.emprunts.length > 10 ? `<p class="text-muted">... et ${historique.emprunts.length - 10} autres</p>` : ''}`
        : '<p class="text-muted">Aucun emprunt</p>';
      document.getElementById('archive-detail-emprunts').innerHTML = empruntsHtml;

      // Historique cotisations
      const cotisationsHtml = historique.cotisations.length > 0
        ? `<table class="table table-sm">
            <thead><tr><th>Tarif</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              ${historique.cotisations.slice(0, 10).map(c => `
                <tr>
                  <td>${c.tarif?.libelle || '-'}</td>
                  <td>${new Date(c.date_cotisation).toLocaleDateString('fr-FR')}</td>
                  <td>${parseFloat(c.montant_paye || 0).toFixed(2)} €</td>
                  <td><span class="badge bg-${c.statut === 'validee' ? 'success' : 'secondary'}">${c.statut}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        : '<p class="text-muted">Aucune cotisation</p>';
      document.getElementById('archive-detail-cotisations').innerHTML = cotisationsHtml;

      // Communications
      const emailsCount = historique.emails?.length || 0;
      const smsCount = historique.sms?.length || 0;
      document.getElementById('archive-detail-communications').innerHTML =
        `<p>${emailsCount} email(s) envoyé(s), ${smsCount} SMS envoyé(s)</p>`;

      // Afficher le modal
      if (!modalArchiveDetail) {
        modalArchiveDetail = new bootstrap.Modal(document.getElementById('modalArchiveDetail'));
      }
      modalArchiveDetail.show();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur de chargement');
  }
}

// Anonymiser une archive individuelle
async function anonymiserArchive(id) {
  const result = await Swal.fire({
    title: 'Anonymiser cette archive ?',
    text: 'Les données personnelles (nom, prénom, email, téléphone, adresse) seront remplacées par *****. Cette action est irréversible.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ffc107',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Oui, anonymiser',
    cancelButtonText: 'Annuler'
  });

  if (result.isConfirmed) {
    try {
      const response = await apiRequest(`/archives/anonymiser/${id}`, { method: 'POST' });

      if (response.success) {
        showSuccessToast('Archive anonymisée avec succès');
        loadArchives(currentArchivePage);
        loadArchivesStats();
      } else {
        showErrorToast(response.message || 'Erreur lors de l\'anonymisation');
      }
    } catch (error) {
      console.error('Erreur:', error);
      showErrorToast('Erreur lors de l\'anonymisation');
    }
  }
}

// Prévisualiser les adhérents à archiver (inactifs 3 ans)
async function previewArchivageInactifs() {
  try {
    const response = await apiRequest('/archives/preview/inactifs');

    if (response.success) {
      const adherents = response.data;

      if (adherents.length === 0) {
        Swal.fire({
          title: 'Aucun adhérent éligible',
          text: 'Aucun adhérent inactif depuis plus de 3 ans n\'a été trouvé.',
          icon: 'info'
        });
        return;
      }

      // Afficher la liste
      let html = `<p class="mb-3">${adherents.length} adhérent(s) sans activité depuis plus de 3 ans :</p>`;
      html += '<div style="max-height: 300px; overflow-y: auto;"><table class="table table-sm">';
      html += '<thead><tr><th>Nom</th><th>Email</th><th>Dernière activité</th></tr></thead><tbody>';

      adherents.forEach(a => {
        const derniereAct = a.derniere_activite
          ? new Date(a.derniere_activite).toLocaleDateString('fr-FR')
          : 'Jamais';
        html += `<tr><td>${a.prenom} ${a.nom}</td><td>${a.email}</td><td>${derniereAct}</td></tr>`;
      });

      html += '</tbody></table></div>';

      const result = await Swal.fire({
        title: 'Archiver les adhérents inactifs ?',
        html: html,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Archiver ${adherents.length} adhérent(s)`,
        cancelButtonText: 'Annuler',
        width: '600px'
      });

      if (result.isConfirmed) {
        await executerArchivageInactifs();
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur lors de la prévisualisation');
  }
}

// Exécuter l'archivage des inactifs
async function executerArchivageInactifs() {
  try {
    Swal.fire({
      title: 'Archivage en cours...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const response = await apiRequest('/archives/archiver-inactifs', { method: 'POST' });

    Swal.close();

    if (response.success) {
      showSuccessToast(`${response.data.count} adhérent(s) archivé(s) avec succès`);
      loadArchives(1);
      loadArchivesStats();
    } else {
      showErrorToast(response.message || 'Erreur lors de l\'archivage');
    }
  } catch (error) {
    Swal.close();
    console.error('Erreur:', error);
    showErrorToast('Erreur lors de l\'archivage');
  }
}

// Prévisualiser les archives à anonymiser
async function previewAnonymisation() {
  try {
    const response = await apiRequest('/archives/preview/anonymisation');

    if (response.success) {
      const archives = response.data;

      if (archives.length === 0) {
        Swal.fire({
          title: 'Aucune archive éligible',
          text: 'Aucune archive non anonymisée avec une inactivité de plus de 3 ans n\'a été trouvée.',
          icon: 'info'
        });
        return;
      }

      // Afficher la liste
      let html = `<p class="mb-3">${archives.length} archive(s) à anonymiser :</p>`;
      html += '<div style="max-height: 300px; overflow-y: auto;"><table class="table table-sm">';
      html += '<thead><tr><th>Nom</th><th>Email</th><th>Archivé le</th></tr></thead><tbody>';

      archives.forEach(a => {
        const dateArchivage = a.date_archivage
          ? new Date(a.date_archivage).toLocaleDateString('fr-FR')
          : '-';
        html += `<tr><td>${a.prenom} ${a.nom}</td><td>${a.email}</td><td>${dateArchivage}</td></tr>`;
      });

      html += '</tbody></table></div>';

      const result = await Swal.fire({
        title: 'Anonymiser les archives ?',
        html: html,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ffc107',
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Anonymiser ${archives.length} archive(s)`,
        cancelButtonText: 'Annuler',
        width: '600px'
      });

      if (result.isConfirmed) {
        await executerAnonymisation();
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur lors de la prévisualisation');
  }
}

// Exécuter l'anonymisation en masse
async function executerAnonymisation() {
  try {
    Swal.fire({
      title: 'Anonymisation en cours...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const response = await apiRequest('/archives/anonymiser-inactifs', { method: 'POST' });

    Swal.close();

    if (response.success) {
      showSuccessToast(`${response.data.count} archive(s) anonymisée(s) avec succès`);
      loadArchives(1);
      loadArchivesStats();
    } else {
      showErrorToast(response.message || 'Erreur lors de l\'anonymisation');
    }
  } catch (error) {
    Swal.close();
    console.error('Erreur:', error);
    showErrorToast('Erreur lors de l\'anonymisation');
  }
}

// Voir l'historique des accès
async function voirHistoriqueAcces() {
  try {
    const response = await apiRequest('/archives/access-logs?limit=100');

    if (response.success) {
      const logs = response.data;

      let html = '<div style="max-height: 400px; overflow-y: auto;">';

      if (logs.length === 0) {
        html += '<p class="text-muted">Aucun accès enregistré</p>';
      } else {
        html += '<table class="table table-sm">';
        html += '<thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Détails</th></tr></thead><tbody>';

        logs.forEach(log => {
          const date = new Date(log.date_acces).toLocaleString('fr-FR');
          const user = `${log.user_prenom || ''} ${log.user_nom || ''} (${log.user_role})`;
          const actionLabels = {
            'consultation_liste': 'Consultation liste',
            'consultation_fiche': 'Consultation fiche',
            'archivage': 'Archivage',
            'anonymisation': 'Anonymisation',
            'archivage_masse': 'Archivage en masse',
            'anonymisation_masse': 'Anonymisation en masse'
          };
          const action = actionLabels[log.action] || log.action;

          html += `<tr>
            <td><small>${date}</small></td>
            <td><small>${user}</small></td>
            <td><span class="badge bg-secondary">${action}</span></td>
            <td><small>${log.details || '-'}</small></td>
          </tr>`;
        });

        html += '</tbody></table>';
      }

      html += '</div>';

      Swal.fire({
        title: 'Historique des accès aux archives',
        html: html,
        width: '800px',
        confirmButtonText: 'Fermer'
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorToast('Erreur de chargement');
  }
}

// Initialiser la section archives
function initArchives() {
  loadArchivesStats();
  loadArchives(1);
}
