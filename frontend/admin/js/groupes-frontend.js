/**
 * Gestion des Groupes Frontend (Portails publics)
 * Configuration des points d'entree du site public
 */

let groupes = [];
let structures = [];

// ==================== INITIALISATION ====================

async function initGroupesFrontendPage() {
  const token = getAuthToken();
  if (!token) {
    console.error('Token non disponible - redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  try {
    await Promise.all([
      loadGroupes(),
      loadStructures()
    ]);
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }

  // Event listeners
  document.getElementById('form-groupe')?.addEventListener('submit', handleGroupeSubmit);
}

// ==================== GROUPES FRONTEND ====================

async function loadGroupes() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/groupes-frontend', {
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
    groupes = Array.isArray(data) ? data : [];
    renderGroupes();
    updateStats();
  } catch (error) {
    console.error('Erreur chargement groupes:', error);
    groupes = [];
    renderGroupes();
  }
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
    populateGroupeStructures();
  } catch (error) {
    console.error('Erreur chargement structures:', error);
    structures = [];
  }
}

function updateStats() {
  const total = groupes.length;
  const actifs = groupes.filter(g => g.actif).length;
  const domaines = groupes.filter(g => g.domaine_personnalise).length;

  document.getElementById('count-groupes').textContent = total;
  document.getElementById('count-actifs').textContent = actifs;
  document.getElementById('count-domaines').textContent = domaines;
}

