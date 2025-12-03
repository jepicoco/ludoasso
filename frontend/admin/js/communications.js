// Communications Management
let currentTriggers = [];
let allTriggers = [];
let emailTemplates = [];
let smsTemplates = [];
let editTriggerModal = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    editTriggerModal = new bootstrap.Modal(document.getElementById('editTriggerModal'));

    loadStats();
    loadTemplates();
    loadTriggers();
});

// Load statistics
async function loadStats() {
    try {
        const response = await apiRequest('/event-triggers/stats');
        if (response.success) {
            const stats = response.data;
            document.getElementById('stat-total').textContent = stats.total;
            document.getElementById('stat-emails').textContent = stats.emailActifs;
            document.getElementById('stat-sms').textContent = stats.smsActifs;
            document.getElementById('stat-categories').textContent = stats.parCategorie?.length || 0;
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// Load available templates
async function loadTemplates() {
    try {
        // Load email templates
        const emailResponse = await apiRequest('/event-triggers/templates?type=email');
        if (emailResponse.success) {
            emailTemplates = emailResponse.data;
            populateTemplateSelect('templateEmailCode', emailTemplates);
        }

        // Load SMS templates
        const smsResponse = await apiRequest('/event-triggers/templates?type=sms');
        if (smsResponse.success) {
            smsTemplates = smsResponse.data;
            populateTemplateSelect('templateSmsCode', smsTemplates);
        }
    } catch (error) {
        console.error('Erreur chargement templates:', error);
    }
}

// Populate template select
function populateTemplateSelect(selectId, templates) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Aucun</option>';

    templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.code;
        option.textContent = `${template.libelle} (${template.code})`;
        option.dataset.categorie = template.categorie;
        select.appendChild(option);
    });
}

// Load triggers
async function loadTriggers(categorie = '') {
    try {
        const url = categorie ? `/event-triggers?categorie=${categorie}` : '/event-triggers';
        const response = await apiRequest(url);

        if (response.success) {
            allTriggers = response.data;
            currentTriggers = allTriggers;
            displayTriggers(currentTriggers);
        }
    } catch (error) {
        console.error('Erreur chargement déclencheurs:', error);
        showNotification('Erreur lors du chargement des déclencheurs', 'error');
    }
}

// Filter by category
function filterByCategory(categorie) {
    loadTriggers(categorie);
}

