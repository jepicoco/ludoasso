/**
 * Scanner Ludotheque - Gestion des emprunts/retours par code-barre
 * Utilise html5-qrcode pour le scanning webcam
 */

// State
let html5QrCode = null;
let currentAdherent = null;
let scanHistory = [];
let cameras = [];
let currentCameraIndex = 0;
let isScanning = false;
let lastScannedCode = null;
let lastScanTime = 0;

// File d'articles en attente (nouveau systeme multi-articles)
let pendingItems = [];

// Config
const SCAN_COOLDOWN = 500; // 0.5 seconde entre chaque scan
const BARCODE_RESCAN_COOLDOWN = 5000; // 5 secondes avant de pouvoir rescanner le meme code-barre
const DEFAULT_LOAN_DAYS = 14;
const BARCODE_SCANNER_TIMEOUT = 100; // Timeout pour detecter fin de saisie douchette (ms)

// Historique des codes scannes (pour eviter rescans rapides du meme code)
const scannedCodesHistory = new Map(); // code -> timestamp du dernier scan

// Douchette USB - Buffer pour capturer les caracteres rapides
let barcodeBuffer = '';
let barcodeTimeout = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  // Verifier l'authentification
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }

  // Charger l'historique depuis localStorage
  loadHistory();

  // Initialiser le scanner webcam
  await initScanner();

  // Initialiser le listener pour douchette USB
  initBarcodeScanner();

  // Event listener pour la saisie manuelle
  document.getElementById('manual-code').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitManualCode();
    }
  });
});

/**
 * Initialise le listener global pour douchette USB
 * Les douchettes envoient les caracteres comme un clavier rapide
 * et terminent par "Enter"
 */
function initBarcodeScanner() {
  document.addEventListener('keydown', handleBarcodeKeydown);
  console.log('[Scanner] Douchette USB activee - Pret a scanner');
}

/**
 * Gere les touches clavier pour detecter une douchette USB
 * - Accumule les caracteres rapides dans un buffer
 * - Traite le code quand "Enter" est detecte
 * - Reset apres un timeout si pas d'Enter
 */
function handleBarcodeKeydown(e) {
  // Ignorer si on est dans un champ de saisie (sauf si c'est Enter sur buffer plein)
  const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

  // Si modal ouverte, laisser la saisie manuelle gerer
  const modalOpen = document.querySelector('.modal.show');
  if (modalOpen && isInputField) {
    return;
  }

  // Si c'est Enter et qu'on a un buffer
  if (e.key === 'Enter' && barcodeBuffer.length >= 3) {
    e.preventDefault();
    const code = barcodeBuffer.trim().toUpperCase();
    barcodeBuffer = '';
    clearTimeout(barcodeTimeout);

    console.log('[Douchette] Code recu:', code);
    processBarcode(code);
    return;
  }

  // Caracteres valides pour code-barre (lettres, chiffres, tirets)
  if (e.key.length === 1 && /[a-zA-Z0-9\-]/.test(e.key)) {
    // Si on n'est pas dans un input, capturer le caractere
    if (!isInputField) {
      e.preventDefault();
    }

    barcodeBuffer += e.key;

    // Reset le timeout
    clearTimeout(barcodeTimeout);
    barcodeTimeout = setTimeout(() => {
      // Si le buffer n'est pas traite par Enter, le vider
      if (barcodeBuffer.length > 0) {
        console.log('[Douchette] Timeout - buffer efface:', barcodeBuffer);
        barcodeBuffer = '';
      }
    }, BARCODE_SCANNER_TIMEOUT);
  }
}

async function initScanner() {
  try {
    // Creer l'instance html5-qrcode
    html5QrCode = new Html5Qrcode("reader");

    // Recuperer les cameras disponibles
    cameras = await Html5Qrcode.getCameras();

    if (cameras && cameras.length > 0) {
      // Preferer la camera arriere si disponible
      const backCamera = cameras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('arriere') ||
        c.label.toLowerCase().includes('rear')
      );

      if (backCamera) {
        currentCameraIndex = cameras.indexOf(backCamera);
      }

      await startScanning();
    } else {
      updateStatus('Aucune camera detectee', 'error');
    }
  } catch (err) {
    console.error('Erreur initialisation scanner:', err);
    updateStatus('Erreur: ' + err.message, 'error');
  }
}

async function startScanning() {
  if (isScanning) return;

  try {
    const camera = cameras[currentCameraIndex];

    await html5QrCode.start(
      camera.id,
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.5
      },
      onScanSuccess,
      onScanError
    );

    isScanning = true;
    updateStatus('En attente de scan...', 'scanning');
  } catch (err) {
    console.error('Erreur demarrage scanner:', err);
    updateStatus('Erreur camera: ' + err.message, 'error');
  }
}

