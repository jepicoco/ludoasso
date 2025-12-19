/**
 * Gestion des Organisations
 * Page dediee aux organisations (associations, collectivites, entreprises)
 */

let organisations = [];
let availableConnectors = { email: [], sms: [] };

// Types d'organisation avec labels et icones
const typeOrganisations = {
  association: { label: 'Association', icon: 'people', color: 'success' },
  collectivite: { label: 'Collectivite', icon: 'bank2', color: 'primary' },
  entreprise: { label: 'Entreprise', icon: 'briefcase', color: 'warning' },
  autre: { label: 'Autre', icon: 'building', color: 'secondary' }
};

// ==================== INITIALISATION ====================

async function initOrganisationsPage() {
  const token = getAuthToken();
  if (!token) {
    console.error('Token non disponible - redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  // Initialiser les jours du selecteur
  initDaysSelect();

  try {
    await Promise.all([
      loadOrganisations(),
      loadAvailableConnectors()
    ]);
  } catch (error) {
    console.error('Erreur initialisation:', error);
  }

  // Event listeners
  document.getElementById('form-organisation')?.addEventListener('submit', handleOrganisationSubmit);

  // Auto-extraire SIREN du SIRET
  document.getElementById('organisation_siret')?.addEventListener('input', function () {
    const siret = this.value.replace(/\s/g, '');
    const sirenField = document.getElementById('organisation_siren');
    if (sirenField) {
      sirenField.value = siret.length >= 9 ? siret.substring(0, 9) : '';
    }
  });

  // Adapter les champs selon le type
  document.getElementById('organisation_type')?.addEventListener('change', adaptFieldsToType);
}

function initDaysSelect() {
  const daySelect = document.getElementById('organisation_debut_exercice_jour');
  if (daySelect) {
    for (let i = 2; i <= 31; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i;
      daySelect.appendChild(opt);
    }
  }
}

function adaptFieldsToType() {
  const type = document.getElementById('organisation_type').value;

  // Champs specifiques associations
  const associationFields = ['field-rna', 'field-agrement', 'field-prefecture', 'field-jo'];
  associationFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = type === 'association' ? 'block' : 'none';
  });

  // Champs specifiques collectivites
  const collectiviteFields = ['field-insee'];
  collectiviteFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = type === 'collectivite' ? 'block' : 'none';
  });
}

// ==================== ORGANISATIONS ====================

