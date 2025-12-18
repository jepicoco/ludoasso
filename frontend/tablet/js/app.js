/**
 * App - Logique principale de l'application tablette
 */

// Etat de l'application
const state = {
    adultes: 0,
    enfants: 0,
    selectedCommune: null,
    favorites: [],
    config: null
};

// Etat du mode admin
const adminState = {
    isAdmin: false,
    timeout: null,
    timeRemaining: 60,
    timerInterval: null,
    longPressTimer: null,
    longPressDuration: 3000, // 3 secondes
    pinCode: '',
    hasError: false
};

/**
 * Initialise l'application
 */
async function initApp() {
    console.log('[App] Initialisation...');

    // Initialiser IndexedDB
    await Storage.initDB();

    // Verifier si configure
    const configured = await API.initAPI();

    if (!configured) {
        // Rediriger vers setup en conservant les parametres URL (ex: ?q=123)
        const params = window.location.search;
        window.location.href = 'setup.html' + params;
        return;
    }

    // Charger la configuration
    try {
        state.config = await API.getTabletConfig();
        console.log('[App] Config chargee:', state.config);

        // Appliquer le theme
        applyTheme(state.config.questionnaire?.theme);

        // Mettre a jour le header
        updateHeader();

        // Mettre a jour l'etat du formulaire (actif/inactif)
        updateFormState();

        // Si inactif, ne pas charger le reste
        if (state.config.questionnaire?.is_active === false) {
            console.log('[App] Questionnaire inactif - interface limitee');
            initAdminMode(); // Garder le mode admin disponible
            return;
        }

        // Charger les communes favorites
        await loadFavorites();

        // Charger les communes en cache si besoin
        await ensureCommunesLoaded();

        // Initialiser la synchronisation
        Sync.initSync();

        // Afficher le dernier enregistrement
        await showLastRecord();

        // Mettre a jour le badge pending
        await Sync.updatePendingBadge();

        // Ajouter click sur badge pour forcer sync
        const badge = document.querySelector('.pending-badge');
        if (badge) {
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', async () => {
                console.log('[App] Sync manuelle declenchee');
                showMessage('Synchronisation en cours...', 'info');
                await Sync.forceSyncNow();
                const remaining = await Storage.getPendingCount();
                if (remaining === 0) {
                    showMessage('Synchronisation reussie!', 'success');
                } else {
                    showMessage(`${remaining} en attente`, 'warning');
                }
            });
        }

        // Mettre a jour le statut
        Sync.updateConnectionStatus(navigator.onLine);

        // Initialiser le mode admin (long press sur titre)
        initAdminMode();

    } catch (error) {
        console.error('[App] Erreur initialisation:', error);
        showMessage('Erreur de connexion au serveur', 'error');

        // Essayer d'utiliser le cache local
        await loadFromCache();
    }
}

/**
 * Applique le theme CSS
 * @param {string} theme - Nom du theme (default, theme-dark, etc.)
 */
function applyTheme(theme) {
    const themeName = theme || 'default';
    const stylesheet = document.getElementById('theme-stylesheet');
    if (stylesheet) {
        const cssFile = themeName === 'default' ? 'default.css' : `${themeName}.css`;
        stylesheet.href = `css/${cssFile}`;
        console.log('[App] Theme applique:', themeName);
    }
}

/**
 * Charge les donnees depuis le cache local
 */
async function loadFromCache() {
    // Charger les favorites depuis le cache
    const cachedFavorites = await Storage.getConfig('favorites');
    if (cachedFavorites) {
        state.favorites = cachedFavorites;
        renderFavorites();
    }

    // Charger la config depuis le cache
    const cachedConfig = await Storage.getConfig('tabletConfig');
    if (cachedConfig) {
        state.config = cachedConfig;
        applyTheme(cachedConfig.questionnaire?.theme);
        updateHeader();
    }
}

/**
 * Met a jour le header avec les infos de configuration
 */
function updateHeader() {
    const siteLabel = document.getElementById('siteLabel');
    if (siteLabel && state.config) {
        siteLabel.textContent = state.config.site?.nom || 'Site non defini';
    }
}

/**
 * Met a jour l'affichage selon l'etat actif/inactif du questionnaire
 */
