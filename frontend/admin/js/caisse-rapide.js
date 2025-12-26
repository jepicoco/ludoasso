/**
 * Caisse Rapide - Script principal
 * Page simplifiee de caisse avec theme sombre et interface touch-first
 */

// ============================================
// STATE
// ============================================
const state = {
  // Structure & Caisse
  structures: [],
  currentStructureId: null,
  caisses: [],
  currentCaisse: null,
  currentSession: null,

  // Usager
  currentMember: null,

  // Panier
  cart: [],

  // Paiement
  paymentModes: [],
  selectedPaymentMode: null,
  cashReceived: 0,

  // Categories produits
  categories: [],
  tarifsCotisation: [],
  tarifsAdhesion: [],

  // Historique session
  history: [],
  sessionStats: { entrees: 0, sorties: 0 },

  // Barcode buffer (pour douchette USB)
  barcodeBuffer: '',
  barcodeTimeout: null
};

/**
 * Fonction globale pour api-admin.js
 * Permet d'envoyer le header X-Structure-Id avec les requetes API
 */
window.getCurrentStructureId = () => state.currentStructureId;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    showLoading();

    // Charger les structures de l'utilisateur
    await loadStructures();

    // Charger les references (modes de paiement, categories)
    await loadReferences();

    // Charger les tarifs cotisation
    await loadTarifsCotisation();

    // Configurer l'ecoute clavier pour les codes-barres
    setupBarcodeListener();

    hideLoading();
  } catch (error) {
    console.error('Erreur initialisation:', error);
    hideLoading();
    showError('Erreur lors du chargement de la page');
  }
});

// ============================================
// LOADING
// ============================================
function showLoading() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

// ============================================
// STRUCTURES & CAISSES
// ============================================
async function loadStructures() {
  try {
    const response = await apiAdmin.get('/api/parametres/mes-structures');
    state.structures = response || [];

    const select = document.getElementById('structure-select');
    select.innerHTML = '';

    if (state.structures.length === 0) {
      select.innerHTML = '<option value="">Aucune structure</option>';
      return;
    }

    state.structures.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nom;
      select.appendChild(opt);
    });

    // Selectionner la premiere structure
    if (state.structures.length > 0) {
      select.style.display = state.structures.length > 1 ? 'block' : 'none';
      select.value = state.structures[0].id;
      await selectStructure(state.structures[0].id);
    }

    // Ecouteur de changement
    select.addEventListener('change', async (e) => {
      await selectStructure(e.target.value);
    });
  } catch (error) {
    console.error('Erreur chargement structures:', error);
  }
}

async function selectStructure(structureId) {
  state.currentStructureId = parseInt(structureId);

  // Definir window.CURRENT_STRUCTURE_ID pour api-admin.js
  window.CURRENT_STRUCTURE_ID = state.currentStructureId;
  localStorage.setItem('selectedStructureId', structureId);

  // Charger les caisses de cette structure
  await loadCaisses();

  // Verifier s'il y a une session ouverte
  await checkOpenSessions();
}

