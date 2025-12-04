/**
 * Admin Navigation Configuration
 * Configuration centralisée des menus de l'interface admin
 */

// Configuration des éléments du menu
const MENU_ITEMS = [
    {
        id: 'scanner',
        label: 'Scanner',
        icon: 'upc-scan',
        href: 'scanner.html',
        highlight: true,  // Met en evidence ce bouton
        floatingButton: true  // Affiche comme bouton flottant sur mobile
    },
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
        id: 'import-jeux',
        label: 'Import Jeux',
        icon: 'upload',
        href: 'import-jeux.html'
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
        id: 'historique-emails',
        label: 'Historique Emails',
        icon: 'envelope-paper',
        href: 'historique-emails.html'
    },
    {
        id: 'historique-sms',
        label: 'Historique SMS',
        icon: 'chat-dots',
        href: 'historique-sms.html'
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
