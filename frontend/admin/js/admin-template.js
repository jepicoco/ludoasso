/**
 * Admin Template Generator
 * Génère les éléments communs du template admin (navbar, sidebar)
 * Gère le chargement et le filtrage des modules actifs et modules utilisateur
 */

// Cache des modules actifs (globaux)
const MODULES_CACHE_KEY = 'activeModules';
const MODULES_CACHE_TIMESTAMP_KEY = 'activeModulesTimestamp';
const MODULES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Variable globale pour les modules actifs (globaux)
window.ACTIVE_MODULES = null;

// Variable globale pour les modules autorisés à l'utilisateur
window.USER_ALLOWED_MODULES = null;

// Variable globale pour les structures accessibles
window.USER_STRUCTURES = null;

// Structure actuellement selectionnee
window.CURRENT_STRUCTURE_ID = null;

// Hierarchie des roles (niveau croissant)
const ROLE_HIERARCHY = {
    'usager': 0,
    'benevole': 1,
    'agent': 2,
    'gestionnaire': 3,
    'comptable': 4,
    'administrateur': 5
};

/**
 * Obtient le role de l'utilisateur depuis le token JWT ou localStorage
 * @returns {string} Le role de l'utilisateur
 */
function getUserRole() {
    // D'abord essayer depuis localStorage
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) return storedRole;

    // Sinon extraire du token JWT
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role) {
                localStorage.setItem('userRole', payload.role);
                return payload.role;
            }
        } catch (e) {
            console.error('Erreur parsing token:', e);
        }
    }

    return 'usager';
}

/**
 * Verifie si l'utilisateur a au moins le niveau de role requis
 * @param {string} minRole - Role minimum requis
 * @returns {boolean}
 */
function hasMinRole(minRole) {
    const userRole = getUserRole();
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= requiredLevel;
}

/**
 * Verifie si l'utilisateur est administrateur
 * @returns {boolean}
 */
function isAdmin() {
    return getUserRole() === 'administrateur';
}

/**
 * Verifie si l'utilisateur est au moins comptable
 * @returns {boolean}
 */
function isComptableOrAdmin() {
    return hasMinRole('comptable');
}

/**
 * Verifie si l'utilisateur est au moins gestionnaire
 * @returns {boolean}
 */
function isGestionnaireOrAbove() {
    return hasMinRole('gestionnaire');
}

/**
 * Verifie si l'utilisateur est au moins benevole
 * @returns {boolean}
 */
function isBenevoleOrAbove() {
    return hasMinRole('benevole');
}

/**
 * Charge les modules actifs depuis le cache ou l'API
 * @returns {Promise<Array<string>>} Liste des codes de modules actifs
 */
