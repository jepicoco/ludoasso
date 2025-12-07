/**
 * Composant Thematiques Article
 * Gere l'affichage et la modification des thematiques d'un article
 * Utilise dans les pages jeux.html, livres.html, films.html, disques.html
 */

const ThematiquesArticle = {
  // Cache des thematiques pour autocompletion
  thematiquesSuggestions: [],

  /**
   * Charge les suggestions de thematiques existantes
   */
  async loadSuggestions() {
    try {
      const result = await apiRequest('/api/thematiques?limit=500&actif=true');
      this.thematiquesSuggestions = result.thematiques || [];
    } catch (e) {
      console.error('Erreur chargement suggestions thematiques:', e);
    }
  },

  /**
   * Charge les thematiques d'un article
   */
  async getThematiques(typeArticle, articleId) {
    try {
      const result = await apiRequest(`/api/thematiques/article/${typeArticle}/${articleId}`);
      return result || [];
    } catch (e) {
      console.error('Erreur chargement thematiques article:', e);
      return [];
    }
  },

  /**
   * Genere le HTML de la section thematiques
   * @param {string} typeArticle - jeu, livre, film, disque
   * @param {number} articleId - ID de l'article
   * @param {boolean} editable - si true, permet l'ajout/suppression
   */
  async renderSection(typeArticle, articleId, editable = true) {
    const thematiques = await this.getThematiques(typeArticle, articleId);

    const editableControls = editable ? `
      <div class="mt-3 pt-3 border-top">
        <div class="row g-2 align-items-end">
          <div class="col">
            <input type="text" class="form-control form-control-sm" id="them-new-nom-${articleId}"
                   placeholder="Ajouter une thematique..." list="them-suggestions-${articleId}">
            <datalist id="them-suggestions-${articleId}">
              ${this.thematiquesSuggestions.map(t => `<option value="${this.escapeHtml(t.nom)}" data-type="${t.type}">`).join('')}
            </datalist>
          </div>
          <div class="col-auto">
            <select class="form-select form-select-sm" id="them-new-type-${articleId}">
              <option value="theme">Theme</option>
              <option value="mecanisme">Mecanisme</option>
              <option value="ambiance">Ambiance</option>
              <option value="public">Public</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="col-auto">
            <button class="btn btn-sm btn-outline-primary" onclick="ThematiquesArticle.ajouterThematique('${typeArticle}', ${articleId})">
              <i class="bi bi-plus"></i>
            </button>
          </div>
        </div>
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="ThematiquesArticle.enrichirIA('${typeArticle}', ${articleId})">
            <i class="bi bi-robot"></i> Enrichir avec IA
          </button>
        </div>
      </div>
    ` : '';

    return `
      <div class="card mb-3" id="thematiques-section-${articleId}">
        <div class="card-header py-2">
          <i class="bi bi-tags"></i> Thematiques
          <span class="badge bg-secondary ms-1">${thematiques.length}</span>
        </div>
        <div class="card-body py-2">
          <div id="thematiques-list-${articleId}" class="d-flex flex-wrap gap-1">
            ${thematiques.length > 0 ? thematiques.map(t => this.renderBadge(t, typeArticle, articleId, editable)).join('') :
              '<span class="text-muted small">Aucune thematique</span>'}
          </div>
          ${editableControls}
        </div>
      </div>
    `;
  },

  /**
   * Genere le badge d'une thematique
   */
  renderBadge(thematique, typeArticle, articleId, editable) {
    const forcePercent = ((thematique.force || 0.5) * 100).toFixed(0);
    const deleteBtn = editable ? `
      <button class="btn-close btn-close-white ms-1" style="font-size: 0.6rem;"
              onclick="event.stopPropagation(); ThematiquesArticle.supprimerThematique('${typeArticle}', ${articleId}, ${thematique.thematique_id})">
      </button>
    ` : '';

    return `
      <span class="badge type-badge type-${thematique.type} d-flex align-items-center"
            title="${forcePercent}% - ${thematique.source}">
        ${this.escapeHtml(thematique.nom)}
        <small class="ms-1 opacity-75">${forcePercent}%</small>
        ${deleteBtn}
      </span>
    `;
  },

  /**
   * Ajoute une thematique a un article
   */
  async ajouterThematique(typeArticle, articleId) {
    const nomInput = document.getElementById(`them-new-nom-${articleId}`);
    const typeSelect = document.getElementById(`them-new-type-${articleId}`);

    const nom = nomInput.value.trim();
    if (!nom) {
      showToast('Entrez un nom de thematique', 'warning');
      return;
    }

    try {
      await apiRequest(`/api/thematiques/article/${typeArticle}/${articleId}`, {
        method: 'POST',
        body: {
          nom,
          type: typeSelect.value,
          force: 0.7,
          source: 'manuel'
        }
      });

      nomInput.value = '';
      await this.refreshSection(typeArticle, articleId);
      showToast('Thematique ajoutee', 'success');
    } catch (e) {
      showToast('Erreur: ' + e.message, 'error');
    }
  },

  /**
   * Supprime un lien thematique
   */
  async supprimerThematique(typeArticle, articleId, thematiqueId) {
    try {
      await apiRequest(`/api/thematiques/article/${typeArticle}/${articleId}/${thematiqueId}`, {
        method: 'DELETE'
      });

      await this.refreshSection(typeArticle, articleId);
      showToast('Thematique supprimee', 'success');
    } catch (e) {
      showToast('Erreur: ' + e.message, 'error');
    }
  },

  /**
   * Lance l'enrichissement IA pour un article
   */
  async enrichirIA(typeArticle, articleId) {
    if (!confirm('Lancer l\'enrichissement IA pour cet article ?')) return;

    try {
      showToast('Enrichissement en cours...', 'info');

      const result = await apiRequest('/api/enrichissement/article', {
        method: 'POST',
        body: { typeArticle, articleId }
      });

      // Afficher les thematiques proposees
      const thematiques = result.thematiques || [];
      if (thematiques.length === 0) {
        showToast('Aucune thematique proposee par l\'IA', 'warning');
        return;
      }

      // Demander confirmation pour appliquer
      const themList = thematiques.map(t => `${t.nom} (${t.type})`).join(', ');
      if (confirm(`L'IA propose: ${themList}\n\nAppliquer ces thematiques ?`)) {
        // Ajouter chaque thematique
        for (const t of thematiques) {
          await apiRequest(`/api/thematiques/article/${typeArticle}/${articleId}`, {
            method: 'POST',
            body: {
              nom: t.nom,
              type: t.type,
              force: t.force,
              source: 'ia'
            }
          });
        }

        await this.refreshSection(typeArticle, articleId);
        showToast(`${thematiques.length} thematiques ajoutees`, 'success');
      }
    } catch (e) {
      showToast('Erreur IA: ' + e.message, 'error');
    }
  },

  /**
   * Rafraichit la section thematiques
   */
  async refreshSection(typeArticle, articleId) {
    const container = document.getElementById(`thematiques-section-${articleId}`);
    if (container) {
      const newHtml = await this.renderSection(typeArticle, articleId, true);
      container.outerHTML = newHtml;
    }
  },

  /**
   * Echappe le HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};

// Charger les suggestions au demarrage si le module est actif
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof isModuleActive === 'function' && isModuleActive('recherche_ia')) {
    await ThematiquesArticle.loadSuggestions();
  }
});