// Display triggers in table
function displayTriggers(triggers) {
    const tbody = document.getElementById('triggersTableBody');
    tbody.innerHTML = '';

    if (triggers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox display-4"></i>
                    <p class="mt-3">Aucun déclencheur trouvé</p>
                </td>
            </tr>
        `;
        return;
    }

    triggers.forEach(trigger => {
        const row = createTriggerRow(trigger);
        tbody.appendChild(row);
    });
}

// Create trigger row
function createTriggerRow(trigger) {
    const tr = document.createElement('tr');

    const categorieIcons = {
        adherent: 'person',
        emprunt: 'box',
        cotisation: 'credit-card',
        systeme: 'gear'
    };

    const categorieColors = {
        adherent: 'primary',
        emprunt: 'success',
        cotisation: 'warning',
        systeme: 'secondary'
    };

    tr.innerHTML = `
        <td>
            <i class="bi bi-${trigger.icone || 'bell'} text-${trigger.couleur || 'primary'}"></i>
        </td>
        <td>
            <strong>${trigger.libelle}</strong>
            <br>
            <small class="text-muted">${trigger.code}</small>
            ${trigger.description ? `<br><small class="text-muted fst-italic">${trigger.description}</small>` : ''}
        </td>
        <td>
            <span class="badge bg-${categorieColors[trigger.categorie] || 'secondary'}">
                <i class="bi bi-${categorieIcons[trigger.categorie] || 'folder'} me-1"></i>
                ${trigger.categorie}
            </span>
        </td>
        <td>
            ${trigger.template_email_code ?
                `<span class="badge bg-light text-dark border">
                    <i class="bi bi-envelope me-1"></i>${trigger.template_email_code}
                </span>` :
                '<span class="text-muted">-</span>'
            }
        </td>
        <td>
            ${trigger.template_sms_code ?
                `<span class="badge bg-light text-dark border">
                    <i class="bi bi-chat-dots me-1"></i>${trigger.template_sms_code}
                </span>` :
                '<span class="text-muted">-</span>'
            }
        </td>
        <td class="text-center">
            <div class="form-check form-switch d-inline-block">
                <input class="form-check-input" type="checkbox" ${trigger.email_actif ? 'checked' : ''}
                    onchange="toggleEmail(${trigger.id}, this.checked)">
            </div>
        </td>
        <td class="text-center">
            <div class="form-check form-switch d-inline-block">
                <input class="form-check-input" type="checkbox" ${trigger.sms_actif ? 'checked' : ''}
                    onchange="toggleSMS(${trigger.id}, this.checked)">
            </div>
        </td>
        <td class="text-center">
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="editTrigger(${trigger.id})" title="Modifier">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="deleteTrigger(${trigger.id})" title="Supprimer">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </td>
    `;

    return tr;
}

// Toggle email
async function toggleEmail(triggerId, actif) {
    try {
        const response = await apiRequest(`/event-triggers/${triggerId}/toggle-email`, 'POST');
        if (response.success) {
            showNotification(response.message, 'success');
            loadStats();
        }
    } catch (error) {
        console.error('Erreur toggle email:', error);
        showNotification('Erreur lors de la modification', 'error');
        // Reload to reset checkbox
        loadTriggers();
    }
}

// Toggle SMS
async function toggleSMS(triggerId, actif) {
    try {
        const response = await apiRequest(`/event-triggers/${triggerId}/toggle-sms`, 'POST');
        if (response.success) {
            showNotification(response.message, 'success');
            loadStats();
        }
    } catch (error) {
        console.error('Erreur toggle SMS:', error);
        showNotification('Erreur lors de la modification', 'error');
        // Reload to reset checkbox
        loadTriggers();
    }
}

// Show create trigger modal
function showCreateTriggerModal() {
    document.getElementById('modalTitle').textContent = 'Créer un déclencheur';
    document.getElementById('triggerForm').reset();
    document.getElementById('triggerId').value = '';
    document.getElementById('triggerCode').removeAttribute('readonly');
    editTriggerModal.show();
}

// Edit trigger
async function editTrigger(triggerId) {
    try {
        const response = await apiRequest(`/event-triggers/${triggerId}`);
        if (response.success) {
            const trigger = response.data;

            document.getElementById('modalTitle').textContent = 'Modifier le déclencheur';
            document.getElementById('triggerId').value = trigger.id;
            document.getElementById('triggerCode').value = trigger.code;
            document.getElementById('triggerCode').setAttribute('readonly', true);
            document.getElementById('triggerLibelle').value = trigger.libelle;
            document.getElementById('triggerDescription').value = trigger.description || '';
            document.getElementById('triggerCategorie').value = trigger.categorie;
            document.getElementById('templateEmailCode').value = trigger.template_email_code || '';
            document.getElementById('templateSmsCode').value = trigger.template_sms_code || '';
            document.getElementById('emailActif').checked = trigger.email_actif;
            document.getElementById('smsActif').checked = trigger.sms_actif;
            document.getElementById('delaiEnvoi').value = trigger.delai_envoi || 0;
            document.getElementById('ordreAffichage').value = trigger.ordre_affichage || 0;
            document.getElementById('couleur').value = trigger.couleur || 'primary';

            editTriggerModal.show();
        }
    } catch (error) {
        console.error('Erreur chargement déclencheur:', error);
        showNotification('Erreur lors du chargement', 'error');
    }
}

// Save trigger
async function saveTrigger() {
    const id = document.getElementById('triggerId').value;
    const data = {
        code: document.getElementById('triggerCode').value.toUpperCase(),
        libelle: document.getElementById('triggerLibelle').value,
        description: document.getElementById('triggerDescription').value,
        categorie: document.getElementById('triggerCategorie').value,
        template_email_code: document.getElementById('templateEmailCode').value || null,
        template_sms_code: document.getElementById('templateSmsCode').value || null,
        email_actif: document.getElementById('emailActif').checked,
        sms_actif: document.getElementById('smsActif').checked,
        delai_envoi: parseInt(document.getElementById('delaiEnvoi').value) || 0,
        ordre_affichage: parseInt(document.getElementById('ordreAffichage').value) || 0,
        couleur: document.getElementById('couleur').value
    };

    // Validation
    if (!data.code || !data.libelle || !data.categorie) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    try {
        let response;
        if (id) {
            // Update
            response = await apiRequest(`/event-triggers/${id}`, 'PUT', data);
        } else {
            // Create
            response = await apiRequest('/event-triggers', 'POST', data);
        }

        if (response.success) {
            showNotification(response.message, 'success');
            editTriggerModal.hide();
            loadStats();
            loadTriggers();
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showNotification(error.message || 'Erreur lors de la sauvegarde', 'error');
    }
}

// Delete trigger
async function deleteTrigger(triggerId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce déclencheur ?')) {
        return;
    }

    try {
        const response = await apiRequest(`/event-triggers/${triggerId}`, 'DELETE');
        if (response.success) {
            showNotification('Déclencheur supprimé avec succès', 'success');
            loadStats();
            loadTriggers();
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const alertClass = {
        success: 'alert-success',
        error: 'alert-danger',
        warning: 'alert-warning',
        info: 'alert-info'
    }[type] || 'alert-info';

    const icon = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    }[type] || 'info-circle';

    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="bi bi-${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    const container = document.querySelector('.main-content .container-fluid');
    const existingAlert = container.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    container.insertAdjacentHTML('afterbegin', alertHtml);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}
