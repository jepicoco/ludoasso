/**
 * Admin Navigation Configuration
 * Configuration centralisée des menus de l'interface admin
 */

// Configuration des éléments du menu
const MENU_ITEMS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'speedometer2',
        href: 'dashboard.html'
    },
    {
        id: 'adherents',
        label: 'Adhérents',
        icon: 'people',
        href: 'adherents.html'
    },
    {
        id: 'jeux',
        label: 'Jeux',
        icon: 'dice-6',
        href: 'jeux.html'
    },
    {
        id: 'emprunts',
        label: 'Emprunts',
        icon: 'arrow-left-right',
        href: 'emprunts.html'
    },
    {
        id: 'cotisations',
        label: 'Cotisations',
        icon: 'receipt',
        href: 'cotisations.html'
    },
    {
        id: 'statistiques',
        label: 'Statistiques',
        icon: 'graph-up',
        href: 'statistiques.html'
    },
    {
        id: 'event-triggers',
        label: 'Déclencheurs',
        icon: 'bell',
        href: 'event-triggers.html',
        adminOnly: true  // Visible uniquement pour les administrateurs
    },
    {
        id: 'communications',
        label: 'Communications',
        icon: 'envelope-at',
        href: 'communications.html',
        adminOnly: true  // Visible uniquement pour les administrateurs
    },
    {
        id: 'parametres',
        label: 'Paramètres',
        icon: 'gear-fill',
        href: 'parametres.html',
        adminOnly: true  // Visible uniquement pour les administrateurs
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
