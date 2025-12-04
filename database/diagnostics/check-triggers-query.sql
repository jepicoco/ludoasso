-- ============================================================
-- Requêtes SQL pour vérifier l'état des event triggers
-- Exécutez ces requêtes dans phpMyAdmin
-- ============================================================

-- 1. Vérifier si le trigger ADHERENT_CREATED existe et son état
SELECT
    id,
    code,
    libelle,
    categorie,
    email_actif AS 'Email actif?',
    sms_actif AS 'SMS actif?',
    template_email_code AS 'Template Email',
    template_sms_code AS 'Template SMS',
    delai_envoi AS 'Délai (min)',
    ordre_affichage
FROM event_triggers
WHERE code = 'ADHERENT_CREATED';

-- 2. Si le résultat ci-dessus est vide, liste TOUS les triggers
SELECT
    id,
    code,
    libelle,
    categorie,
    email_actif,
    sms_actif,
    template_email_code,
    template_sms_code
FROM event_triggers
ORDER BY categorie, ordre_affichage;

-- 3. Vérifier les templates disponibles
SELECT
    id,
    code,
    libelle,
    type_message,
    actif,
    categorie,
    email_objet,
    SUBSTRING(email_corps, 1, 50) AS 'Aperçu email'
FROM templates_messages
WHERE type_message IN ('email', 'both')
ORDER BY categorie, ordre_affichage;

-- 4. Vérifier si le template lié à ADHERENT_CREATED existe
SELECT tm.*
FROM event_triggers et
LEFT JOIN templates_messages tm ON et.template_email_code = tm.code
WHERE et.code = 'ADHERENT_CREATED';