async function stopScanning() {
  if (!isScanning) return;

  try {
    await html5QrCode.stop();
    isScanning = false;
  } catch (err) {
    console.error('Erreur arret scanner:', err);
  }
}

// ==================== SCAN HANDLING ====================

async function onScanSuccess(decodedText, decodedResult) {
  const now = Date.now();

  // Cooldown general entre chaque scan (0.5s)
  if ((now - lastScanTime) < SCAN_COOLDOWN) {
    return;
  }

  // Cooldown specifique par code-barre (5s avant de pouvoir rescanner le meme code)
  const lastScanForThisCode = scannedCodesHistory.get(decodedText);
  if (lastScanForThisCode && (now - lastScanForThisCode) < BARCODE_RESCAN_COOLDOWN) {
    console.log(`[Scanner] Code ${decodedText} en cooldown (${Math.ceil((BARCODE_RESCAN_COOLDOWN - (now - lastScanForThisCode)) / 1000)}s restantes)`);
    return;
  }

  // Mettre a jour les timestamps
  lastScannedCode = decodedText;
  lastScanTime = now;
  scannedCodesHistory.set(decodedText, now);

  // Nettoyer les anciens codes de l'historique (plus de 30s)
  for (const [code, timestamp] of scannedCodesHistory) {
    if (now - timestamp > 30000) {
      scannedCodesHistory.delete(code);
    }
  }

  console.log('Code scanne:', decodedText);
  await processBarcode(decodedText);
}

function onScanError(errorMessage) {
  // Erreurs normales de scan (pas de code visible) - ignorer
}

async function processBarcode(code) {
  updateStatus('Verification...', 'scanning');

  try {
    // Appeler l'API pour valider le code-barre
    const response = await barcodesAPI.scan(code);

    if (response.type === 'adherent') {
      await handleAdherentScan(response);
    } else if (['jeu', 'livre', 'film', 'disque'].includes(response.type)) {
      // Tous les types d'articles sont traites de la meme maniere
      await handleArticleScan(response);
    } else {
      throw new Error('Type de code-barre inconnu: ' + response.type);
    }
  } catch (error) {
    console.error('Erreur scan:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur: ' + (error.message || 'Code invalide'), 'error');
    addToHistory('error', 'Erreur', error.message || 'Code invalide', code);
  }
}

async function handleAdherentScan(response) {
  const adherent = response.adherent;

  // Verifier le statut
  if (adherent.statut !== 'actif') {
    playSound('error');
    flashZone('error');
    updateStatus(`Adherent ${adherent.statut}`, 'error');
    addToHistory('error', 'Adherent non actif', `${adherent.prenom} ${adherent.nom} - Statut: ${adherent.statut}`, response.code);
    return;
  }

  // Selectionner l'adherent
  currentAdherent = adherent;
  displayAdherent(adherent);
  playSound('success');
  flashZone('success');
  updateStatus(`Adherent: ${adherent.prenom} ${adherent.nom}`, 'success');
  addToHistory('info', 'Adherent selectionne', `${adherent.prenom} ${adherent.nom}`, response.code);

  // Si des articles sont en attente, les traiter automatiquement
  if (pendingItems.length > 0) {
    setTimeout(() => flushPendingItems(), 300);
  }
}

/**
 * Gere le scan d'un article (jeu, livre, film, disque)
 * Unifie le traitement pour tous les types de collections
 */
async function handleArticleScan(response) {
  const articleType = response.type;
  const article = response[articleType]; // jeu, livre, film ou disque
  const titre = article.titre;

  // Si pas d'adherent selectionne, ajouter a la file d'attente
  if (!currentAdherent) {
    addToPendingItems(article, response.code, articleType);
    return;
  }

  if (article.statut === 'disponible') {
    // Creer un emprunt
    await createEmprunt(article, articleType);
  } else if (article.statut === 'emprunte') {
    // Effectuer un retour
    await processRetour(article, articleType);
  } else if (article.statut === 'reserve') {
    // Article reserve - verifier si l'adherent courant a une reservation prete
    await handleReservedArticle(article, articleType, response.code);
  } else {
    playSound('error');
    flashZone('error');
    updateStatus(`${getArticleTypeLabel(articleType)} en ${article.statut}`, 'error');
    addToHistory('error', `${getArticleTypeLabel(articleType)} non disponible`, `${titre} - Statut: ${article.statut}`, response.code);
  }
}

/**
 * Gere un article en statut 'reserve'
 * Si l'adherent courant a une reservation prete, la convertir en emprunt
 */
