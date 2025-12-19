/**
 * Configuration des Connecteurs par Structure
 * Gestion hierarchique Email/SMS
 */

let structureId = null;
let config = null;
let availableConnectors = { email: [], sms: [] };
let pendingChanges = {
  defaults: null,
  categories: [],
  events: []
};

// ==================== INITIALISATION ====================

async function initConnecteursPage() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Recuperer l'ID de la structure depuis l'URL
  const urlParams = new URLSearchParams(window.location.search);
  structureId = urlParams.get('id');

  if (!structureId) {
    Swal.fire({
      icon: 'error',
      title: 'Structure non specifiee',
      text: 'Veuillez acceder a cette page depuis la liste des structures'
    }).then(() => {
      window.location.href = 'parametres-structures.html';
    });
    return;
  }

  try {
    await loadConnecteursConfig();
  } catch (error) {
    console.error('Erreur initialisation:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur de chargement',
      text: error.message
    });
  }
}

// ==================== CHARGEMENT ====================

async function loadConnecteursConfig() {
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${structureId}/connecteurs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = 'login.html';
        return;
      }
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    config = data;
    availableConnectors = data.availableConnectors || { email: [], sms: [] };

    // Mise a jour de l'interface
    updateHeader();
    populateConnectorSelects();
    renderCategories();
    populateTestEventSelect();

  } catch (error) {
    console.error('Erreur chargement config:', error);
    throw error;
  }
}

function updateHeader() {
  if (!config || !config.structure) return;

  document.getElementById('structure-nom').textContent = config.structure.nom;
  document.getElementById('breadcrumb-structure').textContent = config.structure.nom;

  // Afficher les defauts systeme
  const systemEmail = config.defaults?.system?.email;
  const systemSms = config.defaults?.system?.sms;

  document.getElementById('system-email-default').textContent = systemEmail
    ? `Defaut systeme: ${systemEmail.libelle} (${systemEmail.email_expediteur})`
    : 'Aucun defaut systeme';

  document.getElementById('system-sms-default').textContent = systemSms
    ? `Defaut systeme: ${systemSms.libelle} (${systemSms.provider})`
    : 'Aucun defaut systeme';
}

function populateConnectorSelects() {
  // Populate default selects
  const defaultEmailSelect = document.getElementById('default-email-connector');
  const defaultSmsSelect = document.getElementById('default-sms-connector');

  // Email options
  defaultEmailSelect.innerHTML = '<option value="">Utiliser le defaut systeme</option>';
  availableConnectors.email.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.libelle} (${c.email_expediteur})`;
    if (c.par_defaut) opt.textContent += ' - Defaut';
    defaultEmailSelect.appendChild(opt);
  });

  // SMS options
  defaultSmsSelect.innerHTML = '<option value="">Utiliser le defaut systeme</option>';
  availableConnectors.sms.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.libelle} (${c.provider})`;
    if (c.par_defaut) opt.textContent += ' - Defaut';
    defaultSmsSelect.appendChild(opt);
  });

  // Set current values
  const structureEmailId = config.defaults?.structure?.email?.id;
  const structureSmsId = config.defaults?.structure?.sms?.id;

  if (structureEmailId) defaultEmailSelect.value = structureEmailId;
  if (structureSmsId) defaultSmsSelect.value = structureSmsId;

  // Event listeners
  defaultEmailSelect.addEventListener('change', onDefaultChange);
  defaultSmsSelect.addEventListener('change', onDefaultChange);
}

