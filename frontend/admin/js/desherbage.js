/**
 * Desherbage - Gestion des articles jamais empruntes
 * Page dediee au desherbage multi-modules avec filtres et detail
 */

// Configuration des modules
const MODULE_CONFIG = {
    ludotheque: {
        code: 'ludotheque',
        type: 'jeu',
        icon: 'dice-6',
        color: 'primary',
        label: 'Ludotheque',
        itemLabel: 'jeux',
        apiBase: '/jeux',
        emplacementsApi: '/plans/refs/emplacements/jeu'
    },
    bibliotheque: {
        code: 'bibliotheque',
        type: 'livre',
        icon: 'book',
        color: 'success',
        label: 'Bibliotheque',
        itemLabel: 'livres',
        apiBase: '/livres',
        emplacementsApi: '/plans/refs/emplacements/livre'
    },
    filmotheque: {
        code: 'filmotheque',
        type: 'film',
        icon: 'film',
        color: 'danger',
        label: 'Filmotheque',
        itemLabel: 'films',
        apiBase: '/films',
        emplacementsApi: '/plans/refs/emplacements/film'
    },
    discotheque: {
        code: 'discotheque',
        type: 'disque',
        icon: 'disc',
        color: 'warning',
        label: 'Discotheque',
        itemLabel: 'disques',
        apiBase: '/disques',
        emplacementsApi: '/plans/refs/emplacements/disque'
    }
};

// Mapping des codes collection vers codes module
const COLLECTION_TO_MODULE = {
    'jeux': 'ludotheque',
    'livres': 'bibliotheque',
    'films': 'filmotheque',
    'disques': 'discotheque'
};

// Etat global
let accessibleModules = [];
let currentModule = null;
let currentFilters = { thematique: null, emplacement: null };
let currentItems = [];
let selectedItem = null;
let thematiquesCache = {};
let emplacementsCache = {};
let plansCache = {};

/**
 * Parse modules_actifs qui peut etre un array ou une string JSON (MariaDB)
 */
