/**
 * Navigation secondaire pour les pages Parametres
 * Affiche une barre de navigation rapide entre les pages d'un meme onglet
 */

const PARAMETRES_CATEGORIES = {
  general: {
    label: 'General',
    icon: 'bi-gear',
    pages: [
      { id: 'site-web', label: 'Site web', href: 'parametres-site-web.html', icon: 'bi-globe' },
      { id: 'listes', label: 'Listes', href: 'parametres-listes.html', icon: 'bi-list-ul' },
      { id: 'sites', label: 'Sites', href: 'parametres-sites.html', icon: 'bi-building' },
      { id: 'utilisateurs', label: 'Utilisateurs', href: 'parametres-utilisateurs.html', icon: 'bi-people' },
      { id: 'holodeck', label: 'Holodeck', href: 'parametres-holodeck.html', icon: 'bi-grid-3x3-gap', adminOnly: true }
    ]
  },
  comptabilite: {
    label: 'Comptabilite',
    icon: 'bi-calculator',
    pages: [
      { id: 'tarifs', label: 'Tarifs cotisation', href: 'tarifs-cotisation.html', icon: 'bi-currency-euro' },
      { id: 'codes-reduction', label: 'Codes reduction', href: 'parametres-codes-reduction.html', icon: 'bi-ticket-perforated' },
      { id: 'comptes-bancaires', label: 'Comptes bancaires', href: 'parametres-comptes-bancaires.html', icon: 'bi-bank' }
    ]
  },
  communication: {
    label: 'Communication',
    icon: 'bi-envelope',
    pages: [
      { id: 'email', label: 'Configuration Email', href: 'parametres-email.html', icon: 'bi-envelope-at' },
      { id: 'sms', label: 'Configuration SMS', href: 'parametres-sms.html', icon: 'bi-phone' },
      { id: 'templates', label: 'Templates', href: 'parametres-templates.html', icon: 'bi-file-text' },
      { id: 'declencheurs', label: 'Declencheurs', href: 'parametres-declencheurs.html', icon: 'bi-lightning' }
    ]
  },
  emprunts: {
    label: 'Emprunts',
    icon: 'bi-arrow-repeat',
    pages: [
      { id: 'prolongations', label: 'Prolongations', href: 'parametres-emprunts.html', icon: 'bi-clock-history' }
    ]
  },
  outils: {
    label: 'Outils',
    icon: 'bi-tools',
    pages: [
      { id: 'import', label: 'Import jeux', href: 'import-jeux.html', icon: 'bi-upload' },
      { id: 'archives', label: 'Archives RGPD', href: 'parametres-archives.html', icon: 'bi-archive' },
      { id: 'thematiques', label: 'Thematiques IA', href: 'parametres-thematiques.html', icon: 'bi-tags', module: 'recherche_ia' }
    ]
  }
};

/**
 * Genere et insere la barre de navigation secondaire
 * @param {string} category - Categorie (general, comptabilite, communication, outils)
 * @param {string} currentPageId - ID de la page courante
 */
function renderSubNav(category, currentPageId) {
  const cat = PARAMETRES_CATEGORIES[category];
  if (!cat) {
    console.error('Categorie inconnue:', category);
    return;
  }

  const container = document.getElementById('sub-nav-container');
  if (!container) {
    console.error('Container sub-nav-container non trouve');
    return;
  }

  // Filtrer les pages adminOnly et par module actif
  const userRole = localStorage.getItem('userRole') || 'usager';
  const filteredPages = cat.pages.filter(page => {
    if (page.adminOnly && userRole !== 'administrateur') {
      return false;
    }
    // Filtrer par module actif (utilise isModuleActive de admin-template.js)
    if (page.module && typeof isModuleActive === 'function' && !isModuleActive(page.module)) {
      return false;
    }
    return true;
  });

  const html = `
    <div class="sub-nav mb-4">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="d-flex align-items-center flex-wrap gap-2">
          <span class="text-muted me-2">
            <i class="bi ${cat.icon}"></i> ${cat.label}:
          </span>
          ${filteredPages.map(page => {
            const isActive = page.id === currentPageId;
            return `
              <a href="${page.href}"
                 class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'}"
                 ${isActive ? 'aria-current="page"' : ''}>
                <i class="bi ${page.icon}"></i>
                <span class="d-none d-md-inline ms-1">${page.label}</span>
              </a>
            `;
          }).join('')}
        </div>
        <a href="${getParametresLink(category)}" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left"></i>
          <span class="d-none d-sm-inline ms-1">Retour</span>
        </a>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Retourne le lien vers la page principale des parametres avec l'onglet actif
 * @param {string} category - Categorie
 * @returns {string} URL
 */
function getParametresLink(category) {
  const tabMap = {
    general: 'general',
    comptabilite: 'comptabilite',
    communication: 'communication',
    emprunts: 'emprunts',
    outils: 'outils'
  };
  return `parametres.html#${tabMap[category] || 'general'}`;
}

/**
 * Genere un breadcrumb simple
 * @param {string} category - Categorie
 * @param {string} pageLabel - Libelle de la page courante
 */
function renderBreadcrumb(category, pageLabel) {
  const cat = PARAMETRES_CATEGORIES[category];
  if (!cat) return;

  const container = document.getElementById('breadcrumb-container');
  if (!container) return;

  container.innerHTML = `
    <nav aria-label="breadcrumb">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item">
          <a href="parametres.html"><i class="bi bi-gear"></i> Parametres</a>
        </li>
        <li class="breadcrumb-item">
          <a href="${getParametresLink(category)}">${cat.label}</a>
        </li>
        <li class="breadcrumb-item active" aria-current="page">${pageLabel}</li>
      </ol>
    </nav>
  `;
}

// Export pour utilisation globale
window.PARAMETRES_CATEGORIES = PARAMETRES_CATEGORIES;
window.renderSubNav = renderSubNav;
window.renderBreadcrumb = renderBreadcrumb;
window.getParametresLink = getParametresLink;
