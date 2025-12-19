/**
 * Gestion des Structures et Groupes Frontend
 * Multi-structures V0.9
 */

let structures = [];
let groupes = [];
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
      loadGroupes(),
      loadUtilisateursDisponibles(),
      loadAvailableConnectors()
    ]);
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }

  // Event listeners
  document.getElementById('form-structure').addEventListener('submit', handleStructureSubmit);
  document.getElementById('form-groupe').addEventListener('submit', handleGroupeSubmit);
  document.getElementById('form-add-acces').addEventListener('submit', handleAddAccesSubmit);
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
    document.getElementById('count-structures').textContent = structures.length;
    populateGroupeStructures();
  } catch (error) {
    console.error('Erreur chargement structures:', error);
    structures = [];
    renderStructures();
  }
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

            <h5 class="card-title">${escapeHtml(structure.nom)}</h5>
            ${structure.organisation_nom ? `<p class="small text-muted mb-1">${escapeHtml(structure.organisation_nom)}</p>` : ''}
            ${structure.description ? `<p class="small text-muted mb-2">${escapeHtml(structure.description)}</p>` : ''}

            <div class="mb-2">
              ${moduleBadges || '<span class="text-muted small">Aucun module</span>'}
            </div>

            <div class="row g-2 small text-muted">
              ${structure.stats ? `
                <div class="col-6 stat-item">
                  <i class="bi bi-people"></i>
                  ${structure.stats.utilisateurs || 0} utilisateurs
                </div>
                <div class="col-6 stat-item">
                  <i class="bi bi-geo-alt"></i>
                  ${structure.stats.sites || 0} sites
                </div>
              ` : ''}
            </div>

            <div class="mt-3 d-flex flex-wrap gap-2">
              <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); showModalAcces(${structure.id}, '${escapeHtml(structure.nom)}')">
                <i class="bi bi-people"></i> Acces
              </button>
              <a class="btn btn-sm btn-outline-info" href="parametres-structure-connecteurs.html?id=${structure.id}" onclick="event.stopPropagation()">
                <i class="bi bi-envelope-at"></i> Connecteurs
              </a>
              <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); toggleStructure(${structure.id})">
                <i class="bi bi-${structure.actif ? 'pause' : 'play'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteStructure(${structure.id})">
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
    document.getElementById('structure_organisation_nom').value = structure.organisation_nom || '';
    document.getElementById('structure_siret').value = structure.siret || '';
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
    organisation_nom: document.getElementById('structure_organisation_nom').value.trim() || null,
    siret: document.getElementById('structure_siret').value.trim() || null,
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
    text: `"${structure.nom}" sera definitivement supprimee`,
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
      throw new Error(error.error || 'Erreur suppression');
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

    await loadStructures();
  } catch (error) {
    console.error('Erreur toggle structure:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

// ==================== ACCES UTILISATEURS ====================

async function loadUtilisateursDisponibles() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/utilisateurs?limit=1000', {
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
      fetch('/api/configurations-email?actif=true', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/configurations-sms?actif=true', { headers: { 'Authorization': `Bearer ${token}` } })
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
            const roleLabel = u.UtilisateurStructure?.role_structure || u.role || '-';
            const dateDebut = u.UtilisateurStructure?.date_debut;
            const dateFin = u.UtilisateurStructure?.date_fin;
            const periode = dateDebut || dateFin
              ? `${dateDebut || '...'} - ${dateFin || '...'}`
              : 'Permanent';

            return `
              <tr>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-person-circle text-muted"></i>
                    <div>
                      <strong>${escapeHtml(u.nom || '')} ${escapeHtml(u.prenom || '')}</strong>
                      <small class="d-block text-muted">${escapeHtml(u.email || '')}</small>
                    </div>
                  </div>
                </td>
                <td><span class="badge bg-secondary">${roleLabel}</span></td>
                <td class="small">${periode}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-danger" onclick="removeAcces(${structureId}, ${u.id})">
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
  } catch (error) {
    console.error('Erreur suppression acces:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

// ==================== GROUPES FRONTEND ====================

async function loadGroupes() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/groupes-frontend', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    groupes = Array.isArray(data) ? data : [];
    renderGroupes();
    document.getElementById('count-groupes').textContent = groupes.length;
  } catch (error) {
    console.error('Erreur chargement groupes:', error);
    groupes = [];
    renderGroupes();
  }
}

function renderGroupes() {
  const container = document.getElementById('liste-groupes');

  if (groupes.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-collection display-1 text-muted"></i>
        <p class="text-muted mt-3">Aucun groupe frontend configure</p>
        <button class="btn btn-primary" onclick="showModalGroupe()">
          <i class="bi bi-plus-lg"></i> Creer le premier groupe
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = groupes.map(groupe => {
    const structuresList = (groupe.structures || [])
      .map(s => `<span class="badge bg-secondary me-1">${escapeHtml(s.code)}</span>`)
      .join('');

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card structure-card h-100 ${!groupe.actif ? 'opacity-50' : ''}" onclick="showModalGroupe(${groupe.id})">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge bg-info">${escapeHtml(groupe.code)}</span>
              ${!groupe.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
            </div>

            <h5 class="card-title">${escapeHtml(groupe.nom)}</h5>
            ${groupe.slug ? `<p class="small text-muted mb-1"><i class="bi bi-link-45deg"></i> /${escapeHtml(groupe.slug)}</p>` : ''}
            ${groupe.domaine_personnalise ? `<p class="small text-muted mb-1"><i class="bi bi-globe"></i> ${escapeHtml(groupe.domaine_personnalise)}</p>` : ''}

            <div class="mb-2">
              <strong class="small">Structures:</strong><br>
              ${structuresList || '<span class="text-muted small">Aucune</span>'}
            </div>

            <div class="mt-3 d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); toggleGroupe(${groupe.id})">
                <i class="bi bi-${groupe.actif ? 'pause' : 'play'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteGroupe(${groupe.id})">
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

  container.innerHTML = structures.map(s => `
    <div class="form-check">
      <input type="checkbox" class="form-check-input groupe-structure-cb" id="groupe_struct_${s.id}" value="${s.id}">
      <label class="form-check-label" for="groupe_struct_${s.id}">
        <span class="color-preview d-inline-block me-1" style="width: 12px; height: 12px; background-color: ${s.couleur || '#007bff'}"></span>
        ${escapeHtml(s.nom)} (${escapeHtml(s.code)})
      </label>
    </div>
  `).join('');
}

function showModalGroupe(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalGroupe'));
  const form = document.getElementById('form-groupe');
  form.reset();
  populateGroupeStructures();

  if (id) {
    const groupe = groupes.find(g => g.id === id);
    if (!groupe) return;

    document.getElementById('modalGroupeTitle').textContent = 'Modifier le groupe';
    document.getElementById('groupe_id').value = groupe.id;
    document.getElementById('groupe_nom').value = groupe.nom || '';
    document.getElementById('groupe_code').value = groupe.code || '';
    document.getElementById('groupe_slug').value = groupe.slug || '';
    document.getElementById('groupe_domaine').value = groupe.domaine_personnalise || '';
    document.getElementById('groupe_theme').value = groupe.theme_code || 'default';
    document.getElementById('groupe_logo').value = groupe.logo_url || '';
    document.getElementById('groupe_actif').checked = groupe.actif !== false;

    // Check structures
    const structureIds = (groupe.structures || []).map(s => s.id);
    document.querySelectorAll('.groupe-structure-cb').forEach(cb => {
      cb.checked = structureIds.includes(parseInt(cb.value));
    });
  } else {
    document.getElementById('modalGroupeTitle').textContent = 'Nouveau groupe frontend';
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
    nom: document.getElementById('groupe_nom').value.trim(),
    code: document.getElementById('groupe_code').value.trim().toUpperCase(),
    slug: document.getElementById('groupe_slug').value.trim() || null,
    domaine_personnalise: document.getElementById('groupe_domaine').value.trim() || null,
    theme_code: document.getElementById('groupe_theme').value,
    logo_url: document.getElementById('groupe_logo').value.trim() || null,
    structure_ids: structureIds,
    actif: document.getElementById('groupe_actif').checked
  };

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
      title: id ? 'Groupe modifie' : 'Groupe cree',
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
    title: 'Supprimer le groupe ?',
    text: `"${groupe.nom}" sera definitivement supprime`,
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
    Swal.fire({ icon: 'success', title: 'Groupe supprime', timer: 1500, showConfirmButton: false });
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

    await loadGroupes();
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
window.initStructuresPage = initStructuresPage;
window.showModalStructure = showModalStructure;
window.deleteStructure = deleteStructure;
window.toggleStructure = toggleStructure;
window.showModalAcces = showModalAcces;
window.showModalAddAcces = showModalAddAcces;
window.removeAcces = removeAcces;
window.showModalGroupe = showModalGroupe;
window.deleteGroupe = deleteGroupe;
window.toggleGroupe = toggleGroupe;
