/**
 * Controller pour la gestion des configurations LLM
 */

const { ConfigurationLLM } = require('../models');
const llmService = require('../services/llmService');
const logger = require('../utils/logger');

/**
 * GET /api/parametres/llm
 * Liste toutes les configurations LLM
 */
exports.getAll = async (req, res) => {
  try {
    const configurations = await ConfigurationLLM.findAll({
      order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
    });

    // Ajouter info sur le quota restant
    const today = new Date().toISOString().split('T')[0];
    const result = configurations.map(config => {
      const data = config.toJSON();

      // Calculer le quota restant
      if (config.limite_requetes_jour) {
        const usedToday = config.date_reset_compteur === today ? config.requetes_aujourdhui : 0;
        data.quota_restant = config.limite_requetes_jour - usedToday;
      } else {
        data.quota_restant = null; // Illimité
      }

      // Ne pas exposer la clé API (déjà masquée par le getter)
      data.has_api_key = !!config.getDataValue('api_key_encrypted');

      return data;
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching LLM configurations', { error: error.message });
    res.status(500).json({ error: 'Erreur lors de la récupération des configurations' });
  }
};

/**
 * GET /api/parametres/llm/:id
 * Récupère une configuration LLM spécifique
 */
exports.getById = async (req, res) => {
  try {
    const config = await ConfigurationLLM.findByPk(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    const data = config.toJSON();
    data.has_api_key = !!config.getDataValue('api_key_encrypted');

    res.json(data);
  } catch (error) {
    logger.error('Error fetching LLM configuration', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration' });
  }
};

/**
 * POST /api/parametres/llm
 * Crée une nouvelle configuration LLM
 */
exports.create = async (req, res) => {
  try {
    const {
      provider,
      libelle,
      api_key,
      base_url,
      model,
      max_tokens,
      temperature,
      actif,
      par_defaut,
      limite_requetes_jour
    } = req.body;

    // Validation
    if (!provider || !libelle || !model) {
      return res.status(400).json({ error: 'Provider, libellé et modèle sont requis' });
    }

    // Vérifier que le provider est valide
    const validProviders = ['anthropic', 'openai', 'mistral', 'ollama'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Provider invalide' });
    }

    // Pour les providers cloud, la clé API est requise
    if (provider !== 'ollama' && !api_key) {
      return res.status(400).json({ error: 'Clé API requise pour ce provider' });
    }

    const config = await ConfigurationLLM.create({
      provider,
      libelle,
      api_key_encrypted: api_key, // Le setter va chiffrer
      base_url,
      model,
      max_tokens: max_tokens || 1000,
      temperature: temperature || 0.3,
      actif: actif || false,
      par_defaut: par_defaut || false,
      limite_requetes_jour: limite_requetes_jour || null
    });

    logger.info('LLM configuration created', { id: config.id, provider, libelle });

    const data = config.toJSON();
    data.has_api_key = !!config.getDataValue('api_key_encrypted');

    res.status(201).json(data);
  } catch (error) {
    logger.error('Error creating LLM configuration', { error: error.message });
    res.status(500).json({ error: 'Erreur lors de la création de la configuration' });
  }
};

/**
 * PUT /api/parametres/llm/:id
 * Met à jour une configuration LLM
 */
exports.update = async (req, res) => {
  try {
    const config = await ConfigurationLLM.findByPk(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    const {
      libelle,
      api_key,
      base_url,
      model,
      max_tokens,
      temperature,
      actif,
      par_defaut,
      limite_requetes_jour
    } = req.body;

    // Mise à jour des champs
    if (libelle !== undefined) config.libelle = libelle;
    if (api_key && api_key !== '********') config.api_key_encrypted = api_key;
    if (base_url !== undefined) config.base_url = base_url;
    if (model !== undefined) config.model = model;
    if (max_tokens !== undefined) config.max_tokens = max_tokens;
    if (temperature !== undefined) config.temperature = temperature;
    if (actif !== undefined) config.actif = actif;
    if (par_defaut !== undefined) config.par_defaut = par_defaut;
    if (limite_requetes_jour !== undefined) config.limite_requetes_jour = limite_requetes_jour;

    await config.save();

    logger.info('LLM configuration updated', { id: config.id });

    const data = config.toJSON();
    data.has_api_key = !!config.getDataValue('api_key_encrypted');

    res.json(data);
  } catch (error) {
    logger.error('Error updating LLM configuration', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la configuration' });
  }
};

/**
 * DELETE /api/parametres/llm/:id
 * Supprime une configuration LLM
 */
exports.delete = async (req, res) => {
  try {
    const config = await ConfigurationLLM.findByPk(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    await config.destroy();

    logger.info('LLM configuration deleted', { id: req.params.id });

    res.json({ message: 'Configuration supprimée' });
  } catch (error) {
    logger.error('Error deleting LLM configuration', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Erreur lors de la suppression de la configuration' });
  }
};

/**
 * POST /api/parametres/llm/:id/test
 * Teste la connexion d'une configuration LLM
 */
exports.testConnection = async (req, res) => {
  try {
    const result = await llmService.testConnection(req.params.id);

    if (result.success) {
      logger.info('LLM connection test successful', { id: req.params.id });
      res.json(result);
    } else {
      logger.warn('LLM connection test failed', { id: req.params.id, error: result.message });
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Error testing LLM connection', { id: req.params.id, error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/parametres/llm/:id/toggle
 * Active/désactive une configuration LLM
 */
exports.toggle = async (req, res) => {
  try {
    const config = await ConfigurationLLM.findByPk(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    config.actif = !config.actif;
    await config.save();

    logger.info('LLM configuration toggled', { id: config.id, actif: config.actif });

    res.json({ actif: config.actif });
  } catch (error) {
    logger.error('Error toggling LLM configuration', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Erreur lors du changement de statut' });
  }
};

/**
 * PATCH /api/parametres/llm/:id/set-default
 * Définit une configuration comme par défaut
 */
exports.setDefault = async (req, res) => {
  try {
    const config = await ConfigurationLLM.findByPk(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    if (!config.actif) {
      return res.status(400).json({ error: 'La configuration doit être active pour être définie par défaut' });
    }

    config.par_defaut = true;
    await config.save(); // Le hook va désactiver les autres

    logger.info('LLM configuration set as default', { id: config.id });

    res.json({ par_defaut: true });
  } catch (error) {
    logger.error('Error setting LLM default', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Erreur lors de la définition par défaut' });
  }
};

/**
 * GET /api/parametres/llm/providers
 * Liste les providers disponibles et leurs modèles
 */
exports.getProviders = async (req, res) => {
  try {
    const providers = [
      {
        id: 'anthropic',
        name: 'Anthropic (Claude)',
        requiresApiKey: true,
        models: llmService.getModelsForProvider('anthropic')
      },
      {
        id: 'openai',
        name: 'OpenAI (GPT)',
        requiresApiKey: true,
        models: llmService.getModelsForProvider('openai')
      },
      {
        id: 'mistral',
        name: 'Mistral AI',
        requiresApiKey: true,
        models: llmService.getModelsForProvider('mistral')
      },
      {
        id: 'ollama',
        name: 'Ollama (Local)',
        requiresApiKey: false,
        models: llmService.getModelsForProvider('ollama')
      }
    ];

    res.json(providers);
  } catch (error) {
    logger.error('Error fetching providers', { error: error.message });
    res.status(500).json({ error: 'Erreur lors de la récupération des providers' });
  }
};

/**
 * GET /api/parametres/llm/stats
 * Statistiques d'utilisation des LLM
 */
exports.getStats = async (req, res) => {
  try {
    const configurations = await ConfigurationLLM.findAll();
    const today = new Date().toISOString().split('T')[0];

    const stats = {
      total_configs: configurations.length,
      active_configs: configurations.filter(c => c.actif).length,
      has_default: configurations.some(c => c.par_defaut && c.actif),
      usage_today: configurations.reduce((sum, c) => {
        if (c.date_reset_compteur === today) {
          return sum + c.requetes_aujourdhui;
        }
        return sum;
      }, 0),
      by_provider: {}
    };

    // Stats par provider
    for (const config of configurations) {
      if (!stats.by_provider[config.provider]) {
        stats.by_provider[config.provider] = {
          count: 0,
          active: 0,
          usage_today: 0
        };
      }
      stats.by_provider[config.provider].count++;
      if (config.actif) stats.by_provider[config.provider].active++;
      if (config.date_reset_compteur === today) {
        stats.by_provider[config.provider].usage_today += config.requetes_aujourdhui;
      }
    }

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching LLM stats', { error: error.message });
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};
