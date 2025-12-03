/**
 * Script de test du système de cotisation
 * Usage: node test-cotisations.js
 */

const API_URL = 'http://localhost:3000/api';
let authToken = null;

// Helper pour faire des requêtes
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
}

// 1. Login
async function login() {
    console.log('\n📋 Étape 1: Connexion...');
    try {
        // Essayer de se connecter avec un compte existant
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@ludotheque.fr',
                password: 'admin123'
            })
        });

        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            console.log('✅ Connexion réussie');
            return true;
        }

        console.log('⚠️  Aucun compte admin trouvé, création en cours...');
        return await createAdmin();
    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
        return false;
    }
}

// Créer un compte admin
async function createAdmin() {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nom: 'Admin',
                prenom: 'System',
                email: 'admin@ludotheque.fr',
                password: 'admin123',
                telephone: '0612345678',
                adhesion_association: true
            })
        });

        const data = await response.json();
        authToken = data.token;
        console.log('✅ Compte admin créé et connecté');
        return true;
    } catch (error) {
        console.error('❌ Erreur création admin:', error.message);
        return false;
    }
}

// 2. Créer des adhérents de test
async function createTestAdherents() {
    console.log('\n📋 Étape 2: Création des adhérents de test...');

    const adherents = [
        {
            nom: 'Dupont',
            prenom: 'Marie',
            email: 'marie.dupont@example.com',
            password: 'test123',
            telephone: '0601020304',
            adhesion_association: true
        },
        {
            nom: 'Martin',
            prenom: 'Pierre',
            email: 'pierre.martin@example.com',
            password: 'test123',
            telephone: '0602030405',
            adhesion_association: false
        },
        {
            nom: 'Durand',
            prenom: 'Sophie',
            email: 'sophie.durand@example.com',
            password: 'test123',
            telephone: '0603040506',
            adhesion_association: true
        }
    ];

    const created = [];
    for (const adh of adherents) {
        try {
            const result = await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(adh)
            });
            created.push(result.adherent);
            console.log(`✅ Adhérent créé: ${adh.prenom} ${adh.nom} (Association: ${adh.adhesion_association})`);
        } catch (error) {
            // Peut-être déjà existant
            console.log(`⚠️  ${adh.prenom} ${adh.nom}: ${error.message}`);
        }
    }

    return created;
}

// 3. Créer des tarifs de cotisation
async function createTestTarifs() {
    console.log('\n📋 Étape 3: Création des tarifs de cotisation...');

    const tarifs = [
        {
            libelle: 'Tarif Annuel Standard',
            description: 'Tarif standard pour une année civile complète',
            type_periode: 'annee_civile',
            type_montant: 'fixe',
            montant_base: 50.00,
            reduction_association_type: 'pourcentage',
            reduction_association_valeur: 20,
            actif: true,
            ordre_affichage: 1
        },
        {
            libelle: 'Tarif Année Scolaire',
            description: 'Tarif pour l\'année scolaire (septembre à août)',
            type_periode: 'annee_scolaire',
            type_montant: 'fixe',
            montant_base: 45.00,
            reduction_association_type: 'montant',
            reduction_association_valeur: 10,
            actif: true,
            ordre_affichage: 2
        },
        {
            libelle: 'Tarif Prorata',
            description: 'Tarif calculé au prorata du mois entamé',
            type_periode: 'annee_civile',
            type_montant: 'prorata',
            montant_base: 60.00,
            reduction_association_type: 'pourcentage',
            reduction_association_valeur: 15,
            actif: true,
            ordre_affichage: 3
        },
        {
            libelle: 'Tarif Date à Date',
            description: 'Cotisation valable 1 an à partir de la date d\'inscription',
            type_periode: 'date_a_date',
            type_montant: 'fixe',
            montant_base: 55.00,
            reduction_association_type: 'pourcentage',
            reduction_association_valeur: 10,
            actif: true,
            ordre_affichage: 4
        }
    ];

    const created = [];
    for (const tarif of tarifs) {
        try {
            const result = await apiRequest('/tarifs-cotisation', {
                method: 'POST',
                body: JSON.stringify(tarif)
            });
            created.push(result);
            console.log(`✅ Tarif créé: ${tarif.libelle} (${tarif.montant_base}€)`);
        } catch (error) {
            console.log(`⚠️  ${tarif.libelle}: ${error.message}`);
        }
    }

    return created;
}

// 4. Créer des cotisations
async function createTestCotisations(adherents, tarifs) {
    console.log('\n📋 Étape 4: Création des cotisations...');

    if (adherents.length === 0 || tarifs.length === 0) {
        console.log('⚠️  Pas assez de données pour créer des cotisations');
        return [];
    }

    const cotisations = [
        {
            adherent_id: adherents[0]?.id || 1,
            tarif_cotisation_id: tarifs[0]?.id || 1,
            mode_paiement: 'carte_bancaire',
            reference_paiement: 'CB-2024-001',
            notes: 'Cotisation annuelle - Paiement en ligne'
        },
        {
            adherent_id: adherents[1]?.id || 2,
            tarif_cotisation_id: tarifs[1]?.id || 2,
            mode_paiement: 'cheque',
            reference_paiement: 'CHQ-123456',
            notes: 'Paiement par chèque'
        },
        {
            adherent_id: adherents[2]?.id || 3,
            tarif_cotisation_id: tarifs[2]?.id || 3,
            mode_paiement: 'especes',
            notes: 'Paiement en espèces au guichet'
        }
    ];

    const created = [];
    for (const cot of cotisations) {
        try {
            const result = await apiRequest('/cotisations', {
                method: 'POST',
                body: JSON.stringify(cot)
            });
            created.push(result);
            console.log(`✅ Cotisation créée: ${result.adherent.prenom} ${result.adherent.nom} - ${result.montant_paye}€`);
            console.log(`   Période: ${result.periode_debut} → ${result.periode_fin}`);
            if (result.reduction_appliquee > 0) {
                console.log(`   Réduction: -${result.reduction_appliquee}€`);
            }
        } catch (error) {
            console.log(`⚠️  Cotisation: ${error.message}`);
        }
    }

    return created;
}

