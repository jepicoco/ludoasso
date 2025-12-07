// ============================================
// Logique du formulaire usager amélioré
// ============================================

// Rôles qui peuvent avoir des restrictions de modules
const ROLES_AVEC_MODULES = ['agent', 'benevole', 'gestionnaire', 'comptable'];

/**
 * Affiche ou masque la section des modules selon le rôle sélectionné
 */
function toggleModulesSection() {
  const role = document.getElementById('role').value;
  const modulesSection = document.getElementById('modulesSection');

  if (ROLES_AVEC_MODULES.includes(role)) {
    modulesSection.style.display = 'block';
  } else {
    modulesSection.style.display = 'none';
    // Décocher toutes les cases si on cache la section
    document.querySelectorAll('#modulesSection input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
  }
}

/**
 * Récupère les modules autorisés sélectionnés
 * @returns {Array|null} - Tableau des modules ou null si aucun sélectionné
 */
function getSelectedModules() {
  const role = document.getElementById('role').value;

  // Administrateur n'a pas de restriction de modules
  if (role === 'administrateur') {
    return null;
  }

  // Usager n'a pas besoin de modules
  if (role === 'usager') {
    return null;
  }

  const modules = [];
  document.querySelectorAll('#modulesSection input[type="checkbox"]:checked').forEach(cb => {
    modules.push(cb.value);
  });

  // Si aucun module sélectionné, retourner null (accès à tous)
  return modules.length > 0 ? modules : null;
}

/**
 * Définit les modules autorisés dans le formulaire
 * @param {Array|null} modules - Tableau des modules ou null
 */
function setSelectedModules(modules) {
  // D'abord décocher tous
  document.querySelectorAll('#modulesSection input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  // Si modules est un tableau non vide, cocher les bons
  if (modules && Array.isArray(modules) && modules.length > 0) {
    modules.forEach(mod => {
      const checkbox = document.getElementById(`module_${mod}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }
}

/**
 * Recherche et charge un usager depuis l'API externe
 */
async function rechercherEtChargerAdherent() {
  const numero = document.getElementById('numeroAdherentExterne').value.trim();

  if (!numero) {
    showToast('Veuillez entrer un numéro d\'usager', 'warning');
    return;
  }

  const btn = document.getElementById('btnRechercheExterne');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Recherche...';

  try {
    const adherent = await rechercherAdherentExterne(numero);

    if (adherent) {
      // Pré-remplir le formulaire
      document.getElementById('nom').value = adherent.nom || '';
      document.getElementById('prenom').value = adherent.prenom || '';
      document.getElementById('email').value = adherent.email || '';
      document.getElementById('telephone').value = adherent.telephone || '';
      document.getElementById('adresse').value = adherent.adresse || '';
      document.getElementById('code_postal').value = adherent.code_postal || '';
      document.getElementById('ville').value = adherent.ville || '';
      document.getElementById('date_naissance').value = adherent.date_naissance || '';

      if (adherent.photo_url) {
        document.getElementById('photo_url').value = adherent.photo_url;
        updatePhotoPreview();
      }

      if (adherent.adhesion_association !== undefined) {
        document.getElementById('adhesion_association').checked = adherent.adhesion_association;
      }

      // Déclencher les validations
      document.getElementById('email').dispatchEvent(new Event('blur'));
      document.getElementById('telephone').dispatchEvent(new Event('input'));

      // Calculer l'âge si date de naissance
      if (adherent.date_naissance) {
        updateAgeDisplay();
      }

      showToast('Usager trouve et formulaire pre-rempli', 'success');
    } else {
      showToast('Aucun usager trouve avec ce numero', 'warning');
    }
  } catch (error) {
    console.error('Erreur recherche usager:', error);
    showToast('Erreur lors de la recherche', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

/**
 * Initialise les validations en temps réel
 */
function initFormValidation() {
  // Validation email
  const emailInput = document.getElementById('email');
  emailInput.addEventListener('blur', async () => {
    const email = emailInput.value.trim();
    if (!email) return;

    if (!validateEmail(email)) {
      showFieldValidation('email', false, 'Format email invalide');
      return;
    }

    // Vérifier unicité (optionnel - peut être fait côté serveur)
    showFieldValidation('email', true, 'Email valide');
  });

  emailInput.addEventListener('input', () => {
    showFieldValidation('email', null); // Reset pendant la saisie
  });

  // Validation et formatage téléphone
  setupPhoneFormatting('telephone');

  // Validation mot de passe avec indicateur de force
  const passwordInput = document.getElementById('password');
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);

    const bar = document.getElementById('passwordStrength');
    const label = document.getElementById('passwordStrengthLabel');

    bar.className = 'progress-bar ' + strength.class;
    bar.style.width = (strength.score * 25) + '%';
    label.textContent = 'Force: ' + strength.label;

    if (password && strength.score < 2) {
      showFieldValidation('password', false, 'Mot de passe trop faible');
    } else if (password) {
      showFieldValidation('password', true);
    }
  });

  // Calcul âge automatique
  const dateNaissanceInput = document.getElementById('date_naissance');
  dateNaissanceInput.addEventListener('change', updateAgeDisplay);

  // Prévisualisation photo
  const photoUrlInput = document.getElementById('photo_url');
  photoUrlInput.addEventListener('input', updatePhotoPreview);
  photoUrlInput.addEventListener('change', updatePhotoPreview);
}

/**
 * Met à jour l'affichage de l'âge
 */
function updateAgeDisplay() {
  const dateNaissance = document.getElementById('date_naissance').value;
  const ageDisplay = document.getElementById('ageDisplay');

  if (dateNaissance) {
    const age = calculateAge(dateNaissance);
    if (age !== null) {
      ageDisplay.textContent = `${age} ans`;
      ageDisplay.className = 'text-muted';

      if (age < 18) {
        ageDisplay.textContent += ' (mineur)';
        ageDisplay.className = 'text-warning';
      }
    }
  } else {
    ageDisplay.textContent = '';
  }
}

/**
 * Met à jour la prévisualisation de la photo
 */
function updatePhotoPreview() {
  const photoUrl = document.getElementById('photo_url').value.trim();
  const preview = document.getElementById('photoPreview');
  const previewImg = document.getElementById('photoPreviewImg');

  if (photoUrl) {
    previewImg.src = photoUrl;
    previewImg.onerror = () => {
      preview.style.display = 'none';
      showFieldValidation('photo_url', false, 'URL de photo invalide');
    };
    previewImg.onload = () => {
      preview.style.display = 'block';
      showFieldValidation('photo_url', true);
    };
  } else {
    preview.style.display = 'none';
  }
}

/**
 * Ouvre le modal de création avec réinitialisation
 */
function openCreateModal() {
  document.getElementById('modalTitle').textContent = 'Nouvel usager';
  document.getElementById('adherentForm').reset();
  document.getElementById('adherentId').value = '';

  // Afficher la recherche externe et le mot de passe
  document.getElementById('searchExternalCard').style.display = 'block';
  document.getElementById('passwordGroup').style.display = 'block';
  document.getElementById('password').required = true;

  // Réinitialiser validations
  document.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
    el.classList.remove('is-valid', 'is-invalid');
  });
  document.querySelectorAll('.valid-feedback, .invalid-feedback').forEach(el => {
    el.remove();
  });

  // Réinitialiser indicateur mot de passe
  document.getElementById('passwordStrength').style.width = '0%';
  document.getElementById('passwordStrengthLabel').textContent = '';

  // Cacher prévisualisation photo
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('ageDisplay').textContent = '';

  // Date d'adhésion par défaut = aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date_adhesion').value = today;

  // Réinitialiser les modules et masquer la section
  setSelectedModules(null);
  toggleModulesSection();

  // Revenir au premier onglet
  const firstTab = new bootstrap.Tab(document.getElementById('tab-infos-btn'));
  firstTab.show();

  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(document.getElementById('adherentModal'));
  }
  modalInstance.show();
}

/**
 * Charge les données d'un usager pour édition
 */
async function editAdherent(id) {
  try {
    const data = await adherentsAPI.getById(id);
    const adherent = data.adherent;

    document.getElementById('modalTitle').textContent = 'Modifier l\'usager';
    document.getElementById('adherentId').value = adherent.id;

    // Masquer recherche externe en mode édition
    document.getElementById('searchExternalCard').style.display = 'none';

    // Remplir les champs
    document.getElementById('nom').value = adherent.nom || '';
    document.getElementById('prenom').value = adherent.prenom || '';
    document.getElementById('email').value = adherent.email || '';
    document.getElementById('telephone').value = adherent.telephone || '';
    document.getElementById('adresse').value = adherent.adresse || '';
    document.getElementById('ville').value = adherent.ville || '';
    document.getElementById('code_postal').value = adherent.code_postal || '';
    document.getElementById('date_naissance').value = adherent.date_naissance || '';
    document.getElementById('statut').value = adherent.statut || 'actif';
    document.getElementById('role').value = adherent.role || 'usager';
    document.getElementById('notes').value = adherent.notes || '';

    // Champs supplémentaires
    document.getElementById('photo_url').value = adherent.photo || '';
    document.getElementById('adhesion_association').checked = adherent.adhesion_association || false;
    document.getElementById('date_adhesion').value = adherent.date_adhesion || '';
    document.getElementById('date_fin_adhesion').value = adherent.date_fin_adhesion || '';

    // Charger les modules autorisés
    setSelectedModules(adherent.modules_autorises);
    toggleModulesSection();

    // Mot de passe optionnel en édition
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').required = false;
    document.getElementById('password').value = '';
    document.getElementById('password').placeholder = 'Laisser vide pour ne pas changer';

    // Déclencher mises à jour
    if (adherent.date_naissance) {
      updateAgeDisplay();
    }
    if (adherent.photo) {
      updatePhotoPreview();
    }
    if (adherent.telephone) {
      document.getElementById('telephone').dispatchEvent(new Event('input'));
    }

    // Revenir au premier onglet
    const firstTab = new bootstrap.Tab(document.getElementById('tab-infos-btn'));
    firstTab.show();

    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(document.getElementById('adherentModal'));
    }
    modalInstance.show();
  } catch (error) {
    console.error('Erreur chargement usager:', error);
    showToast('Erreur lors du chargement de l\'usager: ' + error.message, 'error');
  }
}

/**
 * Soumet le formulaire (création ou modification)
 */
async function submitAdherentForm(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Enregistrement...';

  try {
    const id = document.getElementById('adherentId').value;
    const formData = {
      nom: document.getElementById('nom').value,
      prenom: document.getElementById('prenom').value,
      email: document.getElementById('email').value,
      telephone: document.getElementById('telephone').value || null,
      adresse: document.getElementById('adresse').value || null,
      ville: document.getElementById('ville').value || null,
      code_postal: document.getElementById('code_postal').value || null,
      date_naissance: document.getElementById('date_naissance').value || null,
      statut: document.getElementById('statut').value,
      role: document.getElementById('role').value,
      notes: document.getElementById('notes').value || null,
      photo: document.getElementById('photo_url').value || null,
      adhesion_association: document.getElementById('adhesion_association').checked,
      date_adhesion: document.getElementById('date_adhesion').value || null,
      date_fin_adhesion: document.getElementById('date_fin_adhesion').value || null,
      modules_autorises: getSelectedModules()
    };

    // Mot de passe uniquement si renseigné
    const password = document.getElementById('password').value;
    if (password) {
      formData.password = password;
    }

    if (!id) {
      // Création
      if (!formData.password) {
        showToast('Le mot de passe est requis pour un nouvel usager', 'error');
        return;
      }
      await adherentsAPI.create(formData);
      showToast('Usager cree avec succes !', 'success');
    } else {
      // Modification
      await adherentsAPI.update(id, formData);
      showToast('Usager modifie avec succes !', 'success');
    }

    closeModal();
    loadAdherents();
  } catch (error) {
    console.error('Erreur sauvegarde usager:', error);
    showToast('Erreur: ' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-save"></i> Enregistrer';
  }
}

/**
 * Initialisation du formulaire
 */
function initAdherentForm() {
  // Événements validation
  initFormValidation();

  // Générateur mot de passe
  setupPasswordGenerator('password', 'generatePassword');

  // Toggle affichage mot de passe
  setupPasswordToggle('password', 'togglePassword');

  // Soumission formulaire
  document.getElementById('adherentForm').addEventListener('submit', submitAdherentForm);

  // Touche Entrée sur le champ de recherche externe
  document.getElementById('numeroAdherentExterne')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      rechercherEtChargerAdherent();
    }
  });
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  initAdherentForm();
});