async function loadCaisses() {
  try {
    const response = await apiAdmin.get('/api/caisses');
    state.caisses = response || [];

    // Mettre a jour le select dans le modal
    const select = document.getElementById('modal-caisse-select');
    select.innerHTML = '';

    if (state.caisses.length === 0) {
      select.innerHTML = '<option value="">Aucune caisse disponible</option>';
      return;
    }

    state.caisses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.nom} (${c.code})`;
      opt.dataset.solde = c.solde_actuel || 0;
      select.appendChild(opt);
    });

    // Selectionner la premiere et afficher le solde
    if (state.caisses.length > 0) {
      select.value = state.caisses[0].id;
      updateOpeningBalance();
    }

    // Ecouteur de changement
    select.addEventListener('change', updateOpeningBalance);
  } catch (error) {
    console.error('Erreur chargement caisses:', error);
  }
}

function updateOpeningBalance() {
  const select = document.getElementById('modal-caisse-select');
  const option = select.options[select.selectedIndex];
  const solde = parseFloat(option?.dataset.solde || 0);
  document.getElementById('modal-opening-balance').value = formatMoney(solde);
}

async function checkOpenSessions() {
  // Verifier chaque caisse pour une session ouverte
  for (const caisse of state.caisses) {
    try {
      const response = await apiAdmin.get(`/api/caisses/${caisse.id}/session`);
      if (response && response.id) {
        // Session trouvee
        state.currentCaisse = caisse;
        state.currentSession = response;
        await onSessionOpened();
        return;
      }
    } catch (error) {
      // Pas de session ouverte pour cette caisse, continuer
    }
  }

  // Aucune session ouverte
  state.currentSession = null;
  state.currentCaisse = null;
  updateSessionBanner();
}

// ============================================
// SESSION MANAGEMENT
// ============================================
function updateSessionBanner() {
  const banner = document.getElementById('session-banner');
  const mainContent = document.getElementById('main-content');

  if (state.currentSession) {
    banner.className = 'session-banner session-open';
    banner.innerHTML = `
      <div class="session-info">
        <span><i class="bi bi-check-circle"></i> Session ouverte - ${state.currentCaisse?.nom || 'Caisse'}</span>
        <span style="margin-left: 15px; opacity: 0.8;">
          Ouverte le ${formatDateTime(state.currentSession.date_ouverture)} par ${state.currentSession.utilisateur?.prenom || ''} ${state.currentSession.utilisateur?.nom || ''}
        </span>
      </div>
      <div class="session-actions">
        <button class="btn-session btn-close" onclick="showCloseSessionModal()">
          <i class="bi bi-lock"></i> Fermer la session
        </button>
      </div>
    `;
    mainContent.style.display = 'grid';
  } else {
    banner.className = 'session-banner session-closed';
    banner.innerHTML = `
      <div class="session-info">
        <span><i class="bi bi-exclamation-circle"></i> Aucune session ouverte</span>
      </div>
      <div class="session-actions">
        <button class="btn-session btn-open" onclick="showOpenSessionModal()">
          <i class="bi bi-unlock"></i> Ouvrir une session
        </button>
      </div>
    `;
    mainContent.style.display = 'none';
  }
}

function showOpenSessionModal() {
  if (state.caisses.length === 0) {
    showError('Aucune caisse disponible');
    return;
  }
  document.getElementById('modal-session-comment').value = '';
  document.getElementById('modal-session-open').style.display = 'flex';
}

async function openSession() {
  const caisseId = document.getElementById('modal-caisse-select').value;
  const commentaire = document.getElementById('modal-session-comment').value.trim();

  if (!caisseId) {
    showError('Veuillez selectionner une caisse');
    return;
  }

  try {
    showLoading();
    const response = await apiAdmin.post(`/api/caisses/${caisseId}/session/ouvrir`, {
      commentaire: commentaire || undefined
    });

    state.currentCaisse = state.caisses.find(c => c.id === parseInt(caisseId));
    state.currentSession = response;

    hideModal('modal-session-open');
    await onSessionOpened();
    hideLoading();

    addHistory('success', 'Session ouverte', `Caisse: ${state.currentCaisse?.nom}`);
  } catch (error) {
    hideLoading();
    showError(error.message || 'Erreur lors de l\'ouverture de la session');
  }
}

async function onSessionOpened() {
  updateSessionBanner();

  // Charger l'historique des mouvements
  await loadSessionHistory();

  // Afficher les produits
  selectProductTab('cotisation');
}

function showCloseSessionModal() {
  if (!state.currentSession) return;

  // Calculer le solde theorique
  const theoretique = (state.currentSession.solde_ouverture || 0) +
    state.sessionStats.entrees - state.sessionStats.sorties;

  document.getElementById('modal-theoretical-balance').value = formatMoney(theoretique);
  document.getElementById('modal-real-balance').value = '';
  document.getElementById('modal-balance-diff').value = '';
  document.getElementById('modal-close-comment').value = '';

  // Ecouteur pour calculer l'ecart
  document.getElementById('modal-real-balance').oninput = () => {
    const reel = parseFloat(document.getElementById('modal-real-balance').value) || 0;
    const ecart = reel - theoretique;
    const ecartEl = document.getElementById('modal-balance-diff');
    ecartEl.value = formatMoney(ecart);
    ecartEl.style.color = ecart === 0 ? 'var(--caisse-success)' :
      (ecart > 0 ? 'var(--caisse-warning)' : 'var(--caisse-error)');
  };

  document.getElementById('modal-session-close').style.display = 'flex';
}

async function closeSession() {
  const reel = parseFloat(document.getElementById('modal-real-balance').value);
  const commentaire = document.getElementById('modal-close-comment').value.trim();

  if (isNaN(reel)) {
    showError('Veuillez saisir le solde reel');
    return;
  }

  try {
    showLoading();
    await apiAdmin.post(`/api/caisses/sessions/${state.currentSession.id}/cloturer`, {
      solde_cloture_reel: reel,
      commentaire: commentaire || undefined
    });

    hideModal('modal-session-close');

    // Reset
    state.currentSession = null;
    state.currentCaisse = null;
    state.history = [];
    state.sessionStats = { entrees: 0, sorties: 0 };
    state.cart = [];
    state.currentMember = null;
    state.cashReceived = 0;

    updateSessionBanner();
    hideLoading();

    showSuccess('Session fermee avec succes');
  } catch (error) {
    hideLoading();
    showError(error.message || 'Erreur lors de la fermeture de la session');
  }
}

// ============================================
// REFERENCES & TARIFS
// ============================================
async function loadReferences() {
  try {
    const response = await apiAdmin.get('/api/caisses/references');
    state.paymentModes = response.modesPaiement || [];
    state.categories = response.categories || [];

    renderPaymentModes();
  } catch (error) {
    console.error('Erreur chargement references:', error);
  }
}

async function loadTarifsCotisation() {
  try {
    const response = await apiAdmin.get('/api/tarifs-cotisation');
    state.tarifsCotisation = (response || []).filter(t => t.actif);
  } catch (error) {
    console.error('Erreur chargement tarifs:', error);
    state.tarifsCotisation = [];
  }
}

function renderPaymentModes() {
  const container = document.getElementById('payment-modes');
  container.innerHTML = '';

  state.paymentModes.forEach(mode => {
    const btn = document.createElement('button');
    btn.className = 'payment-mode-btn';
    btn.dataset.modeId = mode.id;
    btn.onclick = () => selectPaymentMode(mode);

    // Icone basee sur le code
    let icon = 'credit-card';
    if (mode.code === 'especes' || mode.code === 'cash') icon = 'cash';
    else if (mode.code === 'cb' || mode.code === 'carte') icon = 'credit-card-2-front';
    else if (mode.code === 'cheque') icon = 'file-text';
    else if (mode.code === 'virement') icon = 'bank';

    btn.innerHTML = `<i class="bi bi-${icon}"></i>${mode.nom}`;
    container.appendChild(btn);
  });
}

function selectPaymentMode(mode) {
  state.selectedPaymentMode = mode;

  // Mettre a jour UI
  document.querySelectorAll('.payment-mode-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.modeId == mode.id);
  });

  // Afficher zone especes si necessaire
  const cashZone = document.getElementById('cash-zone');
  const isEspeces = mode.code === 'especes' || mode.code === 'cash';
  cashZone.classList.toggle('visible', isEspeces);

  if (!isEspeces) {
    state.cashReceived = 0;
    updateCashDisplay();
  }

  updateValidateButton();
}

// ============================================
// PRODUCTS
// ============================================
function selectProductTab(category) {
  // Mettre a jour tabs
  document.querySelectorAll('.product-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.category === category);
  });

  renderProducts(category);
}

function renderProducts(category) {
  const container = document.getElementById('products-list');
  container.innerHTML = '';

  if (category === 'cotisation') {
    state.tarifsCotisation.forEach(tarif => {
      const btn = createProductButton(tarif.libelle, tarif.montant_base, () => addCotisationToCart(tarif));
      container.appendChild(btn);
    });
  } else if (category === 'adhesion') {
    // TODO: Charger les tarifs d'adhesion si disponibles
    container.innerHTML = '<div style="text-align: center; color: var(--caisse-muted); padding: 20px;">Pas de tarifs d\'adhesion configures</div>';
  } else if (category === 'vente') {
    // Articles de vente divers
    const ventesTypes = [
      { libelle: 'Vente diverse', montant: null },
      { libelle: 'Gouter', montant: 2.00 },
      { libelle: 'Boisson', montant: 1.50 }
    ];
    ventesTypes.forEach(v => {
      const btn = createProductButton(v.libelle, v.montant, () => {
        if (v.montant) {
          addToCart({ type: 'vente', label: v.libelle, price: v.montant, category: 'vente' });
        } else {
          showManualEntryModal('vente');
        }
      });
      container.appendChild(btn);
    });
  } else if (category === 'autre') {
    // Autres entrees
    const btn = createProductButton('Saisie libre', null, () => showManualEntryModal('autre'));
    container.appendChild(btn);

    const donBtn = createProductButton('Don', null, () => showManualEntryModal('don'));
    container.appendChild(donBtn);
  }
}

function createProductButton(label, price, onClick) {
  const btn = document.createElement('button');
  btn.className = 'product-btn';
  btn.onclick = onClick;
  btn.innerHTML = `
    <span class="name">${label}</span>
    <span class="price">${price !== null ? formatMoney(price) : 'Variable'}</span>
  `;
  return btn;
}

async function addCotisationToCart(tarif) {
  let price = tarif.montant_base;

  // Si un usager est selectionne, calculer avec l'arbre de decision
  if (state.currentMember) {
    try {
      const response = await apiAdmin.post('/api/tarification/simuler', {
        utilisateurId: state.currentMember.id,
        tarifCotisationId: tarif.id
      });
      if (response && response.calcul) {
        price = response.calcul.montant_final;
      }
    } catch (error) {
      console.error('Erreur simulation tarif:', error);
      // Utiliser le prix de base
    }
  }

  addToCart({
    type: 'cotisation',
    tarifId: tarif.id,
    label: `Cotisation: ${tarif.libelle}`,
    price: price,
    category: 'cotisation',
    utilisateurId: state.currentMember?.id
  });
}

// ============================================
// CART
// ============================================
function addToCart(item) {
  item.id = Date.now(); // ID unique
  state.cart.push(item);
  renderCart();
  updateValidateButton();
}

function removeFromCart(itemId) {
  state.cart = state.cart.filter(item => item.id !== itemId);
  renderCart();
  updateValidateButton();
}

function clearCart() {
  state.cart = [];
  renderCart();
  updateValidateButton();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total-amount');

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="bi bi-cart" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
        <p>Selectionnez des produits</p>
      </div>
    `;
    totalEl.textContent = '0,00 EUR';
    return;
  }

  container.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.label}</div>
        ${item.utilisateurId && state.currentMember ? `<div class="cart-item-detail">Pour: ${state.currentMember.prenom} ${state.currentMember.nom}</div>` : ''}
      </div>
      <div class="cart-item-price">${formatMoney(item.price)}</div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `).join('');

  const total = state.cart.reduce((sum, item) => sum + item.price, 0);
  totalEl.textContent = formatMoney(total);

  // Mettre a jour le rendu si especes selectionne
  if (state.selectedPaymentMode?.code === 'especes' || state.selectedPaymentMode?.code === 'cash') {
    updateCashDisplay();
  }
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price, 0);
}

// ============================================
// CASH HANDLING
// ============================================
function addCash(amount) {
  state.cashReceived += amount;
  updateCashDisplay();
  updateValidateButton();
}

function resetCash() {
  state.cashReceived = 0;
  updateCashDisplay();
  updateValidateButton();
}

function setExactAmount() {
  state.cashReceived = getCartTotal();
  updateCashDisplay();
  updateValidateButton();
}

function updateCashDisplay() {
  document.getElementById('amount-received').textContent = formatMoney(state.cashReceived);

  const total = getCartTotal();
  const change = state.cashReceived - total;
  const changeEl = document.getElementById('change-amount');

  changeEl.textContent = formatMoney(Math.max(0, change));
  changeEl.style.color = change >= 0 ? 'var(--caisse-gold)' : 'var(--caisse-error)';
}

// ============================================
// VALIDATION
// ============================================
function updateValidateButton() {
  const btn = document.getElementById('btn-validate');
  const total = getCartTotal();

  let canValidate = state.cart.length > 0 && state.selectedPaymentMode;

  // Si especes, verifier que le montant est suffisant
  if (state.selectedPaymentMode?.code === 'especes' || state.selectedPaymentMode?.code === 'cash') {
    canValidate = canValidate && state.cashReceived >= total;
  }

  btn.disabled = !canValidate;
}

async function validateTransaction() {
  if (!state.currentSession) {
    showError('Aucune session ouverte');
    return;
  }

  const total = getCartTotal();

  try {
    showLoading();

    // Creer les mouvements de caisse
    for (const item of state.cart) {
      const mouvementData = {
        type_mouvement: 'entree',
        categorie: item.category || 'autre',
        montant: item.price,
        mode_paiement_id: state.selectedPaymentMode.id,
        libelle: item.label,
        utilisateur_concerne_id: item.utilisateurId || state.currentMember?.id || null
      };

      await apiAdmin.post(`/api/caisses/sessions/${state.currentSession.id}/mouvements`, mouvementData);

      // Si c'est une cotisation, creer aussi la cotisation
      if (item.type === 'cotisation' && item.utilisateurId && item.tarifId) {
        try {
          await apiAdmin.post('/api/tarification/creer', {
            utilisateurId: item.utilisateurId,
            tarifCotisationId: item.tarifId,
            modePaiementId: state.selectedPaymentMode.id
          });
        } catch (cotError) {
          console.error('Erreur creation cotisation:', cotError);
          // Continuer quand meme
        }
      }
    }

    // Ajouter a l'historique
    const memberName = state.currentMember ? `${state.currentMember.prenom} ${state.currentMember.nom}` : 'Sans usager';
    addHistory('success', `Transaction: ${formatMoney(total)}`, `${memberName} - ${state.selectedPaymentMode.nom}`);

    // Mettre a jour les stats
    state.sessionStats.entrees += total;
    updateSessionStats();

    // Reset
    clearCart();
    clearMember();
    state.cashReceived = 0;
    updateCashDisplay();

    hideLoading();
    showSuccess('Transaction enregistree');
  } catch (error) {
    hideLoading();
    showError(error.message || 'Erreur lors de la validation');
  }
}

// ============================================
// MEMBER / USAGER
// ============================================
function showMemberSearch() {
  document.getElementById('member-search-input').value = '';
  document.getElementById('member-search-results').innerHTML = '';
  document.getElementById('modal-member-search').style.display = 'flex';
  document.getElementById('member-search-input').focus();
}

let memberSearchTimeout = null;
async function searchMembers() {
  const query = document.getElementById('member-search-input').value.trim();
  const resultsContainer = document.getElementById('member-search-results');

  if (query.length < 2) {
    resultsContainer.innerHTML = '<div style="text-align: center; color: var(--caisse-muted); padding: 20px;">Tapez au moins 2 caracteres</div>';
    return;
  }

  // Debounce
  if (memberSearchTimeout) clearTimeout(memberSearchTimeout);
  memberSearchTimeout = setTimeout(async () => {
    try {
      const response = await apiAdmin.get(`/api/adherents?search=${encodeURIComponent(query)}&limit=10`);
      const members = response.adherents || response || [];

      if (members.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align: center; color: var(--caisse-muted); padding: 20px;">Aucun resultat</div>';
        return;
      }

      resultsContainer.innerHTML = members.map(m => `
        <div class="member-result" onclick="selectMember(${m.id})" style="padding: 12px; background: var(--caisse-accent); border-radius: 8px; margin-bottom: 8px; cursor: pointer;">
          <strong>${m.prenom} ${m.nom}</strong>
          <div style="font-size: 0.85rem; color: var(--caisse-muted);">
            ${m.code_barre || ''} - ${m.email || ''}
          </div>
          <div style="font-size: 0.85rem;">
            <span class="status-badge ${m.statut === 'actif' ? 'valid' : 'expired'}">${m.statut}</span>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Erreur recherche:', error);
      resultsContainer.innerHTML = '<div style="text-align: center; color: var(--caisse-error); padding: 20px;">Erreur de recherche</div>';
    }
  }, 300);
}