// 5. Tester le calcul de montant
async function testCalculMontant(tarifs) {
    console.log('\n📋 Étape 5: Test du calculateur de montant...');

    if (tarifs.length === 0) {
        console.log('⚠️  Aucun tarif disponible');
        return;
    }

    const tarif = tarifs[0];

    try {
        // Calcul sans adhésion association
        const calc1 = await apiRequest(`/tarifs-cotisation/${tarif.id}/calculer`, {
            method: 'POST',
            body: JSON.stringify({
                adhesion_association: false
            })
        });
        console.log(`✅ Calcul pour "${tarif.libelle}"`);
        console.log(`   Sans adhésion association:`);
        console.log(`   - Montant de base: ${calc1.calcul.montant_base}€`);
        console.log(`   - Réduction: ${calc1.calcul.reduction_appliquee}€`);
        console.log(`   - Montant final: ${calc1.calcul.montant_final}€`);

        // Calcul avec adhésion association
        const calc2 = await apiRequest(`/tarifs-cotisation/${tarif.id}/calculer`, {
            method: 'POST',
            body: JSON.stringify({
                adhesion_association: true
            })
        });
        console.log(`   Avec adhésion association:`);
        console.log(`   - Montant de base: ${calc2.calcul.montant_base}€`);
        console.log(`   - Réduction: ${calc2.calcul.reduction_appliquee}€`);
        console.log(`   - Montant final: ${calc2.calcul.montant_final}€`);
    } catch (error) {
        console.log(`❌ Erreur calcul: ${error.message}`);
    }
}

// 6. Afficher les statistiques
async function showStatistics() {
    console.log('\n📋 Étape 6: Statistiques des cotisations...');

    try {
        const stats = await apiRequest('/cotisations/statistiques?annee=2025');
        console.log(`✅ Statistiques pour 2025:`);
        console.log(`   - Total cotisations: ${stats.total}`);
        console.log(`   - En cours: ${stats.par_statut.en_cours}`);
        console.log(`   - Expirées: ${stats.par_statut.expirees}`);
        console.log(`   - Annulées: ${stats.par_statut.annulees}`);
        console.log(`   - Montant total: ${stats.montant_total}€`);
    } catch (error) {
        console.log(`❌ Erreur statistiques: ${error.message}`);
    }
}

// 7. Lister les cotisations
async function listCotisations() {
    console.log('\n📋 Étape 7: Liste des cotisations...');

    try {
        const cotisations = await apiRequest('/cotisations');
        console.log(`✅ ${cotisations.length} cotisation(s) trouvée(s):`);
        cotisations.forEach((cot, index) => {
            console.log(`\n${index + 1}. ${cot.adherent.nom} ${cot.adherent.prenom}`);
            console.log(`   Tarif: ${cot.tarif.libelle}`);
            console.log(`   Montant: ${cot.montant_paye}€ (base: ${cot.montant_base}€)`);
            console.log(`   Période: ${cot.periode_debut} → ${cot.periode_fin}`);
            console.log(`   Statut: ${cot.statut}`);
        });
    } catch (error) {
        console.log(`❌ Erreur liste: ${error.message}`);
    }
}

// Fonction principale
async function main() {
    console.log('🎯 Test du Système de Cotisation - Ludothèque');
    console.log('='.repeat(50));

    try {
        // 1. Connexion
        const loggedIn = await login();
        if (!loggedIn) {
            console.log('❌ Impossible de se connecter');
            return;
        }

        // 2. Créer des adhérents
        const adherents = await createTestAdherents();

        // 3. Créer des tarifs
        const tarifs = await createTestTarifs();

        // 4. Créer des cotisations
        const cotisations = await createTestCotisations(adherents, tarifs);

        // 5. Tester le calcul
        await testCalculMontant(tarifs);

        // 6. Afficher les stats
        await showStatistics();

        // 7. Lister les cotisations
        await listCotisations();

        console.log('\n' + '='.repeat(50));
        console.log('✅ Test terminé avec succès!');
        console.log('\n📍 Accédez aux interfaces:');
        console.log('   - Tarifs: http://localhost:3000/admin/tarifs-cotisation.html');
        console.log('   - Cotisations: http://localhost:3000/admin/cotisations.html');
        console.log('\n🔑 Compte admin créé:');
        console.log('   Email: admin@ludotheque.fr');
        console.log('   Mot de passe: admin123');

    } catch (error) {
        console.error('\n❌ Erreur:', error);
    }
}

// Lancer le script
main().catch(console.error);