async function loadActiveModules() {
    try {
        // Vérifier le cache
        const cachedModules = localStorage.getItem(MODULES_CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(MODULES_CACHE_TIMESTAMP_KEY);

        if (cachedModules && cachedTimestamp) {
            const age = Date.now() - parseInt(cachedTimestamp);
            if (age < MODULES_CACHE_DURATION) {
                window.ACTIVE_MODULES = JSON.parse(cachedModules);
                return window.ACTIVE_MODULES;
            }
        }

        // Charger depuis l'API
        const token = localStorage.getItem('authToken');
        if (!token) {
            // Pas de token, considérer tous les modules actifs
            window.ACTIVE_MODULES = [];
            return window.ACTIVE_MODULES;
        }

        const response = await fetch('/api/parametres/modules-actifs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const modules = await response.json();
            window.ACTIVE_MODULES = modules;

            // Mettre en cache
            localStorage.setItem(MODULES_CACHE_KEY, JSON.stringify(modules));
            localStorage.setItem(MODULES_CACHE_TIMESTAMP_KEY, Date.now().toString());
        } else {
            // En cas d'erreur, utiliser le cache existant ou tableau vide
            window.ACTIVE_MODULES = cachedModules ? JSON.parse(cachedModules) : [];
        }

        return window.ACTIVE_MODULES;
    } catch (error) {
        console.error('Erreur chargement modules actifs:', error);
        // En cas d'erreur, considérer tous les modules actifs (fail-safe)
        window.ACTIVE_MODULES = null;
        return null;
    }
}

/**
 * Charge les modules autorisés à l'utilisateur depuis localStorage
 * Ces modules sont stockés lors de la connexion
 */
function loadUserAllowedModules() {
    try {
        const userModules = localStorage.getItem('userModulesAutorises');
        if (userModules) {
            window.USER_ALLOWED_MODULES = JSON.parse(userModules);
        } else {
            // null = accès à tous les modules
            window.USER_ALLOWED_MODULES = null;
        }
    } catch (error) {
        console.error('Erreur chargement modules utilisateur:', error);
        window.USER_ALLOWED_MODULES = null;
    }
    return window.USER_ALLOWED_MODULES;
}

/**
 * Vérifie si l'utilisateur a accès à un module spécifique
 * @param {string} moduleCode - Code du module
 * @returns {boolean}
 */
function hasUserModuleAccess(moduleCode) {
    // Si pas de module spécifié, toujours accessible
    if (!moduleCode) return true;

    // Admin a accès à tout
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'administrateur') return true;

    // Charger les modules utilisateur si pas encore fait
    if (window.USER_ALLOWED_MODULES === undefined) {
        loadUserAllowedModules();
    }

    // null = accès à tous les modules (permissif)
    if (window.USER_ALLOWED_MODULES === null) return true;

    // Tableau vide = accès à tous
    if (Array.isArray(window.USER_ALLOWED_MODULES) && window.USER_ALLOWED_MODULES.length === 0) return true;

    // Vérifier si le module est dans la liste autorisée
    return window.USER_ALLOWED_MODULES.includes(moduleCode);
}

/**
 * Vérifie si un module est actif (globalement ET pour l'utilisateur)
 * @param {string} moduleCode - Code du module
 * @returns {boolean}
 */
function isModuleActive(moduleCode) {
    // Si pas de module spécifié, toujours actif
    if (!moduleCode) return true;

    // Vérifier d'abord si le module est actif globalement
    if (window.ACTIVE_MODULES !== null && window.ACTIVE_MODULES.length > 0) {
        if (!window.ACTIVE_MODULES.includes(moduleCode)) {
            return false;
        }
    }

    // Ensuite vérifier si l'utilisateur a accès à ce module
    return hasUserModuleAccess(moduleCode);
}

/**
 * Purge le cache des modules actifs et utilisateur
 */
function purgeModulesCache() {
    localStorage.removeItem(MODULES_CACHE_KEY);
    localStorage.removeItem(MODULES_CACHE_TIMESTAMP_KEY);
    localStorage.removeItem('userModulesAutorises');
    window.ACTIVE_MODULES = null;
    window.USER_ALLOWED_MODULES = null;
    console.log('Cache des modules purgé');
}

// ==================== GESTION MULTI-STRUCTURES ====================

/**
 * Charge les structures accessibles a l'utilisateur
 * @returns {Promise<Array>} Liste des structures
 */
async function loadUserStructures() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.USER_STRUCTURES = [];
            return [];
        }

        const response = await fetch('/api/structures', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const structures = await response.json();
            window.USER_STRUCTURES = Array.isArray(structures) ? structures : [];

            // Charger la structure selectionnee depuis localStorage
            const savedStructureId = localStorage.getItem('selectedStructureId');
            if (savedStructureId && window.USER_STRUCTURES.find(s => s.id === parseInt(savedStructureId))) {
                window.CURRENT_STRUCTURE_ID = parseInt(savedStructureId);
            } else if (window.USER_STRUCTURES.length === 1) {
                // Si une seule structure, la selectionner automatiquement
                window.CURRENT_STRUCTURE_ID = window.USER_STRUCTURES[0].id;
                localStorage.setItem('selectedStructureId', window.CURRENT_STRUCTURE_ID);
            }

            return window.USER_STRUCTURES;
        }
    } catch (error) {
        console.error('Erreur chargement structures:', error);
    }

    window.USER_STRUCTURES = [];
    return [];
}

