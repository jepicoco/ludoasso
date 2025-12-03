let allTriggers = [];
let currentCategory = 'all';
let editModal = null;

/**
 * Charge tous les event triggers
 */
async function loadEventTriggers() {
    try {
        showLoading();
        const response = await apiRequest('/event-triggers', 'GET');

        if (response.success) {
            allTriggers = response.data;
            displayEventTriggers();
        } else {
            showError('Erreur lors du chargement des déclencheurs');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion au serveur');
    }
}

/**
 * Charge les statistiques
 */
async function loadStats() {
    try {
        const response = await apiRequest('/event-triggers/stats', 'GET');

        if (response.success) {
            const stats = response.data;
            document.getElementById('stat-total').textContent = stats.total;
            document.getElementById('stat-emails').textContent = stats.emailActifs;
            document.getElementById('stat-sms').textContent = stats.smsActifs;
            document.getElementById('stat-inactifs').textContent = stats.total - stats.emailActifs - stats.smsActifs;
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

/**
 * Affiche les event triggers filtrés
 */
function displayEventTriggers() {
    const tbody = document.getElementById('events-table-body');
    tbody.innerHTML = '';

    // Filtrer par catégorie
    const filtered = currentCategory === 'all'
        ? allTriggers
        : allTriggers.filter(t => t.categorie === currentCategory);

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Aucun déclencheur trouvé</td></tr>';
        hideLoading();
        return;
    }

    filtered.forEach(trigger => {
        const row = createTriggerRow(trigger);
        tbody.appendChild(row);
    });

    hideLoading();
}

/**
 * Crée une ligne pour un event trigger
 */
function createTriggerRow(trigger) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-category', trigger.categorie);

    // Badge de catégorie avec couleur et icône
    const categoryBadge = getCategoryBadge(trigger.categorie, trigger.icone, trigger.couleur);

    // Badge de status email
    const emailBadge = trigger.email_actif
        ? '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Actif</span>'
        : '<span class="badge bg-secondary">Inactif</span>';

    // Badge de status SMS
    const smsBadge = trigger.sms_actif
        ? '<span class="badge bg-info"><i class="bi bi-check-circle"></i> Actif</span>'
        : '<span class="badge bg-secondary">Inactif</span>';

    tr.innerHTML = `
        <td>
            <div class="d-flex align-items-center">
                <i class="bi ${trigger.icone || 'bi-bell'} fs-4 me-2 text-${trigger.couleur || 'primary'}"></i>
                <div>
                    <div class="fw-bold">${trigger.libelle}</div>
                    <small class="text-muted">${trigger.code}</small>
                    ${trigger.description ? `<br><small class="text-muted">${trigger.description}</small>` : ''}
                </div>
            </div>
        </td>
        <td>${categoryBadge}</td>
        <td>
            ${trigger.template_email_code
                ? `<code class="text-success">${trigger.template_email_code}</code>`
                : '<span class="text-muted">-</span>'}
        </td>
        <td>
            ${trigger.template_sms_code
                ? `<code class="text-info">${trigger.template_sms_code}</code>`
                : '<span class="text-muted">-</span>'}
        </td>
        <td class="text-center">
            <button class="btn btn-sm ${trigger.email_actif ? 'btn-success' : 'btn-outline-secondary'}"
                    onclick="toggleEmail(${trigger.id})"
                    title="Activer/Désactiver l'email">
                <i class="bi bi-envelope${trigger.email_actif ? '-fill' : ''}"></i>
            </button>
        </td>
        <td class="text-center">
            <button class="btn btn-sm ${trigger.sms_actif ? 'btn-info' : 'btn-outline-secondary'}"
                    onclick="toggleSMS(${trigger.id})"
                    title="Activer/Désactiver le SMS">
                <i class="bi bi-chat${trigger.sms_actif ? '-fill' : ''}"></i>
            </button>
        </td>
        <td>
            <button class="btn btn-sm btn-outline-primary" onclick="editTrigger(${trigger.id})" title="Modifier">
                <i class="bi bi-pencil"></i>
            </button>
        </td>
    `;

    return tr;
}

/**
 * Retourne le badge de catégorie avec icône
 */
function getCategoryBadge(categorie, icone, couleur) {
    const icons = {
        'adherent': 'bi-person',
        'emprunt': 'bi-box',
        'cotisation': 'bi-credit-card',
        'systeme': 'bi-gear'
    };

    const labels = {
        'adherent': 'Adhérent',
        'emprunt': 'Emprunt',
        'cotisation': 'Cotisation',
        'systeme': 'Système'
    };

    const icon = icons[categorie] || 'bi-tag';
    const label = labels[categorie] || categorie;

    return `<span class="badge bg-${couleur || 'primary'}">
        <i class="bi ${icon}"></i> ${label}
    </span>`;
}

/**
 * Filtre par catégorie
 */
function filterByCategory(category) {
    currentCategory = category;

    // Mettre à jour les boutons actifs
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    displayEventTriggers();
}

/**
 * Active/désactive l'envoi d'email
 */
async function toggleEmail(id) {
    try {
        const response = await apiRequest(`/event-triggers/${id}/toggle-email`, 'POST');

        if (response.success) {
            showToast('Email ' + (response.data.email_actif ? 'activé' : 'désactivé'), 'success');
            await loadEventTriggers();
            await loadStats();
        } else {
            showToast('Erreur lors de la modification', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Active/désactive l'envoi de SMS
 */
async function toggleSMS(id) {
    try {
        const response = await apiRequest(`/event-triggers/${id}/toggle-sms`, 'POST');

        if (response.success) {
            showToast('SMS ' + (response.data.sms_actif ? 'activé' : 'désactivé'), 'success');
            await loadEventTriggers();
            await loadStats();
        } else {
            showToast('Erreur lors de la modification', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Ouvre le modal d'édition
 */
async function editTrigger(id) {
    try {
        const response = await apiRequest(`/event-triggers/${id}`, 'GET');

        if (response.success) {
            const trigger = response.data;

            // Remplir le formulaire
            document.getElementById('edit-id').value = trigger.id;
            document.getElementById('edit-code').value = trigger.code;
            document.getElementById('edit-libelle').value = trigger.libelle;
            document.getElementById('edit-email-actif').checked = trigger.email_actif;
            document.getElementById('edit-sms-actif').checked = trigger.sms_actif;
            document.getElementById('edit-delai').value = trigger.delai_envoi || 0;

            // Charger les templates disponibles
            await loadTemplates();

            // Sélectionner les templates actuels
            if (trigger.template_email_code) {
                document.getElementById('edit-template-email').value = trigger.template_email_code;
            }
            if (trigger.template_sms_code) {
                document.getElementById('edit-template-sms').value = trigger.template_sms_code;
            }

            // Afficher le modal
            if (!editModal) {
                editModal = new bootstrap.Modal(document.getElementById('editModal'));
            }
            editModal.show();
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de chargement', 'error');
    }
}

/**
 * Charge les templates disponibles
 */
async function loadTemplates() {
    try {
        // Templates email
        const emailResponse = await apiRequest('/event-triggers/templates?type=email', 'GET');
        const emailSelect = document.getElementById('edit-template-email');
        emailSelect.innerHTML = '<option value="">Aucun</option>';

        if (emailResponse.success) {
            emailResponse.data.forEach(template => {
                const option = document.createElement('option');
                option.value = template.code;
                option.textContent = `${template.code} - ${template.libelle}`;
                emailSelect.appendChild(option);
            });
        }

        // Templates SMS
        const smsResponse = await apiRequest('/event-triggers/templates?type=sms', 'GET');
        const smsSelect = document.getElementById('edit-template-sms');
        smsSelect.innerHTML = '<option value="">Aucun</option>';

        if (smsResponse.success) {
            smsResponse.data.forEach(template => {
                const option = document.createElement('option');
                option.value = template.code;
                option.textContent = `${template.code} - ${template.libelle}`;
                smsSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur chargement templates:', error);
    }
}

/**
 * Sauvegarde les modifications
 */
async function saveEventTrigger() {
    try {
        const id = document.getElementById('edit-id').value;
        const data = {
            template_email_code: document.getElementById('edit-template-email').value || null,
            template_sms_code: document.getElementById('edit-template-sms').value || null,
            email_actif: document.getElementById('edit-email-actif').checked,
            sms_actif: document.getElementById('edit-sms-actif').checked,
            delai_envoi: parseInt(document.getElementById('edit-delai').value) || 0
        };

        const response = await apiRequest(`/event-triggers/${id}`, 'PUT', data);

        if (response.success) {
            showToast('Déclencheur mis à jour avec succès', 'success');
            editModal.hide();
            await loadEventTriggers();
            await loadStats();
        } else {
            showToast('Erreur lors de la mise à jour', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Actualise les données
 */
async function refreshEventTriggers() {
    await loadEventTriggers();
    await loadStats();
    showToast('Données actualisées', 'success');
}

/**
 * Affiche le chargement
 */
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('events-container').style.display = 'none';
    document.getElementById('error-container').style.display = 'none';
}

/**
 * Cache le chargement
 */
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('events-container').style.display = 'block';
}

/**
 * Affiche une erreur
 */
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('events-container').style.display = 'none';
    document.getElementById('error-container').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

/**
 * Affiche un toast de notification
 */
function showToast(message, type = 'info') {
    // Créer un toast Bootstrap
    const toastContainer = document.getElementById('toast-container') || createToastContainer();

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    // Supprimer après disparition
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

/**
 * Crée le conteneur de toasts
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}
