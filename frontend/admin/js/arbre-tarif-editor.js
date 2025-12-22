/**
 * Editeur d'arbre de decision tarifaire
 * Interface visuelle pour configurer les reductions de cotisations
 */

class ArbreTarifEditor {
  constructor(tarifId) {
    this.tarifId = tarifId;
    this.arbre = null;
    this.typesCondition = [];
    this.operationsComptables = [];
    this.communes = [];
    this.communautes = [];
    this.baremesQF = [];
    this.montantBase = 0;
    this.hasChanges = false;
    this.noeudEnEdition = null;
    this.baremesQFRefreshInterval = null;
    this.baremesQFInitialCount = 0;

    this.init();
  }

  async init() {
    try {
      // Initialiser le template admin (navbar, sidebar)
      if (typeof initTemplate === 'function') {
        await initTemplate('parametres');
      }

      // Mode d'affichage (visuel ou JSON)
      this.modeAffichage = 'visuel';

      // Charger les donnees
      await Promise.all([
        this.chargerTypesCondition(),
        this.chargerOperationsComptables(),
        this.chargerReferentiels(),
        this.chargerBaremesQF(),
        this.chargerTags(),
        this.chargerArbre()
      ]);

      this.setupEventListeners();
      this.renderPalette();
      this.renderArbre();
      this.updateBornes();

    } catch (error) {
      console.error('Erreur initialisation:', error);
      this.showError('Erreur lors du chargement des donnees');
    }
  }

  // ============================================================
  // CHARGEMENT DES DONNEES
  // ============================================================

  async chargerTypesCondition() {
    try {
      const response = await apiAdmin.get('/arbres-decision/types-condition');
      this.typesCondition = response?.data || response || [];
    } catch (error) {
      console.error('Erreur chargement types condition:', error);
      this.typesCondition = [];
    }
  }

  async chargerOperationsComptables() {
    try {
      const response = await apiAdmin.get('/arbres-decision/operations-reduction');
      this.operationsComptables = response?.data || response || [];
    } catch (error) {
      console.error('Erreur chargement operations:', error);
      this.operationsComptables = [];
    }
  }

  async chargerReferentiels() {
    try {
      // Charger communes et communautes en parallele
      const [communesResp, communautesResp] = await Promise.all([
        apiAdmin.get('/communes/all'),
        apiAdmin.get('/communautes-communes')
      ]);

      this.communes = communesResp?.communes || communesResp || [];
      this.communautes = communautesResp?.data || communautesResp || [];
    } catch (error) {
      console.error('Erreur chargement referentiels:', error);
      this.communes = [];
      this.communautes = [];
    }
  }

  async chargerBaremesQF() {
    try {
      const response = await apiAdmin.get('/parametres/baremes-qf');
      this.baremesQF = response?.data || response || [];
      this.baremesQFInitialCount = this.baremesQF.length;
    } catch (error) {
      console.error('Erreur chargement baremes QF:', error);
      this.baremesQF = [];
    }
  }

  async chargerTags() {
    try {
      const response = await apiAdmin.get('/arbres-decision/tags');
      this.tagsUtilisateur = response?.data || response || [];
    } catch (error) {
      console.error('Erreur chargement tags:', error);
      this.tagsUtilisateur = [];
    }
  }

  async rafraichirBaremesQF() {
    try {
      const response = await apiAdmin.get('/parametres/baremes-qf');
      const nouveauxBaremes = response?.data || response || [];

      // Verifier si un nouveau bareme a ete ajoute
      if (nouveauxBaremes.length > this.baremesQFInitialCount) {
        // Arreter le rafraichissement
        this.stopBaremesQFRefresh();

        // Mettre a jour la liste
        this.baremesQF = nouveauxBaremes;

        // Mettre a jour le select dans le DOM si visible
        this.updateBaremesQFSelect();

        this.showSuccess('Nouveau bareme QF detecte !');
      }
    } catch (error) {
      console.error('Erreur rafraichissement baremes QF:', error);
    }
  }

  startBaremesQFRefresh() {
    // Ne pas demarrer si deja en cours
    if (this.baremesQFRefreshInterval) return;

    // Memoriser le nombre actuel pour detecter les nouveaux
    this.baremesQFInitialCount = this.baremesQF.length;

    // Rafraichir toutes les 15 secondes
    this.baremesQFRefreshInterval = setInterval(() => {
      this.rafraichirBaremesQF();
    }, 15000);
  }

  stopBaremesQFRefresh() {
    if (this.baremesQFRefreshInterval) {
      clearInterval(this.baremesQFRefreshInterval);
      this.baremesQFRefreshInterval = null;
    }
  }

  updateBaremesQFSelect() {
    // Mettre a jour tous les selects de baremes QF dans le DOM
    const selects = document.querySelectorAll('.condition-qf-bareme');
    selects.forEach(select => {
      const currentValue = select.value;

      // Regenerer les options
      let optionsHtml = '<option value="">-- Selectionner un bareme --</option>';
      this.baremesQF.forEach(b => {
        const selected = b.id.toString() === currentValue ? 'selected' : '';
        optionsHtml += `<option value="${b.id}" ${selected}>${this.escapeHtml(b.libelle)} (${b.tranches?.length || 0} tranches)</option>`;
      });

      select.innerHTML = optionsHtml;
    });

    // Cacher l'indicateur de surveillance
    document.querySelectorAll('.condition-qf-refresh-status').forEach(el => {
      el.style.display = 'none';
    });
  }

  async chargerArbre() {
    let response;
    try {
      response = await apiAdmin.get(`/arbres-decision/tarif/${this.tarifId}`);
    } catch (error) {
      console.log('Pas d\'arbre existant pour ce tarif');
      response = null;
    }

    if (response && response.success && response.data) {
      this.arbre = response.data;
      this.montantBase = response.data.montant_base || 0;

      // Mettre a jour le titre
      const tarifLibelle = response.data.tarif?.libelle || `Tarif #${this.tarifId}`;
      document.getElementById('breadcrumb-tarif').textContent = `Arbre - ${tarifLibelle}`;
      document.getElementById('page-title').textContent = `Arbre de decision - ${tarifLibelle}`;
      document.getElementById('label-montant-base').innerHTML =
        `Montant de base: <strong>${this.montantBase} EUR</strong>`;

      // Afficher les bornes
      if (response.data.bornes) {
        document.getElementById('label-bornes').innerHTML =
          `Bornes: <strong>${response.data.bornes.min} EUR - ${response.data.bornes.max} EUR</strong>`;
      }

      // Mode d'affichage
      document.getElementById('select-mode-affichage').value = this.arbre.mode_affichage || 'minimum';

      // Verrouillage
      if (this.arbre.verrouille) {
        document.getElementById('alert-verrouille').classList.remove('d-none');
        document.getElementById('btn-enregistrer').disabled = true;
        document.getElementById('dropdown-ajouter').disabled = true;
      }

    } else {
      // Pas d'arbre, on en cree un vide mais on charge quand meme les infos du tarif
      this.arbre = {
        arbre_json: { version: 1, noeuds: [] },
        mode_affichage: 'minimum',
        verrouille: false
      };

      // Charger les infos du tarif separement
      await this.chargerInfosTarif();
    }
  }

  async chargerInfosTarif() {
    try {
      const response = await apiAdmin.get(`/tarifs-cotisation/${this.tarifId}`);
      const tarif = response?.data || response;

      if (tarif) {
        this.montantBase = parseFloat(tarif.montant_base) || 0;
        const tarifLibelle = tarif.libelle || `Tarif #${this.tarifId}`;

        document.getElementById('breadcrumb-tarif').textContent = `Arbre - ${tarifLibelle}`;
        document.getElementById('page-title').textContent = `Arbre de decision - ${tarifLibelle}`;
        document.getElementById('label-montant-base').innerHTML =
          `Montant de base: <strong>${this.montantBase} EUR</strong>`;
        document.getElementById('label-bornes').innerHTML =
          `Bornes: <strong>${this.montantBase} EUR - ${this.montantBase} EUR</strong>`;
      }
    } catch (error) {
      console.error('Erreur chargement infos tarif:', error);
      this.showError('Impossible de charger les informations du tarif');
    }
  }

  // ============================================================
  // EVENEMENTS
  // ============================================================

  setupEventListeners() {
    // Mode d'affichage
    document.getElementById('select-mode-affichage').addEventListener('change', (e) => {
      if (this.arbre) {
        this.arbre.mode_affichage = e.target.value;
        this.markAsChanged();
      }
    });

    // Bouton enregistrer
    document.getElementById('btn-enregistrer').addEventListener('click', () => {
      this.enregistrer();
    });

    // Bouton tester
    document.getElementById('btn-tester').addEventListener('click', () => {
      // Remplir le select des tags disponibles
      this.remplirSelectTagsTest();
      const modal = new bootstrap.Modal(document.getElementById('modal-test'));
      modal.show();
    });

    // Reset highlight quand le modal test se ferme
    document.getElementById('modal-test').addEventListener('hidden.bs.modal', () => {
      // Reset les branches selectionnees
      document.querySelectorAll('.tree-branch-label.selected').forEach(el => {
        el.classList.remove('selected');
      });
      document.querySelectorAll('.tree-node-card.highlight').forEach(el => {
        el.classList.remove('highlight');
      });
    });

    // Reset des flags quand le modal d'edition se ferme (peu importe comment)
    document.getElementById('modal-edition-noeud').addEventListener('hidden.bs.modal', () => {
      this.editingEnfant = false;
      this.enfantEnEdition = null;
      // S'assurer que le backdrop est bien supprime
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    });

    // Lancer test
    document.getElementById('btn-lancer-test').addEventListener('click', () => {
      this.lancerTest();
    });

    // Deverrouiller
    document.getElementById('btn-deverrouiller').addEventListener('click', () => {
      this.deverrouiller();
    });

    // Ajouter branche dans modal
    document.getElementById('btn-ajouter-branche').addEventListener('click', () => {
      this.ajouterBrancheModal();
    });

    // Valider noeud
    document.getElementById('btn-valider-noeud').addEventListener('click', () => {
      this.validerNoeud();
    });

    // Supprimer noeud
    document.getElementById('btn-supprimer-noeud').addEventListener('click', () => {
      this.supprimerNoeud();
    });

    // Avant de quitter la page
    window.addEventListener('beforeunload', (e) => {
      // Nettoyer l'intervalle de rafraichissement des baremes QF
      this.stopBaremesQFRefresh();

      if (this.hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Toggle Vue Visuelle / JSON
    document.getElementById('btn-vue-visuelle').addEventListener('click', () => {
      this.basculerVue('visuel');
    });

    document.getElementById('btn-vue-json').addEventListener('click', () => {
      this.basculerVue('json');
    });

    // Appliquer le JSON
    document.getElementById('btn-appliquer-json').addEventListener('click', () => {
      this.appliquerJson();
    });

    // Validation en temps reel du JSON
    document.getElementById('json-editor').addEventListener('input', (e) => {
      this.validerJsonEnTempsReel(e.target.value);
    });

    // Recherche commune par CP ou nom
    document.getElementById('btn-search-commune').addEventListener('click', () => {
      this.rechercherCommune();
    });

    // Recherche au Enter dans le champ
    document.getElementById('test-commune-search').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.rechercherCommune();
      }
    });
  }

