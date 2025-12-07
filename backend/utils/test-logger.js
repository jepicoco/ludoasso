/**
 * Script de test pour le système de logging
 * Usage: node backend/utils/test-logger.js
 */

const logger = require('./logger');
const auditLogger = require('./auditLogger');

console.log('=== Test du système de logging Assotheque ===\n');

// Test 1: Logger de base
console.log('1. Test des logs de base...');
logger.info('Test de log info');
logger.warn('Test de log warning');
logger.error('Test de log error');

// Test 2: Logs avec métadonnées
console.log('\n2. Test des logs avec métadonnées...');
logger.info('Test avec métadonnées', {
  userId: 123,
  action: 'test',
  timestamp: new Date().toISOString()
});

// Test 3: Audit logger - Authentification
console.log('\n3. Test audit logger - Authentification...');
auditLogger.login({
  userId: 123,
  email: 'test@example.com',
  ip: '127.0.0.1',
  userAgent: 'Test User Agent',
  success: true
});

auditLogger.login({
  userId: null,
  email: 'hacker@example.com',
  ip: '192.168.1.100',
  userAgent: 'Evil Bot',
  success: false
});

auditLogger.logout({
  userId: 123,
  email: 'test@example.com',
  ip: '127.0.0.1'
});

auditLogger.passwordReset({
  userId: 123,
  email: 'test@example.com',
  ip: '127.0.0.1',
  method: 'email'
});

// Test 4: Audit logger - Cotisations
console.log('\n4. Test audit logger - Cotisations...');
auditLogger.cotisationCreated({
  cotisationId: 456,
  adherentId: 123,
  montant: 25.00,
  userId: 1,
  modePaiement: 'carte'
});

auditLogger.cotisationAnnulee({
  cotisationId: 456,
  adherentId: 123,
  montant: 25.00,
  userId: 1,
  raison: 'Test d\'annulation'
});

// Test 5: Audit logger - Adhérents
console.log('\n5. Test audit logger - Adhérents...');
auditLogger.adherentArchived({
  adherentId: 123,
  nom: 'Dupont',
  prenom: 'Jean',
  userId: 1,
  raison: 'Test archivage'
});

// Test 6: Audit logger - Emprunts
console.log('\n6. Test audit logger - Emprunts...');
auditLogger.empruntCreated({
  empruntId: 789,
  adherentId: 123,
  itemType: 'jeux',
  itemId: 456,
  userId: 1
});

auditLogger.empruntReturned({
  empruntId: 789,
  adherentId: 123,
  itemType: 'jeux',
  itemId: 456,
  userId: 1,
  enRetard: false
});

auditLogger.empruntProlonged({
  empruntId: 789,
  adherentId: 123,
  itemType: 'jeux',
  userId: 1,
  nouvelleDateRetour: '2024-12-31'
});

// Test 7: Audit logger - Configuration
console.log('\n7. Test audit logger - Configuration...');
auditLogger.configChanged({
  configKey: 'duree_emprunt_max',
  oldValue: '14',
  newValue: '21',
  userId: 1,
  module: 'emprunts'
});

// Test 8: Audit logger - Sécurité
console.log('\n8. Test audit logger - Sécurité...');
auditLogger.unauthorizedAccess({
  userId: 123,
  resource: '/api/admin/users',
  ip: '192.168.1.100',
  action: 'access_denied'
});

console.log('\n=== Tests terminés ===');
console.log('Vérifiez les fichiers de logs dans le dossier logs/');
console.log('- logs/app-YYYY-MM-DD.log : tous les logs');
console.log('- logs/error-YYYY-MM-DD.log : uniquement les erreurs\n');
