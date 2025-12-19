/**
 * Gestion des Sites
 * Page dediee a la gestion des emplacements physiques et mobiles
 */

let sites = [];
let structures = [];
let sortableSites = null;

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// ==================== INITIALISATION ====================

async function initSitesPage() {
  // Attendre que le token soit disponible (vérifié par auth-admin.js)
  const token = getAuthToken();
  if (!token) {
    console.error('Token non disponible - redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  try {
    await Promise.all([
      loadSites(),
      loadStructures()
    ]);
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }

  // Event listeners
  document.getElementById('form-site')?.addEventListener('submit', handleSiteSubmit);
}

// ==================== SITES ====================

async function loadSites() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/sites', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    sites = Array.isArray(data) ? data : [];
    renderSites();
    updateSitesStats();
  } catch (error) {
    console.error('Erreur chargement sites:', error);
    sites = [];
    renderSites();
  }
}

function updateSitesStats() {
  const total = sites.length;
  const fixes = sites.filter(s => s.type === 'fixe').length;
  const mobiles = sites.filter(s => s.type === 'mobile').length;
  const inactifs = sites.filter(s => !s.actif).length;

  document.getElementById('count-sites').textContent = total;
  document.getElementById('count-fixes').textContent = fixes;
  document.getElementById('count-mobiles').textContent = mobiles;
  document.getElementById('count-inactifs').textContent = inactifs;
}

async function loadStructures() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/structures?actif=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    structures = Array.isArray(data) ? data : [];
    populateStructureSelect();
  } catch (error) {
    console.error('Erreur chargement structures:', error);
    structures = [];
  }
}

function populateStructureSelect() {
  const select = document.getElementById('site_structure');
  if (select) {
    select.innerHTML = '<option value="">Aucune (global)</option>' +
      structures.map(s =>
        `<option value="${s.id}">${escapeHtml(s.nom)} (${escapeHtml(s.code)})</option>`
      ).join('');
  }
}