  rechercherCommune() {
    const searchInput = document.getElementById('test-commune-search');
    const resultDiv = document.getElementById('test-commune-result');
    const hiddenInput = document.getElementById('test-commune-id');
    const search = searchInput.value.trim().toLowerCase();

    if (!search) {
      resultDiv.innerHTML = '';
      hiddenInput.value = '';
      return;
    }

    // Rechercher par CP (exact) ou par nom (contient)
    const isPostalCode = /^\d{5}$/.test(search);
    let matches = [];

    if (isPostalCode) {
      matches = this.communes.filter(c => c.code_postal === search);
    } else {
      matches = this.communes.filter(c =>
        c.nom?.toLowerCase().includes(search) ||
        c.code_postal?.includes(search)
      );
    }

    if (matches.length === 0) {
      resultDiv.innerHTML = '<span class="text-warning">Aucune commune trouvee</span>';
      hiddenInput.value = '';
    } else if (matches.length === 1) {
      // Une seule correspondance : selection automatique
      const c = matches[0];
      hiddenInput.value = c.id;
      resultDiv.innerHTML = `<span class="text-success"><i class="bi bi-check-circle"></i> ${c.nom} (${c.code_postal})</span>`;
    } else {
      // Plusieurs correspondances : afficher une liste cliquable
      hiddenInput.value = '';
      let html = `<div class="text-info mb-1">${matches.length} communes trouvees :</div>`;
      html += '<div class="list-group list-group-flush" style="max-height: 150px; overflow-y: auto;">';
      matches.slice(0, 20).forEach(c => {
        html += `<button type="button" class="list-group-item list-group-item-action py-1 px-2" data-commune-id="${c.id}" data-commune-nom="${this.escapeHtml(c.nom)}" data-commune-cp="${c.code_postal}">
          ${c.nom} (${c.code_postal})
        </button>`;
      });
      if (matches.length > 20) {
        html += `<div class="list-group-item text-muted py-1">... et ${matches.length - 20} autres</div>`;
      }
      html += '</div>';
      resultDiv.innerHTML = html;

      // Attacher les evenements de clic
      resultDiv.querySelectorAll('[data-commune-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.communeId;
          const nom = btn.dataset.communeNom;
          const cp = btn.dataset.communeCp;
          hiddenInput.value = id;
          resultDiv.innerHTML = `<span class="text-success"><i class="bi bi-check-circle"></i> ${nom} (${cp})</span>`;
        });
      });
    }
  }

  // ============================================================
  // RENDU
  // ============================================================

  renderPalette() {
    const container = document.getElementById('palette-criteres');
    const menuDropdown = document.getElementById('menu-types-condition');

    container.innerHTML = '';
    menuDropdown.innerHTML = '';

    this.typesCondition.forEach(type => {
      // Palette
      const badge = document.createElement('span');
      badge.className = 'type-badge';
      badge.style.backgroundColor = type.couleur || '#6c757d';
      badge.innerHTML = `<i class="bi ${type.icone || 'bi-question'}"></i> ${type.libelle}`;
      badge.addEventListener('click', () => this.ajouterNoeud(type.code));
      container.appendChild(badge);

      // Menu dropdown
      const li = document.createElement('li');
      li.innerHTML = `<a class="dropdown-item" href="#">
        <i class="bi ${type.icone || 'bi-question'} me-2" style="color: ${type.couleur}"></i>
        ${type.libelle}
      </a>`;
      li.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        this.ajouterNoeud(type.code);
      });
      menuDropdown.appendChild(li);
    });
  }

  renderArbre() {
    const container = document.getElementById('arbre-tree');
    const vide = document.getElementById('arbre-vide');

    const noeuds = this.arbre?.arbre_json?.noeuds || [];

    if (noeuds.length === 0) {
      vide.classList.remove('d-none');
      container.innerHTML = '';
      return;
    }

    vide.classList.add('d-none');
    container.innerHTML = '';

    // Trier par ordre
    const noeudsOrdonnes = [...noeuds].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    // Construire l'arbre horizontal
    // 1. Noeud de depart
    const startNode = this.createTreeStartNode();
    container.appendChild(startNode);

    // 2. Connecteur vers la premiere condition
    const connector = document.createElement('div');
    connector.className = 'tree-connector';
    container.appendChild(connector);

    // 3. Rendu des conditions avec leurs branches et resultats
    const nodeElement = this.renderTreeNode(noeudsOrdonnes[0],
      this.typesCondition.find(t => t.code === noeudsOrdonnes[0].type) || {},
      0,
      noeudsOrdonnes.slice(1) // Noeuds suivants pour evaluation cumulative
    );
    container.appendChild(nodeElement);
  }

  createTreeStartNode() {
    const node = document.createElement('div');
    node.className = 'tree-start';
    node.innerHTML = `
      <div class="tree-start-node">
        <i class="bi bi-play-circle-fill"></i>
        Depart: ${this.montantBase} EUR
      </div>
    `;
    return node;
  }

  createTreeResultNode(bornes) {
    const modeAffichage = this.arbre?.mode_affichage || 'minimum';
    let displayText;

    if (modeAffichage === 'minimum') {
      displayText = `A partir de ${bornes.min} EUR`;
    } else {
      displayText = `${bornes.max} EUR*`;
    }

    const node = document.createElement('div');
    node.className = 'tree-result';
    node.innerHTML = `
      <div class="tree-result-node">
        <i class="bi bi-check-circle-fill"></i>
        ${displayText}
      </div>
    `;
    return node;
  }

  renderTreeNode(noeud, typeInfo, index, noeudsRestants = [], reductionCumulee = 0) {
    const nodeWrapper = document.createElement('div');
    nodeWrapper.className = 'tree-node';

    // Carte du noeud (juste le header)
    const card = document.createElement('div');
    card.className = 'tree-node-card';
    card.dataset.noeudId = noeud.id;
    card.style.setProperty('--node-color', typeInfo.couleur || '#6c757d');

    const noeudsTotaux = this.arbre?.arbre_json?.noeuds?.length || 1;

    card.innerHTML = `
      <div class="tree-node-header">
        <div class="tree-node-type">
          <i class="bi ${typeInfo.icone || 'bi-question'}"></i>
          <span>${typeInfo.libelle || noeud.type}</span>
        </div>
        <div class="tree-node-actions">
          <button class="btn btn-sm btn-edit" title="Editer">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-move-up" title="Monter" ${index === 0 ? 'disabled' : ''}>
            <i class="bi bi-arrow-up"></i>
          </button>
          <button class="btn btn-sm btn-move-down" title="Descendre" ${index >= noeudsTotaux - 1 ? 'disabled' : ''}>
            <i class="bi bi-arrow-down"></i>
          </button>
        </div>
      </div>
    `;

    nodeWrapper.appendChild(card);

    // Container des branches (separe de la carte)
    const branchesContainer = document.createElement('div');
    branchesContainer.className = 'tree-branches-container';

    const branches = noeud.branches || [];
    branches.forEach((branche, brancheIndex) => {
      const brancheRow = this.renderTreeBranchRow(branche, noeud.id, brancheIndex, noeudsRestants, reductionCumulee, typeInfo.couleur);
      branchesContainer.appendChild(brancheRow);
    });

    nodeWrapper.appendChild(branchesContainer);

    // Attacher les evenements
    card.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      this.ouvrirModalEdition(noeud);
    });

    card.querySelector('.btn-move-up').addEventListener('click', () => {
      this.deplacerNoeud(noeud.id, -1);
    });

    card.querySelector('.btn-move-down').addEventListener('click', () => {
      this.deplacerNoeud(noeud.id, 1);
    });

    return nodeWrapper;
  }

  renderTreeBranchRow(branche, noeudId, brancheIndex, noeudsRestants = [], reductionCumulee = 0, nodeColor = '#6c757d') {
    const branchRow = document.createElement('div');
    branchRow.className = 'tree-branch-row';

    // Calculer la reduction de cette branche
    const reduction = branche.reduction;
    let reductionBranche = 0;
    let reductionText = '';
    if (reduction) {
      if (reduction.type_calcul === 'pourcentage') {
        reductionBranche = this.montantBase * reduction.valeur / 100;
        reductionText = `-${reduction.valeur}%`;
      } else {
        reductionBranche = reduction.valeur;
        reductionText = `-${reduction.valeur} EUR`;
      }
    }

    const nouvelleCumulee = reductionCumulee + reductionBranche;

    // Label de la branche
    const label = document.createElement('div');
    label.className = 'tree-branch-label';
    label.dataset.brancheId = branche.id;
    label.style.setProperty('--node-color', nodeColor);
    label.innerHTML = `
      <span class="branch-name">${this.escapeHtml(branche.libelle || branche.code)}</span>
      <span class="branch-reduction ${!reduction ? 'no-reduction' : ''}">${reductionText || '(base)'}</span>
    `;
    branchRow.appendChild(label);

    // Bouton d'ajout de sous-condition
    if (!this.arbre?.verrouille) {
      const addBtn = document.createElement('button');
      addBtn.className = 'tree-branch-add';
      addBtn.title = 'Ajouter sous-condition';
      addBtn.innerHTML = '<i class="bi bi-plus"></i>';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ouvrirModalAjoutEnfant(noeudId, branche.id);
      });
      branchRow.appendChild(addBtn);
    }

    // Connecteur horizontal
    const connector = document.createElement('div');
    connector.className = 'tree-connector short';
    branchRow.appendChild(connector);

    // Element suivant: enfants, noeud suivant, ou resultat
    if (branche.enfants && branche.enfants.length > 0) {
      // Afficher les sous-conditions
      branche.enfants.forEach((enfant, enfantIndex) => {
        const enfantNode = this.renderTreeChild(enfant, noeudId, branche.id, enfantIndex, noeudsRestants, nouvelleCumulee);
        branchRow.appendChild(enfantNode);
      });
    } else if (noeudsRestants.length > 0) {
      // Afficher le prochain noeud de condition
      const nextNoeud = noeudsRestants[0];
      const nextTypeInfo = this.typesCondition.find(t => t.code === nextNoeud.type) || {};
      const nextNodeEl = this.renderTreeNode(nextNoeud, nextTypeInfo, 1, noeudsRestants.slice(1), nouvelleCumulee);
      branchRow.appendChild(nextNodeEl);
    } else {
      // Afficher le resultat final
      const montantFinal = Math.max(0, this.montantBase - nouvelleCumulee);
      const resultNode = this.createBranchResultNode(montantFinal);
      branchRow.appendChild(resultNode);
    }

    return branchRow;
  }

  createBranchResultNode(montant) {
    const node = document.createElement('div');
    node.className = 'tree-result';
    node.innerHTML = `
      <div class="tree-result-node">
        <i class="bi bi-tag-fill"></i>
        ${montant} EUR
      </div>
    `;
    return node;
  }

  renderTreeChild(enfant, noeudId, brancheId, enfantIndex, noeudsRestants = [], reductionCumulee = 0) {
    const typeInfo = this.typesCondition.find(t => t.code === enfant.type) || {};
    const branches = enfant.branches || [];

    const childWrapper = document.createElement('div');
    childWrapper.className = 'tree-child';
    childWrapper.dataset.enfantIndex = enfantIndex;
    childWrapper.dataset.noeudId = noeudId;
    childWrapper.dataset.brancheId = brancheId;

    // Carte de l'enfant (juste le header)
    const card = document.createElement('div');
    card.className = 'tree-node-card';
    card.style.setProperty('--node-color', typeInfo.couleur || '#6c757d');

    card.innerHTML = `
      <div class="tree-node-header">
        <div class="tree-node-type">
          <i class="bi ${typeInfo.icone || 'bi-question'}"></i>
          <span>${typeInfo.libelle || enfant.type}</span>
        </div>
        <div class="tree-node-actions">
          <button class="btn btn-sm btn-edit-enfant" title="Editer">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-delete-enfant" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;

    childWrapper.appendChild(card);

    // Container des branches (separe de la carte)
    const branchesContainer = document.createElement('div');
    branchesContainer.className = 'tree-branches-container';

    branches.forEach((b, bIndex) => {
      const branchRow = this.renderChildBranchRow(b, noeudId, brancheId, enfant, bIndex, noeudsRestants, reductionCumulee, typeInfo.couleur);
      branchesContainer.appendChild(branchRow);
    });

    childWrapper.appendChild(branchesContainer);

    // Evenements
    card.querySelector('.btn-edit-enfant').addEventListener('click', (e) => {
      e.stopPropagation();
      this.ouvrirEditionEnfant(noeudId, brancheId, enfantIndex);
    });

    card.querySelector('.btn-delete-enfant').addEventListener('click', (e) => {
      e.stopPropagation();
      this.supprimerEnfant(noeudId, brancheId, enfantIndex);
    });

    return childWrapper;
  }

  renderChildBranchRow(branche, noeudId, parentBrancheId, enfant, brancheIndex, noeudsRestants = [], reductionCumulee = 0, nodeColor = '#6c757d') {
    const branchRow = document.createElement('div');
    branchRow.className = 'tree-branch-row';

    // Calculer la reduction de cette branche
    let reductionBranche = 0;
    let reductionText = '';
    if (branche.reduction) {
      if (branche.reduction.type_calcul === 'pourcentage') {
        reductionBranche = this.montantBase * branche.reduction.valeur / 100;
        reductionText = `-${branche.reduction.valeur}%`;
      } else {
        reductionBranche = branche.reduction.valeur;
        reductionText = `-${branche.reduction.valeur} EUR`;
      }
    }

    const nouvelleCumulee = reductionCumulee + reductionBranche;

    // Label de la branche
    const label = document.createElement('div');
    label.className = 'tree-branch-label';
    label.dataset.brancheId = branche.id;
    label.style.setProperty('--node-color', nodeColor);
    label.innerHTML = `
      <span class="branch-name">${this.escapeHtml(branche.libelle || branche.code)}</span>
      <span class="branch-reduction ${!branche.reduction ? 'no-reduction' : ''}">${reductionText || '(base)'}</span>
    `;
    branchRow.appendChild(label);

    // Bouton d'ajout de sous-sous-condition
    if (!this.arbre?.verrouille) {
      const addBtn = document.createElement('button');
      addBtn.className = 'tree-branch-add';
      addBtn.title = 'Ajouter sous-condition';
      addBtn.innerHTML = '<i class="bi bi-plus"></i>';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Contexte pour sous-sous-condition : on passe l'enfant et l'index de sa branche
        this.ouvrirModalAjoutSousEnfant(noeudId, parentBrancheId, enfant, brancheIndex);
      });
      branchRow.appendChild(addBtn);
    }

    // Connecteur horizontal
    const connector = document.createElement('div');
    connector.className = 'tree-connector short';
    branchRow.appendChild(connector);

    // Element suivant: sous-enfants, noeud suivant, ou resultat
    if (branche.enfants && branche.enfants.length > 0) {
      // Afficher les sous-sous-conditions
      branche.enfants.forEach((sousEnfant, sousEnfantIndex) => {
        const sousEnfantNode = this.renderTreeChild(sousEnfant, noeudId, branche.id, sousEnfantIndex, noeudsRestants, nouvelleCumulee);
        branchRow.appendChild(sousEnfantNode);
      });
    } else if (noeudsRestants.length > 0) {
      // Afficher le prochain noeud de condition
      const nextNoeud = noeudsRestants[0];
      const nextTypeInfo = this.typesCondition.find(t => t.code === nextNoeud.type) || {};
      const nextNodeEl = this.renderTreeNode(nextNoeud, nextTypeInfo, 1, noeudsRestants.slice(1), nouvelleCumulee);
      branchRow.appendChild(nextNodeEl);
    } else {
      // Afficher le resultat final
      const montantFinal = Math.max(0, this.montantBase - nouvelleCumulee);
      const resultNode = this.createBranchResultNode(montantFinal);
      branchRow.appendChild(resultNode);
    }

    return branchRow;
  }

  updateBornes() {
    if (!this.arbre) return;

    const bornes = this.calculerBornesLocales();
    document.getElementById('label-bornes').innerHTML =
      `Bornes: <strong>${bornes.min} EUR - ${bornes.max} EUR</strong>`;
  }

  calculerBornesLocales() {
    const noeuds = this.arbre?.arbre_json?.noeuds || [];
    let reductionMax = 0;

    for (const noeud of noeuds) {
      reductionMax += this.calculerReductionMaxNoeud(noeud);
    }

    return {
      min: Math.max(0, this.montantBase - reductionMax),
      max: this.montantBase
    };
  }

  calculerReductionMaxNoeud(noeud) {
    let maxNoeud = 0;

    for (const branche of noeud.branches || []) {
      let maxBranche = 0;

      // Reduction directe de la branche
      if (branche.reduction) {
        const val = branche.reduction.valeur || 0;
        if (branche.reduction.type_calcul === 'pourcentage') {
          maxBranche = this.montantBase * val / 100;
        } else {
          maxBranche = val;
        }
      }

      // Ajouter les reductions des enfants
      if (branche.enfants && branche.enfants.length > 0) {
        for (const enfant of branche.enfants) {
          maxBranche += this.calculerReductionMaxNoeud(enfant);
        }
      }

      maxNoeud = Math.max(maxNoeud, maxBranche);
    }

    return maxNoeud;
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  ajouterNoeud(typeCode) {
    if (this.arbre?.verrouille) {
      this.showError('L\'arbre est verrouille');
      return;
    }

    const noeuds = this.arbre.arbre_json.noeuds || [];

    // Verifier si ce type existe deja
    if (noeuds.some(n => n.type === typeCode)) {
      this.showError('Ce critere existe deja dans l\'arbre');
      return;
    }

    const newNoeud = {
      id: `node_${Date.now()}`,
      type: typeCode,
      ordre: noeuds.length + 1,
      branches: [
        {
          id: `branch_${Date.now()}_1`,
          code: 'DEFAULT',
          libelle: 'Condition par defaut',
          condition: this.getDefaultConditionForType(typeCode),
          reduction: null
        }
      ]
    };

    this.arbre.arbre_json.noeuds.push(newNoeud);
    this.markAsChanged();
    this.renderArbre();
    this.updateBornes();

    // Ouvrir le modal d'edition
    this.ouvrirModalEdition(newNoeud);
  }

  deplacerNoeud(noeudId, direction) {
    const noeuds = this.arbre.arbre_json.noeuds;
    const index = noeuds.findIndex(n => n.id === noeudId);

    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= noeuds.length) return;

    // Echanger les positions
    [noeuds[index], noeuds[newIndex]] = [noeuds[newIndex], noeuds[index]];

    // Mettre a jour les ordres
    noeuds.forEach((n, i) => n.ordre = i + 1);

    this.markAsChanged();
    this.renderArbre();
  }

  // ============================================================
  // AJOUT SOUS-CONDITIONS DEPUIS LE SCHEMA
  // ============================================================

  ouvrirModalAjoutEnfant(noeudId, brancheId) {
    // Stocker le contexte pour l'ajout
    this.ajoutEnfantContext = { noeudId, brancheId };

    // Trouver le noeud parent pour exclure son type
    const noeud = this.arbre.arbre_json.noeuds.find(n => n.id === noeudId);
    const noeudType = noeud?.type;

    // Remplir la liste des types disponibles (exclure le type du noeud parent)
    const container = document.getElementById('liste-types-enfant');
    container.innerHTML = this.typesCondition
      .filter(t => t.code !== noeudType)
      .map(t => `
        <button type="button" class="btn btn-outline-secondary text-start btn-select-type-enfant" data-type="${t.code}">
          <i class="bi ${t.icone || 'bi-question'} me-2" style="color: ${t.couleur}"></i>
          ${t.libelle}
        </button>
      `).join('');

    // Attacher les events
    container.querySelectorAll('.btn-select-type-enfant').forEach(btn => {
      btn.addEventListener('click', () => {
        const typeCode = btn.dataset.type;
        this.ajouterEnfantDepuisSchema(typeCode);
      });
    });

    // Ouvrir le modal
    const modalEl = document.getElementById('modal-ajout-enfant');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  ajouterEnfantDepuisSchema(typeCode) {
    const { noeudId, brancheId } = this.ajoutEnfantContext || {};
    if (!noeudId || !brancheId) return;

    // Trouver le noeud et la branche
    const noeud = this.arbre.arbre_json.noeuds.find(n => n.id === noeudId);
    if (!noeud) return;

    const branche = noeud.branches.find(b => b.id === brancheId);
    if (!branche) return;

    // Initialiser le tableau enfants si necessaire
    if (!branche.enfants) branche.enfants = [];

    // Creer le nouvel enfant
    const enfantIndex = branche.enfants.length;
    const newEnfant = {
      id: `enfant_${Date.now()}_${enfantIndex}`,
      type: typeCode,
      branches: [
        {
          id: `branch_enfant_${Date.now()}_0`,
          code: 'DEFAULT',
          libelle: 'Condition par defaut',
          condition: this.getDefaultConditionForType(typeCode),
          reduction: null
        }
      ]
    };

    // Ajouter l'enfant a la branche
    branche.enfants.push(newEnfant);

    // Fermer le modal de selection de type
    const modalAjout = bootstrap.Modal.getInstance(document.getElementById('modal-ajout-enfant'));
    if (modalAjout) modalAjout.hide();

    // Marquer comme modifie et re-render
    this.markAsChanged();
    this.renderArbre();
    this.updateBornes();

    // Ouvrir le modal d'edition de l'enfant
    // On utilise un timeout pour laisser le modal precedent se fermer
    setTimeout(() => {
      this.enfantEnEdition = {
        noeudId,
        brancheId,
        enfant: newEnfant,
        enfantIndex
      };
      this.ouvrirModalEnfantDirect(newEnfant);
    }, 300);
  }

  ouvrirModalAjoutSousEnfant(noeudId, parentBrancheId, enfant, brancheIndex) {
    // Stocker le contexte pour l'ajout de sous-sous-condition
    this.ajoutSousEnfantContext = { noeudId, parentBrancheId, enfant, brancheIndex };

    // Exclure le type de l'enfant parent
    const enfantType = enfant?.type;

    // Remplir la liste des types disponibles
    const container = document.getElementById('liste-types-enfant');
    container.innerHTML = this.typesCondition
      .filter(t => t.code !== enfantType)
      .map(t => `
        <button type="button" class="btn btn-outline-secondary text-start btn-select-type-sous-enfant" data-type="${t.code}">
          <i class="bi ${t.icone || 'bi-question'} me-2" style="color: ${t.couleur}"></i>
          ${t.libelle}
        </button>
      `).join('');

    // Attacher les events
    container.querySelectorAll('.btn-select-type-sous-enfant').forEach(btn => {
      btn.addEventListener('click', () => {
        const typeCode = btn.dataset.type;
        this.ajouterSousEnfantDepuisSchema(typeCode);
      });
    });

    // Ouvrir le modal
    const modalEl = document.getElementById('modal-ajout-enfant');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  ajouterSousEnfantDepuisSchema(typeCode) {
    const { noeudId, parentBrancheId, enfant, brancheIndex } = this.ajoutSousEnfantContext || {};
    if (!enfant || brancheIndex === undefined) return;

    // Trouver la branche de l'enfant
    const branche = enfant.branches?.[brancheIndex];
    if (!branche) return;

    // Initialiser le tableau enfants si necessaire
    if (!branche.enfants) branche.enfants = [];

    // Creer le nouvel enfant
    const sousEnfantIndex = branche.enfants.length;
    const newSousEnfant = {
      id: `sous_enfant_${Date.now()}_${sousEnfantIndex}`,
      type: typeCode,
      branches: [
        {
          id: `branch_sous_enfant_${Date.now()}_0`,
          code: 'DEFAULT',
          libelle: 'Condition par defaut',
          condition: this.getDefaultConditionForType(typeCode),
          reduction: null
        }
      ]
    };

    // Ajouter le sous-enfant a la branche de l'enfant
    branche.enfants.push(newSousEnfant);

    // Fermer le modal de selection de type
    const modalAjout = bootstrap.Modal.getInstance(document.getElementById('modal-ajout-enfant'));
    if (modalAjout) modalAjout.hide();

    // Marquer comme modifie et re-render
    this.markAsChanged();
    this.renderArbre();
    this.updateBornes();

    // Ouvrir le modal d'edition du sous-enfant
    setTimeout(() => {
      this.enfantEnEdition = {
        noeudId,
        brancheId: branche.id,
        enfant: newSousEnfant,
        enfantIndex: sousEnfantIndex
      };
      this.ouvrirModalEnfantDirect(newSousEnfant);
    }, 300);
  }

  ouvrirModalEnfantDirect(enfant) {
    const typeInfo = this.typesCondition.find(t => t.code === enfant.type) || {};

    // Mettre a jour le titre du modal
    document.getElementById('modal-noeud-titre').textContent = `Sous-condition: ${typeInfo.libelle || enfant.type}`;
    const badge = document.getElementById('modal-noeud-type-badge');
    badge.style.backgroundColor = typeInfo.couleur || '#6c757d';
    badge.querySelector('i').className = `bi ${typeInfo.icone || 'bi-question'}`;
    badge.querySelector('span').textContent = typeInfo.libelle || enfant.type;

    // Important: mettre a jour noeudEnEdition pour que ajouterBrancheModal utilise le bon type
    this.noeudEnEdition = enfant;

    // Render les branches de l'enfant
    const container = document.getElementById('modal-branches-container');
    container.innerHTML = '';

    (enfant.branches || []).forEach((branche, index) => {
      const row = this.createBrancheRow(branche, index, enfant.branches.length, enfant.type);
      container.appendChild(row);
    });

    // Marquer qu'on edite un enfant
    this.editingEnfant = true;

    // Ouvrir le modal
    const modalEl = document.getElementById('modal-edition-noeud');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  ouvrirEditionEnfant(noeudId, brancheId, enfantIndex) {
    // Trouver l'enfant dans l'arbre - recherche récursive
    const resultat = this.trouverEnfantRecursif(noeudId, brancheId, enfantIndex);
    if (!resultat) return;

    const { enfant, chemin } = resultat;

    // Stocker le contexte
    this.enfantEnEdition = {
      noeudId,
      brancheId,
      enfant,
      enfantIndex,
      chemin  // Garder le chemin complet pour la mise à jour
    };

    // Ouvrir le modal
    this.ouvrirModalEnfantDirect(enfant);
  }

  /**
   * Recherche récursive d'un enfant dans l'arbre
   * Parcourt les noeuds, branches et enfants imbriqués
   */
  trouverEnfantRecursif(noeudId, brancheId, enfantIndex) {
    // D'abord chercher dans les noeuds principaux
    const noeud = this.arbre.arbre_json.noeuds.find(n => n.id === noeudId);
    if (!noeud) return null;

    // Chercher la branche dans le noeud principal
    const brancheDirecte = noeud.branches?.find(b => b.id === brancheId);
    if (brancheDirecte && brancheDirecte.enfants && brancheDirecte.enfants[enfantIndex]) {
      return {
        enfant: brancheDirecte.enfants[enfantIndex],
        chemin: { noeudId, brancheId, enfantIndex, niveau: 1 }
      };
    }

    // Sinon, chercher récursivement dans les enfants des branches
    for (const branche of noeud.branches || []) {
      const resultat = this.chercherDansEnfants(branche.enfants || [], brancheId, enfantIndex, [{ noeudId, brancheId: branche.id }]);
      if (resultat) return resultat;
    }

    return null;
  }

  /**
   * Recherche dans les enfants imbriqués
   */
  chercherDansEnfants(enfants, brancheIdCible, enfantIndexCible, chemin) {
    for (const enfant of enfants) {
      for (const branche of enfant.branches || []) {
        // Est-ce la branche qu'on cherche?
        if (branche.id === brancheIdCible && branche.enfants && branche.enfants[enfantIndexCible]) {
          return {
            enfant: branche.enfants[enfantIndexCible],
            chemin: [...chemin, { brancheId: branche.id, enfantIndex: enfantIndexCible }]
          };
        }

        // Sinon chercher plus profond
        if (branche.enfants && branche.enfants.length > 0) {
          const resultat = this.chercherDansEnfants(branche.enfants, brancheIdCible, enfantIndexCible, [...chemin, { brancheId: branche.id }]);
          if (resultat) return resultat;
        }
      }
    }
    return null;
  }

  supprimerEnfant(noeudId, brancheId, enfantIndex) {
    if (!confirm('Supprimer cette sous-condition ?')) return;

    // Trouver et supprimer l'enfant
    const noeud = this.arbre.arbre_json.noeuds.find(n => n.id === noeudId);
    if (!noeud) return;

    const branche = noeud.branches.find(b => b.id === brancheId);
    if (!branche || !branche.enfants) return;

    branche.enfants.splice(enfantIndex, 1);

    // Si plus d'enfants, nettoyer le tableau
    if (branche.enfants.length === 0) {
      delete branche.enfants;
    }

    this.markAsChanged();
    this.renderArbre();
    this.updateBornes();
  }

  ouvrirModalEdition(noeud) {
    this.noeudEnEdition = noeud;
    this.editingEnfant = false;
    this.enfantEnEdition = null;

    const typeInfo = this.typesCondition.find(t => t.code === noeud.type) || {};

    // Titre et badge
    document.getElementById('modal-noeud-titre').textContent = `Editer: ${typeInfo.libelle || noeud.type}`;
    const badge = document.getElementById('modal-noeud-type-badge');
    badge.style.backgroundColor = typeInfo.couleur || '#6c757d';
    badge.querySelector('i').className = `bi ${typeInfo.icone || 'bi-question'}`;
    badge.querySelector('span').textContent = typeInfo.libelle || noeud.type;

    // Render branches
    this.renderBranchesModal(noeud.branches || []);

    // Ouvrir (utiliser getOrCreateInstance pour eviter les instances multiples)
    const modalEl = document.getElementById('modal-edition-noeud');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  renderBranchesModal(branches) {
    const container = document.getElementById('modal-branches-container');
    container.innerHTML = '';
    const noeudType = this.noeudEnEdition?.type;

    branches.forEach((branche, index) => {
      const row = this.createBrancheRow(branche, index, branches.length, noeudType);
      container.appendChild(row);
    });
  }

  createBrancheRow(branche, index, totalBranches, noeudType) {
    const row = document.createElement('div');
    row.className = 'branche-edit-row mb-3 p-3 bg-light rounded border';
    row.dataset.brancheIndex = index;

    const operations = this.operationsComptables.map(op =>
      `<option value="${op.id}" ${branche.reduction?.operation_id === op.id ? 'selected' : ''}>${op.libelle}</option>`
    ).join('');

    // Generer l'editeur de condition selon le type
    const conditionEditor = this.renderConditionEditor(noeudType, branche.condition, index);

    // Compter les enfants existants (pour info)
    const enfants = branche.enfants || [];

    row.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="badge bg-secondary">Branche ${index + 1}</span>
        <button type="button" class="btn btn-outline-danger btn-sm btn-supprimer-branche" ${totalBranches <= 1 ? 'disabled' : ''}>
          <i class="bi bi-trash"></i> Supprimer
        </button>
      </div>
      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label">Libelle de la branche</label>
          <input type="text" class="form-control branche-libelle" value="${this.escapeHtml(branche.libelle || '')}" placeholder="Ex: Habitants de l'agglo">
        </div>
        <div class="col-md-6">
          <label class="form-label">Code (identifiant unique)</label>
          <input type="text" class="form-control branche-code" value="${this.escapeHtml(branche.code || '')}" placeholder="Ex: DANS_AGGLO">
        </div>
      </div>
      <div class="row g-2 mt-2">
        <div class="col-12">
          <label class="form-label"><i class="bi bi-funnel me-1"></i>Condition d'application</label>
          <div class="condition-editor-container p-2 bg-white rounded border">
            ${conditionEditor}
          </div>
        </div>
      </div>
      <div class="row g-2 mt-2">
        <div class="col-md-4">
          <label class="form-label">Type de reduction</label>
          <select class="form-select branche-type-calcul">
            <option value="" ${!branche.reduction ? 'selected' : ''}>Pas de reduction (montant de base)</option>
            <option value="fixe" ${branche.reduction?.type_calcul === 'fixe' ? 'selected' : ''}>Montant fixe (EUR)</option>
            <option value="pourcentage" ${branche.reduction?.type_calcul === 'pourcentage' ? 'selected' : ''}>Pourcentage (%)</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Valeur</label>
          <input type="number" class="form-control branche-valeur" value="${branche.reduction?.valeur || ''}" step="0.01" min="0">
        </div>
        <div class="col-md-5">
          <label class="form-label">Operation comptable</label>
          <select class="form-select branche-operation">
            <option value="">-- Choisir --</option>
            ${operations}
          </select>
        </div>
      </div>

      <!-- Info sous-conditions -->
      ${enfants.length > 0 ? `
        <div class="mt-3 pt-2 border-top">
          <small class="text-muted"><i class="bi bi-diagram-3 me-1"></i>${enfants.length} sous-condition(s) - gerez-les depuis le schema visuel</small>
        </div>
      ` : ''}
    `;

    // Event listener suppression branche
    row.querySelector('.btn-supprimer-branche').addEventListener('click', () => {
      row.remove();
      this.updateBranchNumbers();
    });

    return row;
  }

  updateBranchNumbers() {
    const rows = document.querySelectorAll('.branche-edit-row');
    rows.forEach((row, index) => {
      row.dataset.brancheIndex = index;
      const badge = row.querySelector('.badge');
      if (badge) badge.textContent = `Branche ${index + 1}`;
    });
  }

  // ============================================================
  // EDITEURS DE CONDITION PAR TYPE
  // ============================================================

  renderConditionEditor(noeudType, condition, index) {
    switch (noeudType) {
      case 'COMMUNE':
        return this.renderCommuneConditionEditor(condition, index);
      case 'AGE':
        return this.renderAgeConditionEditor(condition, index);
      case 'QF':
        return this.renderQFConditionEditor(condition, index);
      case 'FIDELITE':
        return this.renderFideliteConditionEditor(condition, index);
      case 'MULTI_INSCRIPTIONS':
        return this.renderMultiInscriptionsConditionEditor(condition, index);
      case 'TAG':
      case 'STATUT_SOCIAL':  // Retrocompatibilite
        return this.renderTagConditionEditor(condition, index);
      default:
        return this.renderGenericConditionEditor(condition, index);
    }
  }

  renderCommuneConditionEditor(condition, index) {
    const condType = condition?.type || 'communaute';
    const selectedIds = condition?.ids || (condition?.id ? [condition.id] : []);

    // Options pour les communautes de communes
    const hasCommunautes = this.communautes && this.communautes.length > 0;
    const communautesOptions = hasCommunautes
      ? this.communautes.map(c =>
          `<option value="${c.id}" ${selectedIds.includes(c.id) ? 'selected' : ''}>${this.escapeHtml(c.nom)}</option>`
        ).join('')
      : '<option value="" disabled>Aucune communaute configuree</option>';

    // Options pour les communes (groupees par departement)
    const hasCommunes = this.communes && this.communes.length > 0;
    let communesOptions = '';
    if (hasCommunes) {
      const communesGrouped = {};
      this.communes.forEach(c => {
        const dept = c.code_postal?.substring(0, 2) || '??';
        if (!communesGrouped[dept]) communesGrouped[dept] = [];
        communesGrouped[dept].push(c);
      });

      Object.keys(communesGrouped).sort().forEach(dept => {
        communesOptions += `<optgroup label="Departement ${dept}">`;
        communesGrouped[dept].forEach(c => {
          communesOptions += `<option value="${c.id}" ${selectedIds.includes(c.id) ? 'selected' : ''}>${this.escapeHtml(c.nom)} (${c.code_postal})</option>`;
        });
        communesOptions += '</optgroup>';
      });
    } else {
      communesOptions = '<option value="" disabled>Aucune commune dans le referentiel</option>';
    }

    // Affichage selon le type selectionne
    const showCommunautes = condType === 'communaute';
    const showCommunes = condType === 'communes';
    const showSelection = condType !== 'autre';

    // Message d'aide si pas de communautes configurees
    const noCommunautesWarning = !hasCommunautes && condType === 'communaute'
      ? '<div class="text-warning small mt-1"><i class="bi bi-exclamation-triangle"></i> Configurez des communautes dans Parametres > Communautes de communes</div>'
      : '';

    // Message d'aide si pas de communes
    const noCommunesWarning = !hasCommunes && condType === 'communes'
      ? '<div class="text-warning small mt-1"><i class="bi bi-exclamation-triangle"></i> Importez des communes dans Parametres > Referentiel Communes</div>'
      : '';

    return `
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small">Type de condition</label>
          <select class="form-select form-select-sm condition-commune-type" onchange="window.arbreEditor.toggleCommuneSelect(this, ${index})">
            <option value="communaute" ${condType === 'communaute' ? 'selected' : ''}>Dans une communaute</option>
            <option value="communes" ${condType === 'communes' ? 'selected' : ''}>Communes specifiques</option>
            <option value="autre" ${condType === 'autre' ? 'selected' : ''}>Toutes les autres (fallback)</option>
          </select>
        </div>
        <div class="col-md-8 condition-commune-select-container" ${!showSelection ? 'style="display:none"' : ''}>
          <!-- Champ de recherche pour communes -->
          <div class="condition-commune-search-container mb-1" ${!showCommunes ? 'style="display:none"' : ''}>
            <label class="form-label small">Recherche par code postal ou nom</label>
            <input type="text" class="form-control form-control-sm condition-commune-search"
                   placeholder="Ex: 74140 ou Douvaine"
                   oninput="window.arbreEditor.filtrerCommunes(this)">
          </div>

          <!-- Label pour communautes -->
          <div class="condition-communaute-label" ${!showCommunautes ? 'style="display:none"' : ''}>
            <label class="form-label small">Communaute de communes</label>
          </div>

          <!-- Label pour communes -->
          <div class="condition-communes-label" ${!showCommunes ? 'style="display:none"' : ''}>
            <label class="form-label small">Communes (${this.communes.length} disponibles)</label>
          </div>

          <select class="form-select form-select-sm condition-commune-ids" multiple size="5"
                  ${!showSelection ? 'disabled' : ''}>
            ${showCommunautes ? communautesOptions : communesOptions}
          </select>
          <small class="text-muted">Maintenez Ctrl pour selectionner plusieurs</small>
          ${noCommunautesWarning}
          ${noCommunesWarning}
        </div>
      </div>
    `;
  }

  filtrerCommunes(inputElement) {
    const container = inputElement.closest('.condition-editor-container');
    const idsSelect = container.querySelector('.condition-commune-ids');
    const searchTerm = inputElement.value.toLowerCase().trim();

    if (!searchTerm) {
      // Remettre toutes les communes
      this.remplirSelectCommunes(idsSelect, this.communes, []);
      return;
    }

    // Filtrer par CP ou nom
    const filtered = this.communes.filter(c => {
      const cp = (c.code_postal || '').toLowerCase();
      const nom = (c.nom || '').toLowerCase();
      return cp.startsWith(searchTerm) || nom.includes(searchTerm);
    });

    // Garder les selections actuelles
    const selectedIds = Array.from(idsSelect.selectedOptions).map(opt => parseInt(opt.value));

    this.remplirSelectCommunes(idsSelect, filtered, selectedIds);
  }

  remplirSelectCommunes(selectElement, communes, selectedIds) {
    if (!communes || communes.length === 0) {
      selectElement.innerHTML = '<option value="" disabled>Aucun resultat</option>';
      return;
    }

    // Grouper par departement
    const grouped = {};
    communes.forEach(c => {
      const dept = c.code_postal?.substring(0, 2) || '??';
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(c);
    });

    let html = '';
    Object.keys(grouped).sort().forEach(dept => {
      html += `<optgroup label="Departement ${dept}">`;
      grouped[dept].forEach(c => {
        const isSelected = selectedIds.includes(c.id);
        html += `<option value="${c.id}" ${isSelected ? 'selected' : ''}>${this.escapeHtml(c.nom)} (${c.code_postal})</option>`;
      });
      html += '</optgroup>';
    });

    selectElement.innerHTML = html;
  }

  toggleCommuneSelect(selectElement, index) {
    const container = selectElement.closest('.condition-editor-container');
    const selectContainer = container.querySelector('.condition-commune-select-container');
    const idsSelect = container.querySelector('.condition-commune-ids');
    const searchContainer = container.querySelector('.condition-commune-search-container');
    const communauteLabel = container.querySelector('.condition-communaute-label');
    const communesLabel = container.querySelector('.condition-communes-label');
    const searchInput = container.querySelector('.condition-commune-search');
    const type = selectElement.value;

    if (type === 'autre') {
      selectContainer.style.display = 'none';
      idsSelect.disabled = true;
    } else {
      selectContainer.style.display = '';
      idsSelect.disabled = false;

      // Afficher/masquer selon le type
      const showCommunautes = type === 'communaute';
      const showCommunes = type === 'communes';

      if (searchContainer) searchContainer.style.display = showCommunes ? '' : 'none';
      if (communauteLabel) communauteLabel.style.display = showCommunautes ? '' : 'none';
      if (communesLabel) communesLabel.style.display = showCommunes ? '' : 'none';

      // Reset le champ de recherche
      if (searchInput) searchInput.value = '';

      // Changer les options selon le type
      if (showCommunautes) {
        if (this.communautes && this.communautes.length > 0) {
          idsSelect.innerHTML = this.communautes.map(c =>
            `<option value="${c.id}">${this.escapeHtml(c.nom)}</option>`
          ).join('');
        } else {
          idsSelect.innerHTML = '<option value="" disabled>Aucune communaute configuree</option>';
        }
      } else {
        // Communes
        this.remplirSelectCommunes(idsSelect, this.communes, []);
      }
    }
  }

  renderAgeConditionEditor(condition, index) {
    const operateur = condition?.operateur || '<';
    const valeur = condition?.valeur || '';
    const min = condition?.min || '';
    const max = condition?.max || '';

    return `
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small">Operateur</label>
          <select class="form-select form-select-sm condition-age-operateur" onchange="window.arbreEditor.toggleAgeInputs(this)">
            <option value="<" ${operateur === '<' ? 'selected' : ''}>Moins de</option>
            <option value="<=" ${operateur === '<=' ? 'selected' : ''}>Jusqu'a (inclus)</option>
            <option value=">" ${operateur === '>' ? 'selected' : ''}>Plus de</option>
            <option value=">=" ${operateur === '>=' ? 'selected' : ''}>A partir de (inclus)</option>
            <option value="entre" ${operateur === 'entre' ? 'selected' : ''}>Entre (bornes)</option>
            <option value="=" ${operateur === '=' ? 'selected' : ''}>Exactement</option>
          </select>
        </div>
        <div class="col-md-4 condition-age-valeur-container" ${operateur === 'entre' ? 'style="display:none"' : ''}>
          <label class="form-label small">Age (ans)</label>
          <input type="number" class="form-control form-control-sm condition-age-valeur" value="${valeur}" min="0" max="120">
        </div>
        <div class="col-md-4 condition-age-min-container" ${operateur !== 'entre' ? 'style="display:none"' : ''}>
          <label class="form-label small">Age min</label>
          <input type="number" class="form-control form-control-sm condition-age-min" value="${min}" min="0" max="120">
        </div>
        <div class="col-md-4 condition-age-max-container" ${operateur !== 'entre' ? 'style="display:none"' : ''}>
          <label class="form-label small">Age max</label>
          <input type="number" class="form-control form-control-sm condition-age-max" value="${max}" min="0" max="120">
        </div>
      </div>
    `;
  }

  toggleAgeInputs(selectElement) {
    const container = selectElement.closest('.condition-editor-container');
    const operateur = selectElement.value;
    const valeurContainer = container.querySelector('.condition-age-valeur-container');
    const minContainer = container.querySelector('.condition-age-min-container');
    const maxContainer = container.querySelector('.condition-age-max-container');

    if (operateur === 'entre') {
      valeurContainer.style.display = 'none';
      minContainer.style.display = '';
      maxContainer.style.display = '';
    } else {
      valeurContainer.style.display = '';
      minContainer.style.display = 'none';
      maxContainer.style.display = 'none';
    }
  }

  renderQFConditionEditor(condition, index) {
    const modeSelection = condition?.mode || 'bareme';
    const baremeId = condition?.bareme_id || '';
    const operateur = condition?.operateur || '<=';
    const valeur = condition?.valeur || '';
    const min = condition?.min || '';
    const max = condition?.max || '';

    // Options pour les baremes
    const hasBaremes = this.baremesQF && this.baremesQF.length > 0;
    const baremesOptions = hasBaremes
      ? this.baremesQF.map(b =>
          `<option value="${b.id}" ${baremeId == b.id ? 'selected' : ''}>${this.escapeHtml(b.libelle)} (${b.tranches?.length || 0} tranches)</option>`
        ).join('')
      : '';

    // Affichage du bareme selectionne (tranches)
    const baremeSelectionne = hasBaremes && baremeId ? this.baremesQF.find(b => b.id == baremeId) : null;
    const tranchesInfo = baremeSelectionne && baremeSelectionne.tranches && baremeSelectionne.tranches.length > 0
      ? `<div class="mt-2 small text-muted">
          <strong>Tranches:</strong>
          ${baremeSelectionne.tranches.map(t => `${t.borne_min || 0}-${t.borne_max || '+'}: -${t.valeur || 0}${t.type_calcul === 'pourcentage' ? '%' : 'EUR'}`).join(' | ')}
        </div>`
      : '';

    const showBaremeMode = modeSelection === 'bareme';
    const showManuelMode = modeSelection === 'manuel';

    return `
      <div class="row g-2">
        <div class="col-12 mb-2">
          <label class="form-label small">Mode de selection</label>
          <div class="btn-group btn-group-sm w-100" role="group">
            <input type="radio" class="btn-check" name="qfMode_${index}" id="qfModeBareme_${index}"
                   value="bareme" ${showBaremeMode ? 'checked' : ''} onchange="window.arbreEditor.toggleQFMode(this)">
            <label class="btn btn-outline-primary" for="qfModeBareme_${index}">
              <i class="bi bi-table me-1"></i>Utiliser un bareme
            </label>
            <input type="radio" class="btn-check" name="qfMode_${index}" id="qfModeManuel_${index}"
                   value="manuel" ${showManuelMode ? 'checked' : ''} onchange="window.arbreEditor.toggleQFMode(this)">
            <label class="btn btn-outline-secondary" for="qfModeManuel_${index}">
              <i class="bi bi-pencil me-1"></i>Saisie manuelle
            </label>
          </div>
        </div>

        <!-- Mode Bareme -->
        <div class="col-12 condition-qf-bareme-container" ${!showBaremeMode ? 'style="display:none"' : ''}>
          <div class="row g-2 align-items-end">
            <div class="col-md-6">
              <label class="form-label small">Bareme de quotient familial</label>
              <select class="form-select form-select-sm condition-qf-bareme" onchange="window.arbreEditor.onBaremeQFChange(this)">
                <option value="">-- Selectionner un bareme --</option>
                ${baremesOptions}
              </select>
              ${!hasBaremes ? '<div class="text-warning small mt-1"><i class="bi bi-exclamation-triangle"></i> Aucun bareme configure</div>' : ''}
              <div class="condition-qf-tranches-info">${tranchesInfo}</div>
            </div>
            <div class="col-md-3">
              <button type="button" class="btn btn-primary btn-sm w-100 condition-qf-appliquer-btn"
                      onclick="window.arbreEditor.appliquerBaremeQF(this)" ${!baremeId ? 'disabled' : ''}>
                <i class="bi bi-arrow-down-circle me-1"></i>Appliquer
              </button>
            </div>
            <div class="col-md-3">
              <a href="parametres-baremes-qf.html" target="_blank"
                 class="btn btn-outline-success btn-sm w-100"
                 onclick="window.arbreEditor.onCreerBaremeClick()">
                <i class="bi bi-plus-lg me-1"></i>Nouveau
              </a>
              <div class="condition-qf-refresh-status small text-muted mt-1 text-center" style="display:none">
                <i class="bi bi-arrow-repeat spin"></i> Surveillance...
              </div>
            </div>
          </div>
        </div>

        <!-- Mode Manuel -->
        <div class="col-12 condition-qf-manuel-container" ${!showManuelMode ? 'style="display:none"' : ''}>
          <div class="row g-2">
            <div class="col-md-4">
              <label class="form-label small">Operateur</label>
              <select class="form-select form-select-sm condition-qf-operateur" onchange="window.arbreEditor.toggleQFInputs(this)">
                <option value="<=" ${operateur === '<=' ? 'selected' : ''}>Jusqu'a (inclus)</option>
                <option value="<" ${operateur === '<' ? 'selected' : ''}>Moins de</option>
                <option value=">=" ${operateur === '>=' ? 'selected' : ''}>A partir de (inclus)</option>
                <option value=">" ${operateur === '>' ? 'selected' : ''}>Plus de</option>
                <option value="entre" ${operateur === 'entre' ? 'selected' : ''}>Entre (bornes)</option>
                <option value="null" ${operateur === 'null' ? 'selected' : ''}>Non renseigne</option>
              </select>
            </div>
            <div class="col-md-4 condition-qf-valeur-container" ${['entre', 'null'].includes(operateur) ? 'style="display:none"' : ''}>
              <label class="form-label small">QF</label>
              <input type="number" class="form-control form-control-sm condition-qf-valeur" value="${valeur}" min="0">
            </div>
            <div class="col-md-4 condition-qf-min-container" ${operateur !== 'entre' ? 'style="display:none"' : ''}>
              <label class="form-label small">QF min</label>
              <input type="number" class="form-control form-control-sm condition-qf-min" value="${min}" min="0">
            </div>
            <div class="col-md-4 condition-qf-max-container" ${operateur !== 'entre' ? 'style="display:none"' : ''}>
              <label class="form-label small">QF max</label>
              <input type="number" class="form-control form-control-sm condition-qf-max" value="${max}" min="0">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  toggleQFMode(radioElement) {
    const container = radioElement.closest('.condition-editor-container');
    const mode = radioElement.value;
    const baremeContainer = container.querySelector('.condition-qf-bareme-container');
    const manuelContainer = container.querySelector('.condition-qf-manuel-container');

    if (mode === 'bareme') {
      baremeContainer.style.display = '';
      manuelContainer.style.display = 'none';
    } else {
      baremeContainer.style.display = 'none';
      manuelContainer.style.display = '';
    }
  }

  onBaremeQFChange(selectElement) {
    const container = selectElement.closest('.condition-editor-container');
    const baremeId = selectElement.value;
    const tranchesInfoEl = container.querySelector('.condition-qf-tranches-info');
    const appliquerBtn = container.querySelector('.condition-qf-appliquer-btn');

    // Activer/desactiver le bouton Appliquer
    if (appliquerBtn) {
      appliquerBtn.disabled = !baremeId;
    }

    if (!baremeId) {
      tranchesInfoEl.innerHTML = '';
      return;
    }

    const bareme = this.baremesQF?.find(b => b.id == baremeId);
    if (bareme && bareme.tranches && bareme.tranches.length > 0) {
      tranchesInfoEl.innerHTML = `
        <div class="mt-2 small text-muted">
          <strong>Tranches:</strong>
          ${bareme.tranches.map(t => `${t.borne_min || 0}-${t.borne_max || '+'}: -${t.valeur || 0}${t.type_calcul === 'pourcentage' ? '%' : 'EUR'}`).join(' | ')}
        </div>
      `;
    } else {
      tranchesInfoEl.innerHTML = '<div class="mt-2 small text-muted">Aucune tranche configuree</div>';
    }
  }

  appliquerBaremeQF(buttonElement) {
    const container = buttonElement.closest('.condition-editor-container');
    const baremeSelect = container.querySelector('.condition-qf-bareme');
    const baremeId = baremeSelect?.value;

    if (!baremeId) {
      this.showError('Veuillez selectionner un bareme');
      return;
    }

    const bareme = this.baremesQF?.find(b => b.id == baremeId);
    if (!bareme || !bareme.tranches || bareme.tranches.length === 0) {
      this.showError('Ce bareme n\'a pas de tranches configurees');
      return;
    }

    // Verifier qu'on a un noeud en edition
    if (!this.noeudEnEdition) {
      this.showError('Aucun noeud en edition');
      return;
    }

    // Generer les branches a partir des tranches
    const nouvellesBranches = bareme.tranches.map((tranche, index) => {
      const borneMax = tranche.borne_max || 99999;
      const borneMin = tranche.borne_min || 0;

      return {
        id: `branch_qf_${Date.now()}_${index}`,
        code: `QF_${borneMin}_${borneMax}`,
        libelle: tranche.libelle || `QF ${borneMin} - ${borneMax === 99999 ? '+' : borneMax}`,
        condition: {
          mode: 'manuel',
          operateur: 'entre',
          min: borneMin,
          max: borneMax
        },
        reduction: tranche.valeur > 0 ? {
          type_calcul: tranche.type_calcul || 'fixe',
          valeur: tranche.valeur
        } : null,
        enfants: []
      };
    });

    // Mettre a jour le noeud en edition
    this.noeudEnEdition.branches = nouvellesBranches;

    // Re-afficher les branches dans la modale pour permettre l'edition
    this.renderBranchesModal(nouvellesBranches);

    this.showSuccess(`${nouvellesBranches.length} branches generees depuis le bareme "${bareme.libelle}"`);
  }

  onCreerBaremeClick() {
    // Demarrer le rafraichissement automatique
    this.startBaremesQFRefresh();

    // Afficher l'indicateur de surveillance
    document.querySelectorAll('.condition-qf-refresh-status').forEach(el => {
      el.style.display = '';
    });
  }

  toggleQFInputs(selectElement) {
    const container = selectElement.closest('.condition-editor-container');
    const operateur = selectElement.value;
    const valeurContainer = container.querySelector('.condition-qf-valeur-container');
    const minContainer = container.querySelector('.condition-qf-min-container');
    const maxContainer = container.querySelector('.condition-qf-max-container');

    if (operateur === 'entre') {
      valeurContainer.style.display = 'none';
      minContainer.style.display = '';
      maxContainer.style.display = '';
    } else if (operateur === 'null') {
      valeurContainer.style.display = 'none';
      minContainer.style.display = 'none';
      maxContainer.style.display = 'none';
    } else {
      valeurContainer.style.display = '';
      minContainer.style.display = 'none';
      maxContainer.style.display = 'none';
    }
  }

  renderFideliteConditionEditor(condition, index) {
    const operateur = condition?.operateur || '>=';
    const valeur = condition?.annees || condition?.valeur || '';

    return `
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small">Operateur</label>
          <select class="form-select form-select-sm condition-fidelite-operateur">
            <option value=">=" ${operateur === '>=' ? 'selected' : ''}>Au moins</option>
            <option value=">" ${operateur === '>' ? 'selected' : ''}>Plus de</option>
            <option value="=" ${operateur === '=' ? 'selected' : ''}>Exactement</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label small">Annees d'anciennete</label>
          <input type="number" class="form-control form-control-sm condition-fidelite-annees" value="${valeur}" min="0">
        </div>
      </div>
    `;
  }

  renderMultiInscriptionsConditionEditor(condition, index) {
    const operateur = condition?.operateur || '>=';
    const valeur = condition?.nombre || condition?.valeur || '';

    return `
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small">Operateur</label>
          <select class="form-select form-select-sm condition-multi-operateur">
            <option value=">=" ${operateur === '>=' ? 'selected' : ''}>Au moins</option>
            <option value=">" ${operateur === '>' ? 'selected' : ''}>Plus de</option>
            <option value="=" ${operateur === '=' ? 'selected' : ''}>Exactement</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label small">Nombre d'inscrits dans la famille</label>
          <input type="number" class="form-control form-control-sm condition-multi-nombre" value="${valeur}" min="1">
        </div>
      </div>
    `;
  }

  renderTagConditionEditor(condition, index) {
    // Charger les tags disponibles
    const hasTags = this.tagsUtilisateur && this.tagsUtilisateur.length > 0;
    const selectedTags = condition?.tags || [];
    const mode = condition?.mode || 'contient';

    const tagsOptions = hasTags
      ? this.tagsUtilisateur.map(t =>
          `<option value="${t.id}" ${selectedTags.includes(t.id) ? 'selected' : ''} style="color: ${t.couleur || '#6c757d'}">
            ${this.escapeHtml(t.libelle)}
          </option>`
        ).join('')
      : '<option value="" disabled>Aucun tag configure</option>';

    const noTagsWarning = !hasTags
      ? '<div class="text-warning small mt-1"><i class="bi bi-exclamation-triangle"></i> Configurez des tags dans Parametres > Tags utilisateurs</div>'
      : '';

    return `
      <div class="row g-2">
        <div class="col-md-4">
          <label class="form-label small">Mode</label>
          <select class="form-select form-select-sm condition-tag-mode">
            <option value="contient" ${mode === 'contient' ? 'selected' : ''}>Contient le tag</option>
            <option value="ne_contient_pas" ${mode === 'ne_contient_pas' ? 'selected' : ''}>Ne contient pas le tag</option>
            <option value="autre" ${mode === 'autre' || condition?.type === 'autre' ? 'selected' : ''}>Tous les autres (fallback)</option>
          </select>
        </div>
        <div class="col-md-8">
          <label class="form-label small">Tags (Ctrl+clic pour plusieurs)</label>
          <select class="form-select form-select-sm condition-tag-valeurs" multiple size="4" ${mode === 'autre' ? 'disabled' : ''}>
            ${tagsOptions}
          </select>
          ${noTagsWarning}
        </div>
      </div>
    `;
  }

  renderGenericConditionEditor(condition, index) {
    return `
      <div class="row g-2">
        <div class="col-12">
          <label class="form-label small">Condition (format JSON)</label>
          <textarea class="form-control form-control-sm condition-json" rows="2">${JSON.stringify(condition || {}, null, 2)}</textarea>
          <small class="text-muted">Format libre pour conditions personnalisees</small>
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }

  ajouterBrancheModal() {
    if (!this.noeudEnEdition) return;

    const container = document.getElementById('modal-branches-container');
    const index = container.children.length;
    const noeudType = this.noeudEnEdition.type;

    // Creer une nouvelle branche vide avec condition par defaut selon le type
    const nouvelleBranche = {
      id: `branch_${Date.now()}_${index}`,
      code: '',
      libelle: '',
      condition: this.getDefaultConditionForType(noeudType),
      reduction: null
    };

    const row = this.createBrancheRow(nouvelleBranche, index, index + 1, noeudType);
    container.appendChild(row);
    this.updateBranchNumbers();
  }

  getDefaultConditionForType(noeudType) {
    switch (noeudType) {
      case 'COMMUNE':
        return { type: 'communaute' };
      case 'AGE':
        return { operateur: '<', valeur: 18 };
      case 'QF':
        return { mode: 'bareme', bareme_id: null };
      case 'FIDELITE':
        return { operateur: '>=', annees: 1 };
      case 'MULTI_INSCRIPTIONS':
        return { operateur: '>=', nombre: 2 };
      case 'TAG':
      case 'STATUT_SOCIAL':
        return { mode: 'contient', tags: [] };
      default:
        return { type: 'default' };
    }
  }

  validerNoeud() {
    // Verifier si on edite un enfant ou le noeud principal
    if (this.editingEnfant && this.enfantEnEdition) {
      this.validerEnfant();
      return;
    }

    if (!this.noeudEnEdition) return;

    const container = document.getElementById('modal-branches-container');
    const rows = container.querySelectorAll('.branche-edit-row');
    const noeudType = this.noeudEnEdition.type;

    const branches = [];

    // Garder une copie des branches originales pour preserver les enfants
    const branchesOriginales = this.noeudEnEdition.branches || [];

    rows.forEach((row, index) => {
      const libelle = row.querySelector('.branche-libelle').value.trim();
      const codeInput = row.querySelector('.branche-code');
      const code = codeInput ? codeInput.value.trim() : '';
      const typeCalcul = row.querySelector('.branche-type-calcul').value;
      const valeur = parseFloat(row.querySelector('.branche-valeur').value) || 0;
      const operationId = row.querySelector('.branche-operation').value;

      // Extraire la condition selon le type de noeud
      const condition = this.extractConditionFromRow(row, noeudType);

      // Preserver les enfants existants de la branche originale
      const brancheOriginale = branchesOriginales[index];
      const enfants = brancheOriginale?.enfants || [];

      const branche = {
        id: brancheOriginale?.id || `branch_${this.noeudEnEdition.id}_${index}`,
        code: code || libelle.toUpperCase().replace(/\s+/g, '_').substring(0, 20) || `BRANCHE_${index}`,
        libelle: libelle || `Branche ${index + 1}`,
        condition,
        reduction: typeCalcul ? {
          operation_id: operationId ? parseInt(operationId) : null,
          type_calcul: typeCalcul,
          valeur: valeur
        } : null,
        enfants: enfants.length > 0 ? enfants : undefined
      };

      branches.push(branche);
    });

    // Mettre a jour le noeud
    this.noeudEnEdition.branches = branches;

    // Fermer le modal
    const modalEl = document.getElementById('modal-edition-noeud');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();

    this.markAsChanged();
    this.renderArbre();
    this.updateBornes();
  }

  validerEnfant() {
    const { noeudId, brancheId, enfant, enfantIndex } = this.enfantEnEdition || {};
    if (!enfant) return;

    const container = document.getElementById('modal-branches-container');
    const rows = container.querySelectorAll('.branche-edit-row');
    const enfantType = enfant.type;

    const branches = [];

    rows.forEach((row, index) => {
      const libelle = row.querySelector('.branche-libelle').value.trim();
      const codeInput = row.querySelector('.branche-code');
      const code = codeInput ? codeInput.value.trim() : '';
      const typeCalcul = row.querySelector('.branche-type-calcul').value;
      const valeur = parseFloat(row.querySelector('.branche-valeur').value) || 0;
      const operationId = row.querySelector('.branche-operation').value;

      const condition = this.extractConditionFromRow(row, enfantType);

      const branche = {
        id: `branch_enfant_${enfant.id}_${index}`,
        code: code || libelle.toUpperCase().replace(/\s+/g, '_').substring(0, 20) || `BRANCHE_${index}`,
        libelle: libelle || `Branche ${index + 1}`,
        condition,
        reduction: typeCalcul ? {
          operation_id: operationId ? parseInt(operationId) : null,
          type_calcul: typeCalcul,
          valeur: valeur
        } : null
      };

      branches.push(branche);
    });

    // Mettre a jour l'enfant dans les donnees de l'arbre
    enfant.branches = branches;

    // Trouver le noeud et la branche dans l'arbre pour mettre a jour
    if (noeudId && brancheId) {
      const noeud = this.arbre.arbre_json.noeuds.find(n => n.id === noeudId);
      if (noeud) {
        const branche = noeud.branches.find(b => b.id === brancheId);
        if (branche && branche.enfants) {
          // L'enfant est deja reference dans branche.enfants, donc mis a jour
          branche.enfants[enfantIndex] = enfant;
        }
      }
    }

    // Fermer le modal
    const modalEl = document.getElementById('modal-edition-noeud');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();

    // Re-render l'arbre
    this.markAsChanged();
    this.renderArbre();
    this.updateBornes();
  }

  extractConditionFromRow(row, noeudType) {
    const conditionContainer = row.querySelector('.condition-editor-container');
    if (!conditionContainer) {
      return { type: 'default' };
    }

    switch (noeudType) {
      case 'COMMUNE':
        return this.extractCommuneCondition(conditionContainer);
      case 'AGE':
        return this.extractAgeCondition(conditionContainer);
      case 'QF':
        return this.extractQFCondition(conditionContainer);
      case 'FIDELITE':
        return this.extractFideliteCondition(conditionContainer);
      case 'MULTI_INSCRIPTIONS':
        return this.extractMultiInscriptionsCondition(conditionContainer);
      case 'TAG':
      case 'STATUT_SOCIAL':
        return this.extractTagCondition(conditionContainer);
      default:
        return this.extractGenericCondition(conditionContainer);
    }
  }

  extractCommuneCondition(container) {
    const typeSelect = container.querySelector('.condition-commune-type');
    const idsSelect = container.querySelector('.condition-commune-ids');

    if (!typeSelect) return { type: 'autre' };

    const type = typeSelect.value;
    if (type === 'autre') {
      return { type: 'autre' };
    }

    const selectedIds = Array.from(idsSelect.selectedOptions).map(opt => parseInt(opt.value));

    // Pour 'communaute', le backend attend un seul ID (la communaute)
    // Pour 'communes', le backend attend un tableau d'IDs (les communes)
    if (type === 'communaute') {
      return {
        type: type,
        id: selectedIds[0] || null  // Un seul ID de communaute
      };
    }

    return {
      type: type,
      ids: selectedIds  // Tableau d'IDs de communes
    };
  }

  extractAgeCondition(container) {
    const operateurSelect = container.querySelector('.condition-age-operateur');
    const valeurInput = container.querySelector('.condition-age-valeur');
    const minInput = container.querySelector('.condition-age-min');
    const maxInput = container.querySelector('.condition-age-max');

    if (!operateurSelect) return { operateur: '<', valeur: 18 };

    const operateur = operateurSelect.value;

    if (operateur === 'entre') {
      return {
        operateur: 'entre',
        min: parseInt(minInput?.value) || 0,
        max: parseInt(maxInput?.value) || 100
      };
    }

    return {
      operateur: operateur,
      valeur: parseInt(valeurInput?.value) || 0
    };
  }

  extractQFCondition(container) {
    // Determiner le mode (bareme ou manuel)
    const baremeRadio = container.querySelector('input[type="radio"][value="bareme"]');
    const mode = baremeRadio?.checked ? 'bareme' : 'manuel';

    if (mode === 'bareme') {
      const baremeSelect = container.querySelector('.condition-qf-bareme');
      const baremeId = baremeSelect?.value;

      if (baremeId) {
        return {
          mode: 'bareme',
          bareme_id: parseInt(baremeId)
        };
      }
      // Pas de bareme selectionne, retourner une condition vide
      return { mode: 'bareme', bareme_id: null };
    }

    // Mode manuel
    const operateurSelect = container.querySelector('.condition-qf-operateur');
    const valeurInput = container.querySelector('.condition-qf-valeur');
    const minInput = container.querySelector('.condition-qf-min');
    const maxInput = container.querySelector('.condition-qf-max');

    if (!operateurSelect) return { mode: 'manuel', operateur: '<=', valeur: 400 };

    const operateur = operateurSelect.value;

    if (operateur === 'null') {
      return { mode: 'manuel', operateur: 'null' };
    }

    if (operateur === 'entre') {
      return {
        mode: 'manuel',
        operateur: 'entre',
        min: parseInt(minInput?.value) || 0,
        max: parseInt(maxInput?.value) || 9999
      };
    }

    return {
      mode: 'manuel',
      operateur: operateur,
      valeur: parseInt(valeurInput?.value) || 0
    };
  }

  extractFideliteCondition(container) {
    const operateurSelect = container.querySelector('.condition-fidelite-operateur');
    const anneesInput = container.querySelector('.condition-fidelite-annees');

    if (!operateurSelect) return { operateur: '>=', annees: 1 };

    return {
      operateur: operateurSelect.value,
      annees: parseInt(anneesInput?.value) || 0
    };
  }

  extractMultiInscriptionsCondition(container) {
    const operateurSelect = container.querySelector('.condition-multi-operateur');
    const nombreInput = container.querySelector('.condition-multi-nombre');

    if (!operateurSelect) return { operateur: '>=', nombre: 2 };

    return {
      operateur: operateurSelect.value,
      nombre: parseInt(nombreInput?.value) || 1
    };
  }

  extractTagCondition(container) {
    const modeSelect = container.querySelector('.condition-tag-mode');
    const tagsSelect = container.querySelector('.condition-tag-valeurs');

    if (!modeSelect) return { type: 'autre' };

    const mode = modeSelect.value;
    if (mode === 'autre') {
      return { type: 'autre' };
    }

    const selectedTags = tagsSelect
      ? Array.from(tagsSelect.selectedOptions).map(opt => parseInt(opt.value))
      : [];

    return {
      mode: mode,
      tags: selectedTags
    };
  }

  extractGenericCondition(container) {
    const jsonTextarea = container.querySelector('.condition-json');
    if (!jsonTextarea) return { type: 'default' };

    try {
      return JSON.parse(jsonTextarea.value);
    } catch (e) {
      return { type: 'default' };
    }
  }

  supprimerNoeud() {
    if (!this.noeudEnEdition) return;

    if (!confirm('Supprimer ce critere ?')) return;

    const noeuds = this.arbre.arbre_json.noeuds;
    const index = noeuds.findIndex(n => n.id === this.noeudEnEdition.id);

    if (index !== -1) {
      noeuds.splice(index, 1);
      noeuds.forEach((n, i) => n.ordre = i + 1);
    }

    const modalEl = document.getElementById('modal-edition-noeud');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.hide();

    this.markAsChanged();
    this.renderArbre();
    this.updateBornes();
  }

  async enregistrer() {
    try {
      document.getElementById('btn-enregistrer').disabled = true;
      document.getElementById('btn-enregistrer').innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Enregistrement...';

      const data = {
        mode_affichage: this.arbre.mode_affichage,
        arbre_json: this.arbre.arbre_json
      };

      let response;

      if (this.arbre.id) {
        // Modification
        response = await apiAdmin.put(`/arbres-decision/${this.arbre.id}`, data);
      } else {
        // Creation
        response = await apiAdmin.post(`/arbres-decision/tarif/${this.tarifId}`, data);
      }

      this.arbre = { ...this.arbre, ...response };
      this.hasChanges = false;
      this.showSuccess('Arbre enregistre');

    } catch (error) {
      console.error('Erreur enregistrement:', error);
      this.showError('Erreur lors de l\'enregistrement');
    } finally {
      document.getElementById('btn-enregistrer').disabled = false;
      document.getElementById('btn-enregistrer').innerHTML =
        '<i class="bi bi-check-lg"></i> Enregistrer';
    }
  }

  async deverrouiller() {
    if (!this.arbre?.id) return;

    if (!confirm('Deverrouiller cet arbre ? Cela permettra de le modifier.')) return;

    try {
      await apiAdmin.post(`/arbres-decision/${this.arbre.id}/dupliquer`, {});

      this.arbre.verrouille = false;
      document.getElementById('alert-verrouille').classList.add('d-none');
      document.getElementById('btn-enregistrer').disabled = false;
      document.getElementById('dropdown-ajouter').disabled = false;
      this.showSuccess('Arbre deverrouille');

    } catch (error) {
      console.error('Erreur deverrouillage:', error);
      this.showError('Erreur lors du deverrouillage');
    }
  }

  async lancerTest() {
    const age = parseInt(document.getElementById('test-age').value) || 35;
    const qf = parseInt(document.getElementById('test-qf').value) || null;
    const communeId = document.getElementById('test-commune-id').value;
    const anciennete = parseInt(document.getElementById('test-anciennete').value) || 0;
    const nbInscrits = parseInt(document.getElementById('test-nb-inscrits').value) || 1;

    // Recuperer les tags selectionnes
    const tagsSelect = document.getElementById('test-tags');
    const selectedTags = tagsSelect
      ? Array.from(tagsSelect.selectedOptions).map(opt => parseInt(opt.value))
      : [];

    // Calculer date de naissance a partir de l'age
    const dateNaissance = new Date();
    dateNaissance.setFullYear(dateNaissance.getFullYear() - age);

    const utilisateurData = {
      date_naissance: dateNaissance.toISOString().split('T')[0],
      quotient_familial: qf,
      commune_id: communeId ? parseInt(communeId) : null,
      // Ces champs sont simules cote serveur normalement
      _anciennete: anciennete,
      _nb_inscrits: nbInscrits,
      _tags: selectedTags
    };

    try {
      const response = await apiAdmin.post(`/arbres-decision/${this.arbre.id}/simuler`, {
        utilisateur_data: utilisateurData,
        montant_base: this.montantBase
      });

      const container = document.getElementById('test-resultat');

      // Extraire data du wrapper { success, data }
      const data = response.data || response;
      const reductions = data.reductions || [];
      const trace = data.trace || [];
      const utilisateurTeste = data.utilisateur_teste || {};

      // Affichage du resultat
      let html = `
        <div class="mb-3">
          <div class="h4 ${data.total_reductions > 0 ? 'text-success' : 'text-primary'}">${data.montant_final ?? this.montantBase} EUR</div>
          <div class="text-muted">Montant final</div>
        </div>
        <div class="row mb-3">
          <div class="col-6">
            <small class="text-muted">Base</small>
            <div class="fw-bold">${data.montant_base ?? this.montantBase} EUR</div>
          </div>
          <div class="col-6">
            <small class="text-muted">Reductions</small>
            <div class="fw-bold text-success">-${data.total_reductions ?? 0} EUR</div>
          </div>
        </div>
      `;

      // Donnees utilisateur testees
      const tagsLibelles = this.formatTagsDisplay(utilisateurTeste._tags);
      html += `
        <div class="mb-3 p-2 bg-light rounded small">
          <strong>Donnees testees:</strong><br>
          Age: ${utilisateurTeste.date_naissance ? this.calculerAgeFromDate(utilisateurTeste.date_naissance) + ' ans' : 'N/A'}
          | QF: ${utilisateurTeste.quotient_familial ?? 'N/A'}
          | Commune: ${utilisateurTeste.commune_id ?? 'N/A'}
          | Tags: ${tagsLibelles}
        </div>
      `;

      // Trace detaillee noeud par noeud
      if (trace.length > 0) {
        html += '<hr><h6><i class="bi bi-list-check me-1"></i>Evaluation noeud par noeud</h6>';
        html += this.renderTraceNoeuds(trace);
      } else {
        html += '<div class="text-warning small">Aucun noeud evalue (arbre vide?)</div>';
      }

      // Resume des reductions
      if (reductions.length > 0) {
        html += `
          <hr>
          <h6 class="text-success"><i class="bi bi-piggy-bank me-1"></i>Reductions appliquees</h6>
          <ul class="list-unstyled mb-0">
            ${reductions.map(r => `
              <li class="d-flex justify-content-between">
                <span>${this.escapeHtml(r.branche_libelle || r.type_source)}</span>
                <span class="text-success fw-bold">-${r.montant_reduction} EUR</span>
              </li>
            `).join('')}
          </ul>
        `;
      }

      container.innerHTML = html;

      // Mettre en surbrillance le chemin dans l'arbre
      if (data.chemin && data.chemin.length > 0) {
        data.chemin.forEach(c => {
          const noeuds = this.arbre.arbre_json.noeuds;
          const noeud = noeuds.find(n => n.type === c.noeud_type);
          if (noeud) {
            // Mettre en surbrillance le noeud
            const cardEl = document.querySelector(`.tree-node-card[data-noeud-id="${noeud.id}"]`);
            if (cardEl) {
              cardEl.classList.add('highlight');

              // Mettre en surbrillance la branche selectionnee
              const branche = noeud.branches.find(b => b.code === c.branche_code);
              if (branche) {
                const brancheLabel = cardEl.querySelector(`.tree-branch-label[data-branche-id="${branche.id}"]`);
                if (brancheLabel) {
                  brancheLabel.classList.add('selected');
                }
              }
            }
          }
        });
      }

    } catch (error) {
      console.error('Erreur test:', error);
      document.getElementById('test-resultat').innerHTML =
        '<div class="text-danger">Erreur lors du test</div>';
    }
  }

  // ============================================================
  // HELPERS POUR TEST
  // ============================================================

  renderTraceNoeuds(trace, niveau = 0) {
    let html = '';
    const indent = niveau * 15;

    for (const t of trace) {
      const typeInfo = this.typesCondition.find(tc => tc.code === t.noeud_type) || {};
      const hasReduction = t.reduction && t.reduction.montant > 0;
      const brancheSelectionnee = t.branche_selectionnee;

      html += `<div class="mb-2 p-2 border rounded" style="margin-left: ${indent}px; border-left: 3px solid ${typeInfo.couleur || '#6c757d'} !important;">`;

      // En-tete du noeud
      html += `<div class="d-flex justify-content-between align-items-center mb-1">
        <strong><i class="bi ${typeInfo.icone || 'bi-question'} me-1"></i>${typeInfo.libelle || t.noeud_type}</strong>
        ${brancheSelectionnee
          ? `<span class="badge bg-success"><i class="bi bi-check"></i> ${this.escapeHtml(brancheSelectionnee.libelle)}</span>`
          : '<span class="badge bg-secondary">Aucune branche</span>'}
      </div>`;

      // Branches testees
      if (t.branches_testees && t.branches_testees.length > 0) {
        html += '<div class="small">';
        for (const b of t.branches_testees) {
          const isSelected = brancheSelectionnee && b.id === brancheSelectionnee.id;
          const icon = b.match ? 'bi-check-circle text-success' : 'bi-x-circle text-danger';
          html += `<div class="${isSelected ? 'fw-bold' : 'text-muted'}">
            <i class="bi ${icon} me-1"></i>
            ${this.escapeHtml(b.libelle || b.code)}
            ${b.details ? `<span class="text-muted ms-1">(${this.escapeHtml(b.details)})</span>` : ''}
          </div>`;
        }
        html += '</div>';
      }

      // Reduction appliquee
      if (hasReduction) {
        html += `<div class="mt-1 text-success small fw-bold">
          <i class="bi bi-arrow-right me-1"></i>Reduction: -${t.reduction.montant} EUR
          (${t.reduction.type_calcul === 'pourcentage' ? t.reduction.valeur + '%' : t.reduction.valeur + ' EUR fixe'})
        </div>`;
      }

      // Enfants (recursif)
      if (t.enfants && t.enfants.length > 0) {
        html += this.renderTraceNoeuds(t.enfants, niveau + 1);
      }

      html += '</div>';
    }

    return html;
  }

  calculerAgeFromDate(dateNaissance) {
    if (!dateNaissance) return null;
    const naissance = new Date(dateNaissance);
    const aujourdhui = new Date();
    let age = aujourdhui.getFullYear() - naissance.getFullYear();
    const moisDiff = aujourdhui.getMonth() - naissance.getMonth();
    if (moisDiff < 0 || (moisDiff === 0 && aujourdhui.getDate() < naissance.getDate())) {
      age--;
    }
    return age;
  }

  remplirSelectTagsTest() {
    const select = document.getElementById('test-tags');
    if (!select) return;

    select.innerHTML = '';
    if (!this.tagsUtilisateur || this.tagsUtilisateur.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = 'Aucun tag disponible';
      select.appendChild(opt);
      return;
    }

    for (const tag of this.tagsUtilisateur) {
      const opt = document.createElement('option');
      opt.value = tag.id;
      opt.textContent = tag.libelle;
      select.appendChild(opt);
    }
  }

  formatTagsDisplay(tagIds) {
    if (!tagIds || tagIds.length === 0) return 'Aucun';
    if (!this.tagsUtilisateur || this.tagsUtilisateur.length === 0) {
      return tagIds.join(', ');
    }
    const libelles = tagIds.map(id => {
      const tag = this.tagsUtilisateur.find(t => t.id === id);
      return tag ? tag.libelle : `#${id}`;
    });
    return libelles.join(', ');
  }

  // ============================================================
  // UTILITAIRES
  // ============================================================

  markAsChanged() {
    this.hasChanges = true;
    document.getElementById('btn-enregistrer').disabled = false;
  }

  showSuccess(message) {
    // Toast simple
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
      <div class="toast show bg-success text-white">
        <div class="toast-body">
          <i class="bi bi-check-circle me-2"></i>${message}
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
      <div class="toast show bg-danger text-white">
        <div class="toast-body">
          <i class="bi bi-exclamation-triangle me-2"></i>${message}
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // ============================================================
  // VUE JSON
  // ============================================================

  basculerVue(mode) {
    this.modeAffichage = mode;

    const arbreContainer = document.getElementById('arbre-container');
    const jsonContainer = document.getElementById('json-container');
    const btnVisuel = document.getElementById('btn-vue-visuelle');
    const btnJson = document.getElementById('btn-vue-json');

    if (mode === 'json') {
      // Passer en mode JSON
      arbreContainer.classList.add('d-none');
      jsonContainer.classList.remove('d-none');
      btnVisuel.classList.remove('active');
      btnJson.classList.add('active');

      // Remplir l'editeur JSON avec les donnees actuelles
      const jsonEditor = document.getElementById('json-editor');
      jsonEditor.value = JSON.stringify(this.arbre.arbre_json, null, 2);
      this.validerJsonEnTempsReel(jsonEditor.value);

    } else {
      // Passer en mode visuel
      arbreContainer.classList.remove('d-none');
      jsonContainer.classList.add('d-none');
      btnVisuel.classList.add('active');
      btnJson.classList.remove('active');

      // Re-render l'arbre (au cas ou le JSON a ete modifie)
      this.renderArbre();
      this.updateBornes();
    }
  }

  validerJsonEnTempsReel(jsonString) {
    const statusEl = document.getElementById('json-validation-status');
    const btnAppliquer = document.getElementById('btn-appliquer-json');

    try {
      const parsed = JSON.parse(jsonString);

      // Verifications de structure
      if (!parsed.noeuds || !Array.isArray(parsed.noeuds)) {
        throw new Error('Structure invalide: "noeuds" doit etre un tableau');
      }

      // Verifier chaque noeud
      for (const noeud of parsed.noeuds) {
        if (!noeud.id || !noeud.type) {
          throw new Error('Chaque noeud doit avoir un "id" et un "type"');
        }
        if (!noeud.branches || !Array.isArray(noeud.branches)) {
          throw new Error(`Le noeud "${noeud.id}" doit avoir un tableau "branches"`);
        }
        for (const branche of noeud.branches) {
          if (!branche.id) {
            throw new Error(`Chaque branche du noeud "${noeud.id}" doit avoir un "id"`);
          }
        }
      }

      // JSON valide
      statusEl.className = 'valid';
      statusEl.innerHTML = '<i class="bi bi-check-circle me-1"></i>JSON valide';
      btnAppliquer.disabled = false;

    } catch (e) {
      statusEl.className = 'invalid';
      statusEl.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>${e.message}`;
      btnAppliquer.disabled = true;
    }
  }

  appliquerJson() {
    const jsonEditor = document.getElementById('json-editor');
    const jsonString = jsonEditor.value;

    try {
      const parsed = JSON.parse(jsonString);

      // Verifications de structure
      if (!parsed.noeuds || !Array.isArray(parsed.noeuds)) {
        throw new Error('Structure invalide');
      }

      // Appliquer les modifications
      this.arbre.arbre_json = parsed;
      this.markAsChanged();

      // Passer en mode visuel pour voir le resultat
      this.basculerVue('visuel');
      this.showSuccess('JSON applique avec succes');

    } catch (e) {
      this.showError(`Erreur: ${e.message}`);
    }
  }
}