/**
 * Recupere l'ID de la structure actuellement selectionnee
 * @returns {number|null}
 */
function getCurrentStructureId() {
    return window.CURRENT_STRUCTURE_ID;
}

/**
 * Change la structure selectionnee
 * @param {number|null} structureId - ID de la structure ou null pour toutes
 */
function setCurrentStructure(structureId) {
    window.CURRENT_STRUCTURE_ID = structureId;
    if (structureId) {
        localStorage.setItem('selectedStructureId', structureId);
    } else {
        localStorage.removeItem('selectedStructureId');
    }

    // Emettre un evenement personnalise pour notifier les pages
    window.dispatchEvent(new CustomEvent('structureChanged', { detail: { structureId } }));

    // Rafraichir la page pour appliquer le filtre
    window.location.reload();
}

/**
 * Genere le HTML du selecteur de structure pour la navbar
 * Affichage adaptatif: boutons directs si <= 3 structures, dropdown sinon
 * @returns {string}
 */
function renderStructureSelector() {
    if (!window.USER_STRUCTURES || window.USER_STRUCTURES.length === 0) {
        return '';
    }

    // Si une seule structure, l'afficher en badge statique (pas de choix)
    if (window.USER_STRUCTURES.length === 1) {
        const s = window.USER_STRUCTURES[0];
        return `
            <div class="me-3 d-flex align-items-center">
                <span class="badge d-flex align-items-center gap-2" style="background-color: ${s.couleur || '#6c757d'}; color: ${s.couleur_texte || '#ffffff'}; padding: 0.5rem 0.75rem;">
                    <i class="bi bi-${s.icone || 'building'}"></i>
                    <span class="d-none d-md-inline">${escapeHtml(s.nom)}</span>
                </span>
            </div>
        `;
    }

    const current = window.USER_STRUCTURES.find(s => s.id === window.CURRENT_STRUCTURE_ID);

    // Si 2 ou 3 structures: afficher des boutons/badges cliquables directement
    if (window.USER_STRUCTURES.length <= 3) {
        return `
            <div class="me-3 d-flex align-items-center gap-1 structure-selector-buttons">
                <button class="btn btn-sm structure-btn ${!window.CURRENT_STRUCTURE_ID ? 'active' : ''}"
                        onclick="setCurrentStructure(null)"
                        title="Toutes les structures"
                        style="background-color: ${!window.CURRENT_STRUCTURE_ID ? '#ffffff' : 'transparent'};
                               color: ${!window.CURRENT_STRUCTURE_ID ? '#0d6efd' : '#ffffff'};
                               border: 1px solid rgba(255,255,255,0.5);">
                    <i class="bi bi-collection"></i>
                    <span class="d-none d-lg-inline ms-1">Toutes</span>
                </button>
                ${window.USER_STRUCTURES.map(s => {
                    const isActive = s.id === window.CURRENT_STRUCTURE_ID;
                    const bgColor = isActive ? (s.couleur || '#6c757d') : 'transparent';
                    const textColor = isActive ? (s.couleur_texte || '#ffffff') : '#ffffff';
                    const borderColor = s.couleur || '#ffffff';
                    return `
                        <button class="btn btn-sm structure-btn ${isActive ? 'active' : ''}"
                                onclick="setCurrentStructure(${s.id})"
                                title="${escapeHtml(s.nom)}"
                                style="background-color: ${bgColor};
                                       color: ${textColor};
                                       border: 2px solid ${borderColor};">
                            <i class="bi bi-${s.icone || 'building'}"></i>
                            <span class="d-none d-lg-inline ms-1">${escapeHtml(s.nom)}</span>
                        </button>
                    `;
                }).join('')}
            </div>
            <style>
                .structure-selector-buttons .structure-btn {
                    padding: 0.35rem 0.6rem;
                    border-radius: 0.375rem;
                    transition: all 0.2s ease;
                    font-size: 0.85rem;
                }
                .structure-selector-buttons .structure-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .structure-selector-buttons .structure-btn.active {
                    font-weight: 600;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                }
            </style>
        `;
    }

    // Si plus de 3 structures: dropdown classique
    const currentLabel = current ? current.nom : 'Toutes les structures';
    const currentColor = current ? (current.couleur || '#6c757d') : '#6c757d';
    const currentIcon = current ? (current.icone || 'building') : 'collection';

    return `
        <div class="dropdown me-3">
            <button class="btn btn-outline-light btn-sm dropdown-toggle d-flex align-items-center gap-2" type="button" id="structureSelectorBtn" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="structure-indicator" style="background-color: ${currentColor}; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
                <i class="bi bi-${currentIcon} d-md-none"></i>
                <span class="d-none d-md-inline">${escapeHtml(currentLabel)}</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="structureSelectorBtn">
                <li>
                    <a class="dropdown-item ${!window.CURRENT_STRUCTURE_ID ? 'active' : ''}" href="#" onclick="setCurrentStructure(null); return false;">
                        <i class="bi bi-collection me-2"></i> Toutes les structures
                    </a>
                </li>
                <li><hr class="dropdown-divider"></li>
                ${window.USER_STRUCTURES.map(s => `
                    <li>
                        <a class="dropdown-item ${s.id === window.CURRENT_STRUCTURE_ID ? 'active' : ''}" href="#" onclick="setCurrentStructure(${s.id}); return false;">
                            <span class="me-2" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${s.couleur || '#6c757d'};"></span>
                            <i class="bi bi-${s.icone || 'building'} me-1"></i>
                            ${escapeHtml(s.nom)}
                        </a>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

/**
 * Fonction utilitaire pour echapper le HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Variable globale pour stocker la version de l'application
 */
window.APP_VERSION = null;

/**
 * Charge la version de l'application depuis l'API
 */
async function loadAppVersion() {
    try {
        const response = await fetch('/api/system/version');
        if (response.ok) {
            const data = await response.json();
            window.APP_VERSION = data.version;
            updateVersionDisplay();
            return data;
        }
    } catch (error) {
        console.error('Erreur chargement version:', error);
    }
    return null;
}

/**
 * Met a jour l'affichage de la version dans le footer
 */
function updateVersionDisplay() {
    const versionEl = document.getElementById('app-version-footer');
    if (versionEl && window.APP_VERSION) {
        versionEl.textContent = `v${window.APP_VERSION}`;
    }
}

/**
 * Génère le HTML de la navbar
 */
function renderNavbar(activePage) {
    const structureSelector = renderStructureSelector();

    return `
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container-fluid">
                <a class="navbar-brand" href="dashboard.html">
                    <i class="bi bi-dice-5"></i> Ludothèque
                    <small class="opacity-75 ms-2" id="app-version-footer" style="font-size: 0.7rem;"></small>
                </a>
                <div class="navbar-nav ms-auto d-flex align-items-center">
                    ${structureSelector}
                    <a class="nav-link position-relative me-2" href="notifications.html" title="Notifications">
                        <i class="bi bi-bell"></i>
                        <span class="notification-badge d-none position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="notification-count">
                            0
                        </span>
                    </a>
                    <a class="nav-link" href="dashboard.html"><i class="bi bi-house"></i> <span class="d-none d-md-inline">Accueil</span></a>
                    <a class="nav-link" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> <span class="d-none d-md-inline">Déconnexion</span></a>
                </div>
            </div>
        </nav>
        <style>
            .notification-badge {
                font-size: 0.65rem;
                padding: 0.2rem 0.4rem;
                min-width: 1.2rem;
            }
            .nav-link .bi-bell {
                font-size: 1.1rem;
            }
        </style>
    `;
}

/**
 * Génère le bouton flottant Scanner pour mobile/tablette
 */
function renderFloatingButton() {
    const scannerItem = getMenuItems().find(item => item.floatingButton);
    if (!scannerItem) return '';

    // Vérifier si le module Scanner est actif
    if (!isModuleActive(scannerItem.module)) return '';

    // Ne pas afficher sur la page scanner elle-même
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === scannerItem.href) return '';

    return `
        <a href="${scannerItem.href}" class="floating-scanner-btn d-md-none" title="${scannerItem.label}">
            <i class="bi bi-${scannerItem.icon}"></i>
        </a>
        <style>
            .floating-scanner-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8rem;
                box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);
                z-index: 1050;
                text-decoration: none;
                transition: all 0.3s ease;
                animation: pulse-scanner 2s infinite;
            }
            .floating-scanner-btn:hover {
                transform: scale(1.1);
                color: white;
                box-shadow: 0 6px 20px rgba(40, 167, 69, 0.6);
            }
            @keyframes pulse-scanner {
                0%, 100% { box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4); }
                50% { box-shadow: 0 4px 25px rgba(40, 167, 69, 0.7); }
            }
            /* Masquer sur desktop (visible en sidebar) */
            @media (min-width: 768px) {
                .floating-scanner-btn { display: none !important; }
            }
        </style>
    `;
}