async function selectMember(memberId) {
  try {
    showLoading();
    const response = await apiAdmin.get(`/api/adherents/${memberId}`);
    state.currentMember = response.utilisateur || response.adherent || response;

    hideModal('modal-member-search');
    renderMember();
    hideLoading();

    // Recalculer les prix cotisation si dans l'onglet cotisation
    if (document.querySelector('.product-tab.active')?.dataset.category === 'cotisation') {
      renderProducts('cotisation');
    }
  } catch (error) {
    hideLoading();
    showError('Erreur lors du chargement de l\'usager');
  }
}

function renderMember() {
  const container = document.getElementById('member-content');

  if (!state.currentMember) {
    container.innerHTML = `
      <div class="member-placeholder">
        <i class="bi bi-upc-scan"></i>
        <p>Scannez ou recherchez un usager</p>
        <button class="btn-caisse" onclick="showMemberSearch()" style="margin-top: 10px;">
          <i class="bi bi-search"></i> Rechercher
        </button>
      </div>
    `;
    return;
  }

  const m = state.currentMember;
  const initials = `${(m.prenom || '')[0] || ''}${(m.nom || '')[0] || ''}`.toUpperCase();
  const isValid = m.statut === 'actif';

  container.innerHTML = `
    <div class="member-card">
      <div class="member-avatar">${initials}</div>
      <div class="member-info">
        <h4>${m.prenom} ${m.nom}</h4>
        <p>${m.code_barre || 'Pas de code-barre'}</p>
      </div>
      <div class="member-status">
        <span class="status-badge ${isValid ? 'valid' : 'expired'}">${isValid ? 'Actif' : 'Inactif'}</span>
      </div>
      <button class="btn-clear-member" onclick="clearMember()" title="Retirer l'usager">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `;
}

