/**
 * Gestion Tarification - Interface unifiee
 * Structure: Cotisations avec types de tarifs et modificateurs integres
 */

// ============================================================
// Variables globales
// ============================================================

let tarifsCache = [];
let prestationsCache = []; // Prestations
let typesTarifsCache = [];
let modificateursCache = [];
let configurationsQFCache = [];
let communesCache = [];
let communautesCache = [];
let utilisateursCache = [];
let tagsCache = []; // Tags utilisateur pour les criteres
let operationsComptablesCache = []; // Operations comptables
let currentModificateurConfig = {}; // Configuration du modificateur en cours d'edition

// ============================================================
// Initialisation
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Tarification] Initialisation...');

  // Initialiser le template admin
  if (typeof initTemplate === 'function') {
    await initTemplate('parametres');
  }

  // Charger d'abord les referentiels (tags, communes, communautes, operations comptables)
  await Promise.all([
    chargerCommunes(),
    chargerCommunautesCommunes(),
    chargerTags(),
    chargerTypesTarifs(),
    chargerModificateurs(),
    chargerConfigurationsQF(),
    chargerOperationsComptables()
  ]);

  // Puis charger et afficher les tarifs (qui utilisent les referentiels)
  await Promise.all([
    chargerTarifs(),
    chargerPrestations()
  ]);

  // Charger utilisateurs en arriere-plan
  chargerUtilisateurs();

  console.log('[Tarification] Initialisation terminee');
});

// ============================================================
// Chargement des donnees
// ============================================================

async function chargerTarifs() {
  try {
    const response = await apiAdmin.get('/tarifs-cotisation');
    tarifsCache = Array.isArray(response) ? response : (response?.data || []);
    // Filtrer pour ne garder que les cotisations (type != 'prestation')
    tarifsCache = tarifsCache.filter(t => t.type !== 'prestation');
    afficherCotisations(tarifsCache);
  } catch (error) {
    console.error('[Tarification] Erreur chargement tarifs:', error);
    document.getElementById('cotisations-list').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i>
        Erreur lors du chargement des tarifs
      </div>
    `;
  }
}

async function chargerPrestations() {
  try {
    const response = await apiAdmin.get('/tarifs-cotisation?type=prestation');
    prestationsCache = Array.isArray(response) ? response : (response?.data || []);
    afficherPrestations(prestationsCache);
  } catch (error) {
    console.error('[Tarification] Erreur chargement prestations:', error);
    prestationsCache = [];
  }
}

function afficherPrestations(prestations) {
  const container = document.getElementById('tab-prestations');

  if (!prestations || prestations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-receipt-cutoff"></i>
        <h5>Prestations</h5>
        <p class="text-muted">
          Gerez ici les tarifs pour les activites ponctuelles<br>
          (animations, ateliers, locations exceptionnelles...)
        </p>
        <button class="btn btn-outline-primary" onclick="ouvrirModalNouveauTarif('prestation')">
          <i class="bi bi-plus"></i> Ajouter une prestation
        </button>
      </div>
    `;
    return;
  }

  let html = '<div class="row">';
  prestations.forEach(prestation => {
    const statusClass = prestation.actif ? '' : 'opacity-50';
    const statusBadge = prestation.actif
      ? '<span class="badge bg-success">Actif</span>'
      : '<span class="badge bg-secondary">Inactif</span>';

    html += `
      <div class="col-md-4 mb-3">
        <div class="card h-100 ${statusClass}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="card-title mb-0">${escapeHtml(prestation.libelle)}</h6>
              ${statusBadge}
            </div>
            ${prestation.description ? `<p class="card-text text-muted small">${escapeHtml(prestation.description)}</p>` : ''}
            <p class="card-text fs-4 fw-bold text-success mb-0">${formatMontant(prestation.montant_base || prestation.montant)} EUR</p>
          </div>
          <div class="card-footer bg-transparent d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary flex-fill" onclick="ouvrirModalTarif(${prestation.id}, 'prestation')">
              <i class="bi bi-pencil"></i> Modifier
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="supprimerTarif(${prestation.id}, 'prestation')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';

  // Ajouter bouton pour nouvelle prestation
  html += `
    <div class="text-center mt-3">
      <button class="btn btn-primary" onclick="ouvrirModalNouveauTarif('prestation')">
        <i class="bi bi-plus-lg"></i> Nouvelle prestation
      </button>
    </div>
  `;

  container.innerHTML = html;
}

async function chargerTypesTarifs() {
  try {
    const response = await apiAdmin.get('/tarification/types-tarifs');
    typesTarifsCache = response?.data || response || [];
    if (!Array.isArray(typesTarifsCache)) typesTarifsCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement types tarifs:', error);
    typesTarifsCache = [];
  }
}

async function chargerModificateurs() {
  try {
    const response = await apiAdmin.get('/tarification/regles-reduction');
    modificateursCache = response?.data || response || [];
    if (!Array.isArray(modificateursCache)) modificateursCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement modificateurs:', error);
    modificateursCache = [];
  }
}

async function chargerConfigurationsQF() {
  try {
    const response = await apiAdmin.get('/tarification/configurations-qf');
    configurationsQFCache = response?.data || response || [];
    if (!Array.isArray(configurationsQFCache)) configurationsQFCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement config QF:', error);
    configurationsQFCache = [];
  }
}

async function chargerCommunes() {
  try {
    const response = await apiAdmin.get('/communes/all');
    communesCache = response?.communes || response?.data || response || [];
    if (!Array.isArray(communesCache)) communesCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement communes:', error);
    communesCache = [];
  }
}

async function chargerCommunautesCommunes() {
  try {
    const response = await apiAdmin.get('/communautes-communes');
    communautesCache = response?.data || response || [];
    if (!Array.isArray(communautesCache)) communautesCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement communautes:', error);
    communautesCache = [];
  }
}

async function chargerTags() {
  try {
    const response = await apiAdmin.get('/parametres/tags-utilisateur/actifs');
    tagsCache = response || [];
    if (!Array.isArray(tagsCache)) tagsCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement tags:', error);
    tagsCache = [];
  }
}

async function chargerOperationsComptables() {
  try {
    const response = await apiAdmin.get('/parametres/operations-comptables');
    operationsComptablesCache = response?.data || response || [];
    if (!Array.isArray(operationsComptablesCache)) operationsComptablesCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement operations comptables:', error);
    operationsComptablesCache = [];
  }
}

async function chargerUtilisateurs() {
  try {
    const response = await apiAdmin.get('/utilisateurs?limit=100&statut=actif');
    utilisateursCache = response?.utilisateurs || response?.data || response || [];
    if (!Array.isArray(utilisateursCache)) utilisateursCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement utilisateurs:', error);
    utilisateursCache = [];
  }
}

// ============================================================
// Affichage des cotisations (cartes depliables)
// ============================================================

function afficherCotisations(tarifs) {
  const container = document.getElementById('cotisations-list');

  if (!tarifs || tarifs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-card-checklist"></i>
        <h5>Aucune cotisation configuree</h5>
        <p class="text-muted">Creez votre premiere cotisation pour commencer</p>
        <button class="btn btn-primary" onclick="ouvrirModalNouveauTarif()">
          <i class="bi bi-plus"></i> Nouvelle cotisation
        </button>
      </div>
    `;
    return;
  }

  // Trier par ordre puis par actif
  tarifs.sort((a, b) => {
    if (a.actif !== b.actif) return b.actif ? 1 : -1;
    return (a.ordre_affichage || 0) - (b.ordre_affichage || 0);
  });

  let html = '';

  tarifs.forEach((tarif, index) => {
    const isActive = tarif.actif !== false;
    const isDefault = tarif.par_defaut === true;
    const collapseId = `collapse-${tarif.id}`;
    const tabsId = `tabs-${tarif.id}`;

    // Badges
    let badges = '';
    if (isDefault) badges += '<span class="badge bg-primary ms-2"><i class="bi bi-star-fill"></i> Par defaut</span>';
    if (!isActive) badges += '<span class="badge bg-secondary ms-2">Inactif</span>';
    if (tarif.type_montant === 'prorata') badges += '<span class="badge bg-info ms-2">Prorata</span>';

    // Periode formatee
    const periodeLabel = {
      'annee_civile': 'Annee civile',
      'annee_scolaire': 'Annee scolaire',
      'date_a_date': '12 mois glissants'
    }[tarif.type_periode] || tarif.type_periode;

    // Criteres d'eligibilite pour cette cotisation
    const criteresHtml = genererCriteresSummaryHtml(tarif.criteres);

    // Modificateurs pour cette cotisation
    const modsHtml = genererModificateursHtml(tarif.id);

    html += `
      <div class="cotisation-card ${isActive ? '' : 'inactive'}">
        <div class="cotisation-header ${index > 0 ? 'collapsed' : ''}"
             data-bs-toggle="collapse" data-bs-target="#${collapseId}">
          <div>
            <h5>
              <i class="bi bi-chevron-down chevron me-2"></i>
              ${escapeHtml(tarif.libelle)}
              ${badges}
            </h5>
            ${tarif.description ? `<small class="text-muted">${escapeHtml(tarif.description)}</small>` : ''}
          </div>
          <div class="text-end">
            <span class="fs-4 fw-bold text-success">${formatMontant(tarif.montant_base)}</span>
            <small class="d-block text-muted">montant de base</small>
          </div>
        </div>

        <div class="collapse ${index === 0 ? 'show' : ''}" id="${collapseId}">
          <div class="cotisation-body">
            <!-- Sub-tabs -->
            <ul class="nav cotisation-tabs border-bottom" role="tablist">
              <li class="nav-item">
                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#${tabsId}-general">
                  <i class="bi bi-info-circle"></i> General
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#${tabsId}-modificateurs">
                  <i class="bi bi-sliders"></i> Modificateurs
                  <span class="badge bg-secondary ms-1">${modificateursCache.length}</span>
                </button>
              </li>
            </ul>

            <div class="tab-content p-3">
              <!-- Tab General -->
              <div class="tab-pane fade show active" id="${tabsId}-general">
                <h6 class="mb-3"><i class="bi bi-funnel"></i> Criteres d'eligibilite</h6>
                ${criteresHtml}

                <div class="info-row">
                  <div class="info-item">
                    <i class="bi bi-calendar3"></i>
                    <span><strong>Periode:</strong> ${periodeLabel}</span>
                  </div>
                  <div class="info-item">
                    <i class="bi bi-calculator"></i>
                    <span><strong>Calcul:</strong> ${tarif.type_montant === 'prorata' ? 'Prorata mensuel' : 'Montant fixe'}</span>
                  </div>
                </div>

                <div class="cotisation-actions">
                  <button class="btn btn-warning btn-sm" onclick="ouvrirSimulateur(${tarif.id})">
                    <i class="bi bi-calculator-fill"></i> Simuler
                  </button>
                  <button class="btn btn-outline-primary btn-sm" onclick="ouvrirModalTarif(${tarif.id})">
                    <i class="bi bi-pencil"></i> Modifier
                  </button>
                  <button class="btn btn-outline-secondary btn-sm" onclick="dupliquerTarif(${tarif.id})">
                    <i class="bi bi-files"></i> Dupliquer
                  </button>
                  <button class="btn btn-outline-${isActive ? 'warning' : 'success'} btn-sm" onclick="toggleTarifActif(${tarif.id})">
                    <i class="bi bi-${isActive ? 'eye-slash' : 'eye'}"></i> ${isActive ? 'Desactiver' : 'Activer'}
                  </button>
                </div>
              </div>

              <!-- Tab Modificateurs -->
              <div class="tab-pane fade" id="${tabsId}-modificateurs">
                <div class="ordre-alert">
                  <i class="bi bi-exclamation-triangle-fill text-warning"></i>
                  <span>Ordre d'application : de haut en bas</span>
                </div>
                ${modsHtml}
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="ouvrirModalModificateur(null, ${tarif.id})">
                  <i class="bi bi-plus"></i> Ajouter un modificateur
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Initialiser le drag & drop pour les modificateurs
  tarifsCache.forEach(tarif => {
    initSortableModificateurs(tarif.id);
  });
}

/**
 * Generer le HTML des types de tarifs pour une cotisation
 */
function genererTypesHtml(tarif, montantsParType) {
  if (!typesTarifsCache || typesTarifsCache.length === 0) {
    return `
      <div class="type-tarif-row">
        <div class="type-tarif-label">
          <strong>Tarif unique</strong>
        </div>
        <div class="type-tarif-montant">${formatMontant(tarif.montant_base)}</div>
      </div>
    `;
  }

  let html = '';

  typesTarifsCache.forEach(type => {
    // Chercher le montant specifique pour ce type
    const montantParType = montantsParType.find(m => m.type_tarif_id === type.id);
    const montant = montantParType ? montantParType.montant : tarif.montant_base;

    // Description des criteres
    const criteresDesc = formatCriteresDescription(type);

    html += `
      <div class="type-tarif-row">
        <div class="type-tarif-label flex-grow-1">
          <div class="d-flex align-items-center">
            <strong>${escapeHtml(type.libelle)}</strong>
            <button class="btn btn-link btn-sm p-0 ms-2" onclick="ouvrirModalCriteres(${type.id})" title="Modifier les criteres">
              <i class="bi bi-funnel${type.criteres ? '-fill text-primary' : ' text-muted'}"></i>
            </button>
          </div>
          ${criteresDesc ? `<small class="text-muted d-block">${criteresDesc}</small>` : ''}
        </div>
        <div class="type-tarif-montant">${formatMontant(montant)}</div>
      </div>
    `;
  });

  return html || `<p class="text-muted">Aucun type de tarif defini</p>`;
}

/**
 * Formate la description des criteres d'un type de tarif
 */
function formatCriteresDescription(type) {
  const criteres = type.criteres;

  // Si pas de criteres JSON, fallback sur le legacy
  if (!criteres || Object.keys(criteres).length === 0) {
    if (type.condition_age_operateur && type.condition_age_operateur !== 'aucune') {
      switch (type.condition_age_operateur) {
        case '<': return `Age < ${type.condition_age_max} ans`;
        case '<=': return `Age <= ${type.condition_age_max} ans`;
        case '>': return `Age > ${type.condition_age_min} ans`;
        case '>=': return `Age >= ${type.condition_age_min} ans`;
        case 'entre': return `Age ${type.condition_age_min}-${type.condition_age_max} ans`;
        default: return '';
      }
    }
    return '';
  }

  const parts = [];

  // Age
  if (criteres.age) {
    const op = criteres.age.operateur;
    if (op === 'entre') {
      parts.push(`Age: ${criteres.age.min || 0}-${criteres.age.max || 999} ans`);
    } else if (op === '<' || op === '<=') {
      parts.push(`Age ${op} ${criteres.age.max} ans`);
    } else {
      parts.push(`Age ${op} ${criteres.age.min} ans`);
    }
  }

  // Sexe
  if (criteres.sexe && criteres.sexe.length > 0 && criteres.sexe.length < 3) {
    const sexeLabels = { M: 'H', F: 'F', A: 'A' };
    parts.push(`Sexe: ${criteres.sexe.map(s => sexeLabels[s]).join('/')}`);
  }

  // Adhesion
  if (criteres.adhesion_active) {
    parts.push('Adhesion asso.');
  }

  // Tags
  if (criteres.tags && criteres.tags.length > 0) {
    const tagLabels = criteres.tags.map(id => {
      const tag = tagsCache.find(t => t.id === id);
      return tag ? tag.libelle : `#${id}`;
    });
    parts.push(`Tags: ${tagLabels.slice(0, 2).join(', ')}${tagLabels.length > 2 ? '...' : ''}`);
  }

  // Commune
  if (criteres.commune) {
    if (criteres.commune.type === 'communaute') {
      const cc = communautesCache.find(c => c.id === criteres.commune.id);
      parts.push(cc ? cc.nom : 'Communaute');
    } else {
      parts.push(`${criteres.commune.ids?.length || 0} commune(s)`);
    }
  }

  return parts.join(' | ');
}

