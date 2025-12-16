/**
 * Admin Navigation Configuration
 * Configuration centralisée des menus de l'interface admin
 */

// Couleurs par défaut pour les modules collections (fond)
const DEFAULT_MODULE_COLORS = {
    ludotheque: '#6f42c1',
    bibliotheque: '#20c997',
    filmotheque: '#fd7e14',
    discotheque: '#e83e8c'
};

// Couleurs de texte par défaut pour les modules collections
const DEFAULT_MODULE_TEXT_COLORS = {
    ludotheque: '#ffffff',
    bibliotheque: '#ffffff',
    filmotheque: '#ffffff',
    discotheque: '#ffffff'
};

// Cache des couleurs de modules
const MODULE_COLORS_CACHE_KEY = 'moduleColors';
const MODULE_TEXT_COLORS_CACHE_KEY = 'moduleTextColors';
const MODULE_COLORS_CACHE_TIMESTAMP_KEY = 'moduleColorsTimestamp';
const MODULE_COLORS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Récupère les couleurs des modules depuis le cache ou les valeurs par défaut
 * @returns {Object} Map code -> couleur hex
 */
function getModuleColors() {
    try {
        const cachedColors = localStorage.getItem(MODULE_COLORS_CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(MODULE_COLORS_CACHE_TIMESTAMP_KEY);

        if (cachedColors && cachedTimestamp) {
            const age = Date.now() - parseInt(cachedTimestamp);
            if (age < MODULE_COLORS_CACHE_DURATION) {
                return JSON.parse(cachedColors);
            }
        }
    } catch (e) {
        console.error('Erreur lecture cache couleurs:', e);
    }
    return { ...DEFAULT_MODULE_COLORS };
}

/**
 * Récupère les couleurs de texte des modules depuis le cache ou les valeurs par défaut
 * @returns {Object} Map code -> couleur hex
 */
function getModuleTextColors() {
    try {
        const cachedColors = localStorage.getItem(MODULE_TEXT_COLORS_CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(MODULE_COLORS_CACHE_TIMESTAMP_KEY);

        if (cachedColors && cachedTimestamp) {
            const age = Date.now() - parseInt(cachedTimestamp);
            if (age < MODULE_COLORS_CACHE_DURATION) {
                return JSON.parse(cachedColors);
            }
        }
    } catch (e) {
        console.error('Erreur lecture cache couleurs texte:', e);
    }
    return { ...DEFAULT_MODULE_TEXT_COLORS };
}

/**
 * Charge les couleurs des modules depuis l'API (pour les rafraîchir)
 */
async function loadModuleColorsFromAPI() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return { colors: getModuleColors(), textColors: getModuleTextColors() };

        const response = await fetch('/api/parametres/modules-actifs/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return { colors: getModuleColors(), textColors: getModuleTextColors() };

        const modules = await response.json();
        const colors = {};
        const textColors = {};

        modules.forEach(m => {
            if (DEFAULT_MODULE_COLORS[m.code]) {
                colors[m.code] = m.couleur && m.couleur.startsWith('#') ? m.couleur : DEFAULT_MODULE_COLORS[m.code];
                textColors[m.code] = m.couleur_texte && m.couleur_texte.startsWith('#') ? m.couleur_texte : DEFAULT_MODULE_TEXT_COLORS[m.code];
            }
        });

        // Sauvegarder en cache
        localStorage.setItem(MODULE_COLORS_CACHE_KEY, JSON.stringify(colors));
        localStorage.setItem(MODULE_TEXT_COLORS_CACHE_KEY, JSON.stringify(textColors));
        localStorage.setItem(MODULE_COLORS_CACHE_TIMESTAMP_KEY, Date.now().toString());

        return { colors, textColors };
    } catch (e) {
        console.error('Erreur chargement couleurs API:', e);
        return { colors: getModuleColors(), textColors: getModuleTextColors() };
    }
}

/**
 * Récupère la couleur d'un module spécifique
 * @param {string} moduleCode - Code du module
 * @returns {string} Couleur hex
 */
function getModuleColor(moduleCode) {
    const colors = getModuleColors();
    return colors[moduleCode] || DEFAULT_MODULE_COLORS[moduleCode] || '#6c757d';
}

/**
 * Récupère la couleur de texte d'un module spécifique
 * @param {string} moduleCode - Code du module
 * @returns {string} Couleur hex
 */
function getModuleTextColor(moduleCode) {
    const textColors = getModuleTextColors();
    return textColors[moduleCode] || DEFAULT_MODULE_TEXT_COLORS[moduleCode] || '#ffffff';
}

// Configuration des éléments du menu
// L'ordre détermine l'affichage dans la sidebar
// separator: true crée une ligne de séparation
const MENU_ITEMS = [
    // === Section 1: Scanner + Dashboard ===
    {
        id: 'scanner',
        label: 'Scanner',
        icon: 'upc-scan',
        href: 'scanner.html',
        highlight: true,  // Met en evidence ce bouton
        floatingButton: true,  // Affiche comme bouton flottant sur mobile
        module: 'scanner'
    },
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'speedometer2',
        href: 'dashboard.html'
    },
    // === Séparation 1 ===
    { separator: true },
    // === Section 2: Gestion quotidienne ===
    {
        id: 'emprunts',
        label: 'Emprunts',
        icon: 'arrow-left-right',
        href: 'emprunts.html'
    },
    {
        id: 'reservations',
        label: 'Reservations',
        icon: 'bookmark',
        href: 'reservations.html',
        module: 'reservations'
    },
    {
        id: 'usagers',
        label: 'Usagers',
        icon: 'people',
        href: 'usagers.html'
    },
    {
        id: 'cotisations',
        label: 'Cotisations',
        icon: 'receipt',
        href: 'cotisations.html'
    },
    {
        id: 'historique-communications',
        label: 'Communications',
        icon: 'send',
        href: 'historique-communications.html',
        module: 'communications'
    },
    {
        id: 'frequentation',
        label: 'Frequentation',
        icon: 'people-fill',
        href: 'frequentation-questionnaires.html',
        module: 'frequentation',
        minRole: 'gestionnaire'
    },
    // === Séparation 2 ===
    { separator: true },
    // === Section 3: Les 4 modules/collections ===
    {
        id: 'jeux',
        label: 'Ludothèque',
        icon: 'dice-6',
        href: 'jeux.html',
        dynamicColor: true,  // Utilise getModuleColor('ludotheque')
        module: 'ludotheque'
    },
    {
        id: 'livres',
        label: 'Bibliothèque',
        icon: 'book',
        href: 'livres.html',
        dynamicColor: true,  // Utilise getModuleColor('bibliotheque')
        module: 'bibliotheque'
    },
    {
        id: 'films',
        label: 'Filmothèque',
        icon: 'film',
        href: 'films.html',
        dynamicColor: true,  // Utilise getModuleColor('filmotheque')
        module: 'filmotheque'
    },
    {
        id: 'disques',
        label: 'Discothèque',
        icon: 'vinyl',
        href: 'disques.html',
        dynamicColor: true,  // Utilise getModuleColor('discotheque')
        module: 'discotheque'
    },
    // === Séparation 3 ===
    { separator: true },
    // === Section 4: Administration ===
    {
        id: 'statistiques',
        label: 'Statistiques',
        icon: 'graph-up',
        href: 'statistiques.html',
        minRole: 'benevole'  // Accessible aux benevoles et au-dessus
    },
    {
        id: 'plans',
        label: 'Plans',
        icon: 'map',
        href: 'editeur-plan.html',
        module: 'plans',
        minRole: 'gestionnaire'  // Accessible aux gestionnaires et au-dessus
    },
    {
        id: 'parametres',
        label: 'Paramètres',
        icon: 'gear-fill',
        href: 'parametres.html',
        adminOnly: true  // Visible uniquement pour les administrateurs
    },
    // === Séparation 4 ===
    { separator: true },
    // === Section 5: Aide ===
    {
        id: 'aide',
        label: 'Aide',
        icon: 'question-circle',
        href: 'aide.html',
        minRole: 'benevole'  // Accessible à tous les utilisateurs admin
    }
];

/**
 * Retourne la configuration du menu
 */
function getMenuItems() {
    return MENU_ITEMS;
}

/**
 * Retourne l'élément de menu correspondant à l'ID
 */
function getMenuItem(id) {
    return MENU_ITEMS.find(item => item.id === id);
}

/**
 * Retourne l'élément de menu correspondant au href
 */
function getMenuItemByHref(href) {
    return MENU_ITEMS.find(item => item.href === href);
}

/**
 * Détermine la page active à partir de l'URL
 */
function getActivePageId() {
    const currentPage = window.location.pathname.split('/').pop();
    const menuItem = getMenuItemByHref(currentPage);
    return menuItem ? menuItem.id : null;
}