/**
 * Génère le HTML de la sidebar
 */
function renderSidebar(activePage) {
    const menuItems = getMenuItems();

    // Récupérer le rôle de l'utilisateur depuis le localStorage
    const userRole = localStorage.getItem('userRole') || 'usager';

    // Séparer Scanner des autres items
    const scannerItem = menuItems.find(item => item.highlight);
    const otherItems = menuItems.filter(item => !item.highlight);

    // Générer le bouton Scanner séparé (si module actif)
    let scannerHTML = '';
    if (scannerItem && isModuleActive(scannerItem.module)) {
        scannerHTML = `
            <a href="${scannerItem.href}" class="scanner-standalone-btn ${activePage === scannerItem.id ? 'active' : ''}">
                <i class="bi bi-${scannerItem.icon}"></i> ${scannerItem.label}
            </a>
        `;
    }

    // Générer le menu sans Scanner
    const menuHTML = otherItems
        .filter(item => {
            // Toujours garder les séparateurs
            if (item.separator) return true;
            // Filtrer les items adminOnly si l'utilisateur n'est pas admin
            if (item.adminOnly && userRole !== 'administrateur') {
                return false;
            }
            // Filtrer par minRole si specifie
            if (item.minRole && !hasMinRole(item.minRole)) {
                return false;
            }
            // Filtrer par module actif
            if (item.module && !isModuleActive(item.module)) {
                return false;
            }
            return true;
        })
        .map(item => {
            // Rendu des séparateurs
            if (item.separator) {
                return '<div class="sidebar-separator"></div>';
            }
            const isActive = item.id === activePage ? 'active' : '';

            // Couleur dynamique ou statique
            let itemColor = item.color;
            let itemTextColor = null;
            if (item.dynamicColor && item.module) {
                itemColor = getModuleColor(item.module);
                itemTextColor = getModuleTextColor(item.module);
            }

            // Calculer le style avec la couleur
            let colorStyle = '';
            let activeStyle = '';
            if (itemColor) {
                // Créer une version pastel de la couleur pour le fond
                const pastelBg = `${itemColor}30`; // 30 = 18.75% opacity en hex
                colorStyle = `style="background-color: ${pastelBg}; border-left: 4px solid ${itemColor}; color: ${itemColor};"`;
                // Pour l'état actif, utiliser la couleur de fond pleine et la couleur de texte
                const activeTextColor = itemTextColor || '#ffffff';
                activeStyle = `style="background-color: ${itemColor}; border-left: 4px solid ${itemColor}; font-weight: bold; color: ${activeTextColor};"`;
            }

            return `
                <a href="${item.href}" class="list-group-item list-group-item-action ${isActive}" ${isActive ? activeStyle : colorStyle}>
                    <i class="bi bi-${item.icon}"></i> ${item.label}
                </a>
            `;
        }).join('');

    return `
        <style>
            #admin-sidebar {
                background-color: transparent !important;
            }
            .scanner-standalone-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: linear-gradient(135deg, #d4edda, #c3e6cb);
                border: 2px solid #155724;
                border-radius: 8px;
                margin: 10px;
                padding: 14px 16px;
                font-size: 1.1rem;
                font-weight: bold;
                text-align: center;
                text-decoration: none;
                color: #155724;
                transition: all 0.2s ease;
            }
            .scanner-standalone-btn i {
                margin-left: -15px;
                font-size: 1.2rem;
            }
            .scanner-standalone-btn:hover {
                background: linear-gradient(135deg, #c3e6cb, #b1dfbb);
                transform: scale(1.02);
                box-shadow: 0 2px 8px rgba(21, 87, 36, 0.3);
                color: #155724;
            }
            .scanner-standalone-btn.active {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                border-color: #155724;
            }
            .sidebar-menu {
                border-top: 1px solid #dee2e6;
                margin-top: 5px;
                padding-top: 5px;
            }
            .sidebar-separator {
                height: 1px;
                background-color: #dee2e6;
                margin: 8px 10px;
            }
        </style>
        ${scannerHTML}
        <div class="list-group list-group-flush sidebar-menu">
            ${menuHTML}
        </div>
    `;
}