function updateFormState() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const inactiveContainer = document.getElementById('inactiveContainer');
    const inactiveMessage = document.getElementById('inactiveMessage');
    const appContainer = document.getElementById('appContainer');

    if (!state.config || !state.config.questionnaire) {
        return;
    }

    const questionnaire = state.config.questionnaire;
    const isActive = questionnaire.is_active !== false; // Par defaut actif si non specifie

    if (isActive) {
        // Formulaire actif
        document.body.classList.remove('form-inactive');

        // Afficher le message d'accueil si defini
        if (questionnaire.message_actif && welcomeMessage) {
            welcomeMessage.textContent = questionnaire.message_actif;
            welcomeMessage.classList.add('visible');
        } else if (welcomeMessage) {
            welcomeMessage.classList.remove('visible');
        }

        // Cacher le conteneur inactif
        if (inactiveContainer) {
            inactiveContainer.classList.remove('visible');
        }

        // Afficher le formulaire
        if (appContainer) {
            appContainer.style.display = '';
        }

    } else {
        // Formulaire inactif
        document.body.classList.add('form-inactive');

        // Cacher le message d'accueil
        if (welcomeMessage) {
            welcomeMessage.classList.remove('visible');
        }

        // Afficher le message d'indisponibilite
        if (inactiveContainer) {
            inactiveContainer.classList.add('visible');
        }

        if (inactiveMessage && questionnaire.message_inactif) {
            inactiveMessage.textContent = questionnaire.message_inactif;
        }

        // Cacher le formulaire
        if (appContainer) {
            appContainer.style.display = 'none';
        }
    }

    console.log('[App] Etat formulaire:', isActive ? 'actif' : 'inactif');
}

/**
 * Charge les communes favorites
 */
async function loadFavorites() {
    try {
        const config = await API.getTabletConfig();
        state.favorites = config.communes_favorites || [];

        // Sauvegarder en cache
        await Storage.setConfig('favorites', state.favorites);
        await Storage.setConfig('tabletConfig', config);

        renderFavorites();
    } catch (error) {
        console.error('[App] Erreur chargement favorites:', error);
    }
}

/**
 * Assure que les communes sont chargees en cache
 */
async function ensureCommunesLoaded() {
    const communesCount = await Storage.getConfig('communesCount');

    // Charger si jamais fait ou si vieux de plus de 7 jours
    const lastLoad = await Storage.getConfig('communesLastLoad');
    const needsRefresh = !lastLoad || (Date.now() - lastLoad > 7 * 24 * 60 * 60 * 1000);

    if (!communesCount || needsRefresh) {
        try {
            console.log('[App] Chargement des communes...');
            const communes = await API.getAllCommunes();
            await Storage.saveCommunes(communes);
            await Storage.setConfig('communesCount', communes.length);
            await Storage.setConfig('communesLastLoad', Date.now());
            console.log(`[App] ${communes.length} communes chargees`);
        } catch (error) {
            console.error('[App] Erreur chargement communes:', error);
        }
    }
}

/**
 * Affiche les communes favorites
 */
function renderFavorites() {
    const grid = document.getElementById('communesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Afficher les favorites (max 8)
    const displayFavorites = state.favorites.slice(0, 8);

    displayFavorites.forEach(commune => {
        const btn = document.createElement('button');
        btn.className = 'commune-btn';
        btn.textContent = commune.nom;
        btn.dataset.communeId = commune.id;
        btn.dataset.communeNom = commune.nom;

        if (state.selectedCommune && state.selectedCommune.id === commune.id) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', () => selectCommune(commune));
        grid.appendChild(btn);
    });

    // Ajouter le bouton "Autre"
    const autreBtn = document.createElement('button');
    autreBtn.className = 'commune-btn autre';
    autreBtn.innerHTML = 'AUTRE &#9660;';
    autreBtn.addEventListener('click', openCommuneModal);
    grid.appendChild(autreBtn);
}

/**
 * Selectionne une commune
 */
function selectCommune(commune) {
    state.selectedCommune = commune;

    // Mettre a jour les boutons
    document.querySelectorAll('.commune-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.communeId == commune.id);
    });

    // Mettre a jour l'affichage de la selection
    updateCommuneSelection();
}

/**
 * Met a jour l'affichage de la commune selectionnee
 */
function updateCommuneSelection() {
    const container = document.getElementById('communeSelection');
    if (!container) return;

    if (state.selectedCommune) {
        container.innerHTML = `
            <div class="commune-selection-icon">&#10003;</div>
            <div class="commune-selection-text">${state.selectedCommune.nom}</div>
            <button class="commune-selection-clear" onclick="clearCommuneSelection()">&times;</button>
        `;
    } else {
        container.innerHTML = `
            <div class="commune-selection-icon empty">?</div>
            <div class="commune-selection-text">Aucune commune selectionnee</div>
        `;
    }
}