function parseModulesActifs(modules) {
    if (!modules) return null;
    if (Array.isArray(modules)) return modules;
    if (typeof modules === 'string') {
        try {
            const parsed = JSON.parse(modules);
            return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    applyModuleColors();
    await initTemplate('desherbage');
    initializeModules();

    // Ecouter les changements de structure pour reinitialiser les modules
    window.addEventListener('structureChanged', () => {
        initializeModules();
    });
});

/**
 * Recupere les modules accessibles pour la structure courante
 * Pattern copie de emprunts.html
 * @returns {Array|null} Liste des codes module ou null pour tous
 */
function getStructureModules() {
    // Si pas de structure selectionnee, verifier si admin global
    if (!window.CURRENT_STRUCTURE_ID) {
        // Admin global ou pas de filtre = tous les modules
        if (window.IS_ADMIN_GLOBAL || !window.USER_STRUCTURES || window.USER_STRUCTURES.length === 0) {
            return null; // null = tous les modules
        }
        // Pas de structure selectionnee mais pas admin = union de tous les modules accessibles
        const allModules = new Set();
        window.USER_STRUCTURES.forEach(s => {
            const modules = parseModulesActifs(s.modules_actifs);
            if (modules) {
                modules.forEach(m => allModules.add(COLLECTION_TO_MODULE[m] || m));
            }
        });
        return allModules.size > 0 ? Array.from(allModules) : null;
    }

    // Structure selectionnee: recuperer ses modules
    const currentStructure = window.USER_STRUCTURES?.find(s => s.id === window.CURRENT_STRUCTURE_ID);
    const modules = parseModulesActifs(currentStructure?.modules_actifs);
    if (!modules) {
        return null;
    }

    // Convertir codes collection en codes module
    return modules.map(m => COLLECTION_TO_MODULE[m] || m);
}

/**
 * Initialise les modules accessibles (pattern emprunts.html)
 */
function initializeModules() {
    const structureModules = getStructureModules();

    if (structureModules === null) {
        // Acces a tous les modules
        accessibleModules = ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'];
    } else {
        // Filtrer aux modules de la structure
        accessibleModules = structureModules.filter(m =>
            ['ludotheque', 'bibliotheque', 'filmotheque', 'discotheque'].includes(m)
        );
    }

    if (accessibleModules.length === 0) {
        // Message si aucun module accessible
        const currentStructure = typeof getCurrentStructure === 'function' ? getCurrentStructure() : null;
        const tabsContainer = document.getElementById('moduleTabs');
        const contentContainer = document.getElementById('moduleTabContent');

        tabsContainer.innerHTML = '';
        contentContainer.innerHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${currentStructure
                    ? `Aucun module de collection n'est actif pour la structure "<strong>${escapeHtml(currentStructure.nom)}</strong>".
                       <br><small class="text-muted">Verifiez les modules actifs dans les parametres de la structure.</small>`
                    : 'Aucun module accessible. Selectionnez une structure ou contactez un administrateur.'}
            </div>
        `;
        return;
    }

    // Vider les caches
    thematiquesCache = {};
    emplacementsCache = {};
    plansCache = {};
    currentModule = null;
    selectedItem = null;

    renderModuleTabs();

    // Activer le premier module
    if (accessibleModules.length > 0) {
        switchModule(accessibleModules[0]);
    }
}

/**
 * Applique les couleurs personnalisees des modules (depuis admin-template.js)
 */
function applyModuleColors() {
    const root = document.documentElement;

    // Appliquer les couleurs de fond
    if (typeof getModuleColors === 'function') {
        const colors = getModuleColors();
        if (colors.ludotheque) root.style.setProperty('--color-ludotheque', colors.ludotheque);
        if (colors.bibliotheque) root.style.setProperty('--color-bibliotheque', colors.bibliotheque);
        if (colors.filmotheque) root.style.setProperty('--color-filmotheque', colors.filmotheque);
        if (colors.discotheque) root.style.setProperty('--color-discotheque', colors.discotheque);
    }

    // Appliquer les couleurs de texte
    if (typeof getModuleTextColors === 'function') {
        const textColors = getModuleTextColors();
        if (textColors.ludotheque) root.style.setProperty('--textcolor-ludotheque', textColors.ludotheque);
        if (textColors.bibliotheque) root.style.setProperty('--textcolor-bibliotheque', textColors.bibliotheque);
        if (textColors.filmotheque) root.style.setProperty('--textcolor-filmotheque', textColors.filmotheque);
        if (textColors.discotheque) root.style.setProperty('--textcolor-discotheque', textColors.discotheque);
    }
}

/**
 * Genere les onglets pour chaque module accessible
 */
function renderModuleTabs() {
    const tabsContainer = document.getElementById('moduleTabs');
    const contentContainer = document.getElementById('moduleTabContent');

    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    // Mapping des icones Bootstrap pour chaque module
    const moduleIcons = {
        ludotheque: 'bi-dice-5',
        bibliotheque: 'bi-book',
        filmotheque: 'bi-film',
        discotheque: 'bi-disc'
    };

    accessibleModules.forEach((moduleCode, index) => {
        const config = MODULE_CONFIG[moduleCode];
        if (!config) return;

        const icon = moduleIcons[moduleCode] || `bi-${config.icon}`;

        // Creer l'onglet avec style module-tab
        const tabLi = document.createElement('li');
        tabLi.className = 'nav-item';
        tabLi.setAttribute('role', 'presentation');
        tabLi.innerHTML = `
            <button class="nav-link module-tab ${moduleCode} ${index === 0 ? 'active' : ''}"
                    id="${moduleCode}-tab"
                    data-bs-toggle="pill"
                    data-bs-target="#${moduleCode}-pane"
                    type="button"
                    role="tab"
                    onclick="switchModule('${moduleCode}')">
                <span class="module-icon"><i class="bi ${icon}"></i></span>
                <span class="d-none d-md-inline">${config.label}</span>
            </button>
        `;
        tabsContainer.appendChild(tabLi);

        // Creer le contenu de l'onglet avec bordure coloree
        const tabPane = document.createElement('div');
        tabPane.className = `tab-pane fade ${index === 0 ? 'show active' : ''}`;
        tabPane.id = `${moduleCode}-pane`;
        tabPane.setAttribute('role', 'tabpanel');
        tabPane.innerHTML = createModuleContent(moduleCode, config);
        contentContainer.appendChild(tabPane);
    });
}

/**
 * Cree le contenu HTML d'un module
 */
function createModuleContent(moduleCode, config) {
    return `
        <div class="content-panel ${moduleCode} p-3 bg-white rounded">
        <!-- Filtres -->
        <div class="filter-section mb-4">
            <div class="row g-3 align-items-end">
                <div class="col-md-4">
                    <label class="form-label"><i class="bi bi-tags"></i> Thematique</label>
                    <select class="form-select" id="${moduleCode}-thematique" onchange="applyFilters('${moduleCode}')">
                        <option value="">Toutes les thematiques</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label"><i class="bi bi-geo-alt"></i> Emplacement</label>
                    <select class="form-select" id="${moduleCode}-emplacement" onchange="applyFilters('${moduleCode}')">
                        <option value="">Tous les emplacements</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <button class="btn btn-outline-secondary w-100" onclick="resetFilters('${moduleCode}')">
                        <i class="bi bi-x-circle"></i> Reinitialiser
                    </button>
                </div>
            </div>
        </div>

        <!-- Layout 2 colonnes -->
        <div class="row">
            <!-- Liste des articles -->
            <div class="col-md-5">
                <div class="card">
                    <div class="card-header bg-danger bg-opacity-10">
                        <h5 class="card-title mb-0 text-danger">
                            <i class="bi bi-trash3"></i> Articles jamais empruntes
                            <span class="badge bg-danger" id="${moduleCode}-count">0</span>
                        </h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="item-list" id="${moduleCode}-list">
                            <div class="text-center p-4">
                                <div class="spinner-border" role="status" style="color: var(--color-${moduleCode})">
                                    <span class="visually-hidden">Chargement...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detail de l'article -->
            <div class="col-md-7">
                <div class="detail-panel" id="${moduleCode}-detail">
                    <div class="card">
                        <div class="card-body text-center text-muted py-5">
                            <i class="bi bi-hand-index fs-1 mb-3 d-block"></i>
                            <p>Selectionnez un article dans la liste pour voir ses details</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div><!-- /content-panel -->
    `;
}

/**
 * Change de module
 */
async function switchModule(moduleCode) {
    currentModule = moduleCode;
    currentFilters = { thematique: null, emplacement: null };
    selectedItem = null;

    // Charger les filtres
    await Promise.all([
        loadThematiques(moduleCode),
        loadEmplacements(moduleCode)
    ]);

    // Charger la liste
    await loadItems(moduleCode);
}

/**
 * Charge les thematiques pour un module
 */
async function loadThematiques(moduleCode) {
    if (thematiquesCache[moduleCode]) {
        populateThematiquesSelect(moduleCode, thematiquesCache[moduleCode]);
        return;
    }

    try {
        const data = await apiRequest(`/thematiques?type=theme&limit=100`);
        const thematiques = data.thematiques || data || [];
        thematiquesCache[moduleCode] = thematiques;
        populateThematiquesSelect(moduleCode, thematiques);
    } catch (error) {
        console.error('Error loading thematiques:', error);
    }
}

function populateThematiquesSelect(moduleCode, thematiques) {
    const select = document.getElementById(`${moduleCode}-thematique`);
    if (!select) return;

    // Garder la premiere option
    select.innerHTML = '<option value="">Toutes les thematiques</option>';

    thematiques.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.nom;
        select.appendChild(option);
    });
}

/**
 * Charge les emplacements pour un module
 */
async function loadEmplacements(moduleCode) {
    const config = MODULE_CONFIG[moduleCode];
    if (!config) return;

    if (emplacementsCache[moduleCode]) {
        populateEmplacementsSelect(moduleCode, emplacementsCache[moduleCode]);
        return;
    }

    try {
        const data = await apiRequest(config.emplacementsApi);
        const emplacements = Array.isArray(data) ? data : (data.emplacements || []);
        emplacementsCache[moduleCode] = emplacements;
        populateEmplacementsSelect(moduleCode, emplacements);
    } catch (error) {
        console.error('Error loading emplacements:', error);
    }
}

function populateEmplacementsSelect(moduleCode, emplacements) {
    const select = document.getElementById(`${moduleCode}-emplacement`);
    if (!select) return;

    select.innerHTML = '<option value="">Tous les emplacements</option>';

    emplacements.forEach(e => {
        const option = document.createElement('option');
        option.value = e.id;
        option.textContent = e.code ? `${e.code} - ${e.libelle}` : e.libelle;
        select.appendChild(option);
    });
}

/**
 * Applique les filtres
 */
function applyFilters(moduleCode) {
    currentFilters.thematique = document.getElementById(`${moduleCode}-thematique`)?.value || null;
    currentFilters.emplacement = document.getElementById(`${moduleCode}-emplacement`)?.value || null;
    loadItems(moduleCode);
}

/**
 * Reinitialise les filtres
 */
function resetFilters(moduleCode) {
    document.getElementById(`${moduleCode}-thematique`).value = '';
    document.getElementById(`${moduleCode}-emplacement`).value = '';
    currentFilters = { thematique: null, emplacement: null };
    loadItems(moduleCode);
}

/**
 * Charge la liste des articles jamais empruntes
 */
async function loadItems(moduleCode) {
    const listContainer = document.getElementById(`${moduleCode}-list`);
    const countBadge = document.getElementById(`${moduleCode}-count`);
    const config = MODULE_CONFIG[moduleCode];

    if (!listContainer || !config) return;

    listContainer.innerHTML = `
        <div class="text-center p-4">
            <div class="spinner-border text-${config.color}" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
        </div>
    `;

    try {
        let url = `/stats/never-borrowed?module=${moduleCode}&limit=100`;
        if (currentFilters.thematique) {
            url += `&thematique=${currentFilters.thematique}`;
        }
        if (currentFilters.emplacement) {
            url += `&emplacement=${currentFilters.emplacement}`;
        }

        const data = await apiRequest(url);
        currentItems = data.items || [];

        countBadge.textContent = data.total || currentItems.length;

        if (currentItems.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center p-4 text-success">
                    <i class="bi bi-check-circle fs-1 d-block mb-2"></i>
                    <p class="mb-0">Aucun article correspondant aux criteres</p>
                    <small class="text-muted">Tous les ${config.itemLabel} ont ete empruntes au moins une fois!</small>
                </div>
            `;
            return;
        }

        renderItemsList(moduleCode, currentItems);
    } catch (error) {
        console.error('Error loading items:', error);
        listContainer.innerHTML = `
            <div class="text-center p-4 text-danger">
                <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
                <p class="mb-0">Erreur lors du chargement</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

/**
 * Affiche la liste des articles
 */
function renderItemsList(moduleCode, items) {
    const listContainer = document.getElementById(`${moduleCode}-list`);

    listContainer.innerHTML = items.map(item => `
        <div class="item-row p-3 border-bottom ${selectedItem?.id === item.id ? 'selected' : ''}"
             onclick="selectItem('${moduleCode}', ${item.id})"
             data-id="${item.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${escapeHtml(item.titre || 'Sans titre')}</h6>
                    <small class="text-muted">
                        ${item.date_acquisition
                            ? '<i class="bi bi-calendar"></i> Acquis le ' + formatDate(item.date_acquisition)
                            : '<i class="bi bi-calendar-x"></i> Date inconnue'}
                    </small>
                </div>
                <i class="bi bi-chevron-right text-muted"></i>
            </div>
        </div>
    `).join('');
}

/**
 * Selectionne un article et affiche ses details
 */
async function selectItem(moduleCode, itemId) {
    const config = MODULE_CONFIG[moduleCode];
    if (!config) return;

    // Mettre a jour la selection visuelle
    document.querySelectorAll(`#${moduleCode}-list .item-row`).forEach(row => {
        row.classList.remove('selected');
    });
    document.querySelector(`#${moduleCode}-list .item-row[data-id="${itemId}"]`)?.classList.add('selected');

    const detailContainer = document.getElementById(`${moduleCode}-detail`);
    detailContainer.innerHTML = `
        <div class="card">
            <div class="card-body text-center py-5">
                <div class="spinner-border text-${config.color}" role="status">
                    <span class="visually-hidden">Chargement...</span>
                </div>
            </div>
        </div>
    `;

    try {
        // Charger les details de l'article
        const item = await apiRequest(`${config.apiBase}/${itemId}`);
        selectedItem = item;
        renderItemDetail(moduleCode, item);
    } catch (error) {
        console.error('Error loading item details:', error);
        detailContainer.innerHTML = `
            <div class="card">
                <div class="card-body text-center text-danger py-5">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
                    <p>Erreur lors du chargement des details</p>
                </div>
            </div>
        `;
    }
}

