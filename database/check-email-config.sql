-- ============================================================
-- Vérifier la configuration email
-- ============================================================

-- 1. Vérifier s'il existe une configuration email active
SELECT
    id,
    libelle AS 'Configuration',
    smtp_host AS 'Serveur SMTP',
    smtp_port AS 'Port',
    smtp_secure AS 'SSL/TLS?',
    smtp_user AS 'Utilisateur',
    email_expediteur AS 'Email expéditeur',
    actif AS 'Active?',
    par_defaut AS 'Par défaut?'
FROM configurations_email
WHERE actif = 1
ORDER BY par_defaut DESC, id DESC
LIMIT 1;

-- 2. Si le résultat ci-dessus est vide, lister TOUTES les configurations
SELECT
    id,
    libelle,
    smtp_host,
    smtp_port,
    actif,
    par_defaut
FROM configurations_email
ORDER BY id DESC;

-- 3. Vérifier les logs d'emails récents
SELECT
    id,
    template_code,
    destinataire,
    objet,
    statut,
    erreur_message,
    date_envoi,
    adherent_id
FROM email_logs
ORDER BY date_envoi DESC
LIMIT 10;
