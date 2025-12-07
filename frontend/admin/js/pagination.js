/**
 * Module de pagination et preferences d'affichage
 * Reutilisable pour toutes les sections *theque
 */

// ============================================
// GESTION DES PREFERENCES UTILISATEUR
// ============================================

const ViewPreferences = {
  STORAGE_KEY: 'assotheque_view_prefs',

  /**
   * Recupere les preferences pour un module
   * @param {string} module - Nom du module (jeux, livres, films, disques)
   * @returns {object} Preferences du module
   */
  get(module) {
    try {
      const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      return prefs[module] || { viewMode: 'list', itemsPerPage: 50, actionsVisible: false };
    } catch (e) {
      return { viewMode: 'list', itemsPerPage: 50, actionsVisible: false };
    }
  },

  /**
   * Sauvegarde les preferences pour un module
   * @param {string} module - Nom du module
   * @param {object} modulePrefs - Preferences a sauvegarder
   */
  set(module, modulePrefs) {
    try {
      const prefs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      prefs[module] = { ...prefs[module], ...modulePrefs };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Erreur sauvegarde preferences:', e);
    }
  },

  /**
   * Recupere le mode d'affichage pour un module
   * @param {string} module
   * @returns {string} 'list' ou 'cards'
   */
  getViewMode(module) {
    return this.get(module).viewMode || 'list';
  },

  /**
   * Definit le mode d'affichage pour un module
   * @param {string} module
   * @param {string} mode - 'list' ou 'cards'
   */
  setViewMode(module, mode) {
    this.set(module, { viewMode: mode });
  },

  /**
   * Recupere le nombre d'items par page pour un module
   * @param {string} module
   * @returns {number}
   */
  getItemsPerPage(module) {
    return this.get(module).itemsPerPage || 50;
  },

  /**
   * Definit le nombre d'items par page pour un module
   * @param {string} module
   * @param {number} count
   */
  setItemsPerPage(module, count) {
    this.set(module, { itemsPerPage: count });
  },

  /**
   * Recupere l'etat du mode actions pour un module
   * @param {string} module
   * @returns {boolean}
   */
  getActionsVisible(module) {
    return this.get(module).actionsVisible || false;
  },

  /**
   * Definit l'etat du mode actions pour un module
   * @param {string} module
   * @param {boolean} visible
   */
  setActionsVisible(module, visible) {
    this.set(module, { actionsVisible: visible });
  }
};

// ============================================
// CLASSE DE PAGINATION
// ============================================

class Pagination {
  /**
   * @param {object} options
   * @param {string} options.module - Nom du module (jeux, livres, etc.)
   * @param {string} options.containerId - ID du container pour les controles
   * @param {function} options.onPageChange - Callback appele lors du changement de page
   * @param {function} options.onViewModeChange - Callback appele lors du changement de mode
   * @param {function} options.onActionsToggle - Callback appele lors du toggle actions
   * @param {boolean} options.showViewToggle - Afficher le toggle vue (defaut: true)
   * @param {boolean} options.showActionsToggle - Afficher le toggle actions (defaut: true)
   */
  constructor(options) {
    this.module = options.module;
    this.containerId = options.containerId;
    this.onPageChange = options.onPageChange;
    this.onViewModeChange = options.onViewModeChange;
    this.onActionsToggle = options.onActionsToggle;
    this.showViewToggle = options.showViewToggle !== false;
    this.showActionsToggle = options.showActionsToggle !== false;

    this.currentPage = 1;
    this.totalPages = 1;
    this.totalItems = 0;
    this.itemsPerPage = ViewPreferences.getItemsPerPage(this.module);
    this.viewMode = ViewPreferences.getViewMode(this.module);
    this.actionsVisible = ViewPreferences.getActionsVisible(this.module);

    this.init();
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container #${this.containerId} non trouve`);
      return;
    }

    // Structure HTML pour pagination et controles de vue
    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 py-2">
        <!-- Info et items par page -->
        <div class="d-flex align-items-center gap-3">
          <span class="text-muted pagination-info"></span>
          <div class="d-flex align-items-center gap-2">
            <label class="form-label mb-0 small text-muted">Par page:</label>
            <select class="form-select form-select-sm pagination-limit" style="width: auto;">
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>

        <!-- Controles centraux -->
        <nav aria-label="Pagination">
          <ul class="pagination pagination-sm mb-0 pagination-controls"></ul>
        </nav>

