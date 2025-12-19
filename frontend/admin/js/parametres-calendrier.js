/**
 * Gestion du Calendrier et des Fermetures
 * Page dediee au calendrier, jours feries, vacances et fermetures exceptionnelles
 */

let sites = [];
let fermetures = [];

// ==================== INITIALISATION ====================

async function initCalendrierPage() {
  const token = getAuthToken();
  if (!token) {
    console.error('Token non disponible - redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  try {
    await Promise.all([
      loadSites(),
      loadFermetures(),
      loadParametresCalendrier()
    ]);
    updateStats();
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }

  // Event listeners
  document.getElementById('form-parametres-calendrier')?.addEventListener('submit', handleCalendrierSubmit);
  document.getElementById('form-fermeture')?.addEventListener('submit', handleFermetureSubmit);

  // Toggle zone vacances selon pays
  document.getElementById('cal_pays')?.addEventListener('change', () => {
    const pays = document.getElementById('cal_pays').value;
    document.getElementById('zone-vacances-container').style.display = pays === 'FR' ? 'block' : 'none';
    document.getElementById('import-vacances-section').style.display = pays === 'FR' ? 'block' : 'none';
  });
}

// ==================== SITES ====================

async function loadSites() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/sites', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    sites = Array.isArray(data) ? data : [];
    populateSiteSelects();
  } catch (error) {
    console.error('Erreur chargement sites:', error);
    sites = [];
  }
}

function populateSiteSelects() {
  const selects = [
    document.getElementById('fermeture_site'),
    document.getElementById('filter-fermetures-site')
  ];

  selects.forEach(select => {
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Tous les sites</option>' +
        sites.filter(s => s.actif).map(s =>
          `<option value="${s.id}">${escapeHtml(s.nom)}</option>`
        ).join('');
      if (currentValue) select.value = currentValue;
    }
  });
}

// ==================== PARAMETRES CALENDRIER ====================

async function loadParametresCalendrier() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/calendrier/parametres', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const params = await response.json();

    document.getElementById('cal_pays').value = params.pays || 'FR';
    document.getElementById('cal_zone').value = params.zone_vacances || 'B';
    document.getElementById('cal_ouvert_feries').checked = params.ouvert_jours_feries;
    document.getElementById('cal_ouvert_vacances').checked = params.ouvert_vacances;

    // Toggle zone selon pays
    const pays = params.pays || 'FR';
    document.getElementById('zone-vacances-container').style.display = pays === 'FR' ? 'block' : 'none';
    document.getElementById('import-vacances-section').style.display = pays === 'FR' ? 'block' : 'none';
  } catch (error) {
    console.error('Erreur chargement parametres calendrier:', error);
  }
}

