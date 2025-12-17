#!/bin/bash
#
# Liberteko - Script de configuration .env
# Usage: bash scripts/setup-env.sh
#

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       Liberteko - Configuration de l'environnement${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Vérifier si .env existe déjà
if [ -f .env ]; then
    echo -e "${YELLOW}⚠ Un fichier .env existe déjà.${NC}"
    read -p "Voulez-vous le remplacer ? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        echo -e "${RED}Annulé.${NC}"
        exit 1
    fi
    # Backup
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Backup créé${NC}"
fi

# ============================================
# Base de données
# ============================================
echo ""
echo -e "${BOLD}┌─────────────────────────────────────────┐${NC}"
echo -e "${BOLD}│  1/3 - Configuration Base de Données   │${NC}"
echo -e "${BOLD}└─────────────────────────────────────────┘${NC}"
echo ""

read -p "Host MySQL [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Port MySQL [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "Nom de la base de données [liberteko]: " DB_NAME
DB_NAME=${DB_NAME:-liberteko}

read -p "Utilisateur MySQL [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Mot de passe MySQL: " DB_PASSWORD
echo ""

# ============================================
# Sécurité - Génération des tokens
# ============================================
echo ""
echo -e "${BOLD}┌─────────────────────────────────────────┐${NC}"
echo -e "${BOLD}│  2/3 - Génération des Tokens Sécurité  │${NC}"
echo -e "${BOLD}└─────────────────────────────────────────┘${NC}"
echo ""

# Générer les secrets
if command -v node &> /dev/null; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    EMAIL_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
else
    # Fallback avec openssl
    JWT_SECRET=$(openssl rand -hex 32)
    EMAIL_KEY=$(openssl rand -hex 32)
fi

echo -e "${GREEN}✓ Tokens générés avec succès${NC}"
echo ""
echo -e "  JWT_SECRET:"
echo -e "  ${CYAN}${JWT_SECRET}${NC}"
echo ""
echo -e "  EMAIL_ENCRYPTION_KEY:"
echo -e "  ${CYAN}${EMAIL_KEY}${NC}"
echo ""
echo -e "${YELLOW}→ Conservez ces tokens en lieu sûr !${NC}"

# ============================================
# Informations de la structure
# ============================================
echo ""
echo -e "${BOLD}┌─────────────────────────────────────────┐${NC}"
echo -e "${BOLD}│  3/3 - Informations de la Structure    │${NC}"
echo -e "${BOLD}└─────────────────────────────────────────┘${NC}"
echo ""

read -p "Nom de la structure [Ma Ludothèque]: " STRUCTURE_NOM
STRUCTURE_NOM=${STRUCTURE_NOM:-Ma Ludothèque}

read -p "Adresse: " STRUCTURE_ADRESSE
STRUCTURE_ADRESSE=${STRUCTURE_ADRESSE:-}

read -p "Email de contact: " STRUCTURE_EMAIL
STRUCTURE_EMAIL=${STRUCTURE_EMAIL:-}

read -p "Téléphone: " STRUCTURE_TELEPHONE
STRUCTURE_TELEPHONE=${STRUCTURE_TELEPHONE:-}

read -p "URL de l'application [https://example.com]: " APP_URL
APP_URL=${APP_URL:-https://example.com}

# ============================================
# Création du fichier .env
# ============================================
echo ""
echo -e "${BOLD}Création du fichier .env...${NC}"

cat > .env << EOF
# ============================================
# Liberteko - Configuration Production
# Généré le $(date '+%Y-%m-%d %H:%M:%S')
# ============================================

# Base de données
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Serveur
PORT=3000
NODE_ENV=production

# Application
APP_NAME=Liberteko
APP_URL=${APP_URL}

# Sécurité (NE PAS PARTAGER)
JWT_SECRET=${JWT_SECRET}
EMAIL_ENCRYPTION_KEY=${EMAIL_KEY}

# Structure
STRUCTURE_NOM=${STRUCTURE_NOM}
STRUCTURE_ADRESSE=${STRUCTURE_ADRESSE}
STRUCTURE_EMAIL=${STRUCTURE_EMAIL}
STRUCTURE_TELEPHONE=${STRUCTURE_TELEPHONE}
EOF

echo -e "${GREEN}✓ Fichier .env créé avec succès${NC}"

# ============================================
# Test de connexion à la base de données
# ============================================
echo ""
echo -e "${BOLD}Test de connexion à la base de données...${NC}"

if command -v node &> /dev/null; then
    node -e "
    const mysql = require('mysql2/promise');
    (async () => {
        try {
            const conn = await mysql.createConnection({
                host: '${DB_HOST}',
                port: ${DB_PORT},
                user: '${DB_USER}',
                password: '${DB_PASSWORD}',
                database: '${DB_NAME}'
            });
            await conn.query('SELECT 1');
            await conn.end();
            console.log('\x1b[32m✓ Connexion réussie à la base de données\x1b[0m');
            process.exit(0);
        } catch (e) {
            console.log('\x1b[31m✗ Erreur: ' + e.message + '\x1b[0m');
            process.exit(1);
        }
    })();
    " 2>/dev/null
    DB_OK=$?
else
    echo -e "${YELLOW}⚠ Node.js non disponible, test ignoré${NC}"
    DB_OK=0
fi

# ============================================
# Résumé
# ============================================
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    Configuration terminée${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Base de données: ${BOLD}${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
echo -e "  Structure:       ${BOLD}${STRUCTURE_NOM}${NC}"
echo -e "  URL:             ${BOLD}${APP_URL}${NC}"
echo ""

if [ $DB_OK -eq 0 ]; then
    echo -e "${GREEN}Prochaine étape:${NC}"
    echo -e "  ${BOLD}npm run install:first${NC}"
    echo ""
else
    echo -e "${RED}⚠ Vérifiez la configuration de la base de données${NC}"
    echo -e "  puis relancez: ${BOLD}bash scripts/setup-env.sh${NC}"
    echo ""
fi