        <!-- Toggles vue et actions -->
        <div class="d-flex align-items-center gap-2">
          ${this.showActionsToggle ? `
          <div class="form-check form-switch mb-0">
            <input class="form-check-input actions-toggle" type="checkbox" id="actionsToggle_${this.module}" ${this.actionsVisible ? 'checked' : ''}>
            <label class="form-check-label small" for="actionsToggle_${this.module}">Actions</label>
          </div>
          ` : ''}
          ${this.showViewToggle ? `
          <div class="btn-group btn-group-sm view-toggle" role="group" aria-label="Mode d'affichage">
            <button type="button" class="btn btn-outline-secondary view-btn" data-view="list" title="Vue liste">
              <i class="bi bi-list-ul"></i>
            </button>
            <button type="button" class="btn btn-outline-secondary view-btn" data-view="cards" title="Vue cartes">
              <i class="bi bi-grid-3x3-gap"></i>
            </button>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.updateViewToggle();
  }

  bindEvents(container) {
    // Changement de limite
    const limitSelect = container.querySelector('.pagination-limit');
    if (limitSelect) {
      limitSelect.value = this.itemsPerPage;
      limitSelect.addEventListener('change', (e) => {
        this.itemsPerPage = parseInt(e.target.value);
        ViewPreferences.setItemsPerPage(this.module, this.itemsPerPage);
        this.currentPage = 1;
        if (this.onPageChange) this.onPageChange(this.currentPage, this.itemsPerPage);
      });
    }

    // Toggle vue
    if (this.showViewToggle) {
      const viewBtns = container.querySelectorAll('.view-btn');
      viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.viewMode = btn.dataset.view;
          ViewPreferences.setViewMode(this.module, this.viewMode);
          this.updateViewToggle();
          if (this.onViewModeChange) this.onViewModeChange(this.viewMode);
        });
      });
    }

    // Toggle actions
    if (this.showActionsToggle) {
      const actionsToggle = container.querySelector('.actions-toggle');
      if (actionsToggle) {
        actionsToggle.addEventListener('change', (e) => {
          this.actionsVisible = e.target.checked;
          ViewPreferences.setActionsVisible(this.module, this.actionsVisible);
          if (this.onActionsToggle) this.onActionsToggle(this.actionsVisible);
        });
      }
    }
  }

  updateViewToggle() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const viewBtns = container.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this.viewMode);
    });
  }

  /**
   * Met a jour les donnees de pagination et reaffiche les controles
   * @param {object} paginationData - { total, page, limit, totalPages }
   */
  update(paginationData) {
    this.currentPage = paginationData.page || 1;
    this.totalPages = paginationData.totalPages || 1;
    this.totalItems = paginationData.total || 0;
    this.itemsPerPage = paginationData.limit || this.itemsPerPage;

    this.render();
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Info
    const infoEl = container.querySelector('.pagination-info');
    if (infoEl) {
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
      infoEl.textContent = this.totalItems > 0
        ? `${start}-${end} sur ${this.totalItems}`
        : 'Aucun resultat';
    }

    // Controles de pagination
    const controlsEl = container.querySelector('.pagination-controls');
    if (controlsEl) {
      controlsEl.innerHTML = this.renderControls();
      this.bindPaginationEvents(controlsEl);
    }
  }

  renderControls() {
    if (this.totalPages <= 1) return '';

    let html = '';

    // Bouton Precedent
    html += `
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage - 1}" aria-label="Precedent">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `;

    // Calcul des pages a afficher
    const pages = this.getPageNumbers();
    pages.forEach(page => {
      if (page === '...') {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      } else {
        html += `
          <li class="page-item ${page === this.currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${page}">${page}</a>
          </li>
        `;
      }
    });

    // Bouton Suivant
    html += `
      <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage + 1}" aria-label="Suivant">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `;

    return html;
  }

  getPageNumbers() {
    const pages = [];
    const maxVisible = 7;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      // Toujours afficher la premiere page
      pages.push(1);

      if (this.currentPage > 3) {
        pages.push('...');
      }

      // Pages autour de la page courante
      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(this.totalPages - 1, this.currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (this.currentPage < this.totalPages - 2) {
        pages.push('...');
      }

      // Toujours afficher la derniere page
      if (!pages.includes(this.totalPages)) pages.push(this.totalPages);
    }

    return pages;
  }

  bindPaginationEvents(controlsEl) {
    controlsEl.querySelectorAll('a.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(link.dataset.page);
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
          this.currentPage = page;
          if (this.onPageChange) this.onPageChange(this.currentPage, this.itemsPerPage);
        }
      });
    });
  }

  /**
   * Recupere la page courante
   */
  getPage() {
    return this.currentPage;
  }

  /**
   * Recupere le nombre d'items par page
   */
  getLimit() {
    return this.itemsPerPage;
  }

  /**
   * Recupere le mode d'affichage
   */
  getViewMode() {
    return this.viewMode;
  }

  /**
   * Recupere l'etat du mode actions
   */
  getActionsVisible() {
    return this.actionsVisible;
  }

  /**
   * Reinitialise a la premiere page
   */
  reset() {
    this.currentPage = 1;
  }
}

// Export pour utilisation globale
window.Pagination = Pagination;
window.ViewPreferences = ViewPreferences;
