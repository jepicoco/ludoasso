-- ============================================================
-- Désactiver toutes les configurations email existantes
-- ============================================================

UPDATE configurations_email SET actif = 0;

-- Vérifier les configurations
SELECT id, libelle, smtp_host, smtp_user, actif, par_defaut
FROM configurations_email
ORDER BY id;

-- Si aucune configuration de test n'existe, en créer une simple
-- Décommentez les lignes ci-dessous si nécessaire :

/*
INSERT INTO configurations_email (
    libelle,
    email_expediteur,
    nom_expediteur,
    smtp_host,
    smtp_port,
    smtp_secure,
    smtp_user,
    smtp_password,
    actif,
    par_defaut,
    ordre_affichage,
    icone,
    couleur,
    notes,
    role_minimum,
    created_at,
    updated_at
) VALUES (
    'Test Local (Désactivé)',
    'test@liberteko.local',
    'Liberteko Test',
    'localhost',
    1025,
    0,
    'test',
    'test',
    0,  -- DÉSACTIVÉ pour ne pas bloquer
    1,
    0,
    'bi-envelope-at',
    'warning',
    'Configuration de test locale. Ne pas activer sans serveur SMTP local.',
    'gestionnaire',
    NOW(),
    NOW()
);
*/
