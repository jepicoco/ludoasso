/**
 * Gestion des Structures
 * Page dediee aux structures (Bibliotheque, Ludotheque, etc.)
 */

let structures = [];
let organisations = [];
let utilisateursDisponibles = [];
let availableConnectors = { email: [], sms: [] };

// ==================== INITIALISATION ====================

async function initStructuresPage() {
  const token = getAuthToken();
  if (!token) {
    console.error('Token non disponible - redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  try {
    await Promise.all([
      loadStructures(),
      loadOrganisations(),
      loadUtilisateursDisponibles(),
      loadAvailableConnectors()
    ]);
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }

  // Event listeners
  document.getElementById('form-structure')?.addEventListener('submit', handleStructureSubmit);
  document.getElementById('form-add-acces')?.addEventListener('submit', handleAddAccesSubmit);
}

// ==================== STRUCTURES ====================

async function loadStructures() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/structures', {
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
    structures = Array.isArray(data) ? data : [];
    renderStructures();
    updateStats();
  } catch (error) {
    console.error('Erreur chargement structures:', error);
    structures = [];
    renderStructures();
  }
}

async function loadOrganisations() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/organisations?actif=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    organisations = Array.isArray(data) ? data : [];
    populateOrganisationSelect();
  } catch (error) {
    console.error('Erreur chargement organisations:', error);
    organisations = [];
  }
}

function populateOrganisationSelect() {
  const select = document.getElementById('structure_organisation_id');
  if (select) {
    select.innerHTML = '<option value="">Aucune organisation</option>' +
      organisations.map(o =>
        `<option value="${o.id}">${escapeHtml(o.nom)}${o.nom_court ? ' (' + escapeHtml(o.nom_court) + ')' : ''}</option>`
      ).join('');
  }
}

function updateStats() {
  const total = structures.length;
  const actives = structures.filter(s => s.actif).length;
  const totalSites = structures.reduce((sum, s) => sum + (s.stats?.sites || 0), 0);
  const totalArticles = structures.reduce((sum, s) => {
    const stats = s.stats || {};
    return sum + (stats.jeux || 0) + (stats.livres || 0) + (stats.films || 0) + (stats.disques || 0);
  }, 0);

  document.getElementById('count-structures').textContent = total;
  document.getElementById('count-actives').textContent = actives;
  document.getElementById('count-sites').textContent = totalSites;
  document.getElementById('count-articles').textContent = totalArticles;
}

const TYPE_STRUCTURE_LABELS = {
  bibliotheque: 'Bibliotheque',
  ludotheque: 'Ludotheque',
  mediatheque: 'Mediatheque',
  relais_petite_enfance: 'Relais Petite Enfance',
  enfance: 'Enfance',
  jeunesse: 'Jeunesse',
  culturel_sportif: 'Culturel et Sportif',
  autre: 'Autre'
};

function getTypeStructureLabel(type) {
  return TYPE_STRUCTURE_LABELS[type] || type || 'Ludotheque';
}