/**
 * Affiche les details d'un article
 */
function renderItemDetail(moduleCode, item) {
    const config = MODULE_CONFIG[moduleCode];
    const detailContainer = document.getElementById(`${moduleCode}-detail`);

    // Obtenir l'emplacement
    const emplacement = getEmplacementFromItem(moduleCode, item);

    detailContainer.innerHTML = `
        <div class="card">
            <div class="card-header bg-${config.color} bg-opacity-10">
                <h5 class="card-title mb-0">
                    <i class="bi bi-${config.icon} text-${config.color}"></i>
                    ${escapeHtml(item.titre || 'Sans titre')}
                </h5>
            </div>
            <div class="card-body">
                <!-- Image -->
                ${item.image_url ? `
                    <div class="text-center mb-3">
                        <img src="${item.image_url}" alt="${escapeHtml(item.titre)}" class="detail-image rounded">
                    </div>
                ` : ''}

                <!-- Infos principales -->
                <div class="row mb-3">
                    ${renderItemInfo(moduleCode, item)}
                </div>

                <!-- Statut -->
                <div class="mb-3">
                    <label class="info-label">Statut</label>
                    <div class="input-group">
                        <select class="form-select" id="detail-statut">
                            <option value="disponible" ${item.statut === 'disponible' ? 'selected' : ''}>Disponible</option>
                            <option value="indisponible" ${item.statut === 'indisponible' ? 'selected' : ''}>Indisponible</option>
                            <option value="reserve" ${item.statut === 'reserve' ? 'selected' : ''}>Reserve</option>
                        </select>
                        <button class="btn btn-primary" onclick="updateStatus('${moduleCode}', ${item.id})">
                            <i class="bi bi-check"></i> Mettre a jour
                        </button>
                    </div>
                </div>

                <!-- Mini-plan -->
                <div class="mb-3">
                    <label class="info-label"><i class="bi bi-map"></i> Localisation</label>
                    <div class="mini-plan-container" id="mini-plan-${item.id}" style="min-height: 150px;">
                        ${emplacement
                            ? `<div class="text-center p-3">
                                 <span class="badge" style="background-color: ${emplacement.couleur || '#6c757d'}">
                                   <i class="bi bi-${emplacement.icone || 'geo-alt'}"></i>
                                   ${emplacement.code ? emplacement.code + ' - ' : ''}${emplacement.libelle}
                                 </span>
                                 <div id="plan-svg-${item.id}" class="mt-2"></div>
                               </div>`
                            : '<div class="text-center text-muted p-3"><i class="bi bi-geo-alt-fill"></i> Emplacement non defini</div>'
                        }
                    </div>
                </div>

                <!-- Notes -->
                <div class="mb-3">
                    <label class="info-label"><i class="bi bi-sticky"></i> Notes de desherbage</label>
                    <textarea class="form-control" id="detail-notes" rows="3"
                              placeholder="Ajoutez vos notes (etat, raison du retrait, destination...)">${escapeHtml(item.notes || '')}</textarea>
                    <button class="btn btn-outline-secondary btn-sm mt-2" onclick="saveNotes('${moduleCode}', ${item.id})">
                        <i class="bi bi-save"></i> Enregistrer les notes
                    </button>
                </div>

                <!-- Actions -->
                <div class="d-grid gap-2">
                    <button class="btn btn-outline-${config.color}" onclick="openFullDetail('${moduleCode}', ${item.id})">
                        <i class="bi bi-box-arrow-up-right"></i> Voir la fiche complete
                    </button>
                </div>
            </div>
        </div>
    `;

    // Charger le mini-plan si emplacement defini
    if (emplacement && emplacement.id) {
        loadMiniPlan(moduleCode, item.id, emplacement);
    }
}

