/**
 * Admin Template Generator
 * Génère les éléments communs du template admin (navbar, sidebar)
 */

/**
 * Génère le HTML de la navbar
 */
function renderNavbar(activePage) {
    return `
        <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
            <div class="container-fluid">
                <a class="navbar-brand" href="dashboard.html">
                    <i class="bi bi-dice-5"></i> Ludothèque
                </a>
                <div class="navbar-nav ms-auto">
                    <a class="nav-link" href="dashboard.html"><i class="bi bi-house"></i> Accueil</a>
                    <a class="nav-link" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Déconnexion</a>
                </div>
            </div>
        </nav>
    `;
}

/**
 * Génère le HTML de la sidebar
 */
function renderSidebar(activePage) {
    const menuItems = getMenuItems();

    // Récupérer le rôle de l'utilisateur depuis le localStorage
    const userRole = localStorage.getItem('userRole') || 'usager';

    const menuHTML = menuItems
        .filter(item => {
            // Filtrer les items adminOnly si l'utilisateur n'est pas admin
            if (item.adminOnly && userRole !== 'administrateur') {
                return false;
            }
            return true;
        })
        .map(item => {
            const isActive = item.id === activePage ? 'active' : '';
            return `
                <a href="${item.href}" class="list-group-item list-group-item-action ${isActive}">
                    <i class="bi bi-${item.icon}"></i> ${item.label}
                </a>
            `;
        }).join('');

    return `
        <div class="list-group list-group-flush">
            ${menuHTML}
        </div>
    `;
}

/**
 * Initialise le template avec la page actuelle
 * @param {string} pageId - ID de la page active (dashboard, adherents, etc.)
 */
function initTemplate(pageId) {
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
}

/**
 * Initialisation automatique au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    // Le template sera initialisé par la page elle-même via initTemplate()
    // ou automatiquement si aucun pageId n'est spécifié
});
