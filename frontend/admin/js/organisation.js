/**
 * Gestion de la page Organisation
 * Formulaire de saisie/modification des informations de l'organisation
 */

let currentOrganisation = null;
let connecteurs = { email: [], sms: [] };

// ==================== INITIALISATION ====================

async function initOrganisationPage() {
  const token = getAuthToken();
  if (!token) {
    console.error('Token non disponible - redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  try {
    // Charger les connecteurs et l'organisation en parallele
    await Promise.all([
      loadConnecteurs(),
      loadOrganisation()
    ]);

    // Afficher le formulaire
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('form-organisation').style.display = 'block';

    // Event listeners
    document.getElementById('org_type').addEventListener('change', toggleTypeSections);
    document.getElementById('org_couleur').addEventListener('input', updateCouleurPreview);
    document.getElementById('form-organisation').addEventListener('submit', (e) => {
      e.preventDefault();
      saveOrganisation();
    });

    // Initial state
    toggleTypeSections();
  } catch (error) {
    console.error('Erreur initialisation:', error);
    document.getElementById('loading-spinner').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i>
        Erreur lors du chargement: ${error.message}
      </div>
    `;
  }
}

// ==================== CHARGEMENT ====================

async function loadConnecteurs() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/organisations/connecteurs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    connecteurs = await response.json();
    populateConnecteurSelects();
  } catch (error) {
    console.error('Erreur chargement connecteurs:', error);
    connecteurs = { email: [], sms: [] };
  }
}

function populateConnecteurSelects() {
  const emailSelect = document.getElementById('org_email_config');
  const smsSelect = document.getElementById('org_sms_config');

  // Email configs
  emailSelect.innerHTML = '<option value="">Aucun connecteur</option>' +
    connecteurs.email.map(c =>
      `<option value="${c.id}">${escapeHtml(c.nom)}${c.par_defaut ? ' (defaut)' : ''}</option>`
    ).join('');

  // SMS configs
  smsSelect.innerHTML = '<option value="">Aucun connecteur</option>' +
    connecteurs.sms.map(c =>
      `<option value="${c.id}">${escapeHtml(c.nom)} (${c.provider})${c.par_defaut ? ' (defaut)' : ''}</option>`
    ).join('');
}

async function loadOrganisation() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/organisations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const organisations = await response.json();

    // Prendre la premiere organisation (ou null si aucune)
    if (organisations.length > 0) {
      currentOrganisation = organisations[0];
      fillForm(currentOrganisation);
      renderStructures(currentOrganisation.structures || []);
    } else {
      currentOrganisation = null;
      renderStructures([]);
    }
  } catch (error) {
    console.error('Erreur chargement organisation:', error);
    currentOrganisation = null;
  }
}

// ==================== FORMULAIRE ====================

function fillForm(org) {
  document.getElementById('org_id').value = org.id || '';
  document.getElementById('org_nom').value = org.nom || '';
  document.getElementById('org_nom_court').value = org.nom_court || '';
  document.getElementById('org_type').value = org.type_organisation || 'association';
  document.getElementById('org_date_creation').value = org.date_creation || '';
  document.getElementById('org_actif').checked = org.actif !== false;

  // Identifiants legaux
  document.getElementById('org_siret').value = formatSiretDisplay(org.siret) || '';
  document.getElementById('org_rna').value = org.rna || '';
  document.getElementById('org_code_ape').value = org.code_ape || '';
  document.getElementById('org_numero_tva').value = org.numero_tva || '';
  document.getElementById('org_numero_agrement').value = org.numero_agrement || '';

  // Associations
  document.getElementById('org_prefecture').value = org.prefecture_declaration || '';
  document.getElementById('org_date_jo').value = org.date_publication_jo || '';

  // Collectivites
  document.getElementById('org_code_insee').value = org.code_insee || '';

  // Adresse
  document.getElementById('org_adresse').value = org.adresse || '';
  document.getElementById('org_code_postal').value = org.code_postal || '';
  document.getElementById('org_ville').value = org.ville || '';
  document.getElementById('org_pays').value = org.pays || 'FR';

  // Contact
  document.getElementById('org_email').value = org.email || '';
  document.getElementById('org_telephone').value = org.telephone || '';
  document.getElementById('org_site_web').value = org.site_web || '';

  // Representant
  document.getElementById('org_representant_nom').value = org.representant_nom || '';
  document.getElementById('org_representant_fonction').value = org.representant_fonction || '';
  document.getElementById('org_representant_email').value = org.representant_email || '';

  // Comptabilite
  document.getElementById('org_regime_tva').value = org.regime_tva || 'non_assujetti';
  document.getElementById('org_exercice_jour').value = org.debut_exercice_jour || 1;
  document.getElementById('org_exercice_mois').value = org.debut_exercice_mois || 1;
  document.getElementById('org_code_comptable').value = org.code_comptable || '';

  // Identite visuelle
  document.getElementById('org_logo_url').value = org.logo_url || '';
  document.getElementById('org_couleur').value = org.couleur_primaire || '#007bff';
  previewLogo();
  updateCouleurPreview();

  // Connecteurs
  document.getElementById('org_email_config').value = org.configuration_email_id || '';
  document.getElementById('org_sms_config').value = org.configuration_sms_id || '';

  // Afficher les bonnes sections selon le type
  toggleTypeSections();
}

function collectFormData() {
  return {
    nom: document.getElementById('org_nom').value.trim(),
    nom_court: document.getElementById('org_nom_court').value.trim() || null,
    type_organisation: document.getElementById('org_type').value,
    date_creation: document.getElementById('org_date_creation').value || null,
    actif: document.getElementById('org_actif').checked,

    siret: document.getElementById('org_siret').value.replace(/\s/g, '') || null,
    rna: document.getElementById('org_rna').value.trim() || null,
    code_ape: document.getElementById('org_code_ape').value.trim() || null,
    numero_tva: document.getElementById('org_numero_tva').value.trim() || null,
    numero_agrement: document.getElementById('org_numero_agrement').value.trim() || null,

    prefecture_declaration: document.getElementById('org_prefecture').value.trim() || null,
    date_publication_jo: document.getElementById('org_date_jo').value || null,
    code_insee: document.getElementById('org_code_insee').value.trim() || null,

    adresse: document.getElementById('org_adresse').value.trim() || null,
    code_postal: document.getElementById('org_code_postal').value.trim() || null,
    ville: document.getElementById('org_ville').value.trim() || null,
    pays: document.getElementById('org_pays').value,

    email: document.getElementById('org_email').value.trim() || null,
    telephone: document.getElementById('org_telephone').value.trim() || null,
    site_web: document.getElementById('org_site_web').value.trim() || null,

    representant_nom: document.getElementById('org_representant_nom').value.trim() || null,
    representant_fonction: document.getElementById('org_representant_fonction').value.trim() || null,
    representant_email: document.getElementById('org_representant_email').value.trim() || null,

    regime_tva: document.getElementById('org_regime_tva').value,
    debut_exercice_jour: parseInt(document.getElementById('org_exercice_jour').value) || 1,
    debut_exercice_mois: parseInt(document.getElementById('org_exercice_mois').value) || 1,
    code_comptable: document.getElementById('org_code_comptable').value.trim() || null,

    logo_url: document.getElementById('org_logo_url').value.trim() || null,
    couleur_primaire: document.getElementById('org_couleur').value,

    configuration_email_id: document.getElementById('org_email_config').value || null,
    configuration_sms_id: document.getElementById('org_sms_config').value || null
  };
}

// ==================== SAUVEGARDE ====================

async function saveOrganisation() {
  const data = collectFormData();

  // Validation basique
  if (!data.nom) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: 'Le nom est obligatoire' });
    document.getElementById('org_nom').focus();
    return;
  }

  try {
    const token = getAuthToken();
    const id = document.getElementById('org_id').value;
    const url = id ? `/api/organisations/${id}` : '/api/organisations';
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

    const result = await response.json();
    currentOrganisation = result;
    document.getElementById('org_id').value = result.id;

    Swal.fire({
      icon: 'success',
      title: id ? 'Organisation mise a jour' : 'Organisation creee',
      timer: 2000,
      showConfirmButton: false
    });

    // Recharger les structures
    if (result.structures) {
      renderStructures(result.structures);
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Erreur', text: error.message });
  }
}

// ==================== UI ====================

function toggleTypeSections() {
  const type = document.getElementById('org_type').value;

  document.getElementById('section-associations').style.display =
    type === 'association' ? 'block' : 'none';
  document.getElementById('section-collectivites').style.display =
    type === 'collectivite' ? 'block' : 'none';
}

function previewLogo() {
  const url = document.getElementById('org_logo_url').value.trim();
  const container = document.getElementById('logo-preview-container');
  const img = document.getElementById('logo-preview');

  if (url) {
    img.src = url;
    img.onerror = () => { container.style.display = 'none'; };
    img.onload = () => { container.style.display = 'block'; };
  } else {
    container.style.display = 'none';
  }
}

function updateCouleurPreview() {
  const couleur = document.getElementById('org_couleur').value;
  document.getElementById('couleur-preview').style.backgroundColor = couleur;
}

function formatSiret(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length > 14) value = value.substring(0, 14);

  // Formater avec espaces: XXX XXX XXX XXXXX
  let formatted = '';
  for (let i = 0; i < value.length; i++) {
    if (i === 3 || i === 6 || i === 9) formatted += ' ';
    formatted += value[i];
  }
  input.value = formatted;
}

function formatSiretDisplay(siret) {
  if (!siret) return '';
  const clean = siret.replace(/\D/g, '');
  let formatted = '';
  for (let i = 0; i < clean.length; i++) {
    if (i === 3 || i === 6 || i === 9) formatted += ' ';
    formatted += clean[i];
  }
  return formatted;
}

function renderStructures(structures) {
  const container = document.getElementById('liste-structures');
  document.getElementById('count-structures').textContent = structures.length;

  if (structures.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-3">
        <small>Aucune structure rattachee</small>
      </div>
    `;
    return;
  }

  container.innerHTML = structures.map(s => `
    <a href="structures.html?id=${s.id}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
      <div>
        <i class="bi bi-${s.icone || 'diagram-3'}" style="color: ${s.couleur || '#6f42c1'}"></i>
        <span class="ms-2">${escapeHtml(s.nom)}</span>
        <small class="text-muted ms-1">(${escapeHtml(s.code)})</small>
      </div>
      ${s.actif ? '' : '<span class="badge bg-secondary">Inactif</span>'}
    </a>
  `).join('');
}

// ==================== UTILITAIRES ====================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export pour utilisation globale
window.initOrganisationPage = initOrganisationPage;
window.saveOrganisation = saveOrganisation;
window.toggleTypeSections = toggleTypeSections;
window.previewLogo = previewLogo;
window.updateCouleurPreview = updateCouleurPreview;
window.formatSiret = formatSiret;