async function handleReservedArticle(article, articleType, code) {
  if (!currentAdherent) {
    playSound('error');
    updateStatus(`Article reserve - Selectionnez un adherent`, 'error');
    return;
  }

  try {
    // Verifier si l'adherent courant a une reservation prete pour cet article
    const reservations = await reservationsAPI.getForArticle(articleType, article.id);
    const reservationPrete = reservations.find(r =>
      r.statut === 'prete' && r.utilisateur_id === currentAdherent.id
    );

    if (reservationPrete) {
      // Convertir la reservation en emprunt
      const result = await reservationsAPI.convertToEmprunt(reservationPrete.id);

      const typeLabel = getArticleTypeLabel(articleType);
      playSound('success');
      flashZone('success');
      updateStatus(`Reservation convertie en emprunt: ${article.titre}`, 'success');
      addToHistory('success', 'Reservation → Emprunt', `${typeLabel}: ${article.titre} → ${currentAdherent.prenom} ${currentAdherent.nom}`, code);
    } else {
      // L'article est reserve mais pas pour cet adherent
      playSound('error');
      flashZone('error');
      updateStatus(`Article reserve pour un autre usager`, 'error');
      addToHistory('error', 'Article reserve', `${article.titre} - Reserve pour un autre usager`, code);
    }
  } catch (error) {
    console.error('Erreur traitement reservation:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur: ' + (error.message || 'Erreur inconnue'), 'error');
    addToHistory('error', 'Erreur reservation', error.message || 'Erreur inconnue', code);
  }
}

// Alias pour compatibilite avec l'ancien code
async function handleJeuScan(response) {
  return handleArticleScan(response);
}

/**
 * Retourne le libelle francais du type d'article
 */
function getArticleTypeLabel(type) {
  const labels = {
    jeu: 'Jeu',
    livre: 'Livre',
    film: 'Film',
    disque: 'Disque'
  };
  return labels[type] || 'Article';
}

/**
 * Retourne l'icone Bootstrap correspondant au type d'article
 */
function getArticleTypeIcon(type) {
  const icons = {
    jeu: 'bi-dice-5',
    livre: 'bi-book',
    film: 'bi-film',
    disque: 'bi-disc'
  };
  return icons[type] || 'bi-box';
}

// ==================== PENDING ITEMS QUEUE ====================

/**
 * Ajoute un article a la file d'attente (quand pas d'adherent selectionne)
 * @param {Object} article - L'article (jeu, livre, film ou disque)
 * @param {string} code - Le code-barre
 * @param {string} articleType - Le type d'article ('jeu', 'livre', 'film', 'disque')
 */
function addToPendingItems(article, code, articleType = 'jeu') {
  // Verifier si l'article n'est pas deja dans la file
  const existingIndex = pendingItems.findIndex(item =>
    item.article.id === article.id && item.articleType === articleType
  );
  if (existingIndex !== -1) {
    playSound('error');
    updateStatus(`"${article.titre}" deja dans la file`, 'error');
    return;
  }

  pendingItems.push({
    article,
    articleType,
    code,
    addedAt: Date.now()
  });

  const typeLabel = getArticleTypeLabel(articleType);
  playSound('success');
  flashZone('success');
  updateStatus(`"${article.titre}" ajoute a la file (${pendingItems.length})`, 'success');
  addToHistory('info', 'File d\'attente', `${typeLabel}: ${article.titre} (${article.statut})`, code);

  updatePendingItemsDisplay();
}

/**
 * Retire un article de la file d'attente
 */
function removePendingItem(index) {
  if (index >= 0 && index < pendingItems.length) {
    const removed = pendingItems.splice(index, 1)[0];
    addToHistory('info', 'Retire de la file', removed.article.titre, removed.code);
    updatePendingItemsDisplay();
  }
}

/**
 * Vide la file d'attente
 */
function clearPendingItems() {
  if (pendingItems.length === 0) return;

  if (confirm(`Vider la file d'attente (${pendingItems.length} articles) ?`)) {
    pendingItems = [];
    updatePendingItemsDisplay();
    addToHistory('info', 'File videe', 'Tous les articles retires');
  }
}

/**
 * Traite tous les articles en attente pour l'adherent selectionne
 */
async function flushPendingItems() {
  if (!currentAdherent || pendingItems.length === 0) return;

  const itemsToProcess = [...pendingItems];
  pendingItems = [];
  updatePendingItemsDisplay();

  let successCount = 0;
  let errorCount = 0;

  for (const item of itemsToProcess) {
    try {
      if (item.article.statut === 'disponible') {
        await createEmpruntSilent(item.article, item.articleType);
        successCount++;
      } else if (item.article.statut === 'emprunte') {
        await processRetourSilent(item.article, item.articleType);
        successCount++;
      } else {
        // Statut non gere - erreur silencieuse dans l'historique
        addToHistory('error', 'Non traite', `${item.article.titre} - Statut: ${item.article.statut}`, item.code);
        errorCount++;
      }
    } catch (error) {
      // Erreur silencieuse dans l'historique, on continue avec les autres
      addToHistory('error', 'Erreur traitement', `${item.article.titre}: ${error.message}`, item.code);
      errorCount++;
    }
  }

  // Feedback global
  if (successCount > 0 && errorCount === 0) {
    playSound('success');
    flashZone('success');
    updateStatus(`${successCount} articles traites`, 'success');
  } else if (successCount > 0 && errorCount > 0) {
    playSound('success');
    updateStatus(`${successCount} OK, ${errorCount} erreurs`, 'error');
  } else if (errorCount > 0) {
    playSound('error');
    flashZone('error');
    updateStatus(`${errorCount} erreurs`, 'error');
  }
}