async function handleCalendrierSubmit(e) {
  e.preventDefault();

  const data = {
    pays: document.getElementById('cal_pays').value,
    zone_vacances: document.getElementById('cal_zone').value,
    ouvert_jours_feries: document.getElementById('cal_ouvert_feries').checked,
    ouvert_vacances: document.getElementById('cal_ouvert_vacances').checked
  };

  try {
    const token = getAuthToken();
    await fetch('/api/calendrier/parametres', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    Swal.fire({
      icon: 'success',
      title: 'Parametres enregistres',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible d\'enregistrer les parametres' });
  }
}

// ==================== FERMETURES ====================

async function loadFermetures() {
  try {
    const token = getAuthToken();
    const annee = document.getElementById('filter-fermetures-annee')?.value || new Date().getFullYear();
    const type = document.getElementById('filter-fermetures-type')?.value || '';
    const siteId = document.getElementById('filter-fermetures-site')?.value || '';

    let url = `/api/calendrier/fermetures?annee=${annee}`;
    if (type) url += `&type=${type}`;
    if (siteId) url += `&site_id=${siteId}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    fermetures = Array.isArray(data) ? data : [];
    renderFermetures();
    updateStats();
  } catch (error) {
    console.error('Erreur chargement fermetures:', error);
    fermetures = [];
    renderFermetures();
  }
}

function updateStats() {
  const feries = fermetures.filter(f => f.type === 'ferie').length;
  const vacances = fermetures.filter(f => f.type === 'vacances').length;
  const ponctuels = fermetures.filter(f => f.type === 'ponctuel').length;

  document.getElementById('count-feries').textContent = feries;
  document.getElementById('count-vacances').textContent = vacances;
  document.getElementById('count-ponctuels').textContent = ponctuels;

  // Calculer prochaine fermeture
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = fermetures
    .map(f => new Date(f.date_debut))
    .filter(d => d >= today)
    .sort((a, b) => a - b);

  if (upcoming.length > 0) {
    const diff = Math.ceil((upcoming[0] - today) / (1000 * 60 * 60 * 24));
    document.getElementById('count-prochaine').textContent = diff === 0 ? 'Aujourd\'hui' : diff;
  } else {
    document.getElementById('count-prochaine').textContent = '-';
  }
}

function renderFermetures() {
  const container = document.getElementById('liste-fermetures');

  if (fermetures.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-calendar-check display-4"></i>
        <p class="mt-2">Aucune fermeture pour cette periode</p>
      </div>
    `;
    return;
  }

  const typeBadges = {
    'ferie': 'bg-danger',
    'vacances': 'bg-warning text-dark',
    'ponctuel': 'bg-info',
    'autre': 'bg-secondary'
  };

  const typeLabels = {
    'ferie': 'Jour ferie',
    'vacances': 'Vacances',
    'ponctuel': 'Ponctuel',
    'autre': 'Autre'
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Motif</th>
            <th>Site</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${fermetures.map(f => {
            const site = sites.find(s => s.id === f.site_id);
            return `
              <tr>
                <td>
                  <span class="badge ${typeBadges[f.type] || 'bg-secondary'} fermeture-badge">
                    ${typeLabels[f.type] || f.type}
                    ${f.recurrent_annuel ? ' <i class="bi bi-arrow-repeat"></i>' : ''}
                  </span>
                </td>
                <td>
                  ${formatDate(f.date_debut)}
                  ${f.date_fin !== f.date_debut ? ` - ${formatDate(f.date_fin)}` : ''}
                </td>
                <td>${escapeHtml(f.motif || '-')}</td>
                <td>${site ? escapeHtml(site.nom) : '<em class="text-muted">Tous</em>'}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" onclick="editFermeture(${f.id})" title="Modifier">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteFermeture(${f.id})" title="Supprimer">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showModalFermeture(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalFermeture'));
  const form = document.getElementById('form-fermeture');
  form.reset();

  document.getElementById('fermeture_id').value = id || '';
  document.getElementById('modalFermetureTitle').textContent = id ? 'Modifier la fermeture' : 'Ajouter une fermeture';

  // Date par defaut = aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fermeture_date_debut').value = today;
  document.getElementById('fermeture_date_fin').value = today;

  modal.show();
}

function editFermeture(id) {
  const f = fermetures.find(x => x.id === id);
  if (!f) return;

  showModalFermeture(id);

  setTimeout(() => {
    document.getElementById('fermeture_site').value = f.site_id || '';
    document.getElementById('fermeture_date_debut').value = f.date_debut;
    document.getElementById('fermeture_date_fin').value = f.date_fin;
    document.getElementById('fermeture_motif').value = f.motif || '';
    document.getElementById('fermeture_type').value = f.type || 'ponctuel';
    document.getElementById('fermeture_recurrent').checked = f.recurrent_annuel;
  }, 100);
}

async function handleFermetureSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('fermeture_id').value;
  const data = {
    site_id: document.getElementById('fermeture_site').value || null,
    date_debut: document.getElementById('fermeture_date_debut').value,
    date_fin: document.getElementById('fermeture_date_fin').value,
    motif: document.getElementById('fermeture_motif').value,
    type: document.getElementById('fermeture_type').value,
    recurrent_annuel: document.getElementById('fermeture_recurrent').checked
  };

  try {
    const token = getAuthToken();
    const url = id ? `/api/calendrier/fermetures/${id}` : '/api/calendrier/fermetures';
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
      const error = await response.json();
      throw new Error(error.error || 'Erreur serveur');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalFermeture')).hide();
    await loadFermetures();

    Swal.fire({
      icon: 'success',
      title: id ? 'Fermeture modifiee' : 'Fermeture ajoutee',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

async function deleteFermeture(id) {
  const result = await Swal.fire({
    title: 'Supprimer cette fermeture ?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/calendrier/fermetures/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur suppression');

    await loadFermetures();

    Swal.fire({
      icon: 'success',
      title: 'Fermeture supprimee',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

// ==================== IMPORT ====================

async function importerJoursFeries() {
  const annee = document.getElementById('import_feries_annee').value;
  const pays = document.getElementById('cal_pays').value;

  try {
    const token = getAuthToken();

    Swal.fire({
      title: 'Import en cours...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const response = await fetch('/api/calendrier/jours-feries/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pays, annee })
    });

    const result = await response.json();

    if (result.success) {
      await loadFermetures();
      Swal.fire({
        icon: 'success',
        title: 'Import reussi',
        text: result.message
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: result.message
      });
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors de l\'import' });
  }
}

async function importerVacances() {
  const annee_scolaire = document.getElementById('import_vacances_annee').value;
  const zone = document.getElementById('cal_zone').value;

  try {
    const token = getAuthToken();

    Swal.fire({
      title: 'Import en cours...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const response = await fetch('/api/calendrier/vacances/import', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ zone, annee_scolaire })
    });

    const result = await response.json();

    if (result.success) {
      await loadFermetures();
      Swal.fire({
        icon: 'success',
        title: 'Import reussi',
        text: result.message
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: result.message
      });
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: 'Erreur lors de l\'import' });
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

// Export pour utilisation globale
window.initCalendrierPage = initCalendrierPage;
window.loadFermetures = loadFermetures;
window.showModalFermeture = showModalFermeture;
window.editFermeture = editFermeture;
window.deleteFermeture = deleteFermeture;
window.importerJoursFeries = importerJoursFeries;
window.importerVacances = importerVacances;