function renderSites() {
  const container = document.getElementById('liste-sites');

  if (sites.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-building display-1 text-muted"></i>
        <p class="text-muted mt-3">Aucun site configure</p>
        <button class="btn btn-primary" onclick="showModalSite()">
          <i class="bi bi-plus-lg"></i> Creer le premier site
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = sites.map(site => `
    <div class="col-md-6 col-lg-4" data-site-id="${site.id}">
      <div class="card site-card h-100 ${!site.actif ? 'opacity-50' : ''}" onclick="showModalSite(${site.id})">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="d-flex align-items-center gap-2">
              <span class="drag-handle text-muted" onclick="event.stopPropagation()">
                <i class="bi bi-grip-vertical"></i>
              </span>
              <span class="site-badge" style="background-color: ${site.couleur}20; color: ${site.couleur}">
                <i class="bi bi-${site.icone || 'building'}"></i>
                ${site.type === 'mobile' ? 'Mobile' : 'Fixe'}
              </span>
            </div>
            ${!site.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
          </div>

          <h5 class="card-title">${escapeHtml(site.nom)}</h5>
          <p class="card-text small text-muted">${site.code}</p>

          ${site.type === 'fixe' && site.adresse ? `
            <p class="small mb-2">
              <i class="bi bi-geo-alt text-muted"></i>
              ${escapeHtml(site.ville || '')} ${site.code_postal || ''}
            </p>
          ` : ''}

          ${site.structure ? `
            <p class="small mb-2">
              <i class="bi bi-diagram-3" style="color: ${site.structure.couleur || '#6f42c1'}"></i>
              ${escapeHtml(site.structure.nom)}
            </p>
          ` : ''}

          <div class="mt-3 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); showModalHoraires(${site.id}, '${escapeHtml(site.nom)}', '${site.type}')">
              <i class="bi bi-clock"></i> Horaires
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteSite(${site.id})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Initialiser le drag & drop
  initSortable();
}

function initSortable() {
  const container = document.getElementById('liste-sites');
  if (sortableSites) sortableSites.destroy();

  sortableSites = new Sortable(container, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: async function(evt) {
      const ordres = [];
      container.querySelectorAll('[data-site-id]').forEach((el, index) => {
        ordres.push({ id: parseInt(el.dataset.siteId), ordre: index });
      });

      try {
        const token = getAuthToken();
        await fetch('/api/sites/reorder', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ordres })
        });
      } catch (error) {
        console.error('Erreur reorder:', error);
      }
    }
  });
}

function showModalSite(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalSite'));
  const form = document.getElementById('form-site');
  form.reset();

  document.getElementById('modalSiteTitle').textContent = id ? 'Modifier le site' : 'Nouveau site';
  document.getElementById('site_id').value = id || '';

  // S'assurer que le select des structures est rempli
  populateStructureSelect();

  if (id) {
    const site = sites.find(s => s.id === id);
    if (site) {
      document.getElementById('site_nom').value = site.nom;
      document.getElementById('site_code').value = site.code;
      document.getElementById('site_type').value = site.type;
      document.getElementById('site_pays').value = site.pays || 'FR';
      document.getElementById('site_description').value = site.description || '';
      document.getElementById('site_adresse').value = site.adresse || '';
      document.getElementById('site_code_postal').value = site.code_postal || '';
      document.getElementById('site_ville').value = site.ville || '';
      document.getElementById('site_telephone').value = site.telephone || '';
      document.getElementById('site_email').value = site.email || '';
      document.getElementById('site_structure').value = site.structure_id || '';
      document.getElementById('site_couleur').value = site.couleur || '#0d6efd';
      document.getElementById('site_icone').value = site.icone || 'building';
      document.getElementById('site_google_place_id').value = site.google_place_id || '';
      document.getElementById('site_actif').checked = site.actif;
    }
  }

  toggleSiteTypeFields();
  modal.show();
}

function toggleSiteTypeFields() {
  const type = document.getElementById('site_type').value;
  document.getElementById('site-adresse-section').style.display = type === 'fixe' ? 'block' : 'none';
}

async function handleSiteSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('site_id').value;
  const structureValue = document.getElementById('site_structure')?.value;
  const data = {
    nom: document.getElementById('site_nom').value,
    code: document.getElementById('site_code').value || undefined,
    type: document.getElementById('site_type').value,
    pays: document.getElementById('site_pays').value,
    description: document.getElementById('site_description').value,
    adresse: document.getElementById('site_adresse').value,
    code_postal: document.getElementById('site_code_postal').value,
    ville: document.getElementById('site_ville').value,
    telephone: document.getElementById('site_telephone').value,
    email: document.getElementById('site_email').value,
    structure_id: structureValue ? parseInt(structureValue) : null,
    couleur: document.getElementById('site_couleur').value,
    icone: document.getElementById('site_icone').value,
    google_place_id: document.getElementById('site_google_place_id').value,
    actif: document.getElementById('site_actif').checked
  };

  try {
    const token = getAuthToken();
    const url = id ? `/api/sites/${id}` : '/api/sites';
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erreur');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalSite')).hide();
    showToast(id ? 'Site modifie' : 'Site cree', 'success');
    await loadSites();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteSite(id) {
  const site = sites.find(s => s.id === id);
  const result = await Swal.fire({
    title: 'Desactiver ce site ?',
    text: `Le site "${site.nom}" sera desactive mais pas supprime.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Desactiver',
    cancelButtonText: 'Annuler'
  });

  if (result.isConfirmed) {
    try {
      const token = getAuthToken();
      await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Site desactive', 'success');
      await loadSites();
    } catch (error) {
      showToast('Erreur lors de la desactivation', 'error');
    }
  }
}

// ==================== HORAIRES ====================

let currentSiteCalendrier = null;

