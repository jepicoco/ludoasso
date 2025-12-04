-- Désactiver TOUTES les configurations email
-- Exécutez ceci dans phpMyAdmin pour débloquer le serveur

UPDATE configurations_email SET actif = 0;

-- Vérifier le résultat
SELECT
    id,
    libelle,
    smtp_host,
    smtp_port,
    smtp_user,
    actif,
    par_defaut
FROM configurations_email
ORDER BY id;