/**
 * Generer le HTML resume des criteres pour affichage dans les cartes cotisation
 */
function genererCriteresSummaryHtml(criteres) {
  if (!criteres || Object.keys(criteres).length === 0) {
    return `
      <div class="alert alert-light border-0 py-2 px-3">
        <i class="bi bi-globe text-muted"></i>
        <span class="ms-2">Aucun critere - Cette cotisation est accessible a tous les usagers</span>
      </div>
    `;
  }

  let html = '<div class="criteres-summary">';

  // Age
  if (criteres.age) {
    const op = criteres.age.operateur;
    const min = criteres.age.min;
    const max = criteres.age.max;
    let ageText = '';
    if (op === 'entre' && min !== undefined && max !== undefined) {
      ageText = `${min} a ${max} ans`;
    } else if ((op === '<' || op === '<=') && max !== undefined) {
      ageText = `${op === '<' ? 'Moins de' : "Jusqu'a"} ${max} ans`;
    } else if ((op === '>' || op === '>=') && min !== undefined) {
      ageText = `${op === '>' ? 'Plus de' : 'A partir de'} ${min} ans`;
    } else {
      ageText = 'Critere age';
    }
    html += `
      <span class="critere-badge bg-secondary-subtle">
        <i class="bi bi-calendar-event"></i> ${ageText}
      </span>
    `;
  }

  // Sexe / Civilite
  if (criteres.sexe && criteres.sexe.length > 0 && criteres.sexe.length < 3) {
    const sexeLabels = { M: 'Hommes', F: 'Femmes', A: 'Autre' };
    const sexeText = criteres.sexe.map(s => sexeLabels[s] || s).join(', ');
    html += `
      <span class="critere-badge bg-info-subtle">
        <i class="bi bi-person"></i> ${sexeText}
      </span>
    `;
  }

  // Commune
  if (criteres.commune) {
    let communeText = '';
    if (criteres.commune.type === 'communaute') {
      const cc = communautesCache.find(c => c.id === criteres.commune.id);
      communeText = cc ? cc.nom : 'Communaute de communes';
    } else {
      communeText = `${criteres.commune.ids?.length || 0} commune(s)`;
    }
    html += `
      <span class="critere-badge bg-primary-subtle">
        <i class="bi bi-geo-alt"></i> ${escapeHtml(communeText)}
      </span>
    `;
  }

  // Adhesion association
  if (criteres.adhesion_active) {
    html += `
      <span class="critere-badge bg-success-subtle">
        <i class="bi bi-check-circle"></i> Adhesion asso. active
      </span>
    `;
  }

  // Tags
  if (criteres.tags && criteres.tags.length > 0) {
    let tagsText = '';
    if (tagsCache && tagsCache.length > 0) {
      const tagLabels = criteres.tags.map(id => {
        const tag = tagsCache.find(t => t.id === id);
        return tag ? tag.libelle : null;
      }).filter(Boolean);
      if (tagLabels.length > 0) {
        tagsText = tagLabels.slice(0, 3).join(', ') + (tagLabels.length > 3 ? '...' : '');
      } else {
        tagsText = `${criteres.tags.length} tag(s)`;
      }
    } else {
      tagsText = `${criteres.tags.length} tag(s)`;
    }
    html += `
      <span class="critere-badge bg-warning-subtle">
        <i class="bi bi-tag"></i> ${escapeHtml(tagsText)}
      </span>
    `;
  }

  html += '</div>';
  return html;
}

/**
 * Generer le HTML des modificateurs pour une cotisation
 */