function clearMember() {
  state.currentMember = null;
  renderMember();

  // Recalculer les prix cotisation
  if (document.querySelector('.product-tab.active')?.dataset.category === 'cotisation') {
    renderProducts('cotisation');
  }
}

// ============================================
// BARCODE SCANNER (USB)
// ============================================
function setupBarcodeListener() {
  document.addEventListener('keydown', (e) => {
    // Ignorer si un modal est ouvert ou un input est focus
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT'
    );

    // Les douchettes USB envoient des caracteres rapidement suivis de Enter
    if (e.key === 'Enter') {
      if (state.barcodeBuffer.length >= 3) {
        processBarcode(state.barcodeBuffer);
      }
      state.barcodeBuffer = '';
      return;
    }

    // Ignorer si input focus (sauf si c'est un scan rapide)
    if (isInputFocused && !state.barcodeTimeout) {
      return;
    }

    // Accumuler les caracteres
    if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      state.barcodeBuffer += e.key.toUpperCase();

      // Reset timeout
      if (state.barcodeTimeout) clearTimeout(state.barcodeTimeout);
      state.barcodeTimeout = setTimeout(() => {
        state.barcodeBuffer = '';
        state.barcodeTimeout = null;
      }, 100); // Les douchettes envoient tout en moins de 100ms
    }
  });
}

