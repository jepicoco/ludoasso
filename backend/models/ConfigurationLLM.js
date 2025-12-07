/**
 * Modèle ConfigurationLLM
 * Gestion des configurations des providers LLM (Anthropic, OpenAI, Mistral, Ollama)
 */

const { DataTypes } = require('sequelize');
const crypto = require('crypto');

// Clé de chiffrement pour les API keys (utilise EMAIL_ENCRYPTION_KEY existante)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY;
const IV_LENGTH = 16;

/**
 * Chiffre une chaîne avec AES-256-CBC
 */
function encrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    console.warn('EMAIL_ENCRYPTION_KEY not set or too short, storing API key in plain text');
    return text;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-CBC
 */
function decrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    return text;
  }
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text; // Probably not encrypted
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf8');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

module.exports = (sequelize) => {
  const ConfigurationLLM = sequelize.define('ConfigurationLLM', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    provider: {
      type: DataTypes.ENUM('anthropic', 'openai', 'mistral', 'ollama'),
      allowNull: false
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    api_key_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        // Ne jamais retourner la clé déchiffrée directement
        const value = this.getDataValue('api_key_encrypted');
        return value ? '********' : null;
      },
      set(value) {
        if (value && value !== '********') {
          this.setDataValue('api_key_encrypted', encrypt(value));
        }
      }
    },
    base_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    max_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000
    },
    temperature: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
      defaultValue: 0.3
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    par_defaut: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    limite_requetes_jour: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    requetes_aujourdhui: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    date_reset_compteur: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'configurations_llm',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeSave: async (instance) => {
        // Si on définit ce provider comme par défaut, retirer le flag des autres
        if (instance.par_defaut && instance.changed('par_defaut')) {
          await ConfigurationLLM.update(
            { par_defaut: false },
            { where: { id: { [sequelize.Sequelize.Op.ne]: instance.id } } }
          );
        }
      }
    }
  });

  /**
   * Récupère la clé API déchiffrée (usage interne uniquement)
   */
  ConfigurationLLM.prototype.getDecryptedApiKey = function() {
    const encrypted = this.getDataValue('api_key_encrypted');
    return decrypt(encrypted);
  };

  /**
   * Vérifie si la clé API est configurée
   */
  ConfigurationLLM.prototype.hasApiKey = function() {
    return !!this.getDataValue('api_key_encrypted');
  };

  /**
   * Récupère le provider par défaut actif
   */
  ConfigurationLLM.getDefault = async function() {
    return await this.findOne({
      where: { par_defaut: true, actif: true }
    });
  };

  /**
   * Récupère tous les providers actifs
   */
  ConfigurationLLM.getActifs = async function() {
    return await this.findAll({
      where: { actif: true },
      order: [['par_defaut', 'DESC'], ['libelle', 'ASC']]
    });
  };

  /**
   * Incrémente le compteur de requêtes et vérifie la limite
   * @returns {boolean} true si la requête est autorisée
   */
  ConfigurationLLM.prototype.incrementerCompteur = async function() {
    const today = new Date().toISOString().split('T')[0];

    // Reset le compteur si nouveau jour
    if (this.date_reset_compteur !== today) {
      this.requetes_aujourdhui = 0;
      this.date_reset_compteur = today;
    }

    // Vérifier la limite
    if (this.limite_requetes_jour && this.requetes_aujourdhui >= this.limite_requetes_jour) {
      return false;
    }

    this.requetes_aujourdhui += 1;
    await this.save();
    return true;
  };

  /**
   * Vérifie si le provider peut accepter une requête (limite non atteinte)
   */
  ConfigurationLLM.prototype.peutFaireRequete = function() {
    const today = new Date().toISOString().split('T')[0];

    // Si nouveau jour, le compteur sera reset
    if (this.date_reset_compteur !== today) {
      return true;
    }

    // Pas de limite = toujours OK
    if (!this.limite_requetes_jour) {
      return true;
    }

    return this.requetes_aujourdhui < this.limite_requetes_jour;
  };

  /**
   * Retourne les modèles disponibles par provider
   */
  ConfigurationLLM.getModelsForProvider = function(provider) {
    const models = {
      anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', cost: 'medium' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', cost: 'low' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', cost: 'high' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', cost: 'medium' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', cost: 'low' }
      ],
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o', cost: 'high' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', cost: 'low' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', cost: 'high' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', cost: 'low' }
      ],
      mistral: [
        { id: 'mistral-large-latest', name: 'Mistral Large', cost: 'high' },
        { id: 'mistral-medium-latest', name: 'Mistral Medium', cost: 'medium' },
        { id: 'mistral-small-latest', name: 'Mistral Small', cost: 'low' },
        { id: 'open-mistral-7b', name: 'Mistral 7B', cost: 'low' }
      ],
      ollama: [
        { id: 'llama3.2', name: 'Llama 3.2', cost: 'free' },
        { id: 'llama3.1', name: 'Llama 3.1', cost: 'free' },
        { id: 'mistral', name: 'Mistral', cost: 'free' },
        { id: 'mixtral', name: 'Mixtral', cost: 'free' },
        { id: 'phi3', name: 'Phi-3', cost: 'free' }
      ]
    };
    return models[provider] || [];
  };

  return ConfigurationLLM;
};