async function showModalHoraires(siteId, siteName, siteType) {
  const modal = new bootstrap.Modal(document.getElementById('modalHoraires'));
  document.getElementById('horaires_site_id').value = siteId;
  document.getElementById('horaires-site-nom').textContent = siteName;

  const isMobile = siteType === 'mobile';

  // Charger les parametres calendrier du site
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/calendrier/site/${siteId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      currentSiteCalendrier = await response.json();
    } else {
      currentSiteCalendrier = { ouvert_jours_feries: false, ouvert_vacances: true, horaires_vacances_identiques: true };
    }
  } catch (error) {
    currentSiteCalendrier = { ouvert_jours_feries: false, ouvert_vacances: true, horaires_vacances_identiques: true };
  }

  // Remplir les checkboxes
  document.getElementById('site_ouvert_feries').checked = currentSiteCalendrier.ouvert_jours_feries;
  document.getElementById('site_ouvert_vacances').checked = currentSiteCalendrier.ouvert_vacances;

  if (currentSiteCalendrier.horaires_vacances_identiques) {
    document.getElementById('horaires_vacances_identiques').checked = true;
  } else {
    document.getElementById('horaires_vacances_specifiques').checked = true;
  }

  // Afficher/masquer config horaires vacances selon si ouvert
  toggleHorairesVacancesConfig();

  // Event listeners pour les radios
  document.getElementById('site_ouvert_vacances').addEventListener('change', toggleHorairesVacancesConfig);
  document.getElementById('horaires_vacances_identiques').addEventListener('change', updateHorairesVacancesDisplay);
  document.getElementById('horaires_vacances_specifiques').addEventListener('change', updateHorairesVacancesDisplay);

  // Charger les horaires existants
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/sites/${siteId}/horaires`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const horaires = await response.json();

    // Separer horaires normaux et vacances
    const horairesNormaux = horaires.filter(h => !h.periode || h.periode === 'normale');
    const horairesVacances = horaires.filter(h => h.periode === 'vacances');

    renderHorairesForm(horairesNormaux, 'normale', isMobile);
    renderHorairesForm(horairesVacances, 'vacances', isMobile);

    updateBadgeHorairesVacances(horairesVacances.length);
  } catch (error) {
    console.error('Erreur chargement horaires:', error);
    renderHorairesForm([], 'normale', isMobile);
    renderHorairesForm([], 'vacances', isMobile);
  }

  updateHorairesVacancesDisplay();
  modal.show();
}

function toggleHorairesVacancesConfig() {
  const ouvert = document.getElementById('site_ouvert_vacances').checked;
  document.getElementById('config-horaires-vacances').style.display = ouvert ? 'block' : 'none';

  if (!ouvert) {
    // Masquer l'onglet vacances si ferme
    document.getElementById('tab-horaires-vacances').classList.add('disabled');
    document.getElementById('alert-horaires-vacances-disabled').innerHTML = `
      <i class="bi bi-x-circle"></i>
      <strong>Ferme :</strong> Le site est ferme pendant les vacances scolaires.
    `;
  } else {
    document.getElementById('tab-horaires-vacances').classList.remove('disabled');
    updateHorairesVacancesDisplay();
  }
}

function updateHorairesVacancesDisplay() {
  const identiques = document.getElementById('horaires_vacances_identiques').checked;
  const ouvert = document.getElementById('site_ouvert_vacances').checked;

  if (!ouvert) {
    document.getElementById('alert-horaires-vacances-disabled').style.display = 'block';
    document.getElementById('alert-horaires-vacances-info').style.display = 'none';
    document.getElementById('btn-add-horaire-vacances').style.display = 'none';
    document.getElementById('horaires-vacances-container').style.opacity = '0.5';
  } else if (identiques) {
    document.getElementById('alert-horaires-vacances-disabled').style.display = 'block';
    document.getElementById('alert-horaires-vacances-disabled').innerHTML = `
      <i class="bi bi-exclamation-triangle"></i>
      <strong>Desactive :</strong> Les horaires vacances ne sont pas utilises car "Memes horaires que la periode normale" est selectionne.
    `;
    document.getElementById('alert-horaires-vacances-info').style.display = 'none';
    document.getElementById('btn-add-horaire-vacances').style.display = 'none';
    document.getElementById('horaires-vacances-container').style.opacity = '0.5';
  } else {
    document.getElementById('alert-horaires-vacances-disabled').style.display = 'none';
    document.getElementById('alert-horaires-vacances-info').style.display = 'block';
    document.getElementById('btn-add-horaire-vacances').style.display = 'inline-block';
    document.getElementById('horaires-vacances-container').style.opacity = '1';
  }
}

function updateBadgeHorairesVacances(count) {
  const badge = document.getElementById('badge-horaires-vacances');
  badge.textContent = count > 0 ? count : '-';
  badge.className = count > 0 ? 'badge bg-warning ms-1' : 'badge bg-secondary ms-1';
}

function renderHorairesForm(horaires, periode = 'normale', isMobile = false) {
  const containerId = periode === 'vacances' ? 'horaires-vacances-container' : 'horaires-normaux-container';
  const tbodyId = periode === 'vacances' ? 'horaires-vacances-tbody' : 'horaires-normaux-tbody';
  const container = document.getElementById(containerId);

  if (!container) return;

  if (horaires.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        Aucun horaire defini. Cliquez sur "Ajouter un creneau" pour commencer.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="table table-sm">
      <thead>
        <tr>
          <th>Jour</th>
          <th>Debut</th>
          <th>Fin</th>
          <th>Recurrence</th>
          ${isMobile ? '<th>Lieu</th>' : ''}
          <th></th>
        </tr>
      </thead>
      <tbody id="${tbodyId}">
        ${horaires.map((h, i) => renderHoraireRow(h, i, isMobile, periode)).join('')}
      </tbody>
    </table>
  `;
}