function renderStructures() {
  const container = document.getElementById('liste-structures');

  if (structures.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-diagram-3 display-1 text-muted"></i>
        <p class="text-muted mt-3">Aucune structure configuree</p>
        <button class="btn btn-primary" onclick="showModalStructure()">
          <i class="bi bi-plus-lg"></i> Creer la premiere structure
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = structures.map(structure => {
    const modules = structure.modules_actifs || [];
    const moduleBadges = modules.map(m => {
      const icons = { jeux: 'dice-6', livres: 'book', films: 'film', disques: 'disc' };
      const colors = { jeux: 'success', livres: 'primary', films: 'danger', disques: 'warning' };
      return `<span class="badge bg-${colors[m]} module-badge"><i class="bi bi-${icons[m]}"></i></span>`;
    }).join(' ');

    const stats = structure.stats || {};
    const totalArticles = (stats.jeux || 0) + (stats.livres || 0) + (stats.films || 0) + (stats.disques || 0);

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card structure-card h-100 ${!structure.actif ? 'opacity-50' : ''}" onclick="showModalStructure(${structure.id})">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <span class="color-preview" style="background-color: ${structure.couleur || '#007bff'}"></span>
                <span class="structure-badge" style="background-color: ${structure.couleur || '#007bff'}20; color: ${structure.couleur || '#007bff'}">
                  <i class="bi bi-${structure.icone || 'building'}"></i>
                  ${escapeHtml(structure.code)}
                </span>
              </div>
              ${!structure.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
            </div>

            <h5 class="card-title mb-1">${escapeHtml(structure.nom)}</h5>
            <p class="small text-muted mb-1">
              <span class="badge bg-light text-dark border">${getTypeStructureLabel(structure.type_structure)}</span>
              ${structure.organisation ? `<span class="ms-1"><i class="bi bi-building-gear"></i> ${escapeHtml(structure.organisation.nom)}</span>` : ''}
            </p>
            ${structure.description ? `<p class="small text-muted mb-2">${escapeHtml(structure.description)}</p>` : ''}

            <div class="mb-3">
              ${moduleBadges || '<span class="text-muted small">Aucun module</span>'}
            </div>

            <div class="row g-2 small text-muted mb-3">
              <div class="col-6 stat-item">
                <i class="bi bi-geo-alt"></i>
                ${stats.sites || 0} site${(stats.sites || 0) > 1 ? 's' : ''}
              </div>
              <div class="col-6 stat-item">
                <i class="bi bi-box-seam"></i>
                ${totalArticles} article${totalArticles > 1 ? 's' : ''}
              </div>
              <div class="col-6 stat-item">
                <i class="bi bi-arrow-left-right"></i>
                ${stats.emprunts_actifs || 0} emprunt${(stats.emprunts_actifs || 0) > 1 ? 's' : ''}
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); showModalAcces(${structure.id}, '${escapeHtml(structure.nom).replace(/'/g, "\\'")}')">
                <i class="bi bi-people"></i> Acces
              </button>
              <a class="btn btn-sm btn-outline-info" href="parametres-structure-connecteurs.html?id=${structure.id}" onclick="event.stopPropagation()">
                <i class="bi bi-envelope-at"></i> Connecteurs
              </a>
              <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); toggleStructure(${structure.id})" title="${structure.actif ? 'Desactiver' : 'Activer'}">
                <i class="bi bi-${structure.actif ? 'pause' : 'play'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteStructure(${structure.id})" title="Supprimer">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function showModalStructure(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalStructure'));
  const form = document.getElementById('form-structure');
  form.reset();

  // Elements du lien vers config fine
  const linkConfig = document.getElementById('link-config-connecteurs');
  const textSaveFirst = document.getElementById('text-save-first');

  if (id) {
    const structure = structures.find(s => s.id === id);
    if (!structure) return;

    document.getElementById('modalStructureTitle').textContent = 'Modifier la structure';
    document.getElementById('structure_id').value = structure.id;
    document.getElementById('structure_nom').value = structure.nom || '';
    document.getElementById('structure_code').value = structure.code || '';
    document.getElementById('structure_description').value = structure.description || '';
    document.getElementById('structure_organisation_id').value = structure.organisation_id || '';
    document.getElementById('structure_type_structure').value = structure.type_structure || 'ludotheque';
    document.getElementById('structure_adresse').value = structure.adresse || '';
    document.getElementById('structure_telephone').value = structure.telephone || '';
    document.getElementById('structure_email').value = structure.email || '';
    document.getElementById('structure_couleur').value = structure.couleur || '#007bff';
    document.getElementById('structure_icone').value = structure.icone || 'building';
    document.getElementById('structure_code_comptable').value = structure.code_comptable || '';
    document.getElementById('structure_actif').checked = structure.actif !== false;

    // Modules
    const modules = structure.modules_actifs || [];
    document.getElementById('module_jeux').checked = modules.includes('jeux');
    document.getElementById('module_livres').checked = modules.includes('livres');
    document.getElementById('module_films').checked = modules.includes('films');
    document.getElementById('module_disques').checked = modules.includes('disques');

    // Connecteurs par defaut
    const emailConnectorId = structure.configurationEmailDefaut?.id || structure.configuration_email_id || '';
    const smsConnectorId = structure.configurationSMSDefaut?.id || structure.configuration_sms_id || '';
    document.getElementById('structure_email_connector').value = emailConnectorId;
    document.getElementById('structure_sms_connector').value = smsConnectorId;

    // Afficher le lien vers config fine
    if (linkConfig) {
      linkConfig.href = `parametres-structure-connecteurs.html?id=${structure.id}`;
      linkConfig.classList.remove('d-none');
    }
    if (textSaveFirst) {
      textSaveFirst.classList.add('d-none');
    }
  } else {
    document.getElementById('modalStructureTitle').textContent = 'Nouvelle structure';
    document.getElementById('structure_id').value = '';
    document.getElementById('structure_couleur').value = '#007bff';
    document.getElementById('module_jeux').checked = true;
    document.getElementById('structure_email_connector').value = '';
    document.getElementById('structure_sms_connector').value = '';

    // Masquer le lien vers config fine (on ne peut pas y acceder avant sauvegarde)
    if (linkConfig) {
      linkConfig.classList.add('d-none');
    }
    if (textSaveFirst) {
      textSaveFirst.classList.remove('d-none');
    }
  }

  modal.show();
}

async function handleStructureSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('structure_id').value;
  const modules = [];
  if (document.getElementById('module_jeux').checked) modules.push('jeux');
  if (document.getElementById('module_livres').checked) modules.push('livres');
  if (document.getElementById('module_films').checked) modules.push('films');
  if (document.getElementById('module_disques').checked) modules.push('disques');

  const emailConnectorValue = document.getElementById('structure_email_connector').value;
  const smsConnectorValue = document.getElementById('structure_sms_connector').value;

  const data = {
    nom: document.getElementById('structure_nom').value.trim(),
    code: document.getElementById('structure_code').value.trim().toUpperCase(),
    description: document.getElementById('structure_description').value.trim() || null,
    organisation_id: document.getElementById('structure_organisation_id').value || null,
    type_structure: document.getElementById('structure_type_structure').value || 'ludotheque',
    adresse: document.getElementById('structure_adresse').value.trim() || null,
    telephone: document.getElementById('structure_telephone').value.trim() || null,
    email: document.getElementById('structure_email').value.trim() || null,
    couleur: document.getElementById('structure_couleur').value,
    icone: document.getElementById('structure_icone').value,
    code_comptable: document.getElementById('structure_code_comptable').value.trim() || null,
    modules_actifs: modules,
    actif: document.getElementById('structure_actif').checked,
    configuration_email_id: emailConnectorValue ? parseInt(emailConnectorValue) : null,
    configuration_sms_id: smsConnectorValue ? parseInt(smsConnectorValue) : null
  };

  try {
    const token = getAuthToken();
    const url = id ? `/api/structures/${id}` : '/api/structures';
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

    bootstrap.Modal.getInstance(document.getElementById('modalStructure')).hide();
    await loadStructures();

    Swal.fire({
      icon: 'success',
      title: id ? 'Structure modifiee' : 'Structure creee',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Erreur sauvegarde structure:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: error.message
    });
  }
}

async function deleteStructure(id) {
  const structure = structures.find(s => s.id === id);
  if (!structure) return;

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Supprimer la structure ?',
    html: `<strong>"${escapeHtml(structure.nom)}"</strong> sera definitivement supprimee.<br><br>
           <small class="text-muted">Note : la suppression n'est possible que si la structure ne contient aucune donnee (articles, emprunts, cotisations).</small>`,
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Erreur suppression');
    }

    await loadStructures();
    Swal.fire({ icon: 'success', title: 'Structure supprimee', timer: 1500, showConfirmButton: false });
  } catch (error) {
    console.error('Erreur suppression structure:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

async function toggleStructure(id) {
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur toggle');

    const result = await response.json();
    await loadStructures();

    Swal.fire({
      icon: 'success',
      title: result.message,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Erreur toggle structure:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

// ==================== ACCES UTILISATEURS ====================

async function loadUtilisateursDisponibles() {
  try {
    const token = getAuthToken();
    // Charger les utilisateurs page par page (limite max 100 par l'API)
    const response = await fetch('/api/utilisateurs?limit=100', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    utilisateursDisponibles = data.utilisateurs || data || [];
  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error);
    utilisateursDisponibles = [];
  }
}

async function loadAvailableConnectors() {
  try {
    const token = getAuthToken();
    const [emailRes, smsRes] = await Promise.all([
      fetch('/api/parametres/configurations-email', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/parametres/configurations-sms', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    if (emailRes.ok) {
      availableConnectors.email = await emailRes.json();
    }
    if (smsRes.ok) {
      availableConnectors.sms = await smsRes.json();
    }

    populateConnectorSelects();
  } catch (error) {
    console.error('Erreur chargement connecteurs:', error);
  }
}

function populateConnectorSelects() {
  const emailSelect = document.getElementById('structure_email_connector');
  const smsSelect = document.getElementById('structure_sms_connector');

  if (!emailSelect || !smsSelect) return;

  // Email options
  emailSelect.innerHTML = '<option value="">Defaut systeme</option>';
  availableConnectors.email.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.libelle || c.email_expediteur} (${c.email_expediteur})`;
    if (c.par_defaut) opt.textContent += ' - Defaut';
    emailSelect.appendChild(opt);
  });

  // SMS options
  smsSelect.innerHTML = '<option value="">Defaut systeme</option>';
  availableConnectors.sms.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.libelle || c.provider} (${c.provider})`;
    if (c.par_defaut) opt.textContent += ' - Defaut';
    smsSelect.appendChild(opt);
  });
}

async function showModalAcces(structureId, structureNom) {
  document.getElementById('acces_structure_id').value = structureId;
  document.getElementById('acces-structure-nom').textContent = structureNom;

  const modal = new bootstrap.Modal(document.getElementById('modalAcces'));
  modal.show();

  await loadAccesStructure(structureId);
}

async function loadAccesStructure(structureId) {
  const container = document.getElementById('liste-acces');
  container.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
    </div>
  `;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${structureId}/utilisateurs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const utilisateurs = await response.json();

    if (utilisateurs.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-people display-4"></i>
          <p class="mt-2">Aucun utilisateur n'a acces a cette structure</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Role structure</th>
            <th>Periode</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${utilisateurs.map(u => {
            const user = u.utilisateur || u;
            const roleLabel = u.role_structure || user.role || '-';
            const dateDebut = u.date_debut;
            const dateFin = u.date_fin;
            const periode = dateDebut || dateFin
              ? `${dateDebut || '...'} - ${dateFin || '...'}`
              : 'Permanent';

            return `
              <tr>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-person-circle text-muted"></i>
                    <div>
                      <strong>${escapeHtml(user.nom || '')} ${escapeHtml(user.prenom || '')}</strong>
                      <small class="d-block text-muted">${escapeHtml(user.email || '')}</small>
                    </div>
                  </div>
                </td>
                <td><span class="badge bg-secondary">${roleLabel}</span></td>
                <td class="small">${periode}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-danger" onclick="removeAcces(${structureId}, ${user.id})">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Erreur chargement acces:', error);
    container.innerHTML = `<div class="alert alert-danger">Erreur: ${error.message}</div>`;
  }
}

function showModalAddAcces() {
  const modal = new bootstrap.Modal(document.getElementById('modalAddAcces'));
  document.getElementById('form-add-acces').reset();

  // Populate select
  const select = document.getElementById('acces_utilisateur');
  select.innerHTML = '<option value="">Selectionner un utilisateur</option>';
  utilisateursDisponibles.forEach(u => {
    select.innerHTML += `<option value="${u.id}">${escapeHtml(u.nom || '')} ${escapeHtml(u.prenom || '')} - ${escapeHtml(u.email || '')}</option>`;
  });

  modal.show();
}

async function handleAddAccesSubmit(e) {
  e.preventDefault();

  const structureId = document.getElementById('acces_structure_id').value;
  const data = {
    utilisateur_id: parseInt(document.getElementById('acces_utilisateur').value),
    role_structure: document.getElementById('acces_role').value || null,
    date_debut: document.getElementById('acces_date_debut').value || null,
    date_fin: document.getElementById('acces_date_fin').value || null
  };

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${structureId}/utilisateurs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur ajout acces');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalAddAcces')).hide();
    await loadAccesStructure(structureId);

    Swal.fire({ icon: 'success', title: 'Acces ajoute', timer: 1500, showConfirmButton: false });
  } catch (error) {
    console.error('Erreur ajout acces:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

async function removeAcces(structureId, userId) {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Retirer l\'acces ?',
    text: 'L\'utilisateur ne pourra plus acceder a cette structure.',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Retirer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${structureId}/utilisateurs/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Erreur suppression');

    await loadAccesStructure(structureId);
    Swal.fire({ icon: 'success', title: 'Acces retire', timer: 1500, showConfirmButton: false });
  } catch (error) {
    console.error('Erreur suppression acces:', error);
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
window.initStructuresPage = initStructuresPage;
window.showModalStructure = showModalStructure;
window.deleteStructure = deleteStructure;
window.toggleStructure = toggleStructure;
window.showModalAcces = showModalAcces;
window.showModalAddAcces = showModalAddAcces;
window.removeAcces = removeAcces;