/**
 * Efface la selection de commune
 */
function clearCommuneSelection() {
    state.selectedCommune = null;
    document.querySelectorAll('.commune-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    updateCommuneSelection();
}

/**
 * Incremente un compteur
 */
function incrementCounter(type) {
    if (type === 'adultes') {
        state.adultes++;
    } else if (type === 'enfants') {
        state.enfants++;
    }
    updateCounters();
}

/**
 * Decremente un compteur
 */
function decrementCounter(type) {
    if (type === 'adultes' && state.adultes > 0) {
        state.adultes--;
    } else if (type === 'enfants' && state.enfants > 0) {
        state.enfants--;
    }
    updateCounters();
}

/**
 * Met a jour l'affichage des compteurs
 */
function updateCounters() {
    document.getElementById('adultesCount').textContent = state.adultes;
    document.getElementById('enfantsCount').textContent = state.enfants;
    document.getElementById('totalCount').textContent = state.adultes + state.enfants;

    // Activer/desactiver le bouton valider
    const validateBtn = document.getElementById('validateBtn');
    if (validateBtn) {
        validateBtn.disabled = (state.adultes + state.enfants) === 0;
    }
}

/**
 * Retourne l'horodatage a utiliser pour l'enregistrement
 * En mode admin, permet de forcer une date/heure specifique
 */
function getRecordTimestamp() {
    const forcedInput = document.getElementById('forcedDateTime');
    const forcedValue = forcedInput?.value;

    // Si mode admin ET champ rempli, utiliser la date forcee
    if (forcedValue && adminState.isAdmin) {
        console.log('[Admin] Horodatage force:', forcedValue);
        return new Date(forcedValue).toISOString();
    }

    // Sinon, date/heure actuelle
    return new Date().toISOString();
}

/**
 * Valide l'enregistrement
 */
async function validateRecord() {
    const total = state.adultes + state.enfants;

    if (total === 0) {
        showMessage('Veuillez indiquer au moins un visiteur', 'warning');
        return;
    }

    // Creer l'enregistrement
    const record = {
        questionnaire_id: state.config?.questionnaire?.id || API.getQuestionnaireId(),
        site_id: state.config?.site?.id || null,
        commune_id: state.selectedCommune?.id || null,
        commune_nom: state.selectedCommune?.nom || null,
        nb_adultes: state.adultes,
        nb_enfants: state.enfants,
        horodatage: getRecordTimestamp()
    };

    try {
        // Sauvegarder localement
        const savedRecord = await Storage.addPendingRecord(record);

        // Afficher confirmation
        showLastRecordConfirmation(savedRecord);

        // Reset
        resetForm();

        // Tenter une sync immediate
        if (navigator.onLine) {
            setTimeout(() => Sync.doSync(), 500);
        }

        // Mettre a jour le badge
        await Sync.updatePendingBadge();

    } catch (error) {
        console.error('[App] Erreur sauvegarde:', error);
        showMessage('Erreur lors de l\'enregistrement', 'error');
    }
}

/**
 * Reset le formulaire
 */
function resetForm() {
    state.adultes = 0;
    state.enfants = 0;
    state.selectedCommune = null;

    updateCounters();
    renderFavorites();
    updateCommuneSelection();

    // Reset du champ date/heure forcee (mode admin)
    const forcedDT = document.getElementById('forcedDateTime');
    if (forcedDT) forcedDT.value = '';
}

/**
 * Affiche la confirmation du dernier enregistrement
 */
function showLastRecordConfirmation(record) {
    const container = document.getElementById('lastRecord');
    if (!container) return;

    const time = new Date(record.horodatage).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const details = [];
    if (record.nb_adultes > 0) {
        details.push(`${record.nb_adultes} adulte${record.nb_adultes > 1 ? 's' : ''}`);
    }
    if (record.nb_enfants > 0) {
        details.push(`${record.nb_enfants} enfant${record.nb_enfants > 1 ? 's' : ''}`);
    }

    container.innerHTML = `
        <div class="last-record">
            <div class="last-record-icon">&#10003;</div>
            <div class="last-record-text">
                ${time} - ${details.join(', ')}
                ${record.commune_nom ? ` (${record.commune_nom})` : ''}
            </div>
        </div>
    `;

    // Masquer apres 10 secondes
    setTimeout(() => {
        container.innerHTML = '';
    }, 10000);
}

/**
 * Affiche le dernier enregistrement au demarrage
 */
async function showLastRecord() {
    const last = await Storage.getLastHistoryRecord();
    if (last) {
        showLastRecordConfirmation(last);
    }
}

/**
 * Ouvre la modal de recherche de commune
 */
function openCommuneModal() {
    const modal = document.getElementById('communeModal');
    if (modal) {
        modal.classList.add('show');
        document.getElementById('communeSearch').focus();
    }
}

/**
 * Ferme la modal de recherche de commune
 */
function closeCommuneModal() {
    const modal = document.getElementById('communeModal');
    if (modal) {
        modal.classList.remove('show');
        document.getElementById('communeSearch').value = '';
        document.getElementById('communeResults').innerHTML = '';
    }
}

/**
 * Recherche des communes
 */
async function searchCommunes() {
    const query = document.getElementById('communeSearch').value.trim();

    if (query.length < 2) {
        document.getElementById('communeResults').innerHTML = '';
        return;
    }

    try {
        // Rechercher d'abord localement
        let results = await Storage.searchCommunesLocal(query);

        // Si online et peu de resultats, chercher aussi via API
        if (navigator.onLine && results.length < 5) {
            try {
                const apiResults = await API.searchCommunes(query);
                // Merger les resultats
                const existingIds = new Set(results.map(r => r.id));
                apiResults.forEach(r => {
                    if (!existingIds.has(r.id)) {
                        results.push(r);
                    }
                });
            } catch (e) {
                console.log('[App] Recherche API echouee, utilisation cache local');
            }
        }

        renderCommuneResults(results);
    } catch (error) {
        console.error('[App] Erreur recherche:', error);
    }
}

/**
 * Affiche les resultats de recherche
 */
function renderCommuneResults(communes) {
    const container = document.getElementById('communeResults');
    if (!container) return;

    if (communes.length === 0) {
        container.innerHTML = '<div class="commune-list-item">Aucun resultat</div>';
        return;
    }

    container.innerHTML = communes.map(commune => `
        <div class="commune-list-item" onclick="selectCommuneFromSearch(${commune.id}, '${commune.nom.replace(/'/g, "\\'")}')">
            <div class="commune-list-item-name">${commune.nom}</div>
            <div class="commune-list-item-info">${commune.code_postal || ''} - ${commune.departement || ''}</div>
        </div>
    `).join('');
}

/**
 * Selectionne une commune depuis la recherche
 */
function selectCommuneFromSearch(id, nom) {
    selectCommune({ id, nom });
    closeCommuneModal();
}

/**
 * Affiche un message
 */
function showMessage(text, type = 'info') {
    // Supprimer les anciens messages
    document.querySelectorAll('.message').forEach(m => m.remove());

    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;

    const container = document.querySelector('.app-container');
    if (container) {
        container.insertBefore(message, container.firstChild);

        setTimeout(() => message.remove(), 3000);
    }
}

/**
 * Ouvre les parametres
 */
function openSettings() {
    if (confirm('Voulez-vous reconfigurer cette tablette ?')) {
        Storage.clearAllData().then(() => {
            window.location.href = 'setup.html';
        });
    }
}

// =====================================
// MODE ADMIN & PIN PROTECTION
// =====================================

/**
 * Initialise le mode admin (detection appui long sur titre)
 */
function initAdminMode() {
    const trigger = document.getElementById('siteLabel');
    if (!trigger) return;

    // Touch events pour mobile
    trigger.addEventListener('touchstart', startLongPress, { passive: true });
    trigger.addEventListener('touchend', cancelLongPress);
    trigger.addEventListener('touchcancel', cancelLongPress);
    trigger.addEventListener('touchmove', cancelLongPress);

    // Mouse events pour desktop
    trigger.addEventListener('mousedown', startLongPress);
    trigger.addEventListener('mouseup', cancelLongPress);
    trigger.addEventListener('mouseleave', cancelLongPress);

    console.log('[Admin] Mode admin initialise');
}

/**
 * Demarre le timer d'appui long
 */
function startLongPress(e) {
    if (adminState.isAdmin) return; // Deja en mode admin

    const trigger = document.getElementById('siteLabel');
    trigger.classList.add('pressing');

    adminState.longPressTimer = setTimeout(() => {
        trigger.classList.remove('pressing');
        showPinModal();
    }, adminState.longPressDuration);
}

/**
 * Annule le timer d'appui long
 */
function cancelLongPress() {
    const trigger = document.getElementById('siteLabel');
    if (trigger) trigger.classList.remove('pressing');

    if (adminState.longPressTimer) {
        clearTimeout(adminState.longPressTimer);
        adminState.longPressTimer = null;
    }
}

/**
 * Affiche la modal PIN
 */
function showPinModal() {
    adminState.pinCode = '';
    updatePinDisplay();

    const modal = document.getElementById('pinModal');
    if (modal) {
        modal.classList.add('show');
    }
}

/**
 * Ferme la modal PIN
 */
function hidePinModal() {
    const modal = document.getElementById('pinModal');
    if (modal) {
        modal.classList.remove('show');
    }
    adminState.pinCode = '';
    updatePinDisplay();
}

/**
 * Gere l'appui sur une touche du clavier PIN
 */
function pinKeyPress(digit) {
    if (adminState.pinCode.length >= 4) return;

    adminState.pinCode += digit;
    updatePinDisplay();

    // Auto-validation si 4 chiffres
    if (adminState.pinCode.length === 4) {
        setTimeout(() => pinValidate(), 100);
    }
}

/**
 * Efface le code PIN
 */
function pinClear() {
    adminState.pinCode = '';
    updatePinDisplay();

    // Retirer l'effet d'erreur
    const display = document.getElementById('pinDisplay');
    if (display) display.classList.remove('error');
}

/**
 * Met a jour l'affichage du PIN
 */
function updatePinDisplay() {
    const display = document.getElementById('pinDisplay');
    const validateBtn = document.getElementById('pinValidateBtn');

    if (display) {
        const masked = adminState.pinCode.replace(/./g, '*').padEnd(4, '_');
        display.textContent = masked;
    }

    if (validateBtn) {
        validateBtn.disabled = adminState.pinCode.length !== 4;
    }
}

/**
 * Valide le code PIN
 */
function pinValidate() {
    const correctPin = state.config?.questionnaire?.code_pin || '0000';

    if (adminState.pinCode === correctPin) {
        hidePinModal();
        enterAdminMode();
    } else {
        // Afficher erreur
        const display = document.getElementById('pinDisplay');
        if (display) {
            display.classList.add('error');
        }

        // Vibrer si supporte
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // Reset apres animation
        setTimeout(() => {
            pinClear();
        }, 500);
    }
}

/**
 * Entre en mode admin
 */
function enterAdminMode() {
    adminState.isAdmin = true;
    adminState.timeRemaining = 60;

    document.body.classList.add('admin-mode');

    // Demarrer le timer
    updateAdminTimer();
    adminState.timerInterval = setInterval(() => {
        adminState.timeRemaining--;
        updateAdminTimer();

        if (adminState.timeRemaining <= 0) {
            exitAdminMode();
        }
    }, 1000);

    console.log('[Admin] Mode admin active');
}

/**
 * Sort du mode admin
 */
function exitAdminMode() {
    adminState.isAdmin = false;

    if (adminState.timerInterval) {
        clearInterval(adminState.timerInterval);
        adminState.timerInterval = null;
    }

    document.body.classList.remove('admin-mode');

    console.log('[Admin] Mode admin desactive');
}

/**
 * Met a jour l'affichage du timer admin
 */
function updateAdminTimer() {
    const timer = document.querySelector('.admin-timer');
    if (timer) {
        timer.textContent = `Admin: ${adminState.timeRemaining}s`;
    }
}

/**
 * Met a jour le badge d'erreur
 */
function updateErrorBadge(hasError) {
    adminState.hasError = hasError;
    const badge = document.getElementById('errorBadge');
    if (badge) {
        badge.classList.toggle('visible', hasError);
    }
}

/**
 * Affiche une erreur (appelable depuis sync.js)
 */
function showSyncError() {
    updateErrorBadge(true);
}

/**
 * Masque l'erreur (appelable depuis sync.js)
 */
function hideSyncError() {
    updateErrorBadge(false);
}

// Exposer les fonctions globalement
window.incrementCounter = incrementCounter;
window.decrementCounter = decrementCounter;
window.validateRecord = validateRecord;
window.clearCommuneSelection = clearCommuneSelection;
window.openCommuneModal = openCommuneModal;
window.closeCommuneModal = closeCommuneModal;
window.searchCommunes = searchCommunes;
window.selectCommuneFromSearch = selectCommuneFromSearch;
window.openSettings = openSettings;

// Fonctions admin/PIN
window.pinKeyPress = pinKeyPress;
window.pinClear = pinClear;
window.pinValidate = pinValidate;
window.exitAdminMode = exitAdminMode;
window.showSyncError = showSyncError;
window.hideSyncError = hideSyncError;

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', initApp);