/**
 * Cree un emprunt sans feedback UI (pour traitement en lot)
 * @param {Object} article - L'article a emprunter
 * @param {string} articleType - Le type d'article ('jeu', 'livre', 'film', 'disque')
 */
async function createEmpruntSilent(article, articleType = 'jeu') {
  const dateRetour = new Date();
  dateRetour.setDate(dateRetour.getDate() + DEFAULT_LOAN_DAYS);

  // Construire l'objet d'emprunt avec le bon ID selon le type
  const empruntData = {
    adherent_id: currentAdherent.id,
    date_retour_prevue: dateRetour.toISOString().split('T')[0]
  };
  empruntData[`${articleType}_id`] = article.id;

  await empruntsAPI.create(empruntData);

  const typeLabel = getArticleTypeLabel(articleType);
  addToHistory('success', 'Emprunt', `${typeLabel}: ${article.titre} → ${currentAdherent.prenom} ${currentAdherent.nom}`, article.code_barre);
}

/**
 * Effectue un retour sans feedback UI (pour traitement en lot)
 * @param {Object} article - L'article a retourner
 * @param {string} articleType - Le type d'article ('jeu', 'livre', 'film', 'disque')
 */
async function processRetourSilent(article, articleType = 'jeu') {
  // Construire le filtre avec le bon ID selon le type
  const filter = { statut: 'en_cours' };
  filter[`${articleType}_id`] = article.id;

  const emprunts = await empruntsAPI.getAll(filter);

  if (!emprunts.emprunts || emprunts.emprunts.length === 0) {
    throw new Error('Aucun emprunt en cours trouve');
  }

  const emprunt = emprunts.emprunts[0];
  const adherentNom = emprunt.adherent ? `${emprunt.adherent.prenom} ${emprunt.adherent.nom}` : 'Inconnu';

  const response = await empruntsAPI.return(emprunt.id);

  const typeLabel = getArticleTypeLabel(articleType);

  // Si reservation en attente (traitement silencieux = on laisse en rayon par defaut)
  if (response.hasReservation) {
    const reservataire = response.reservation?.utilisateur
      ? `${response.reservation.utilisateur.prenom} ${response.reservation.utilisateur.nom}`
      : 'Un usager';
    addToHistory('info', 'Retour + Reservation', `${typeLabel}: ${article.titre} (${adherentNom}) - Reserve par ${reservataire}`, article.code_barre);
  } else {
    addToHistory('success', 'Retour', `${typeLabel}: ${article.titre} (${adherentNom})`, article.code_barre);
  }
}

/**
 * Met a jour l'affichage de la zone des articles en attente
 */