/**
 * Initialise le template avec la page actuelle
 * @param {string} pageId - ID de la page active (dashboard, adherents, etc.)
 */
async function initTemplate(pageId) {
    // Charger les modules actifs (globaux) d'abord
    await loadActiveModules();

    // Charger les modules autorisés à l'utilisateur
    loadUserAllowedModules();

    // Charger les structures accessibles (multi-structures V0.9)
    await loadUserStructures();

    // Charger la version de l'application (en arriere-plan)
    loadAppVersion();

    // Charger les couleurs des modules depuis l'API si le cache est expiré
    if (typeof loadModuleColorsFromAPI === 'function') {
        const cachedTimestamp = localStorage.getItem('moduleColorsTimestamp');
        const cachedColors = localStorage.getItem('moduleColors');
        const age = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp) : Infinity;
        // Rafraîchir si cache > 10 minutes ou inexistant
        if (age > 10 * 60 * 1000 || !cachedColors) {
            await loadModuleColorsFromAPI(); // Attendre pour avoir les bonnes couleurs au premier rendu
        }
    }

    // Déterminer la page active
    const activePage = pageId || getActivePageId();

    // Générer la navbar
    const navbarContainer = document.getElementById('admin-navbar');
    if (navbarContainer) {
        navbarContainer.outerHTML = renderNavbar(activePage);
    }

    // Générer la sidebar
    const sidebarContainer = document.getElementById('admin-sidebar');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = renderSidebar(activePage);
    }

    // Ajouter le bouton flottant Scanner pour mobile
    const floatingBtn = renderFloatingButton();
    if (floatingBtn) {
        document.body.insertAdjacentHTML('beforeend', floatingBtn);
    }
}

/**
 * Initialisation automatique au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    // Le template sera initialisé par la page elle-même via initTemplate()
    // ou automatiquement si aucun pageId n'est spécifié
});

// Exports globaux pour multi-structures
window.loadUserStructures = loadUserStructures;
window.getCurrentStructureId = getCurrentStructureId;
window.setCurrentStructure = setCurrentStructure;