async function loadOrganisations() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/organisations', {
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
    organisations = Array.isArray(data) ? data : [];
    renderOrganisations();
    updateStats();
  } catch (error) {
    console.error('Erreur chargement organisations:', error);
    organisations = [];
    renderOrganisations();
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
  const emailSelect = document.getElementById('organisation_email_connector');
  const smsSelect = document.getElementById('organisation_sms_connector');

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

function updateStats() {
  const total = organisations.length;
  const actives = organisations.filter(o => o.actif).length;
  const totalStructures = organisations.reduce((sum, o) => sum + (o.structures?.length || 0), 0);

  document.getElementById('count-organisations').textContent = total;
  document.getElementById('count-actives').textContent = actives;
  document.getElementById('count-structures').textContent = totalStructures;
}

function renderOrganisations() {
  const container = document.getElementById('liste-organisations');

  if (organisations.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-building-gear display-1 text-muted"></i>
        <p class="text-muted mt-3">Aucune organisation configuree</p>
        <button class="btn btn-primary" onclick="showModalOrganisation()">
          <i class="bi bi-plus-lg"></i> Creer la premiere organisation
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = organisations.map(org => {
    const typeInfo = typeOrganisations[org.type_organisation] || typeOrganisations.autre;
    const structuresCount = org.structures?.length || 0;

    // Informations affichees
    const infos = [];
    if (org.siret) infos.push({ icon: 'file-text', label: 'SIRET', value: formatSiret(org.siret) });
    if (org.rna) infos.push({ icon: 'file-earmark', label: 'RNA', value: org.rna });
    if (org.ville) infos.push({ icon: 'geo-alt', label: '', value: org.ville });
    if (org.email) infos.push({ icon: 'envelope', label: '', value: org.email });

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card organisation-card h-100 ${!org.actif ? 'opacity-50' : ''}" onclick="showModalOrganisation(${org.id})">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div class="d-flex align-items-center gap-2">
                <span class="color-preview" style="background-color: ${org.couleur_primaire || '#007bff'}"></span>
                <span class="badge bg-${typeInfo.color} type-badge">
                  <i class="bi bi-${typeInfo.icon}"></i> ${typeInfo.label}
                </span>
              </div>
              ${!org.actif ? '<span class="badge bg-secondary">Inactif</span>' : ''}
            </div>

            <h5 class="card-title mb-1">${escapeHtml(org.nom)}</h5>
            ${org.nom_court ? `<p class="small text-muted mb-2">(${escapeHtml(org.nom_court)})</p>` : ''}

            <div class="mb-3 small">
              ${infos.slice(0, 3).map(info => `
                <div class="stat-item text-muted mb-1">
                  <i class="bi bi-${info.icon}"></i>
                  ${info.label ? `<span class="info-label">${info.label}:</span>` : ''}
                  ${escapeHtml(info.value)}
                </div>
              `).join('')}
            </div>

            <div class="d-flex align-items-center gap-2 mb-3">
              <i class="bi bi-diagram-3 text-purple"></i>
              <span class="small">${structuresCount} structure${structuresCount > 1 ? 's' : ''} rattachee${structuresCount > 1 ? 's' : ''}</span>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <a class="btn btn-sm btn-outline-purple" href="structures.html?organisation=${org.id}" onclick="event.stopPropagation()">
                <i class="bi bi-diagram-3"></i> Structures
              </a>
              <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); toggleOrganisation(${org.id})" title="${org.actif ? 'Desactiver' : 'Activer'}">
                <i class="bi bi-${org.actif ? 'pause' : 'play'}"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteOrganisation(${org.id})" title="Supprimer">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function showModalOrganisation(id = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalOrganisation'));
  const form = document.getElementById('form-organisation');
  form.reset();

  // Reinitialiser les onglets au premier
  const firstTab = document.querySelector('#modalOrganisation .nav-link');
  if (firstTab) {
    new bootstrap.Tab(firstTab).show();
  }

  if (id) {
    const org = organisations.find(o => o.id === id);
    if (!org) return;

    document.getElementById('modalOrganisationTitle').textContent = 'Modifier l\'organisation';
    document.getElementById('organisation_id').value = org.id;

    // Identification
    document.getElementById('organisation_nom').value = org.nom || '';
    document.getElementById('organisation_nom_court').value = org.nom_court || '';
    document.getElementById('organisation_type').value = org.type_organisation || 'association';
    document.getElementById('organisation_couleur').value = org.couleur_primaire || '#007bff';
    document.getElementById('organisation_actif').checked = org.actif !== false;
    document.getElementById('organisation_logo').value = org.logo_url || '';

    // Identifiants legaux
    document.getElementById('organisation_siret').value = org.siret || '';
    document.getElementById('organisation_siren').value = org.siren || '';
    document.getElementById('organisation_rna').value = org.rna || '';
    document.getElementById('organisation_code_ape').value = org.code_ape || '';
    document.getElementById('organisation_numero_tva').value = org.numero_tva || '';
    document.getElementById('organisation_numero_agrement').value = org.numero_agrement || '';
    document.getElementById('organisation_prefecture').value = org.prefecture_declaration || '';
    document.getElementById('organisation_date_jo').value = org.date_publication_jo || '';
    document.getElementById('organisation_date_creation').value = org.date_creation || '';
    document.getElementById('organisation_code_insee').value = org.code_insee || '';

    // Coordonnees
    document.getElementById('organisation_adresse').value = org.adresse || '';
    document.getElementById('organisation_code_postal').value = org.code_postal || '';
    document.getElementById('organisation_ville').value = org.ville || '';
    document.getElementById('organisation_pays').value = org.pays || 'FR';
    document.getElementById('organisation_email').value = org.email || '';
    document.getElementById('organisation_telephone').value = org.telephone || '';
    document.getElementById('organisation_site_web').value = org.site_web || '';

    // Representant
    document.getElementById('organisation_representant_nom').value = org.representant_nom || '';
    document.getElementById('organisation_representant_fonction').value = org.representant_fonction || '';
    document.getElementById('organisation_representant_email').value = org.representant_email || '';

    // Comptabilite
    document.getElementById('organisation_regime_tva').value = org.regime_tva || 'non_assujetti';
    document.getElementById('organisation_code_comptable').value = org.code_comptable || '';
    document.getElementById('organisation_debut_exercice_jour').value = org.debut_exercice_jour || 1;
    document.getElementById('organisation_debut_exercice_mois').value = org.debut_exercice_mois || 1;

    // Connecteurs
    document.getElementById('organisation_email_connector').value = org.configuration_email_id || '';
    document.getElementById('organisation_sms_connector').value = org.configuration_sms_id || '';
  } else {
    document.getElementById('modalOrganisationTitle').textContent = 'Nouvelle organisation';
    document.getElementById('organisation_id').value = '';
    document.getElementById('organisation_couleur').value = '#007bff';
    document.getElementById('organisation_type').value = 'association';
    document.getElementById('organisation_pays').value = 'FR';
    document.getElementById('organisation_regime_tva').value = 'non_assujetti';
  }

  // Adapter les champs selon le type
  adaptFieldsToType();

  modal.show();
}

async function handleOrganisationSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('organisation_id').value;

  const emailConnectorValue = document.getElementById('organisation_email_connector').value;
  const smsConnectorValue = document.getElementById('organisation_sms_connector').value;

  const data = {
    nom: document.getElementById('organisation_nom').value.trim(),
    nom_court: document.getElementById('organisation_nom_court').value.trim() || null,
    type_organisation: document.getElementById('organisation_type').value,
    couleur_primaire: document.getElementById('organisation_couleur').value,
    actif: document.getElementById('organisation_actif').checked,
    logo_url: document.getElementById('organisation_logo').value.trim() || null,

    // Identifiants legaux
    siret: document.getElementById('organisation_siret').value.replace(/\s/g, '') || null,
    rna: document.getElementById('organisation_rna').value.trim() || null,
    code_ape: document.getElementById('organisation_code_ape').value.trim() || null,
    numero_tva: document.getElementById('organisation_numero_tva').value.trim() || null,
    numero_agrement: document.getElementById('organisation_numero_agrement').value.trim() || null,
    prefecture_declaration: document.getElementById('organisation_prefecture').value.trim() || null,
    date_publication_jo: document.getElementById('organisation_date_jo').value || null,
    date_creation: document.getElementById('organisation_date_creation').value || null,
    code_insee: document.getElementById('organisation_code_insee').value.trim() || null,

    // Coordonnees
    adresse: document.getElementById('organisation_adresse').value.trim() || null,
    code_postal: document.getElementById('organisation_code_postal').value.trim() || null,
    ville: document.getElementById('organisation_ville').value.trim() || null,
    pays: document.getElementById('organisation_pays').value,
    email: document.getElementById('organisation_email').value.trim() || null,
    telephone: document.getElementById('organisation_telephone').value.trim() || null,
    site_web: document.getElementById('organisation_site_web').value.trim() || null,

    // Representant
    representant_nom: document.getElementById('organisation_representant_nom').value.trim() || null,
    representant_fonction: document.getElementById('organisation_representant_fonction').value.trim() || null,
    representant_email: document.getElementById('organisation_representant_email').value.trim() || null,

    // Comptabilite
    regime_tva: document.getElementById('organisation_regime_tva').value,
    code_comptable: document.getElementById('organisation_code_comptable').value.trim() || null,
    debut_exercice_jour: parseInt(document.getElementById('organisation_debut_exercice_jour').value) || 1,
    debut_exercice_mois: parseInt(document.getElementById('organisation_debut_exercice_mois').value) || 1,

    // Connecteurs
    configuration_email_id: emailConnectorValue ? parseInt(emailConnectorValue) : null,
    configuration_sms_id: smsConnectorValue ? parseInt(smsConnectorValue) : null
  };

  try {
    const token = getAuthToken();
    const url = id ? `/api/organisations/${id}` : '/api/organisations';
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

    bootstrap.Modal.getInstance(document.getElementById('modalOrganisation')).hide();
    await loadOrganisations();

    Swal.fire({
      icon: 'success',
      title: id ? 'Organisation modifiee' : 'Organisation creee',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Erreur sauvegarde organisation:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: error.message
    });
  }
}

async function deleteOrganisation(id) {
  const org = organisations.find(o => o.id === id);
  if (!org) return;

  const structuresCount = org.structures?.length || 0;
  const warningText = structuresCount > 0
    ? `<br><br><span class="text-danger"><i class="bi bi-exclamation-triangle"></i> Cette organisation a ${structuresCount} structure(s) rattachee(s) qui seront dissociees.</span>`
    : '';

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Supprimer l\'organisation ?',
    html: `<strong>"${escapeHtml(org.nom)}"</strong> sera definitivement supprimee.${warningText}`,
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/organisations/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Erreur suppression');
    }

    await loadOrganisations();
    Swal.fire({ icon: 'success', title: 'Organisation supprimee', timer: 1500, showConfirmButton: false });
  } catch (error) {
    console.error('Erreur suppression organisation:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

async function toggleOrganisation(id) {
  const org = organisations.find(o => o.id === id);
  if (!org) return;

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/organisations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ actif: !org.actif })
    });

    if (!response.ok) throw new Error('Erreur toggle');

    await loadOrganisations();

    Swal.fire({
      icon: 'success',
      title: org.actif ? 'Organisation desactivee' : 'Organisation activee',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Erreur toggle organisation:', error);
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

// ==================== UTILITAIRES ====================

function formatSiret(siret) {
  if (!siret) return '';
  // Format: XXX XXX XXX XXXXX
  return siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Export pour utilisation globale
window.initOrganisationsPage = initOrganisationsPage;
window.showModalOrganisation = showModalOrganisation;
window.deleteOrganisation = deleteOrganisation;
window.toggleOrganisation = toggleOrganisation;