function genererModificateursHtml(tarifId) {
  // Trier par ordre_application
  const mods = [...modificateursCache].sort((a, b) =>
    (a.ordre_application || 100) - (b.ordre_application || 100)
  );

  if (mods.length === 0) {
    return `<p class="text-muted">Aucun modificateur configure. Les usagers paieront le tarif de base.</p>`;
  }

  let html = `<div id="modificateurs-sortable-${tarifId}" class="ps-3">`;

  mods.forEach((mod, index) => {
    const isActive = mod.actif !== false;
    const icons = {
      'commune': 'geo-alt',
      'quotient_familial': 'graph-up',
      'age': 'calendar-event',
      'fidelite': 'award',
      'multi_inscriptions': 'people-fill',
      'multi_enfants': 'people-fill', // legacy
      'statut_social': 'person-badge'
    };
    const colors = {
      'commune': 'primary',
      'quotient_familial': 'info',
      'age': 'secondary',
      'fidelite': 'warning',
      'multi_inscriptions': 'success',
      'multi_enfants': 'success', // legacy
      'statut_social': 'danger'
    };

    const typeSource = mod.type_source || 'manuel';
    const icon = icons[typeSource] || 'tag';
    const color = colors[typeSource] || 'secondary';

    const valeurFormatee = mod.type_calcul === 'pourcentage'
      ? `-${mod.valeur}%`
      : `-${formatMontant(mod.valeur)}`;

    // Affichage special pour QF
    let qfHtml = '';
    if (typeSource === 'quotient_familial') {
      qfHtml = genererQFTableHtml();
    }

    // Types applicables
    const typesApplicables = typesTarifsCache.map(t => t.libelle).join(', ') || 'Tous';

    html += `
      <div class="modificateur-item ${isActive ? '' : 'inactive'}"
           data-id="${mod.id}"
           style="border-left-color: var(--bs-${color});">
        <span class="modificateur-ordre">${index + 1}</span>
        <div class="d-flex align-items-start">
          <span class="drag-handle">
            <i class="bi bi-grip-vertical fs-5"></i>
          </span>
          <i class="bi bi-${icon} modificateur-icon text-${color}"></i>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <strong>${escapeHtml(mod.libelle)}</strong>
              <span class="modificateur-valeur">${valeurFormatee}</span>
            </div>
            ${mod.description ? `<small class="text-muted d-block">${escapeHtml(mod.description)}</small>` : ''}
            <small class="text-muted">S'applique a : ${typesApplicables}</small>
            ${qfHtml}
          </div>
          <div class="btn-group btn-group-sm ms-2">
            <button class="btn btn-outline-primary btn-sm" onclick="ouvrirModalModificateur(${mod.id}, ${tarifId})" title="Modifier">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="supprimerModificateur(${mod.id})" title="Supprimer">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

/**
 * Generer le tableau QF compact
 */
function genererQFTableHtml() {
  if (!configurationsQFCache || configurationsQFCache.length === 0) {
    return '';
  }

  const config = configurationsQFCache.find(c => c.par_defaut) || configurationsQFCache[0];
  if (!config || !config.tranches || config.tranches.length === 0) {
    return '';
  }

  const mode = config.mode_calcul || 'remplacement';

  let html = `
    <div class="mt-2">
      <small class="text-info"><strong>[Mode: ${mode === 'remplacement' ? 'Remplacement' : 'Reduction'}]</strong></small>
      <table class="table table-sm qf-table mb-0">
        <thead>
          <tr>
            <th>Tranche</th>
            ${typesTarifsCache.map(t => `<th>${escapeHtml(t.libelle)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  config.tranches.forEach(tranche => {
    html += `<tr><td>QF ${tranche.borne_min || 0}-${tranche.borne_max || '+'}</td>`;
    typesTarifsCache.forEach(type => {
      const valeur = tranche.valeursParType?.find(v => v.type_tarif_id === type.id);
      html += `<td>${valeur ? formatMontant(valeur.montant) : '[base]'}</td>`;
    });
    html += `</tr>`;
  });

  html += '</tbody></table></div>';
  return html;
}

/**
 * Initialiser le drag & drop pour les modificateurs d'un tarif
 */
function initSortableModificateurs(tarifId) {
  const container = document.getElementById(`modificateurs-sortable-${tarifId}`);
  if (!container) return;

  Sortable.create(container, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'bg-light',
    onEnd: async (evt) => {
      const items = container.querySelectorAll('.modificateur-item');
      const ordres = Array.from(items).map((item, index) => ({
        id: parseInt(item.dataset.id),
        ordre_application: index + 1
      }));

      try {
        for (const { id, ordre_application } of ordres) {
          await apiAdmin.put(`/tarification/regles-reduction/${id}`, { ordre_application });
        }

        // Mettre a jour les numeros affiches
        items.forEach((item, index) => {
          item.querySelector('.modificateur-ordre').textContent = index + 1;
        });

        showToast('Ordre mis a jour', 'success');
      } catch (error) {
        console.error('[Tarification] Erreur mise a jour ordre:', error);
        showToast('Erreur', 'error');
        chargerModificateurs().then(() => afficherCotisations(tarifsCache));
      }
    }
  });
}

// ============================================================
// Modal Tarif (Nouveau / Modifier)
// ============================================================

function ouvrirModalNouveauTarif(type = 'cotisation') {
  ouvrirModalTarif(null, type);
}

/**
 * Toggle l'affichage des sections selon le type (cotisation/prestation)
 */
function toggleTarifType(type) {
  const sectionCotisation = document.getElementById('section_cotisation');
  const tarifTypeHidden = document.getElementById('tarif_type');
  const labelLibelle = document.querySelector('label[for="tarif_libelle"]');
  const inputLibelle = document.getElementById('tarif_libelle');

  tarifTypeHidden.value = type;

  if (type === 'prestation') {
    sectionCotisation.style.display = 'none';
    inputLibelle.placeholder = 'Ex: Atelier creation jeux, Location salle...';
    document.getElementById('modalTarifTitle').innerHTML = '<i class="bi bi-receipt text-success"></i> Prestation';
  } else {
    sectionCotisation.style.display = 'block';
    inputLibelle.placeholder = 'Ex: Cotisation annuelle 2025';
    const id = document.getElementById('tarif_id').value;
    document.getElementById('modalTarifTitle').innerHTML = id
      ? '<i class="bi bi-pencil"></i> Modifier la cotisation'
      : '<i class="bi bi-plus-circle"></i> Nouvelle cotisation';
  }
}

function ouvrirModalTarif(id = null, type = 'cotisation') {
  const modal = new bootstrap.Modal(document.getElementById('modalTarif'));
  const form = document.getElementById('formTarif');
  form.reset();

  // Initialiser les selects de criteres
  initTarifCriteresSelects();

  // Initialiser le select des operations comptables
  initOperationsComptablesSelect();

  // Reset des criteres
  resetTarifCriteres();

  // Configurer le type
  document.getElementById('tarif_type').value = type;
  document.getElementById(`tarif_type_${type}`).checked = true;
  toggleTarifType(type);

  // Masquer le selecteur de type en mode edition (on ne change pas le type)
  const typeSelector = document.getElementById('tarif_type_selector');

  if (id) {
    // Mode edition - chercher dans le bon cache selon le type
    let tarif;
    if (type === 'prestation') {
      tarif = prestationsCache.find(t => t.id === id);
    } else {
      tarif = tarifsCache.find(t => t.id === id);
    }

    if (!tarif) {
      showToast('Tarif non trouve', 'error');
      return;
    }

    typeSelector.style.display = 'none'; // Masquer le selecteur en edition

    if (type === 'prestation') {
      document.getElementById('modalTarifTitle').innerHTML = '<i class="bi bi-pencil"></i> Modifier la prestation';
    } else {
      document.getElementById('modalTarifTitle').innerHTML = '<i class="bi bi-pencil"></i> Modifier la cotisation';
    }

    document.getElementById('tarif_id').value = tarif.id;
    document.getElementById('tarif_libelle').value = tarif.libelle || '';
    document.getElementById('tarif_montant').value = tarif.montant_base || tarif.montant || 0;
    document.getElementById('tarif_description').value = tarif.description || '';
    document.getElementById('tarif_actif').checked = tarif.actif !== false;
    document.getElementById('tarif_defaut').checked = tarif.par_defaut === true;

    // Operation comptable
    document.getElementById('tarif_operation_comptable').value = tarif.operation_comptable_id || '';

    if (type === 'cotisation') {
      document.getElementById('tarif_periode').value = tarif.type_periode || 'annee_civile';
      document.getElementById('tarif_calcul').value = tarif.type_montant || 'fixe';

      // Charger les criteres
      if (tarif.criteres) {
        chargerTarifCriteres(tarif.criteres);
      }
    }
  } else {
    typeSelector.style.display = 'block'; // Afficher le selecteur en creation
    document.getElementById('tarif_id').value = '';
    document.getElementById('tarif_actif').checked = true;
  }

  modal.show();
}

// ============================================================
// Gestion des criteres dans le modal Tarif
// ============================================================

/**
 * Initialise le select des operations comptables
 */
function initOperationsComptablesSelect() {
  const select = document.getElementById('tarif_operation_comptable');
  if (!select) return;

  select.innerHTML = '<option value="">-- Aucune (pas d\'ecritures auto) --</option>';

  operationsComptablesCache.forEach(op => {
    const label = `${op.libelle} (${op.compte_produit})`;
    select.innerHTML += `<option value="${op.id}">${escapeHtml(label)}</option>`;
  });
}

/**
 * Initialise les selects des criteres (communautes, communes, tags)
 */
function initTarifCriteresSelects() {
  // Communautes
  const communauteSelect = document.getElementById('tarif_critere_communaute_id');
  if (communauteSelect) {
    communauteSelect.innerHTML = '<option value="">-- Selectionnez --</option>';
    communautesCache.forEach(c => {
      communauteSelect.innerHTML += `<option value="${c.id}">${escapeHtml(c.nom)}</option>`;
    });
  }

  // Communes
  const communesSelect = document.getElementById('tarif_critere_communes_ids');
  if (communesSelect) {
    communesSelect.innerHTML = '';
    communesCache.forEach(c => {
      communesSelect.innerHTML += `<option value="${c.id}">${c.code_postal} - ${escapeHtml(c.nom)}</option>`;
    });
  }

  // Tags
  const tagsContainer = document.getElementById('tarif_critere_tags_liste');
  if (tagsContainer) {
    if (!tagsCache || tagsCache.length === 0) {
      tagsContainer.innerHTML = '<span class="text-muted small">Aucun tag disponible</span>';
    } else {
      tagsContainer.innerHTML = tagsCache.map(tag => `
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="tarif_critere_tag_${tag.id}" value="${tag.id}">
          <label class="form-check-label" for="tarif_critere_tag_${tag.id}" style="color: ${tag.couleur};">
            <i class="bi ${tag.icone || 'bi-tag'}"></i> ${escapeHtml(tag.libelle)}
          </label>
        </div>
      `).join('');
    }
  }
}

/**
 * Reset tous les criteres du formulaire tarif
 */
function resetTarifCriteres() {
  // Age
  document.getElementById('tarif_critere_age_actif').checked = false;
  document.getElementById('tarif_critere_age_config').style.display = 'none';
  document.getElementById('tarif_critere_age_operateur').value = '<';
  document.getElementById('tarif_critere_age_min').value = '';
  document.getElementById('tarif_critere_age_max').value = '';
  toggleTarifCritereAgeInputs();

  // Sexe
  document.getElementById('tarif_critere_sexe_actif').checked = false;
  document.getElementById('tarif_critere_sexe_config').style.display = 'none';
  document.getElementById('tarif_critere_sexe_M').checked = true;
  document.getElementById('tarif_critere_sexe_F').checked = true;
  document.getElementById('tarif_critere_sexe_A').checked = true;

  // Commune
  document.getElementById('tarif_critere_commune_actif').checked = false;
  document.getElementById('tarif_critere_commune_config').style.display = 'none';
  document.getElementById('tarif_critere_commune_type_communaute').checked = true;
  document.getElementById('tarif_critere_communaute_id').value = '';
  toggleTarifCritereCommuneInputs();

  // Adhesion
  document.getElementById('tarif_critere_adhesion_actif').checked = false;

  // Tags
  document.getElementById('tarif_critere_tags_actif').checked = false;
  document.getElementById('tarif_critere_tags_config').style.display = 'none';
  document.querySelectorAll('#tarif_critere_tags_liste input[type="checkbox"]').forEach(cb => cb.checked = false);
}

/**
 * Charge les criteres dans le formulaire
 */
function chargerTarifCriteres(criteres) {
  if (!criteres) return;

  // Age
  if (criteres.age) {
    document.getElementById('tarif_critere_age_actif').checked = true;
    document.getElementById('tarif_critere_age_config').style.display = 'block';
    document.getElementById('tarif_critere_age_operateur').value = criteres.age.operateur || '<';
    document.getElementById('tarif_critere_age_min').value = criteres.age.min || '';
    document.getElementById('tarif_critere_age_max').value = criteres.age.max || '';
    toggleTarifCritereAgeInputs();
  }

  // Sexe
  if (criteres.sexe && Array.isArray(criteres.sexe)) {
    document.getElementById('tarif_critere_sexe_actif').checked = true;
    document.getElementById('tarif_critere_sexe_config').style.display = 'block';
    document.getElementById('tarif_critere_sexe_M').checked = criteres.sexe.includes('M');
    document.getElementById('tarif_critere_sexe_F').checked = criteres.sexe.includes('F');
    document.getElementById('tarif_critere_sexe_A').checked = criteres.sexe.includes('A');
  }

  // Commune
  if (criteres.commune) {
    document.getElementById('tarif_critere_commune_actif').checked = true;
    document.getElementById('tarif_critere_commune_config').style.display = 'block';
    if (criteres.commune.type === 'communaute') {
      document.getElementById('tarif_critere_commune_type_communaute').checked = true;
      document.getElementById('tarif_critere_communaute_id').value = criteres.commune.id || '';
    } else {
      document.getElementById('tarif_critere_commune_type_liste').checked = true;
      const select = document.getElementById('tarif_critere_communes_ids');
      (criteres.commune.ids || []).forEach(id => {
        const option = select.querySelector(`option[value="${id}"]`);
        if (option) option.selected = true;
      });
    }
    toggleTarifCritereCommuneInputs();
  }

  // Adhesion
  if (criteres.adhesion_active) {
    document.getElementById('tarif_critere_adhesion_actif').checked = true;
  }

  // Tags
  if (criteres.tags && Array.isArray(criteres.tags)) {
    document.getElementById('tarif_critere_tags_actif').checked = true;
    document.getElementById('tarif_critere_tags_config').style.display = 'block';
    criteres.tags.forEach(tagId => {
      const cb = document.getElementById(`tarif_critere_tag_${tagId}`);
      if (cb) cb.checked = true;
    });
  }
}

/**
 * Recupere les criteres depuis le formulaire
 */
function getTarifCriteres() {
  const criteres = {};

  // Age
  if (document.getElementById('tarif_critere_age_actif').checked) {
    const op = document.getElementById('tarif_critere_age_operateur').value;
    criteres.age = { operateur: op };
    if (op === 'entre' || op === '>' || op === '>=') {
      const min = document.getElementById('tarif_critere_age_min').value;
      if (min) criteres.age.min = parseInt(min);
    }
    if (op === 'entre' || op === '<' || op === '<=') {
      const max = document.getElementById('tarif_critere_age_max').value;
      if (max) criteres.age.max = parseInt(max);
    }
  }

  // Sexe
  if (document.getElementById('tarif_critere_sexe_actif').checked) {
    const sexes = [];
    if (document.getElementById('tarif_critere_sexe_M').checked) sexes.push('M');
    if (document.getElementById('tarif_critere_sexe_F').checked) sexes.push('F');
    if (document.getElementById('tarif_critere_sexe_A').checked) sexes.push('A');
    if (sexes.length > 0 && sexes.length < 3) { // Ne pas sauvegarder si tous selectionnes
      criteres.sexe = sexes;
    }
  }

  // Commune
  if (document.getElementById('tarif_critere_commune_actif').checked) {
    if (document.getElementById('tarif_critere_commune_type_communaute').checked) {
      const communauteId = document.getElementById('tarif_critere_communaute_id').value;
      if (communauteId) {
        criteres.commune = { type: 'communaute', id: parseInt(communauteId) };
      }
    } else {
      const select = document.getElementById('tarif_critere_communes_ids');
      const ids = Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
      if (ids.length > 0) {
        criteres.commune = { type: 'liste', ids: ids };
      }
    }
  }

  // Adhesion
  if (document.getElementById('tarif_critere_adhesion_actif').checked) {
    criteres.adhesion_active = true;
  }

  // Tags
  if (document.getElementById('tarif_critere_tags_actif').checked) {
    const tags = [];
    document.querySelectorAll('#tarif_critere_tags_liste input[type="checkbox"]:checked').forEach(cb => {
      tags.push(parseInt(cb.value));
    });
    if (tags.length > 0) {
      criteres.tags = tags;
    }
  }

  return Object.keys(criteres).length > 0 ? criteres : null;
}

/**
 * Toggle l'affichage d'une section de critere
 */
function toggleTarifCritereSection(section) {
  const checkbox = document.getElementById(`tarif_critere_${section}_actif`);
  const config = document.getElementById(`tarif_critere_${section}_config`);
  if (config) {
    config.style.display = checkbox.checked ? 'block' : 'none';
  }
}

/**
 * Toggle les inputs d'age selon l'operateur
 */
function toggleTarifCritereAgeInputs() {
  const op = document.getElementById('tarif_critere_age_operateur').value;
  const minCol = document.getElementById('tarif_critere_age_min_col');
  const maxCol = document.getElementById('tarif_critere_age_max_col');
  const etLabel = document.getElementById('tarif_critere_age_et');

  if (op === 'entre') {
    minCol.style.display = 'block';
    maxCol.style.display = 'block';
    etLabel.style.display = 'block';
  } else if (op === '>' || op === '>=') {
    minCol.style.display = 'block';
    maxCol.style.display = 'none';
    etLabel.style.display = 'none';
  } else {
    minCol.style.display = 'none';
    maxCol.style.display = 'block';
    etLabel.style.display = 'none';
  }
}

/**
 * Toggle les inputs de commune selon le type
 */
function toggleTarifCritereCommuneInputs() {
  const isCommunaute = document.getElementById('tarif_critere_commune_type_communaute').checked;
  document.getElementById('tarif_critere_communaute_select_container').style.display = isCommunaute ? 'block' : 'none';
  document.getElementById('tarif_critere_communes_liste_container').style.display = isCommunaute ? 'none' : 'block';
}

function genererTypesTarifsForm() {
  const container = document.getElementById('types-tarifs-container');

  if (!typesTarifsCache || typesTarifsCache.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i>
        Aucun type de tarif defini. Le tarif de base s'appliquera a tous.
        <a href="#" onclick="ouvrirModalCategorie()">Creer des categories</a>
      </div>
    `;
    return;
  }

  let html = '';
  typesTarifsCache.forEach(type => {
    const condition = formatConditionAge(type);
    html += `
      <div class="row align-items-center mb-2">
        <div class="col-md-6">
          <strong>${escapeHtml(type.libelle)}</strong>
          ${condition ? `<small class="text-muted ms-2">(${condition})</small>` : ''}
        </div>
        <div class="col-md-6">
          <div class="input-group input-group-sm">
            <input type="number" class="form-control" id="type_montant_${type.id}"
                   placeholder="Meme que base" min="0" step="0.01">
            <span class="input-group-text">EUR</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function formatConditionAge(type) {
  const op = type.condition_age_operateur;
  if (!op || op === 'aucune') return null;

  switch (op) {
    case '<': return `< ${type.condition_age_max} ans`;
    case '<=': return `<= ${type.condition_age_max} ans`;
    case '>': return `> ${type.condition_age_min} ans`;
    case '>=': return `>= ${type.condition_age_min} ans`;
    case 'entre': return `${type.condition_age_min}-${type.condition_age_max} ans`;
    default: return null;
  }
}

async function sauvegarderTarif() {
  const id = document.getElementById('tarif_id').value;
  const type = document.getElementById('tarif_type').value;
  const isPrestation = type === 'prestation';

  // Operation comptable
  const opComptableValue = document.getElementById('tarif_operation_comptable').value;
  const operationComptableId = opComptableValue ? parseInt(opComptableValue) : null;

  const data = {
    libelle: document.getElementById('tarif_libelle').value.trim(),
    montant_base: parseFloat(document.getElementById('tarif_montant').value),
    description: document.getElementById('tarif_description').value.trim() || null,
    actif: document.getElementById('tarif_actif').checked,
    par_defaut: document.getElementById('tarif_defaut').checked,
    type: type, // 'cotisation' ou 'prestation'
    operation_comptable_id: operationComptableId
  };

  // Ajouter les champs specifiques aux cotisations
  if (!isPrestation) {
    data.type_periode = document.getElementById('tarif_periode').value;
    data.type_montant = document.getElementById('tarif_calcul').value;
    // Criteres d'eligibilite dynamiques
    data.criteres = getTarifCriteres();
  } else {
    // Pour les prestations, pas de periode ni calcul prorata ni criteres
    data.type_periode = null;
    data.type_montant = 'fixe';
    data.criteres = null;
  }

  if (!data.libelle) {
    showToast('Le libelle est obligatoire', 'error');
    return;
  }

  try {
    const successMsg = isPrestation ? 'Prestation' : 'Cotisation';

    if (id) {
      await apiAdmin.put(`/tarifs-cotisation/${id}`, data);
      showToast(`${successMsg} modifiee`, 'success');
    } else {
      await apiAdmin.post('/tarifs-cotisation', data);
      showToast(`${successMsg} creee`, 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalTarif')).hide();

    // Recharger le bon cache selon le type
    if (isPrestation) {
      await chargerPrestations();
    } else {
      await chargerTarifs();
    }
  } catch (error) {
    console.error('[Tarification] Erreur sauvegarde:', error);
    showToast('Erreur: ' + (error.message || 'Erreur inconnue'), 'error');
  }
}

async function supprimerTarif(id, type = 'cotisation') {
  const isPrestation = type === 'prestation';
  const typeLabel = isPrestation ? 'cette prestation' : 'cette cotisation';

  if (!confirm(`Voulez-vous vraiment supprimer ${typeLabel} ?`)) {
    return;
  }

  try {
    await apiAdmin.delete(`/tarifs-cotisation/${id}`);
    showToast(isPrestation ? 'Prestation supprimee' : 'Cotisation supprimee', 'success');

    if (isPrestation) {
      await chargerPrestations();
    } else {
      await chargerTarifs();
    }
  } catch (error) {
    console.error('[Tarification] Erreur suppression:', error);
    showToast('Erreur: ' + (error.message || 'Impossible de supprimer'), 'error');
  }
}

async function toggleTarifActif(id) {
  try {
    await apiAdmin.patch(`/tarifs-cotisation/${id}/toggle-actif`);
    await chargerTarifs();
    showToast('Statut mis a jour', 'success');
  } catch (error) {
    console.error('[Tarification] Erreur:', error);
    showToast('Erreur', 'error');
  }
}

async function dupliquerTarif(id) {
  const tarif = tarifsCache.find(t => t.id === id);
  if (!tarif) return;

  const result = await Swal.fire({
    title: 'Dupliquer cette cotisation ?',
    text: `Une copie de "${tarif.libelle}" sera creee.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Oui, dupliquer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const newData = {
      libelle: tarif.libelle + ' (copie)',
      montant_base: tarif.montant_base,
      description: tarif.description,
      type_periode: tarif.type_periode,
      type_montant: tarif.type_montant,
      actif: false,
      par_defaut: false
    };

    await apiAdmin.post('/tarifs-cotisation', newData);
    showToast('Cotisation dupliquee', 'success');
    await chargerTarifs();
  } catch (error) {
    console.error('[Tarification] Erreur duplication:', error);
    showToast('Erreur', 'error');
  }
}

// ============================================================
// Modal Modificateur
// ============================================================

function ouvrirModalModificateur(id = null, tarifId = null) {
  const modal = new bootstrap.Modal(document.getElementById('modalModificateur'));
  const form = document.getElementById('formModificateur');
  form.reset();

  // Cacher la zone de configuration specifique
  document.getElementById('mod_condition_container').style.display = 'none';

  document.getElementById('modificateur_tarif_id').value = tarifId || '';

  // Generer checkboxes types applicables
  genererTypesApplicables();

  if (id) {
    const mod = modificateursCache.find(m => m.id === id);
    if (!mod) {
      showToast('Modificateur non trouve', 'error');
      return;
    }

    document.getElementById('modalModificateurTitle').innerHTML = '<i class="bi bi-pencil"></i> Modifier le modificateur';
    document.getElementById('modificateur_id').value = mod.id;
    document.getElementById('mod_code').value = mod.code || '';
    document.getElementById('mod_libelle').value = mod.libelle || '';
    document.getElementById('mod_type_calcul').value = mod.type_calcul || 'fixe';
    document.getElementById('mod_valeur').value = mod.valeur || 0;

    // Selectionner le type source et afficher sa configuration
    const typeSource = mod.type_source || '';
    const sourceRadio = document.querySelector(`input[name="mod_source"][value="${typeSource}"]`);
    if (sourceRadio) {
      sourceRadio.checked = true;
      // Charger la configuration specifique
      chargerConfigModificateur(mod);
    }

    updateModificateurPreview();
  } else {
    document.getElementById('modalModificateurTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Ajouter un modificateur';
    document.getElementById('modificateur_id').value = '';
  }

  modal.show();
}

function genererTypesApplicables() {
  const container = document.getElementById('mod_types_applicable');

  if (!typesTarifsCache || typesTarifsCache.length === 0) {
    container.innerHTML = '<small class="text-muted">S\'applique a tous les usagers</small>';
    return;
  }

  let html = '<div class="form-check"><input class="form-check-input" type="checkbox" id="mod_type_tous" checked><label class="form-check-label" for="mod_type_tous"><strong>Tous</strong></label></div>';

  typesTarifsCache.forEach(type => {
    html += `
      <div class="form-check">
        <input class="form-check-input mod-type-check" type="checkbox" id="mod_type_${type.id}" value="${type.id}" checked>
        <label class="form-check-label" for="mod_type_${type.id}">${escapeHtml(type.libelle)}</label>
      </div>
    `;
  });

  container.innerHTML = html;
}

function updateModificateurPreview() {
  const typeCalcul = document.getElementById('mod_type_calcul').value;
  const valeur = parseFloat(document.getElementById('mod_valeur').value) || 0;
  const suffix = document.getElementById('mod_valeur_suffix');
  const previewText = document.getElementById('mod_preview_text');

  suffix.textContent = typeCalcul === 'pourcentage' ? '%' : 'EUR';

  const base = 100;
  let reduction, final;

  if (typeCalcul === 'pourcentage') {
    reduction = base * valeur / 100;
    final = base - reduction;
    previewText.textContent = `-${valeur}% = -${reduction.toFixed(2)}EUR => ${final.toFixed(2)}EUR`;
  } else {
    reduction = valeur;
    final = Math.max(0, base - reduction);
    previewText.textContent = `-${valeur.toFixed(2)}EUR => ${final.toFixed(2)}EUR`;
  }
}

async function sauvegarderModificateur() {
  const id = document.getElementById('modificateur_id').value;
  const source = document.querySelector('input[name="mod_source"]:checked')?.value;

  if (!source) {
    showToast('Selectionnez un type de modificateur', 'error');
    return;
  }

  // Collecter la configuration specifique au type
  const configuration = collecterConfigModificateur(source);

  const data = {
    code: document.getElementById('mod_code').value.trim().toUpperCase(),
    libelle: document.getElementById('mod_libelle').value.trim(),
    type_source: source,
    type_calcul: document.getElementById('mod_type_calcul').value,
    valeur: parseFloat(document.getElementById('mod_valeur').value) || 0,
    ordre_application: modificateursCache.length + 1,
    configuration: configuration,
    actif: true
  };

  if (!data.code || !data.libelle) {
    showToast('Code et libelle obligatoires', 'error');
    return;
  }

  try {
    if (id) {
      await apiAdmin.put(`/tarification/regles-reduction/${id}`, data);
      showToast('Modificateur modifie', 'success');
    } else {
      await apiAdmin.post('/tarification/regles-reduction', data);
      showToast('Modificateur cree', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalModificateur')).hide();
    await chargerModificateurs();
    afficherCotisations(tarifsCache);
  } catch (error) {
    console.error('[Tarification] Erreur:', error);
    showToast('Erreur: ' + (error.message || 'Erreur inconnue'), 'error');
  }
}

async function supprimerModificateur(id) {
  const mod = modificateursCache.find(m => m.id === id);
  if (!mod) return;

  const result = await Swal.fire({
    title: 'Supprimer ce modificateur ?',
    text: mod.libelle,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    confirmButtonText: 'Supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    await apiAdmin.delete(`/tarification/regles-reduction/${id}`);
    showToast('Modificateur supprime', 'success');
    await chargerModificateurs();
    afficherCotisations(tarifsCache);
  } catch (error) {
    console.error('[Tarification] Erreur:', error);
    showToast('Erreur', 'error');
  }
}

// ============================================================
// Simulateur
// ============================================================

function ouvrirSimulateur(tarifId) {
  const tarif = tarifsCache.find(t => t.id === tarifId);
  if (!tarif) return;

  document.getElementById('sim_tarif_id').value = tarifId;

  // Peupler les selects
  populerSelectSimulateur();

  // Reset result
  document.getElementById('simulation-result').style.display = 'none';

  const modal = new bootstrap.Modal(document.getElementById('modalSimulateur'));
  modal.show();
}

function populerSelectSimulateur() {
  // Communes
  const selectCommune = document.getElementById('sim_commune');
  selectCommune.innerHTML = '<option value="">-- Aucune --</option>';
  communesCache.forEach(c => {
    selectCommune.innerHTML += `<option value="${c.id}">${escapeHtml(c.nom)}</option>`;
  });

  // Utilisateurs
  const selectUser = document.getElementById('sim_utilisateur');
  selectUser.innerHTML = '<option value="">-- Saisie manuelle --</option>';
  utilisateursCache.forEach(u => {
    const nom = `${u.nom || ''} ${u.prenom || ''}`.trim();
    selectUser.innerHTML += `<option value="${u.id}">${escapeHtml(nom)}</option>`;
  });

  // Pre-remplir quand on selectionne un user
  selectUser.onchange = () => {
    const userId = selectUser.value;
    if (!userId) return;

    const user = utilisateursCache.find(u => u.id == userId);
    if (user) {
      if (user.date_naissance) {
        const age = Math.floor((Date.now() - new Date(user.date_naissance)) / (365.25 * 24 * 60 * 60 * 1000));
        document.getElementById('sim_age').value = age;
      }
      if (user.quotient_familial) {
        document.getElementById('sim_qf').value = user.quotient_familial;
      }
      if (user.commune_id) {
        document.getElementById('sim_commune').value = user.commune_id;
      }
    }
  };

  // Date par defaut
  document.getElementById('sim_date').value = new Date().toISOString().split('T')[0];
}

async function lancerSimulation() {
  const tarifId = document.getElementById('sim_tarif_id').value;
  const resultContainer = document.getElementById('simulation-result');
  const detailContainer = document.getElementById('simulation-detail');

  resultContainer.style.display = 'block';
  detailContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-warning"></div></div>';

  try {
    const params = {
      tarif_cotisation_id: parseInt(tarifId),
      age: parseInt(document.getElementById('sim_age').value) || null,
      quotient_familial: parseInt(document.getElementById('sim_qf').value) || null,
      commune_id: parseInt(document.getElementById('sim_commune').value) || null,
      date_debut: document.getElementById('sim_date').value || null
    };

    const result = await apiAdmin.post('/tarification/simuler', params);

    afficherResultatSimulation(result);
  } catch (error) {
    console.error('[Tarification] Erreur simulation:', error);
    detailContainer.innerHTML = `<div class="alert alert-danger mb-0">${error.message || 'Erreur'}</div>`;
  }
}

function afficherResultatSimulation(result) {
  const container = document.getElementById('simulation-detail');

  let html = '<div class="simulation-result">';

  // Montant de base
  html += `<div class="simulation-step"><span>Tarif de base</span><span>${formatMontant(result.montant_base || result.montantBase)}</span></div>`;

  // Type tarif
  if (result.type_tarif || result.typeTarif) {
    const tt = result.type_tarif || result.typeTarif;
    html += `<div class="simulation-step"><span>Categorie: ${escapeHtml(tt.libelle || tt)}</span><span></span></div>`;
  }

  // Reductions
  if (result.reductions && result.reductions.length > 0) {
    result.reductions.forEach(red => {
      html += `<div class="simulation-step reduction"><span>${escapeHtml(red.libelle)}</span><span>-${formatMontant(red.montant)}</span></div>`;
    });
  }

  // Montant final
  const final = result.montant_final || result.montantFinal || 0;
  html += `<div class="simulation-step final"><span>Montant a payer</span><span>${formatMontant(final)}</span></div>`;

  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// Utilitaires
// ============================================================

function formatMontant(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant || 0);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }
}

// ============================================================
// Configuration dynamique des modificateurs
// ============================================================

/**
 * Affiche le formulaire de configuration specifique au type de modificateur
 */
function afficherConfigModificateur(type) {
  const container = document.getElementById('mod_condition_container');
  const content = document.getElementById('mod_condition_content');

  if (!type) {
    container.style.display = 'none';
    return;
  }

  let html = '';

  switch (type) {
    case 'commune':
      html = genererConfigCommune();
      break;
    case 'quotient_familial':
      html = genererConfigQF();
      break;
    case 'age':
      html = genererConfigAge();
      break;
    case 'multi_inscriptions':
      html = genererConfigMultiInscriptions();
      break;
    case 'fidelite':
      html = genererConfigFidelite();
      break;
    case 'statut_social':
      html = genererConfigStatutSocial();
      break;
    default:
      container.style.display = 'none';
      return;
  }

  content.innerHTML = html;
  container.style.display = 'block';
}

/**
 * Configuration pour le modificateur Commune
 */
function genererConfigCommune() {
  // Generer les options de communes
  let communesOptions = '<option value="">-- Selectionnez --</option>';
  communesCache.forEach(c => {
    communesOptions += `<option value="${c.id}">${escapeHtml(c.nom)} (${c.code_postal || ''})</option>`;
  });

  // Generer les options de communautes (si disponible)
  let communautesOptions = '<option value="">-- Selectionnez --</option>';
  communautesCache.forEach(cc => {
    communautesOptions += `<option value="${cc.id}">${escapeHtml(cc.nom)}</option>`;
  });

  return `
    <h6 class="mb-3"><i class="bi bi-geo-alt text-primary"></i> Configuration Commune</h6>

    <div class="mb-3">
      <label class="form-label">Mode de selection</label>
      <div class="d-flex gap-3">
        <div class="form-check">
          <input class="form-check-input" type="radio" name="commune_mode" id="commune_mode_liste" value="liste" checked onchange="toggleCommuneMode()">
          <label class="form-check-label" for="commune_mode_liste">Communes specifiques</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="radio" name="commune_mode" id="commune_mode_communaute" value="communaute" onchange="toggleCommuneMode()">
          <label class="form-check-label" for="commune_mode_communaute">Communaute de communes</label>
        </div>
      </div>
    </div>

    <div id="config_communes_liste">
      <label class="form-label">Communes eligibles</label>
      <select class="form-select" id="mod_communes_select" multiple size="5">
        ${communesOptions}
      </select>
      <small class="text-muted">Maintenez Ctrl pour selectionner plusieurs communes</small>
    </div>

    <div id="config_communes_communaute" style="display: none;">
      <label class="form-label">Communaute de communes</label>
      <select class="form-select" id="mod_communaute_select">
        ${communautesOptions}
      </select>
      <div class="mt-2">
        <a href="parametres-communautes-communes.html" class="btn btn-sm btn-outline-secondary" target="_blank">
          <i class="bi bi-gear"></i> Gerer les communautes
        </a>
      </div>
    </div>
  `;
}

function toggleCommuneMode() {
  const mode = document.querySelector('input[name="commune_mode"]:checked')?.value;
  document.getElementById('config_communes_liste').style.display = mode === 'liste' ? 'block' : 'none';
  document.getElementById('config_communes_communaute').style.display = mode === 'communaute' ? 'block' : 'none';
}

/**
 * Configuration pour le modificateur Quotient Familial
 */
function genererConfigQF() {
  let configOptions = '<option value="">-- Selectionnez un bareme --</option>';
  configurationsQFCache.forEach(config => {
    const defaut = config.par_defaut ? ' (par defaut)' : '';
    configOptions += `<option value="${config.id}">${escapeHtml(config.libelle || config.code)}${defaut}</option>`;
  });

  // Generer apercu du bareme selectionne
  const defaultConfig = configurationsQFCache.find(c => c.par_defaut) || configurationsQFCache[0];

  return `
    <h6 class="mb-3"><i class="bi bi-graph-up text-info"></i> Configuration Quotient Familial</h6>

    <div class="mb-3">
      <label class="form-label">Bareme QF a appliquer</label>
      <select class="form-select" id="mod_qf_config" onchange="afficherApercuQF()">
        ${configOptions}
      </select>
    </div>

    <div id="apercu_qf_container">
      ${defaultConfig ? genererApercuBaremeQF(defaultConfig) : '<p class="text-muted">Aucun bareme configure</p>'}
    </div>

    <div class="mt-2">
      <a href="parametres-baremes-qf.html" class="btn btn-sm btn-outline-info" target="_blank">
        <i class="bi bi-gear"></i> Gerer les baremes QF
      </a>
    </div>
  `;
}

function genererApercuBaremeQF(config) {
  if (!config || !config.tranches || config.tranches.length === 0) {
    return '<p class="text-muted">Aucune tranche configuree</p>';
  }

  let html = `
    <div class="table-responsive">
      <table class="table table-sm table-bordered mb-0">
        <thead class="table-light">
          <tr>
            <th>Tranche QF</th>
            <th>Reduction</th>
          </tr>
        </thead>
        <tbody>
  `;

  config.tranches.forEach(tranche => {
    const reduction = tranche.type_calcul === 'pourcentage'
      ? `-${tranche.valeur}%`
      : `-${formatMontant(tranche.valeur)}`;
    html += `
      <tr>
        <td>QF ${tranche.borne_min || 0} - ${tranche.borne_max || '+'}</td>
        <td class="text-danger">${reduction}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  return html;
}

function afficherApercuQF() {
  const configId = document.getElementById('mod_qf_config')?.value;
  const container = document.getElementById('apercu_qf_container');

  if (!configId) {
    container.innerHTML = '<p class="text-muted">Selectionnez un bareme</p>';
    return;
  }

  const config = configurationsQFCache.find(c => c.id == configId);
  container.innerHTML = config ? genererApercuBaremeQF(config) : '<p class="text-muted">Bareme non trouve</p>';
}

/**
 * Configuration pour le modificateur Age
 */
function genererConfigAge() {
  return `
    <h6 class="mb-3"><i class="bi bi-calendar-event text-secondary"></i> Configuration Age</h6>

    <div class="row">
      <div class="col-md-4">
        <label class="form-label">Condition</label>
        <select class="form-select" id="mod_age_operateur" onchange="toggleAgeInputs()">
          <option value="<">Inferieur a</option>
          <option value="<=">Inferieur ou egal a</option>
          <option value=">">Superieur a</option>
          <option value=">=">Superieur ou egal a</option>
          <option value="entre">Compris entre</option>
        </select>
      </div>
      <div class="col-md-4" id="age_min_container" style="display: none;">
        <label class="form-label">Age min</label>
        <div class="input-group">
          <input type="number" class="form-control" id="mod_age_min" min="0" max="120">
          <span class="input-group-text">ans</span>
        </div>
      </div>
      <div class="col-md-4" id="age_max_container">
        <label class="form-label">Age max</label>
        <div class="input-group">
          <input type="number" class="form-control" id="mod_age_max" min="0" max="120">
          <span class="input-group-text">ans</span>
        </div>
      </div>
    </div>

    <div class="alert alert-secondary mt-3 small">
      <i class="bi bi-info-circle"></i>
      L'age est calcule a la date d'inscription de la cotisation.
    </div>
  `;
}

function toggleAgeInputs() {
  const op = document.getElementById('mod_age_operateur')?.value;
  const minContainer = document.getElementById('age_min_container');
  const maxContainer = document.getElementById('age_max_container');
  const maxLabel = maxContainer?.querySelector('label');

  if (op === 'entre') {
    minContainer.style.display = 'block';
    maxContainer.style.display = 'block';
    if (maxLabel) maxLabel.textContent = 'Age max';
  } else if (op === '>' || op === '>=') {
    minContainer.style.display = 'block';
    maxContainer.style.display = 'none';
    if (minContainer.querySelector('label')) {
      minContainer.querySelector('label').textContent = 'Age';
    }
  } else {
    minContainer.style.display = 'none';
    maxContainer.style.display = 'block';
    if (maxLabel) maxLabel.textContent = 'Age';
  }
}

/**
 * Configuration pour le modificateur Multi-inscriptions
 */
function genererConfigMultiInscriptions() {
  return `
    <h6 class="mb-3"><i class="bi bi-people-fill text-success"></i> Configuration Multi-inscriptions</h6>

    <div class="mb-3">
      <label class="form-label">S'applique aux inscriptions de type</label>
      <div class="d-flex gap-3">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="multi_adultes" checked>
          <label class="form-check-label" for="multi_adultes">
            <i class="bi bi-person"></i> Adultes
          </label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="multi_enfants" checked>
          <label class="form-check-label" for="multi_enfants">
            <i class="bi bi-person-hearts"></i> Enfants
          </label>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6">
        <label class="form-label">A partir de combien d'inscriptions ?</label>
        <select class="form-select" id="multi_a_partir_de">
          <option value="2">2eme inscription</option>
          <option value="3">3eme inscription</option>
          <option value="4">4eme inscription</option>
          <option value="5">5eme inscription</option>
        </select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Reduction progressive ?</label>
        <select class="form-select" id="multi_progressif">
          <option value="non">Non, reduction fixe</option>
          <option value="oui">Oui, par pallier</option>
        </select>
      </div>
    </div>

    <div class="alert alert-success mt-3 small">
      <i class="bi bi-info-circle"></i>
      La reduction s'applique automatiquement aux membres d'une meme famille inscrits.
    </div>
  `;
}

/**
 * Configuration pour le modificateur Fidelite
 */
function genererConfigFidelite() {
  return `
    <h6 class="mb-3"><i class="bi bi-award text-warning"></i> Configuration Fidelite</h6>

    <div class="row">
      <div class="col-md-6">
        <label class="form-label">Nombre d'annees consecutives</label>
        <select class="form-select" id="fidelite_annees">
          <option value="2">2 ans ou plus</option>
          <option value="3">3 ans ou plus</option>
          <option value="5">5 ans ou plus</option>
          <option value="10">10 ans ou plus</option>
        </select>
      </div>
    </div>

    <div class="alert alert-warning mt-3 small">
      <i class="bi bi-info-circle"></i>
      La fidelite est calculee sur les cotisations payees sans interruption.
    </div>
  `;
}

/**
 * Configuration pour le modificateur Statut Social
 */
function genererConfigStatutSocial() {
  return `
    <h6 class="mb-3"><i class="bi bi-person-badge text-danger"></i> Configuration Statut Social</h6>

    <div class="mb-3">
      <label class="form-label">Statuts eligibles</label>
      <div class="row g-2">
        <div class="col-md-6">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="statut_demandeur_emploi" value="demandeur_emploi">
            <label class="form-check-label" for="statut_demandeur_emploi">Demandeur d'emploi</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="statut_rsa" value="rsa">
            <label class="form-check-label" for="statut_rsa">Beneficiaire RSA</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="statut_etudiant" value="etudiant">
            <label class="form-check-label" for="statut_etudiant">Etudiant</label>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="statut_retraite" value="retraite">
            <label class="form-check-label" for="statut_retraite">Retraite</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="statut_handicap" value="handicap">
            <label class="form-check-label" for="statut_handicap">Personne en situation de handicap</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="statut_autre" value="autre">
            <label class="form-check-label" for="statut_autre">Autre (justificatif)</label>
          </div>
        </div>
      </div>
    </div>

    <div class="alert alert-danger mt-3 small">
      <i class="bi bi-info-circle"></i>
      Un justificatif sera demande lors de l'inscription.
    </div>
  `;
}

/**
 * Collecter la configuration specifique du modificateur
 */
function collecterConfigModificateur(type) {
  const config = {};

  switch (type) {
    case 'commune':
      const communeMode = document.querySelector('input[name="commune_mode"]:checked')?.value;
      if (communeMode === 'liste') {
        const select = document.getElementById('mod_communes_select');
        config.communes = Array.from(select?.selectedOptions || []).map(o => parseInt(o.value));
      } else {
        config.communaute_id = parseInt(document.getElementById('mod_communaute_select')?.value) || null;
      }
      config.mode = communeMode;
      break;

    case 'quotient_familial':
      config.configuration_qf_id = parseInt(document.getElementById('mod_qf_config')?.value) || null;
      break;

    case 'age':
      config.operateur = document.getElementById('mod_age_operateur')?.value;
      config.age_min = parseInt(document.getElementById('mod_age_min')?.value) || null;
      config.age_max = parseInt(document.getElementById('mod_age_max')?.value) || null;
      break;

    case 'multi_inscriptions':
      config.inclure_adultes = document.getElementById('multi_adultes')?.checked;
      config.inclure_enfants = document.getElementById('multi_enfants')?.checked;
      config.a_partir_de = parseInt(document.getElementById('multi_a_partir_de')?.value) || 2;
      config.progressif = document.getElementById('multi_progressif')?.value === 'oui';
      break;

    case 'fidelite':
      config.annees_min = parseInt(document.getElementById('fidelite_annees')?.value) || 2;
      break;

    case 'statut_social':
      config.statuts = [];
      ['demandeur_emploi', 'rsa', 'etudiant', 'retraite', 'handicap', 'autre'].forEach(s => {
        if (document.getElementById(`statut_${s}`)?.checked) {
          config.statuts.push(s);
        }
      });
      break;
  }

  return config;
}

/**
 * Charger la configuration existante dans le formulaire
 */
function chargerConfigModificateur(mod) {
  if (!mod || !mod.type_source) return;

  const type = mod.type_source;
  const config = mod.configuration || {};

  // D'abord afficher le bon formulaire
  afficherConfigModificateur(type);

  // Puis remplir les valeurs
  setTimeout(() => {
    switch (type) {
      case 'commune':
        if (config.mode === 'communaute') {
          document.getElementById('commune_mode_communaute')?.click();
          if (config.communaute_id) {
            document.getElementById('mod_communaute_select').value = config.communaute_id;
          }
        } else if (config.communes?.length) {
          const select = document.getElementById('mod_communes_select');
          config.communes.forEach(id => {
            const option = select?.querySelector(`option[value="${id}"]`);
            if (option) option.selected = true;
          });
        }
        break;

      case 'quotient_familial':
        if (config.configuration_qf_id) {
          document.getElementById('mod_qf_config').value = config.configuration_qf_id;
          afficherApercuQF();
        }
        break;

      case 'age':
        if (config.operateur) {
          document.getElementById('mod_age_operateur').value = config.operateur;
          toggleAgeInputs();
        }
        if (config.age_min) document.getElementById('mod_age_min').value = config.age_min;
        if (config.age_max) document.getElementById('mod_age_max').value = config.age_max;
        break;

      case 'multi_inscriptions':
        document.getElementById('multi_adultes').checked = config.inclure_adultes !== false;
        document.getElementById('multi_enfants').checked = config.inclure_enfants !== false;
        if (config.a_partir_de) document.getElementById('multi_a_partir_de').value = config.a_partir_de;
        if (config.progressif) document.getElementById('multi_progressif').value = 'oui';
        break;

      case 'fidelite':
        if (config.annees_min) document.getElementById('fidelite_annees').value = config.annees_min;
        break;

      case 'statut_social':
        (config.statuts || []).forEach(s => {
          const el = document.getElementById(`statut_${s}`);
          if (el) el.checked = true;
        });
        break;
    }
  }, 100);
}

// ============================================================
// Modal Criteres Types de Tarifs
// ============================================================

/**
 * Ouvre le modal de configuration des criteres pour un type de tarif
 */
function ouvrirModalCriteres(typeId) {
  const type = typesTarifsCache.find(t => t.id === typeId);
  if (!type) {
    showToast('Type de tarif non trouve', 'error');
    return;
  }

  const modal = new bootstrap.Modal(document.getElementById('modalCriteres'));

  // Remplir le titre
  document.getElementById('criteres_type_nom').textContent = type.libelle;
  document.getElementById('criteres_type_id').value = typeId;

  // Remplir les selects
  remplirSelectsCriteres();

  // Charger les criteres existants
  const criteres = type.criteres || {};

  // Reset form
  document.getElementById('formCriteres').reset();

  // Critere Age
  if (criteres.age) {
    document.getElementById('critere_age_actif').checked = true;
    document.getElementById('critere_age_config').style.display = 'block';
    document.getElementById('critere_age_operateur').value = criteres.age.operateur || '<';
    if (criteres.age.min) document.getElementById('critere_age_min').value = criteres.age.min;
    if (criteres.age.max) document.getElementById('critere_age_max').value = criteres.age.max;
    toggleCritereAgeInputs();
  } else {
    document.getElementById('critere_age_actif').checked = false;
    document.getElementById('critere_age_config').style.display = 'none';
  }

  // Critere Sexe
  if (criteres.sexe && criteres.sexe.length > 0) {
    document.getElementById('critere_sexe_actif').checked = true;
    document.getElementById('critere_sexe_config').style.display = 'block';
    document.getElementById('critere_sexe_M').checked = criteres.sexe.includes('M');
    document.getElementById('critere_sexe_F').checked = criteres.sexe.includes('F');
    document.getElementById('critere_sexe_A').checked = criteres.sexe.includes('A');
  } else {
    document.getElementById('critere_sexe_actif').checked = false;
    document.getElementById('critere_sexe_config').style.display = 'none';
    // Reset checkboxes
    document.getElementById('critere_sexe_M').checked = true;
    document.getElementById('critere_sexe_F').checked = true;
    document.getElementById('critere_sexe_A').checked = true;
  }

  // Critere Commune
  if (criteres.commune) {
    document.getElementById('critere_commune_actif').checked = true;
    document.getElementById('critere_commune_config').style.display = 'block';
    if (criteres.commune.type === 'communaute') {
      document.getElementById('critere_commune_type_communaute').checked = true;
      document.getElementById('critere_communaute_id').value = criteres.commune.id || '';
    } else {
      document.getElementById('critere_commune_type_liste').checked = true;
      const select = document.getElementById('critere_communes_ids');
      (criteres.commune.ids || []).forEach(id => {
        const option = select.querySelector(`option[value="${id}"]`);
        if (option) option.selected = true;
      });
    }
    toggleCritereCommuneInputs();
  } else {
    document.getElementById('critere_commune_actif').checked = false;
    document.getElementById('critere_commune_config').style.display = 'none';
  }

  // Critere Adhesion
  document.getElementById('critere_adhesion_actif').checked = criteres.adhesion_active === true;

  // Critere Tags
  if (criteres.tags && criteres.tags.length > 0) {
    document.getElementById('critere_tags_actif').checked = true;
    document.getElementById('critere_tags_config').style.display = 'block';
    // Cocher les tags
    criteres.tags.forEach(tagId => {
      const checkbox = document.getElementById(`critere_tag_${tagId}`);
      if (checkbox) checkbox.checked = true;
    });
  } else {
    document.getElementById('critere_tags_actif').checked = false;
    document.getElementById('critere_tags_config').style.display = 'none';
  }

  modal.show();
}

/**
 * Remplit les selects du modal criteres
 */
function remplirSelectsCriteres() {
  // Communautes
  const selectCommunaute = document.getElementById('critere_communaute_id');
  selectCommunaute.innerHTML = '<option value="">-- Selectionnez une communaute --</option>';
  communautesCache.forEach(cc => {
    selectCommunaute.innerHTML += `<option value="${cc.id}">${escapeHtml(cc.nom)}</option>`;
  });

  // Communes
  const selectCommunes = document.getElementById('critere_communes_ids');
  selectCommunes.innerHTML = '';
  communesCache.forEach(c => {
    selectCommunes.innerHTML += `<option value="${c.id}">${escapeHtml(c.nom)} (${c.code_postal || ''})</option>`;
  });

  // Tags
  const tagsContainer = document.getElementById('critere_tags_liste');
  if (tagsCache.length === 0) {
    tagsContainer.innerHTML = '<p class="text-muted">Aucun tag configure. <a href="parametres-tags-utilisateur.html">Creer des tags</a></p>';
  } else {
    tagsContainer.innerHTML = tagsCache.map(tag => `
      <div class="form-check form-check-inline">
        <input class="form-check-input" type="checkbox" id="critere_tag_${tag.id}" value="${tag.id}">
        <label class="form-check-label" for="critere_tag_${tag.id}" style="color: ${tag.couleur}">
          <i class="bi ${tag.icone || 'bi-tag'}"></i> ${escapeHtml(tag.libelle)}
        </label>
      </div>
    `).join('');
  }
}

/**
 * Toggle l'affichage d'une section de critere
 */
function toggleCritereSection(section) {
  const checkbox = document.getElementById(`critere_${section}_actif`);
  const config = document.getElementById(`critere_${section}_config`);
  if (config) {
    config.style.display = checkbox.checked ? 'block' : 'none';
  }
}

/**
 * Toggle les inputs d'age selon l'operateur
 */
function toggleCritereAgeInputs() {
  const op = document.getElementById('critere_age_operateur').value;
  const minCol = document.getElementById('critere_age_min_col');
  const maxCol = document.getElementById('critere_age_max_col');
  const etLabel = document.getElementById('critere_age_et');

  if (op === 'entre') {
    minCol.style.display = 'block';
    maxCol.style.display = 'block';
    etLabel.style.display = 'block';
  } else if (op === '>' || op === '>=') {
    minCol.style.display = 'block';
    maxCol.style.display = 'none';
    etLabel.style.display = 'none';
  } else {
    minCol.style.display = 'none';
    maxCol.style.display = 'block';
    etLabel.style.display = 'none';
  }
}

/**
 * Toggle les inputs de commune selon le type
 */
function toggleCritereCommuneInputs() {
  const type = document.querySelector('input[name="critere_commune_type"]:checked')?.value;
  document.getElementById('critere_communaute_select_container').style.display = type === 'communaute' ? 'block' : 'none';
  document.getElementById('critere_communes_liste_container').style.display = type === 'liste' ? 'block' : 'none';
}

/**
 * Sauvegarde les criteres du type de tarif
 */
async function sauvegarderCriteres() {
  const typeId = document.getElementById('criteres_type_id').value;
  if (!typeId) return;

  const criteres = {};

  // Age
  if (document.getElementById('critere_age_actif').checked) {
    const op = document.getElementById('critere_age_operateur').value;
    criteres.age = { operateur: op };
    if (op === 'entre') {
      criteres.age.min = parseInt(document.getElementById('critere_age_min').value) || 0;
      criteres.age.max = parseInt(document.getElementById('critere_age_max').value) || 999;
    } else if (op === '>' || op === '>=') {
      criteres.age.min = parseInt(document.getElementById('critere_age_min').value) || 0;
    } else {
      criteres.age.max = parseInt(document.getElementById('critere_age_max').value) || 999;
    }
  }

  // Sexe
  if (document.getElementById('critere_sexe_actif').checked) {
    const sexes = [];
    if (document.getElementById('critere_sexe_M').checked) sexes.push('M');
    if (document.getElementById('critere_sexe_F').checked) sexes.push('F');
    if (document.getElementById('critere_sexe_A').checked) sexes.push('A');
    if (sexes.length > 0 && sexes.length < 3) {
      criteres.sexe = sexes;
    }
  }

  // Commune
  if (document.getElementById('critere_commune_actif').checked) {
    const type = document.querySelector('input[name="critere_commune_type"]:checked')?.value;
    if (type === 'communaute') {
      const id = parseInt(document.getElementById('critere_communaute_id').value);
      if (id) criteres.commune = { type: 'communaute', id };
    } else {
      const select = document.getElementById('critere_communes_ids');
      const ids = Array.from(select.selectedOptions).map(o => parseInt(o.value));
      if (ids.length > 0) criteres.commune = { type: 'liste', ids };
    }
  }

  // Adhesion
  if (document.getElementById('critere_adhesion_actif').checked) {
    criteres.adhesion_active = true;
  }

  // Tags
  if (document.getElementById('critere_tags_actif').checked) {
    const tagIds = [];
    tagsCache.forEach(tag => {
      const checkbox = document.getElementById(`critere_tag_${tag.id}`);
      if (checkbox?.checked) tagIds.push(tag.id);
    });
    if (tagIds.length > 0) criteres.tags = tagIds;
  }

  // Sauvegarder via API
  try {
    await apiAdmin.put(`/tarification/types-tarifs/${typeId}`, {
      criteres: Object.keys(criteres).length > 0 ? criteres : null
    });

    showToast('Criteres mis a jour', 'success');
    bootstrap.Modal.getInstance(document.getElementById('modalCriteres')).hide();

    // Recharger les types
    await chargerTypesTarifs();
    afficherCotisations(tarifsCache);
  } catch (error) {
    console.error('[Tarification] Erreur sauvegarde criteres:', error);
    showToast('Erreur: ' + (error.message || 'Erreur inconnue'), 'error');
  }
}

// ============================================================
// Exports globaux
// ============================================================

window.ouvrirModalNouveauTarif = ouvrirModalNouveauTarif;
window.ouvrirModalTarif = ouvrirModalTarif;
window.sauvegarderTarif = sauvegarderTarif;
window.supprimerTarif = supprimerTarif;
window.toggleTarifActif = toggleTarifActif;
window.toggleTarifType = toggleTarifType;
window.dupliquerTarif = dupliquerTarif;

window.ouvrirModalModificateur = ouvrirModalModificateur;
window.sauvegarderModificateur = sauvegarderModificateur;
window.supprimerModificateur = supprimerModificateur;
window.updateModificateurPreview = updateModificateurPreview;

window.afficherConfigModificateur = afficherConfigModificateur;
window.toggleCommuneMode = toggleCommuneMode;
window.afficherApercuQF = afficherApercuQF;
window.toggleAgeInputs = toggleAgeInputs;

window.ouvrirSimulateur = ouvrirSimulateur;
window.lancerSimulation = lancerSimulation;

window.ouvrirModalCriteres = ouvrirModalCriteres;
window.sauvegarderCriteres = sauvegarderCriteres;
window.toggleCritereSection = toggleCritereSection;
window.toggleCritereAgeInputs = toggleCritereAgeInputs;
window.toggleCritereCommuneInputs = toggleCritereCommuneInputs;

// Criteres sur tarifs cotisation (modal tarif)
window.toggleTarifCritereSection = toggleTarifCritereSection;
window.toggleTarifCritereAgeInputs = toggleTarifCritereAgeInputs;
window.toggleTarifCritereCommuneInputs = toggleTarifCritereCommuneInputs;

window.ajouterTypeTarif = function() {
  // TODO: Ouvrir modal creation type tarif
  showToast('Fonctionnalite a venir', 'info');
};