function updatePendingItemsDisplay() {
  const container = document.getElementById('pending-items-zone');
  if (!container) return;

  if (pendingItems.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  const listHtml = pendingItems.map((item, index) => {
    let badgeClass = 'bg-secondary';
    let actionLabel = '';
    if (item.article.statut === 'disponible') {
      badgeClass = 'bg-success';
      actionLabel = 'Emprunt';
    } else if (item.article.statut === 'emprunte') {
      badgeClass = 'bg-warning text-dark';
      actionLabel = 'Retour';
    }

    const icon = getArticleTypeIcon(item.articleType);

    return `
      <div class="pending-item">
        <div class="pending-item-info">
          <i class="bi ${icon}"></i>
          <span class="pending-item-title">${item.article.titre}</span>
          <span class="badge ${badgeClass} badge-sm">${actionLabel || item.article.statut}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="removePendingItem(${index})" title="Retirer">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pending-items-header">
      <h6><i class="bi bi-hourglass-split"></i> Articles en attente (${pendingItems.length})</h6>
      <button class="btn btn-sm btn-outline-secondary" onclick="clearPendingItems()" title="Vider la file">
        <i class="bi bi-trash"></i>
      </button>
    </div>
    <div class="pending-items-list">
      ${listHtml}
    </div>
    <p class="pending-items-hint">
      <i class="bi bi-info-circle"></i> Scannez une carte adherent pour traiter ces articles
    </p>
  `;
}

/**
 * Cree un emprunt avec feedback UI
 * @param {Object} article - L'article a emprunter
 * @param {string} articleType - Le type d'article ('jeu', 'livre', 'film', 'disque')
 */
async function createEmprunt(article, articleType = 'jeu') {
  if (!currentAdherent) {
    // Ouvrir la recherche d'adherent avec l'article en attente
    playSound('error');
    updateStatus('Selectionnez un adherent pour emprunter', 'error');
    addToHistory('info', 'Adherent requis', `Emprunt de "${article.titre}" - Selection adherent...`, article.code_barre);

    // Ouvrir la modal de recherche avec l'article en attente
    openSearchAdherent({ article, articleType });
    return;
  }

  try {
    // Calculer la date de retour prevue
    const dateRetour = new Date();
    dateRetour.setDate(dateRetour.getDate() + DEFAULT_LOAN_DAYS);

    // Construire l'objet d'emprunt avec le bon ID selon le type
    const empruntData = {
      adherent_id: currentAdherent.id,
      date_retour_prevue: dateRetour.toISOString().split('T')[0]
    };
    empruntData[`${articleType}_id`] = article.id;

    // Creer l'emprunt via API
    await empruntsAPI.create(empruntData);

    const typeLabel = getArticleTypeLabel(articleType);
    playSound('success');
    flashZone('success');
    updateStatus(`Emprunt cree: ${article.titre}`, 'success');
    addToHistory('success', 'Emprunt', `${typeLabel}: ${article.titre} → ${currentAdherent.prenom} ${currentAdherent.nom}`, article.code_barre);

  } catch (error) {
    console.error('Erreur creation emprunt:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur emprunt: ' + (error.message || 'Erreur inconnue'), 'error');
    addToHistory('error', 'Erreur emprunt', error.message || 'Erreur inconnue', article.code_barre);
  }
}

/**
 * Effectue un retour avec feedback UI
 * @param {Object} article - L'article a retourner
 * @param {string} articleType - Le type d'article ('jeu', 'livre', 'film', 'disque')
 */
async function processRetour(article, articleType = 'jeu') {
  try {
    // Construire le filtre avec le bon ID selon le type
    const filter = { statut: 'en_cours' };
    filter[`${articleType}_id`] = article.id;

    // Trouver l'emprunt en cours pour cet article
    const emprunts = await empruntsAPI.getAll(filter);

    if (!emprunts.emprunts || emprunts.emprunts.length === 0) {
      throw new Error(`Aucun emprunt en cours trouve pour cet article`);
    }

    const emprunt = emprunts.emprunts[0];
    const adherentNom = emprunt.adherent ? `${emprunt.adherent.prenom} ${emprunt.adherent.nom}` : 'Inconnu';

    // Effectuer le retour
    const response = await empruntsAPI.return(emprunt.id);

    const typeLabel = getArticleTypeLabel(articleType);

    // Verifier s'il y a une reservation en attente
    if (response.hasReservation) {
      // Afficher la modal de choix reservation
      showReservationChoiceModal(emprunt.id, article, articleType, response.reservation, adherentNom);
    } else {
      playSound('success');
      flashZone('success');
      updateStatus(`Retour: ${article.titre}`, 'success');
      addToHistory('success', 'Retour', `${typeLabel}: ${article.titre} (${adherentNom})`, article.code_barre);
    }

  } catch (error) {
    console.error('Erreur retour:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur retour: ' + (error.message || 'Erreur inconnue'), 'error');
    addToHistory('error', 'Erreur retour', error.message || 'Erreur inconnue', article.code_barre);
  }
}

// Variables pour la modal de reservation
let pendingReservationChoice = null;

/**
 * Affiche la modal pour choisir quoi faire avec une reservation en attente
 */
function showReservationChoiceModal(empruntId, article, articleType, reservation, ancienEmprunteur) {
  pendingReservationChoice = { empruntId, article, articleType, reservation, ancienEmprunteur };

  const reservataire = reservation.utilisateur
    ? `${reservation.utilisateur.prenom} ${reservation.utilisateur.nom}`
    : 'Reservataire';

  // Creer ou recuperer la modal
  let modal = document.getElementById('reservationChoiceModal');
  if (!modal) {
    // Creer la modal dynamiquement
    const modalHtml = `
      <div class="modal fade" id="reservationChoiceModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-warning">
              <h5 class="modal-title"><i class="bi bi-bookmark-star"></i> Reservation en attente</h5>
            </div>
            <div class="modal-body" id="reservationChoiceBody">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="handleReservationChoice('rayon')">
                <i class="bi bi-box-arrow-in-down"></i> Remettre en rayon
              </button>
              <button type="button" class="btn btn-primary" onclick="handleReservationChoice('cote')">
                <i class="bi bi-bookmark-check"></i> Mettre de cote
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    modal = document.getElementById('reservationChoiceModal');
  }

  // Mettre a jour le contenu
  document.getElementById('reservationChoiceBody').innerHTML = `
    <div class="alert alert-info mb-3">
      <strong>${article.titre}</strong> vient d'etre retourne par ${ancienEmprunteur}.
    </div>
    <p>Cet article est reserve par <strong>${reservataire}</strong>.</p>
    <p>Que souhaitez-vous faire ?</p>
    <ul class="list-unstyled mt-3">
      <li class="mb-2">
        <i class="bi bi-box-arrow-in-down text-secondary"></i>
        <strong>Remettre en rayon</strong> - L'article sera disponible pour tous
      </li>
      <li>
        <i class="bi bi-bookmark-check text-primary"></i>
        <strong>Mettre de cote</strong> - Notifier ${reservataire} pour recuperation
      </li>
    </ul>
  `;

  // Afficher la modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

/**
 * Traite le choix de l'utilisateur pour la reservation
 * @param {string} action - 'rayon' ou 'cote'
 */
async function handleReservationChoice(action) {
  if (!pendingReservationChoice) return;

  const { empruntId, article, articleType, reservation, ancienEmprunteur } = pendingReservationChoice;
  const typeLabel = getArticleTypeLabel(articleType);

  // Fermer la modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('reservationChoiceModal'));
  if (modal) modal.hide();

  try {
    // Appeler l'API pour traiter la reservation
    await empruntsAPI.traiterReservation(empruntId, action);

    if (action === 'cote') {
      const reservataire = reservation.utilisateur
        ? `${reservation.utilisateur.prenom} ${reservation.utilisateur.nom}`
        : 'Reservataire';
      playSound('success');
      flashZone('success');
      updateStatus(`Retour + Reservation notifiee`, 'success');
      addToHistory('success', 'Retour + Reservation', `${typeLabel}: ${article.titre} mis de cote pour ${reservataire}`, article.code_barre);
    } else {
      playSound('success');
      flashZone('success');
      updateStatus(`Retour: ${article.titre}`, 'success');
      addToHistory('success', 'Retour', `${typeLabel}: ${article.titre} remis en rayon (${ancienEmprunteur})`, article.code_barre);
    }
  } catch (error) {
    console.error('Erreur traitement reservation:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur: ' + (error.message || 'Erreur inconnue'), 'error');
    addToHistory('error', 'Erreur traitement', error.message || 'Erreur inconnue', article.code_barre);
  }

  pendingReservationChoice = null;
}

// ==================== UI FUNCTIONS ====================

function displayAdherent(adherent) {
  const container = document.getElementById('adherent-display');
  const initials = (adherent.prenom[0] + adherent.nom[0]).toUpperCase();
  const badgeClass = `badge-${adherent.statut}`;

  container.innerHTML = `
    <div class="adherent-info">
      <div class="adherent-avatar">${initials}</div>
      <div class="adherent-details">
        <h4>${adherent.prenom} ${adherent.nom}</h4>
        <p>${adherent.email || 'Pas d\'email'}</p>
        <span class="badge-statut ${badgeClass}">${adherent.statut}</span>
      </div>
      <button class="btn-clear-adherent" onclick="clearAdherent()">
        <i class="bi bi-x-lg"></i> Terminer la saisie
      </button>
    </div>
  `;
}

function clearAdherent() {
  currentAdherent = null;
  document.getElementById('adherent-display').innerHTML = `
    <div class="adherent-placeholder">
      <i class="bi bi-person-plus"></i>
      <p>Scannez la carte d'un adherent pour commencer</p>
    </div>
  `;
  updateStatus('En attente de scan...', 'scanning');
}

function updateStatus(message, type) {
  const statusEl = document.getElementById('scanner-status');
  statusEl.className = `scanner-status ${type}`;

  let icon = 'bi-camera-video';
  if (type === 'success') icon = 'bi-check-circle-fill';
  if (type === 'error') icon = 'bi-exclamation-triangle-fill';

  statusEl.innerHTML = `<i class="bi ${icon}"></i> ${message}`;

  // Reset au statut normal apres 3 secondes
  if (type !== 'scanning') {
    setTimeout(() => {
      updateStatus('En attente de scan...', 'scanning');
    }, 3000);
  }
}

function flashZone(type) {
  const zone = document.getElementById('scanner-zone');
  zone.classList.remove('flash-success', 'flash-error');
  void zone.offsetWidth; // Force reflow
  zone.classList.add(`flash-${type}`);
}

// ==================== HISTORY ====================

function addToHistory(type, action, details, code = '') {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const item = {
    type,
    action,
    details,
    code,
    time: timeStr,
    timestamp: now.getTime()
  };

  scanHistory.unshift(item);

  // Garder seulement les 50 derniers
  if (scanHistory.length > 50) {
    scanHistory = scanHistory.slice(0, 50);
  }

  saveHistory();
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('history-list');

  if (scanHistory.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <i class="bi bi-inbox"></i>
        <p>Aucune action pour le moment</p>
      </div>
    `;
    return;
  }

  // Afficher les 10 dernieres
  const items = scanHistory.slice(0, 10);

  container.innerHTML = items.map(item => {
    let icon = 'bi-info-circle';
    if (item.type === 'success') icon = 'bi-check-circle-fill';
    if (item.type === 'error') icon = 'bi-x-circle-fill';

    return `
      <div class="history-item ${item.type}">
        <div class="history-icon ${item.type}">
          <i class="bi ${icon}"></i>
        </div>
        <div class="history-content">
          <div class="action">${item.action}</div>
          <div class="details">${item.details}</div>
        </div>
        <div class="history-time">${item.time}</div>
      </div>
    `;
  }).join('');
}

function clearHistory() {
  if (confirm('Vider l\'historique des actions ?')) {
    scanHistory = [];
    saveHistory();
    renderHistory();
  }
}

function saveHistory() {
  localStorage.setItem('scanner_history', JSON.stringify(scanHistory));
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('scanner_history');
    if (saved) {
      scanHistory = JSON.parse(saved);
      // Filtrer les entrees de plus de 24h
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      scanHistory = scanHistory.filter(item => item.timestamp > oneDayAgo);
      renderHistory();
    }
  } catch (e) {
    console.error('Erreur chargement historique:', e);
    scanHistory = [];
  }
}

// ==================== AUDIO ====================

function playSound(type) {
  try {
    const audio = document.getElementById(`sound-${type}`);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {}); // Ignorer les erreurs autoplay
    }
  } catch (e) {
    // Ignorer les erreurs audio
  }
}