function renderCategories() {
  const container = document.getElementById('categories-container');

  if (!config.categories || config.categories.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <i class="bi bi-inbox display-4"></i>
        <p class="mt-2">Aucun evenement configure</p>
      </div>
    `;
    return;
  }

  container.innerHTML = config.categories.map(category => {
    const hasOverride = category.override !== null;
    const categoryEmailId = category.override?.configuration_email_id || '';
    const categorySmsId = category.override?.configuration_sms_id || '';

    return `
      <div class="category-section">
        <div class="category-header d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-0">
              <i class="bi bi-folder2-open me-2"></i>
              ${escapeHtml(category.label)}
              ${hasOverride ? '<span class="badge bg-primary override-badge ms-2">Override</span>' : ''}
            </h6>
            <small class="text-muted">${category.events?.length || 0} evenement(s)</small>
          </div>
          <div class="d-flex gap-2">
            <select class="form-select form-select-sm connector-select category-email"
                    data-category="${category.code}"
                    data-type="email"
                    onchange="onCategoryChange(this)">
              <option value="">Defaut structure</option>
              ${availableConnectors.email.map(c => `
                <option value="${c.id}" ${c.id == categoryEmailId ? 'selected' : ''}>
                  ${escapeHtml(c.libelle)}
                </option>
              `).join('')}
            </select>
            <select class="form-select form-select-sm connector-select category-sms"
                    data-category="${category.code}"
                    data-type="sms"
                    onchange="onCategoryChange(this)">
              <option value="">Defaut structure</option>
              ${availableConnectors.sms.map(c => `
                <option value="${c.id}" ${c.id == categorySmsId ? 'selected' : ''}>
                  ${escapeHtml(c.libelle)}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
        <div class="border border-top-0 rounded-bottom">
          ${category.events.map(event => {
            const eventHasOverride = event.override !== null;
            const eventEmailId = event.override?.configuration_email_id || '';
            const eventSmsId = event.override?.configuration_sms_id || '';

            return `
              <div class="event-row d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted font-monospace small">${escapeHtml(event.code)}</span>
                  <span class="ms-2">${escapeHtml(event.libelle)}</span>
                  ${eventHasOverride ? '<span class="badge bg-info override-badge ms-1">Override</span>' : ''}
                </div>
                <div class="d-flex gap-2">
                  <select class="form-select form-select-sm connector-select event-email"
                          data-event="${event.code}"
                          data-type="email"
                          onchange="onEventChange(this)">
                    <option value="">Defaut categorie</option>
                    ${availableConnectors.email.map(c => `
                      <option value="${c.id}" ${c.id == eventEmailId ? 'selected' : ''}>
                        ${escapeHtml(c.libelle)}
                      </option>
                    `).join('')}
                  </select>
                  <select class="form-select form-select-sm connector-select event-sms"
                          data-event="${event.code}"
                          data-type="sms"
                          onchange="onEventChange(this)">
                    <option value="">Defaut categorie</option>
                    ${availableConnectors.sms.map(c => `
                      <option value="${c.id}" ${c.id == eventSmsId ? 'selected' : ''}>
                        ${escapeHtml(c.libelle)}
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function populateTestEventSelect() {
  const select = document.getElementById('test-event-code');
  select.innerHTML = '<option value="">Selectionner un evenement</option>';

  if (!config.categories) return;

  config.categories.forEach(category => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = category.label;

    category.events.forEach(event => {
      const opt = document.createElement('option');
      opt.value = event.code;
      opt.textContent = event.libelle;
      optgroup.appendChild(opt);
    });

    select.appendChild(optgroup);
  });
}

// ==================== GESTION DES CHANGEMENTS ====================

function onDefaultChange() {
  pendingChanges.defaults = {
    configuration_email_id: document.getElementById('default-email-connector').value || null,
    configuration_sms_id: document.getElementById('default-sms-connector').value || null
  };
}

function onCategoryChange(selectElement) {
  const category = selectElement.dataset.category;
  const type = selectElement.dataset.type;

  // Trouver ou creer l'entree pour cette categorie
  let categoryChange = pendingChanges.categories.find(c => c.categorie === category);
  if (!categoryChange) {
    categoryChange = { categorie: category };
    pendingChanges.categories.push(categoryChange);
  }

  // Mettre a jour la valeur
  if (type === 'email') {
    categoryChange.configuration_email_id = selectElement.value || null;
    // Conserver l'autre valeur si elle existe
    if (!('configuration_sms_id' in categoryChange)) {
      const smsSelect = document.querySelector(`.category-sms[data-category="${category}"]`);
      categoryChange.configuration_sms_id = smsSelect?.value || null;
    }
  } else {
    categoryChange.configuration_sms_id = selectElement.value || null;
    // Conserver l'autre valeur si elle existe
    if (!('configuration_email_id' in categoryChange)) {
      const emailSelect = document.querySelector(`.category-email[data-category="${category}"]`);
      categoryChange.configuration_email_id = emailSelect?.value || null;
    }
  }
}

function onEventChange(selectElement) {
  const eventCode = selectElement.dataset.event;
  const type = selectElement.dataset.type;

  // Trouver ou creer l'entree pour cet evenement
  let eventChange = pendingChanges.events.find(e => e.event_trigger_code === eventCode);
  if (!eventChange) {
    eventChange = { event_trigger_code: eventCode };
    pendingChanges.events.push(eventChange);
  }

  // Mettre a jour la valeur
  if (type === 'email') {
    eventChange.configuration_email_id = selectElement.value || null;
    // Conserver l'autre valeur si elle existe
    if (!('configuration_sms_id' in eventChange)) {
      const smsSelect = document.querySelector(`.event-sms[data-event="${eventCode}"]`);
      eventChange.configuration_sms_id = smsSelect?.value || null;
    }
  } else {
    eventChange.configuration_sms_id = selectElement.value || null;
    // Conserver l'autre valeur si elle existe
    if (!('configuration_email_id' in eventChange)) {
      const emailSelect = document.querySelector(`.event-email[data-event="${eventCode}"]`);
      eventChange.configuration_email_id = emailSelect?.value || null;
    }
  }
}

// ==================== SAUVEGARDE ====================

async function saveAllChanges() {
  // Construire les donnees a envoyer
  const data = {};

  // Defaults - toujours envoyer les valeurs actuelles
  data.defaults = {
    configuration_email_id: document.getElementById('default-email-connector').value || null,
    configuration_sms_id: document.getElementById('default-sms-connector').value || null
  };

  // Categories - collecter toutes les valeurs actuelles
  data.categories = [];
  document.querySelectorAll('.category-email').forEach(select => {
    const category = select.dataset.category;
    const smsSelect = document.querySelector(`.category-sms[data-category="${category}"]`);
    data.categories.push({
      categorie: category,
      configuration_email_id: select.value || null,
      configuration_sms_id: smsSelect?.value || null
    });
  });

  // Events - collecter toutes les valeurs actuelles
  data.events = [];
  document.querySelectorAll('.event-email').forEach(select => {
    const eventCode = select.dataset.event;
    const smsSelect = document.querySelector(`.event-sms[data-event="${eventCode}"]`);
    data.events.push({
      event_trigger_code: eventCode,
      configuration_email_id: select.value || null,
      configuration_sms_id: smsSelect?.value || null
    });
  });

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${structureId}/connecteurs/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur sauvegarde');
    }

    // Reset pending changes
    pendingChanges = { defaults: null, categories: [], events: [] };

    // Recharger la config pour voir les badges actualises
    await loadConnecteursConfig();

    Swal.fire({
      icon: 'success',
      title: 'Configuration enregistree',
      timer: 1500,
      showConfirmButton: false
    });

  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: error.message
    });
  }
}

// ==================== TEST RESOLUTION ====================

async function testResolve() {
  const eventCode = document.getElementById('test-event-code').value;

  if (!eventCode) {
    Swal.fire({
      icon: 'warning',
      title: 'Selectionnez un evenement',
      timer: 1500,
      showConfirmButton: false
    });
    return;
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`/api/structures/${structureId}/connecteurs/test/${eventCode}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Erreur test');
    }

    const result = await response.json();

    document.getElementById('test-result').classList.remove('d-none');
    document.getElementById('test-email-result').innerHTML = result.resolved.email
      ? `<span class="text-success">${escapeHtml(result.resolved.email.libelle)}</span>`
      : '<span class="text-muted">Aucun</span>';
    document.getElementById('test-sms-result').innerHTML = result.resolved.sms
      ? `<span class="text-success">${escapeHtml(result.resolved.sms.libelle)}</span>`
      : '<span class="text-muted">Aucun</span>';

  } catch (error) {
    console.error('Erreur test:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: error.message
    });
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
window.initConnecteursPage = initConnecteursPage;
window.saveAllChanges = saveAllChanges;
window.testResolve = testResolve;
window.onCategoryChange = onCategoryChange;
window.onEventChange = onEventChange;