function renderHoraireRow(horaire = {}, index = 0, isMobile = false, periode = 'normale') {
  const rowClass = periode === 'vacances' ? 'table-warning' : '';
  return `
    <tr data-index="${index}" data-periode="${periode}" class="${rowClass}">
      <td>
        <select class="form-select form-select-sm horaire-jour" style="width: 130px">
          ${JOURS.map((j, i) => `<option value="${i}" ${horaire.jour_semaine === i ? 'selected' : ''}>${j}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="time" class="form-control form-control-sm horaire-debut" value="${horaire.heure_debut ? horaire.heure_debut.substring(0, 5) : '09:00'}" style="width: 100px">
      </td>
      <td>
        <input type="time" class="form-control form-control-sm horaire-fin" value="${horaire.heure_fin ? horaire.heure_fin.substring(0, 5) : '17:00'}" style="width: 100px">
      </td>
      <td>
        <select class="form-select form-select-sm horaire-recurrence" style="width: 140px">
          <option value="toutes" ${horaire.recurrence === 'toutes' ? 'selected' : ''}>Toutes</option>
          <option value="paires" ${horaire.recurrence === 'paires' ? 'selected' : ''}>Sem. paires</option>
          <option value="impaires" ${horaire.recurrence === 'impaires' ? 'selected' : ''}>Sem. impaires</option>
        </select>
      </td>
      ${isMobile ? `
        <td>
          <input type="text" class="form-control form-control-sm horaire-lieu" placeholder="Lieu" value="${escapeHtml(horaire.lieu_specifique || '')}" style="width: 150px">
        </td>
      ` : ''}
      <td>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeHoraireRow(this, '${periode}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `;
}

function addHoraireRow(periode = 'normale') {
  const containerId = periode === 'vacances' ? 'horaires-vacances-container' : 'horaires-normaux-container';
  const tbodyId = periode === 'vacances' ? 'horaires-vacances-tbody' : 'horaires-normaux-tbody';
  const container = document.getElementById(containerId);
  let tbody = document.getElementById(tbodyId);

  const siteId = document.getElementById('horaires_site_id').value;
  const site = sites.find(s => s.id == siteId);
  const isMobile = site && site.type === 'mobile';

  // Si pas de tableau, le creer
  if (!tbody) {
    container.innerHTML = `
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Jour</th>
            <th>Debut</th>
            <th>Fin</th>
            <th>Recurrence</th>
            ${isMobile ? '<th>Lieu</th>' : ''}
            <th></th>
          </tr>
        </thead>
        <tbody id="${tbodyId}"></tbody>
      </table>
    `;
    tbody = document.getElementById(tbodyId);
  }

  const index = tbody.children.length;
  tbody.insertAdjacentHTML('beforeend', renderHoraireRow({}, index, isMobile, periode));

  if (periode === 'vacances') {
    updateBadgeHorairesVacances(tbody.children.length);
  }
}

function removeHoraireRow(btn, periode = 'normale') {
  btn.closest('tr').remove();

  if (periode === 'vacances') {
    const tbody = document.getElementById('horaires-vacances-tbody');
    updateBadgeHorairesVacances(tbody ? tbody.children.length : 0);
  }
}

async function saveHoraires() {
  const siteId = document.getElementById('horaires_site_id').value;

  // Collecter horaires normaux
  const tbodyNormaux = document.getElementById('horaires-normaux-tbody');
  const horairesNormaux = [];
  if (tbodyNormaux) {
    tbodyNormaux.querySelectorAll('tr').forEach(row => {
      horairesNormaux.push({
        jour_semaine: parseInt(row.querySelector('.horaire-jour').value),
        heure_debut: row.querySelector('.horaire-debut').value,
        heure_fin: row.querySelector('.horaire-fin').value,
        recurrence: row.querySelector('.horaire-recurrence').value,
        lieu_specifique: row.querySelector('.horaire-lieu')?.value || null,
        periode: 'normale'
      });
    });
  }

  // Collecter horaires vacances
  const tbodyVacances = document.getElementById('horaires-vacances-tbody');
  const horairesVacances = [];
  if (tbodyVacances) {
    tbodyVacances.querySelectorAll('tr').forEach(row => {
      horairesVacances.push({
        jour_semaine: parseInt(row.querySelector('.horaire-jour').value),
        heure_debut: row.querySelector('.horaire-debut').value,
        heure_fin: row.querySelector('.horaire-fin').value,
        recurrence: row.querySelector('.horaire-recurrence').value,
        lieu_specifique: row.querySelector('.horaire-lieu')?.value || null,
        periode: 'vacances'
      });
    });
  }

  const allHoraires = [...horairesNormaux, ...horairesVacances];

  // Sauvegarder les parametres calendrier du site
  const calendrierData = {
    site_id: parseInt(siteId),
    ouvert_jours_feries: document.getElementById('site_ouvert_feries').checked,
    ouvert_vacances: document.getElementById('site_ouvert_vacances').checked,
    horaires_vacances_identiques: document.getElementById('horaires_vacances_identiques').checked
  };

  await saveHorairesToServer(siteId, allHoraires, calendrierData);
}

async function saveHorairesToServer(siteId, horaires, calendrierData) {
  try {
    const token = getAuthToken();

    // Sauvegarder les horaires
    await fetch(`/api/sites/${siteId}/horaires`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horaires })
    });

    // Sauvegarder les parametres calendrier
    await fetch(`/api/calendrier/site/${siteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(calendrierData)
    });

    bootstrap.Modal.getInstance(document.getElementById('modalHoraires')).hide();
    showToast('Horaires et parametres enregistres', 'success');
  } catch (error) {
    showToast('Erreur lors de l\'enregistrement', 'error');
  }
}

// ==================== UTILITAIRES ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(message, type = 'info') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });

  Toast.fire({
    icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
    title: message
  });
}

// Export pour utilisation globale
window.initSitesPage = initSitesPage;
window.loadSites = loadSites;
window.showModalSite = showModalSite;
window.deleteSite = deleteSite;
window.toggleSiteTypeFields = toggleSiteTypeFields;
window.showModalHoraires = showModalHoraires;
window.addHoraireRow = addHoraireRow;
window.removeHoraireRow = removeHoraireRow;
window.saveHoraires = saveHoraires;