async function processBarcode(code) {
  if (!state.currentSession) {
    return; // Ignorer si pas de session
  }

  try {
    const response = await apiAdmin.post('/api/barcodes/scan', { code });

    if (response.type === 'adherent' && response.adherent) {
      // C'est un usager
      state.currentMember = response.adherent;
      renderMember();
      addHistory('info', 'Usager scanne', `${response.adherent.prenom} ${response.adherent.nom}`);

      // Recalculer les prix cotisation
      if (document.querySelector('.product-tab.active')?.dataset.category === 'cotisation') {
        renderProducts('cotisation');
      }
    }
  } catch (error) {
    console.error('Code-barre non reconnu:', code);
  }
}

// ============================================
// MANUAL ENTRY
// ============================================
function showManualEntryModal(category = 'vente') {
  document.getElementById('manual-category').value = category;
  document.getElementById('manual-label').value = '';
  document.getElementById('manual-amount').value = '';
  document.getElementById('modal-manual-entry').style.display = 'flex';
  document.getElementById('manual-label').focus();
}

function addManualEntry() {
  const category = document.getElementById('manual-category').value;
  const label = document.getElementById('manual-label').value.trim();
  const amount = parseFloat(document.getElementById('manual-amount').value);

  if (!label) {
    showError('Veuillez saisir un libelle');
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showError('Veuillez saisir un montant valide');
    return;
  }

  addToCart({
    type: category,
    label: label,
    price: amount,
    category: category
  });

  hideModal('modal-manual-entry');
}