/**
 * Obtient l'emplacement d'un article
 */
function getEmplacementFromItem(moduleCode, item) {
    // Selon le module, le champ peut etre different
    if (item.emplacementRef) return item.emplacementRef;
    if (item.emplacement) return item.emplacement;

    // Chercher dans le cache
    const emplacements = emplacementsCache[moduleCode] || [];
    const emplacementId = item.emplacement_id || item.emplacement_jeu_id || item.emplacement_livre_id || item.emplacement_film_id || item.emplacement_disque_id;

    if (emplacementId) {
        return emplacements.find(e => e.id === emplacementId);
    }

    return null;
}

/**
 * Affiche les informations specifiques selon le type de module
 */
function renderItemInfo(moduleCode, item) {
    const infos = [];

    switch (moduleCode) {
        case 'ludotheque':
            if (item.editeur) infos.push({ label: 'Editeur', value: item.editeur });
            if (item.nb_joueurs_min || item.nb_joueurs_max) {
                infos.push({ label: 'Joueurs', value: `${item.nb_joueurs_min || '?'} - ${item.nb_joueurs_max || '?'}` });
            }
            if (item.duree_min || item.duree_max) {
                infos.push({ label: 'Duree', value: `${item.duree_min || '?'} - ${item.duree_max || '?'} min` });
            }
            if (item.age_min) infos.push({ label: 'Age', value: `${item.age_min}+` });
            break;

        case 'bibliotheque':
            if (item.auteur) infos.push({ label: 'Auteur', value: item.auteur });
            if (item.editeur) infos.push({ label: 'Editeur', value: item.editeur });
            if (item.isbn) infos.push({ label: 'ISBN', value: item.isbn });
            if (item.annee_publication) infos.push({ label: 'Annee', value: item.annee_publication });
            break;

        case 'filmotheque':
            if (item.realisateur) infos.push({ label: 'Realisateur', value: item.realisateur });
            if (item.annee) infos.push({ label: 'Annee', value: item.annee });
            if (item.duree) infos.push({ label: 'Duree', value: `${item.duree} min` });
            break;

        case 'discotheque':
            if (item.artiste) infos.push({ label: 'Artiste', value: item.artiste });
            if (item.annee) infos.push({ label: 'Annee', value: item.annee });
            if (item.format) infos.push({ label: 'Format', value: item.format });
            break;
    }

    // Date d'acquisition commune
    if (item.date_acquisition) {
        infos.push({ label: 'Acquisition', value: formatDate(item.date_acquisition) });
    }

    return infos.map(info => `
        <div class="col-6 mb-2">
            <small class="info-label d-block">${info.label}</small>
            <span>${escapeHtml(String(info.value))}</span>
        </div>
    `).join('');
}