function renderGroupes() {
  const container = document.getElementById('liste-groupes');

  if (groupes.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-window-stack display-1 text-muted"></i>
        <p class="text-muted mt-3">Aucun portail public configure</p>
        <button class="btn btn-primary" onclick="showModalGroupe()">
          <i class="bi bi-plus-lg"></i> Creer le premier portail
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = groupes.map(groupe => {
    const structuresList = (groupe.structures || []).map(s => {
      return `<span class="structure-chip" style="background-color: ${s.couleur || '#6c757d'}20; color: ${s.couleur || '#6c757d'}">
        <i class="bi bi-${s.icone || 'building'}"></i>
        ${escapeHtml(s.code)}
      </span>`;
    }).join('');

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card groupe-card h-100 ${!groupe.actif ? 'opacity-50' : ''}" onclick="showModalGroupe(${groupe.id})">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge bg-info">${escapeHtml(groupe.code)}</span>
              <div>
                ${groupe.theme_code && groupe.theme_code !== 'default' ? `<span class="badge bg-secondary me-1">${escapeHtml(groupe.theme_code)}</span>` : ''}
                ${!groupe.actif ? '<span class="badge bg-warning text-dark">Inactif</span>' : ''}
              </div>
            </div>

            <h5 class="card-title mb-2">${escapeHtml(groupe.nom)}</h5>

            <!-- URLs -->
            <div class="mb-3">
              ${groupe.slug ? `
                <div class="mb-1">
                  <i class="bi bi-link-45deg text-muted"></i>
                  <span class="url-badge">/${escapeHtml(groupe.slug)}</span>
                </div>
              ` : ''}
              ${groupe.domaine_personnalise ? `
                <div>
                  <i class="bi bi-globe text-primary"></i>
                  <span class="url-badge">${escapeHtml(groupe.domaine_personnalise)}</span>
                </div>
              ` : ''}
              ${!groupe.slug && !groupe.domaine_personnalise ? `
                <span class="text-muted small"><i class="bi bi-exclamation-circle"></i> Aucune URL configuree</span>
              ` : ''}
            </div>

            <!-- Structures -->
            <div class="mb-3">
              <small class="text-muted d-block mb-1">Structures :</small>
              ${structuresList || '<span class="text-muted small">Aucune structure</span>'}
            </div>

            <!-- Actions -->
            <div class="d-flex flex-wrap gap-2">
              ${groupe.actif && (groupe.slug || groupe.domaine_personnalise) ? `
                <a href="${groupe.domaine_personnalise ? 'https://' + groupe.domaine_personnalise : '/' + groupe.slug + '/catalogue'}"
                   target="_blank" class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation()">
                  <i class="bi bi-box-arrow-up-right"></i> Voir
                </a>
              ` : ''}
              <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); toggleGroupe(${groupe.id})" title="${groupe.actif ? 'Desactiver' : 'Activer'}">
                <i class="bi bi-${groupe.actif ? 'pause' : 'play'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteGroupe(${groupe.id})" title="Supprimer">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populateGroupeStructures() {
  const container = document.getElementById('groupe-structures-checkboxes');
  if (!container) return;

  if (structures.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning mb-0">
          <i class="bi bi-exclamation-triangle"></i>
          Aucune structure active disponible.
          <a href="structures.html">Creez d'abord une structure</a>.
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = structures.map(s => `
    <div class="col-md-6 col-lg-4">
      <div class="form-check p-3 border rounded">
        <input type="checkbox" class="form-check-input groupe-structure-cb" id="groupe_struct_${s.id}" value="${s.id}">
        <label class="form-check-label d-flex align-items-center gap-2" for="groupe_struct_${s.id}">
          <span class="color-preview d-inline-block" style="width: 16px; height: 16px; border-radius: 4px; background-color: ${s.couleur || '#007bff'}"></span>
          <span>
            <strong>${escapeHtml(s.nom)}</strong>
            <small class="d-block text-muted">${escapeHtml(s.code)}</small>
          </span>
        </label>
      </div>
    </div>
  `).join('');
}

function showModalGroupe(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalGroupe'));
  const form = document.getElementById('form-groupe');
  form.reset();
  populateGroupeStructures();

  // Reset to first tab
  const firstTab = document.querySelector('#portalTabs .nav-link');
  if (firstTab) {
    bootstrap.Tab.getOrCreateInstance(firstTab).show();
  }

  if (id) {
    const groupe = groupes.find(g => g.id === id);
    if (!groupe) return;

    document.getElementById('modalGroupeTitle').textContent = 'Modifier le portail';
    document.getElementById('groupe_id').value = groupe.id;

    // Onglet General
    document.getElementById('groupe_nom').value = groupe.nom || '';
    document.getElementById('groupe_code').value = groupe.code || '';
    document.getElementById('groupe_slug').value = groupe.slug || '';
    document.getElementById('groupe_domaine').value = groupe.domaine_personnalise || '';
    document.getElementById('groupe_theme').value = groupe.theme_code || 'default';
    document.getElementById('groupe_actif').checked = groupe.actif !== false;

    // Onglet Identite
    document.getElementById('groupe_nom_affiche').value = groupe.nom_affiche || '';
    document.getElementById('groupe_logo').value = groupe.logo_url || '';
    document.getElementById('groupe_favicon').value = groupe.favicon_url || '';
    document.getElementById('groupe_meta_description').value = groupe.meta_description || '';

    // Onglet Contact
    document.getElementById('groupe_email_contact').value = groupe.email_contact || '';
    document.getElementById('groupe_telephone_contact').value = groupe.telephone_contact || '';

    // Onglet Maintenance
    document.getElementById('groupe_mode_maintenance').checked = groupe.mode_maintenance === true;
    document.getElementById('groupe_message_maintenance').value = groupe.message_maintenance || '';

    // Check structures
    const structureIds = (groupe.structures || []).map(s => s.id);
    document.querySelectorAll('.groupe-structure-cb').forEach(cb => {
      cb.checked = structureIds.includes(parseInt(cb.value));
    });
  } else {
    document.getElementById('modalGroupeTitle').textContent = 'Nouveau portail public';
    document.getElementById('groupe_id').value = '';
  }

  modal.show();
}

async function handleGroupeSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('groupe_id').value;
  const structureIds = Array.from(document.querySelectorAll('.groupe-structure-cb:checked'))
    .map(cb => parseInt(cb.value));

  const data = {
    // General
    nom: document.getElementById('groupe_nom').value.trim(),
    code: document.getElementById('groupe_code').value.trim().toUpperCase(),
    slug: document.getElementById('groupe_slug').value.trim() || null,
    domaine_personnalise: document.getElementById('groupe_domaine').value.trim() || null,
    theme_code: document.getElementById('groupe_theme').value,
    actif: document.getElementById('groupe_actif').checked,
    // Identite
    nom_affiche: document.getElementById('groupe_nom_affiche').value.trim() || null,
    logo_url: document.getElementById('groupe_logo').value.trim() || null,
    favicon_url: document.getElementById('groupe_favicon').value.trim() || null,
    meta_description: document.getElementById('groupe_meta_description').value.trim() || null,
    // Contact
    email_contact: document.getElementById('groupe_email_contact').value.trim() || null,
    telephone_contact: document.getElementById('groupe_telephone_contact').value.trim() || null,
    // Maintenance
    mode_maintenance: document.getElementById('groupe_mode_maintenance').checked,
    message_maintenance: document.getElementById('groupe_message_maintenance').value.trim() || null,
    // Structures
    structure_ids: structureIds
  };

  // Validation
  if (structureIds.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Attention',
      text: 'Selectionnez au moins une structure pour ce portail.'
    });
    return;
  }

  try {
    const token = getAuthToken();
    const url = id ? `/api/groupes-frontend/${id}` : '/api/groupes-frontend';
    const method = id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Erreur HTTP ${response.status}`);
    }

    bootstrap.Modal.getInstance(document.getElementById('modalGroupe')).hide();
    await loadGroupes();

    Swal.fire({
      icon: 'success',
      title: id ? 'Portail modifie' : 'Portail cree',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Erreur sauvegarde groupe:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: error.message
    });
  }
}

async function deleteGroupe(id) {
  const groupe = groupes.find(g => g.id === id);
  if (!groupe) return;

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Supprimer le portail ?',
    html: `<strong>"${escapeHtml(groupe.nom)}"</strong> sera definitivement supprime.`,
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/groupes-frontend/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur suppression');

    await loadGroupes();
    Swal.fire({ icon: 'success', title: 'Portail supprime', timer: 1500, showConfirmButton: false });
  } catch (error) {
    console.error('Erreur suppression groupe:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

async function toggleGroupe(id) {
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/groupes-frontend/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur toggle');

    const result = await response.json();
    await loadGroupes();

    Swal.fire({
      icon: 'success',
      title: result.message,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Erreur toggle groupe:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

// ==================== UTILITAIRES ====================

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export pour utilisation globale
window.initGroupesFrontendPage = initGroupesFrontendPage;
window.showModalGroupe = showModalGroupe;
window.deleteGroupe = deleteGroupe;
window.toggleGroupe = toggleGroupe;