// ============================================
// HISTORY
// ============================================
async function loadSessionHistory() {
  if (!state.currentSession) return;

  try {
    const response = await apiAdmin.get(`/api/caisses/sessions/${state.currentSession.id}/mouvements`);
    const mouvements = response || [];

    // Calculer les stats
    state.sessionStats = { entrees: 0, sorties: 0 };
    mouvements.forEach(m => {
      if (m.statut === 'valide') {
        if (m.type_mouvement === 'entree') {
          state.sessionStats.entrees += parseFloat(m.montant);
        } else {
          state.sessionStats.sorties += parseFloat(m.montant);
        }
      }
    });

    updateSessionStats();

    // Convertir en historique affichable
    state.history = mouvements.slice(0, 20).map(m => ({
      type: m.statut === 'annule' ? 'error' : 'success',
      action: `${m.type_mouvement === 'entree' ? '+' : '-'}${formatMoney(m.montant)}`,
      detail: m.libelle || m.categorie,
      time: new Date(m.date_mouvement)
    }));

    renderHistory();
  } catch (error) {
    console.error('Erreur chargement historique:', error);
  }
}

function addHistory(type, action, detail) {
  state.history.unshift({
    type,
    action,
    detail,
    time: new Date()
  });

  // Garder max 50 entrees
  if (state.history.length > 50) {
    state.history = state.history.slice(0, 50);
  }

  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('history-list');

  if (state.history.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--caisse-muted); padding: 20px;">Aucune activite</div>';
    return;
  }

  container.innerHTML = state.history.map(h => `
    <div class="history-item ${h.type}">
      <div class="history-time">${formatTime(h.time)}</div>
      <div class="history-action">${h.action}</div>
      <div class="history-detail">${h.detail}</div>
    </div>
  `).join('');
}

function clearHistory() {
  state.history = [];
  renderHistory();
}

function updateSessionStats() {
  document.getElementById('stat-entrees').textContent = formatMoney(state.sessionStats.entrees);
  document.getElementById('stat-sorties').textContent = formatMoney(state.sessionStats.sorties);
}

// ============================================
// UTILITIES
// ============================================
function formatMoney(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0).replace('€', 'EUR');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function hideModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function showError(message) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: message,
      background: 'var(--caisse-card)',
      color: 'var(--caisse-text)',
      confirmButtonColor: 'var(--caisse-error)'
    });
  } else {
    alert('Erreur: ' + message);
  }
}

function showSuccess(message) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'success',
      title: 'Succes',
      text: message,
      background: 'var(--caisse-card)',
      color: 'var(--caisse-text)',
      confirmButtonColor: 'var(--caisse-success)',
      timer: 2000,
      showConfirmButton: false
    });
  }
}

// ============================================
// FULLSCREEN
// ============================================
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log('Erreur fullscreen:', err);
    });
  } else {
    document.exitFullscreen();
  }
}