/**
 * Charge le mini-plan pour un emplacement
 */
async function loadMiniPlan(moduleCode, itemId, emplacement) {
    const container = document.getElementById(`plan-svg-${itemId}`);
    if (!container) return;

    try {
        // Chercher l'element d'emplacement lie au plan
        const response = await apiRequest(`/plans/elements/by-emplacement/${MODULE_CONFIG[moduleCode].type}/${emplacement.id}`);

        if (response && response.element_plan_id) {
            // Charger le plan
            const planData = await apiRequest(`/plans/elements/${response.element_plan_id}`);

            if (planData && planData.plan) {
                container.innerHTML = `
                    <div class="position-relative" style="max-height: 200px; overflow: hidden;">
                        <img src="${planData.plan.image_url}" alt="Plan" class="img-fluid opacity-50" style="max-height: 180px;">
                        <div class="position-absolute" style="left: ${response.x || 50}%; top: ${response.y || 50}%; transform: translate(-50%, -50%);">
                            <span class="location-marker" style="display: inline-block; width: 20px; height: 20px; background: #dc3545; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.log('Pas de plan lie pour cet emplacement');
        // Silencieux - c'est OK si pas de plan
    }
}

/**
 * Met a jour le statut d'un article
 */
async function updateStatus(moduleCode, itemId) {
    const config = MODULE_CONFIG[moduleCode];
    const newStatus = document.getElementById('detail-statut').value;

    try {
        await apiRequest(`${config.apiBase}/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ statut: newStatus })
        });

        showAlert('Statut mis a jour', 'success');

        // Si le statut n'est plus "disponible", rafraichir la liste (l'item disparait)
        if (newStatus !== 'disponible') {
            loadItems(moduleCode);
            // Reinitialiser le panneau detail
            document.getElementById(`${moduleCode}-detail`).innerHTML = `
                <div class="card">
                    <div class="card-body text-center text-muted py-5">
                        <i class="bi bi-hand-index fs-1 mb-3 d-block"></i>
                        <p>Selectionnez un article dans la liste pour voir ses details</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Erreur lors de la mise a jour: ' + error.message, 'danger');
    }
}

/**
 * Sauvegarde les notes de desherbage
 */
async function saveNotes(moduleCode, itemId) {
    const config = MODULE_CONFIG[moduleCode];
    const notes = document.getElementById('detail-notes').value;

    try {
        await apiRequest(`${config.apiBase}/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ notes: notes })
        });

        showAlert('Notes enregistrees', 'success');
    } catch (error) {
        console.error('Error saving notes:', error);
        showAlert('Erreur lors de l\'enregistrement: ' + error.message, 'danger');
    }
}

/**
 * Ouvre la fiche complete dans un nouvel onglet
 */
function openFullDetail(moduleCode, itemId) {
    const config = MODULE_CONFIG[moduleCode];
    // Ouvrir la page du module correspondant
    const pageMap = {
        ludotheque: 'jeux.html',
        bibliotheque: 'livres.html',
        filmotheque: 'films.html',
        discotheque: 'disques.html'
    };
    const page = pageMap[moduleCode];
    if (page) {
        // Stocker l'ID pour l'ouvrir automatiquement
        sessionStorage.setItem('openItemId', itemId);
        window.open(page, '_blank');
    }
}

/**
 * Rafraichit la liste courante
 */
function refreshList() {
    if (currentModule) {
        loadItems(currentModule);
    }
}

// ============================================
// Utilitaires
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}
