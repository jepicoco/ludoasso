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
 * Génère le bouton flottant Scanner pour mobile/tablette
 */
function renderFloatingButton() {
    const scannerItem = getMenuItems().find(item => item.floatingButton);
    if (!scannerItem) return '';

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
            const highlightClass = item.highlight ? 'list-group-item-success fw-bold' : '';
            return `
                <a href="${item.href}" class="list-group-item list-group-item-action ${isActive} ${highlightClass}">
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