// ==================== CAMERA ====================

async function switchCamera() {
  if (cameras.length < 2) {
    alert('Une seule camera disponible');
    return;
  }

  await stopScanning();
  currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
  await startScanning();
}

// ==================== MANUAL INPUT ====================

function openManualInput() {
  const modal = new bootstrap.Modal(document.getElementById('manualInputModal'));
  document.getElementById('manual-code').value = '';
  modal.show();
  setTimeout(() => document.getElementById('manual-code').focus(), 300);
}

async function submitManualCode() {
  const code = document.getElementById('manual-code').value.trim().toUpperCase();

  if (!code) {
    alert('Veuillez saisir un code-barre');
    return;
  }

  // Fermer la modal
  bootstrap.Modal.getInstance(document.getElementById('manualInputModal')).hide();

  // Traiter le code
  await processBarcode(code);
}

// ==================== FULLSCREEN ====================

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      document.body.classList.add('fullscreen-mode');
    }).catch(() => {});
  } else {
    document.exitFullscreen().then(() => {
      document.body.classList.remove('fullscreen-mode');
    }).catch(() => {});
  }
}

// Ecouter les changements de fullscreen
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('fullscreen-mode');
  }
});

// ==================== SEARCH FUNCTIONS ====================

let searchAdherentTimeout = null;
let searchJeuTimeout = null;
let pendingArticleForEmprunt = null; // Article en attente d'un adherent pour emprunt { article, articleType }

function openSearchAdherent(forEmprunt = false) {
  if (forEmprunt) {
    // Stocke qu'on cherche un adherent pour un emprunt en attente
    pendingArticleForEmprunt = forEmprunt;
  }

  const modal = new bootstrap.Modal(document.getElementById('searchAdherentModal'));
  document.getElementById('search-adherent-input').value = '';
  document.getElementById('search-adherent-results').innerHTML = '<p class="text-muted text-center">Tapez pour rechercher un adherent</p>';
  modal.show();

  setTimeout(() => {
    document.getElementById('search-adherent-input').focus();
  }, 300);

  // Ajouter listener de recherche
  document.getElementById('search-adherent-input').oninput = (e) => {
    clearTimeout(searchAdherentTimeout);
    searchAdherentTimeout = setTimeout(() => {
      searchAdherents(e.target.value);
    }, 300);
  };
}

async function searchAdherents(query) {
  const resultsDiv = document.getElementById('search-adherent-results');

  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '<p class="text-muted text-center">Tapez au moins 2 caracteres</p>';
    return;
  }

  resultsDiv.innerHTML = '<p class="text-muted text-center"><i class="bi bi-hourglass-split"></i> Recherche...</p>';

  try {
    const data = await adherentsAPI.getAll({ search: query, limit: 10 });
    const adherents = data.adherents || [];

    if (adherents.length === 0) {
      resultsDiv.innerHTML = '<p class="text-muted text-center">Aucun adherent trouve</p>';
      return;
    }

    resultsDiv.innerHTML = adherents.map(adh => {
      const initials = (adh.prenom[0] + adh.nom[0]).toUpperCase();
      const badgeClass = adh.statut === 'actif' ? 'bg-success' : 'bg-secondary';

      return `
        <div class="search-result-item" onclick="selectAdherentFromSearch(${adh.id}, '${adh.prenom.replace(/'/g, "\\'")}', '${adh.nom.replace(/'/g, "\\'")}', '${adh.email || ''}', '${adh.statut}', '${adh.code_barre || ''}')">
          <div class="avatar">${initials}</div>
          <div class="info">
            <div class="name">${adh.prenom} ${adh.nom}</div>
            <div class="details">${adh.code_barre || 'Pas de code'}</div>
          </div>
          <span class="badge ${badgeClass}">${adh.statut}</span>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erreur recherche adherents:', error);
    resultsDiv.innerHTML = '<p class="text-danger text-center">Erreur de recherche</p>';
  }
}

function selectAdherentFromSearch(id, prenom, nom, email, statut, code_barre) {
  // Fermer la modal
  bootstrap.Modal.getInstance(document.getElementById('searchAdherentModal')).hide();

  // Verifier le statut
  if (statut !== 'actif') {
    playSound('error');
    flashZone('error');
    updateStatus(`Adherent ${statut}`, 'error');
    addToHistory('error', 'Adherent non actif', `${prenom} ${nom} - Statut: ${statut}`, code_barre);
    pendingArticleForEmprunt = null;
    return;
  }

  // Selectionner l'adherent
  currentAdherent = { id, prenom, nom, email, statut, code_barre };
  displayAdherent(currentAdherent);
  playSound('success');
  flashZone('success');
  updateStatus(`Adherent: ${prenom} ${nom}`, 'success');
  addToHistory('info', 'Adherent selectionne', `${prenom} ${nom}`, code_barre);

  // Si on avait un article en attente d'emprunt, le traiter
  if (pendingArticleForEmprunt && pendingArticleForEmprunt !== true) {
    const { article, articleType } = pendingArticleForEmprunt;
    pendingArticleForEmprunt = null;
    setTimeout(() => createEmprunt(article, articleType), 300);
  }
  // Si des articles sont en attente dans la nouvelle file, les traiter
  else if (pendingItems.length > 0) {
    setTimeout(() => flushPendingItems(), 300);
  }
}

function openSearchJeu() {
  const modal = new bootstrap.Modal(document.getElementById('searchJeuModal'));
  document.getElementById('search-jeu-input').value = '';
  document.getElementById('search-jeu-results').innerHTML = '<p class="text-muted text-center">Tapez pour rechercher un jeu</p>';
  modal.show();

  setTimeout(() => {
    document.getElementById('search-jeu-input').focus();
  }, 300);

  // Ajouter listener de recherche
  document.getElementById('search-jeu-input').oninput = (e) => {
    clearTimeout(searchJeuTimeout);
    searchJeuTimeout = setTimeout(() => {
      searchJeux(e.target.value);
    }, 300);
  };
}

async function searchJeux(query) {
  const resultsDiv = document.getElementById('search-jeu-results');

  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '<p class="text-muted text-center">Tapez au moins 2 caracteres</p>';
    return;
  }

  resultsDiv.innerHTML = '<p class="text-muted text-center"><i class="bi bi-hourglass-split"></i> Recherche...</p>';

  try {
    const data = await jeuxAPI.getAll({ search: query, limit: 10 });
    const jeux = data.jeux || [];

    if (jeux.length === 0) {
      resultsDiv.innerHTML = '<p class="text-muted text-center">Aucun jeu trouve</p>';
      return;
    }

    resultsDiv.innerHTML = jeux.map(jeu => {
      let badgeClass = 'bg-secondary';
      if (jeu.statut === 'disponible') badgeClass = 'bg-success';
      else if (jeu.statut === 'emprunte') badgeClass = 'bg-warning text-dark';

      return `
        <div class="search-result-item" onclick="selectJeuFromSearch(${jeu.id})">
          <div class="jeu-icon"><i class="bi bi-dice-5"></i></div>
          <div class="info">
            <div class="name">${jeu.titre}</div>
            <div class="details">${jeu.code_barre || 'Pas de code'}</div>
          </div>
          <span class="badge ${badgeClass}">${jeu.statut}</span>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erreur recherche jeux:', error);
    resultsDiv.innerHTML = '<p class="text-danger text-center">Erreur de recherche</p>';
  }
}

async function selectJeuFromSearch(jeuId) {
  // Fermer la modal
  bootstrap.Modal.getInstance(document.getElementById('searchJeuModal')).hide();

  try {
    // Recuperer les details du jeu
    const data = await jeuxAPI.getById(jeuId);
    const jeu = data.jeu;

    if (!jeu) {
      throw new Error('Jeu non trouve');
    }

    // Traiter comme un scan d'article de type jeu
    await handleArticleScan({ type: 'jeu', jeu, code: jeu.code_barre });

  } catch (error) {
    console.error('Erreur selection jeu:', error);
    playSound('error');
    flashZone('error');
    updateStatus('Erreur: ' + error.message, 'error');
  }
}

// ==================== CLEANUP ====================

window.addEventListener('beforeunload', () => {
  if (html5QrCode && isScanning) {
    html5QrCode.stop().catch(() => {});
  }
});
