/**
 * Service LLM Unifié
 * Factory pattern pour supporter plusieurs providers (Anthropic, OpenAI, Mistral, Ollama)
 */

const { ConfigurationLLM } = require('../models');
const logger = require('../utils/logger');

// Clients API (lazy loading)
let anthropicClient = null;
let openaiClient = null;

/**
 * Classe de base pour les providers LLM
 */
class LLMProvider {
  constructor(config) {
    this.config = config;
    this.apiKey = config.getDecryptedApiKey();
    this.model = config.model;
    this.maxTokens = config.max_tokens;
    this.temperature = parseFloat(config.temperature);
    this.baseUrl = config.base_url;
  }

  async chat(messages, options = {}) {
    throw new Error('Method chat() must be implemented by subclass');
  }

  async testConnection() {
    throw new Error('Method testConnection() must be implemented by subclass');
  }

  formatMessages(messages) {
    // Format standard : [{role: 'user'|'assistant'|'system', content: '...'}]
    return messages;
  }
}

/**
 * Provider Anthropic (Claude)
 */
class AnthropicProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.initClient();
  }

  initClient() {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      anthropicClient = new Anthropic({
        apiKey: this.apiKey
      });
    } catch (error) {
      logger.warn('Anthropic SDK not installed. Run: npm install @anthropic-ai/sdk');
      anthropicClient = null;
    }
  }

  async chat(messages, options = {}) {
    if (!anthropicClient) {
      throw new Error('Anthropic SDK not installed');
    }

    // Séparer le system message des autres
    let systemMessage = '';
    const chatMessages = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        chatMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    const response = await anthropicClient.messages.create({
      model: options.model || this.model,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature ?? this.temperature,
      system: systemMessage || undefined,
      messages: chatMessages
    });

    return {
      content: response.content[0].text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      },
      model: response.model,
      stop_reason: response.stop_reason
    };
  }

  async testConnection() {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Say "OK" and nothing else.' }
      ], { maxTokens: 10 });
      return { success: true, message: 'Connection successful', response: response.content };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Provider OpenAI (GPT)
 */
class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.initClient();
  }

  initClient() {
    try {
      const OpenAI = require('openai');
      openaiClient = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl || undefined
      });
    } catch (error) {
      logger.warn('OpenAI SDK not installed. Run: npm install openai');
      openaiClient = null;
    }
  }

  async chat(messages, options = {}) {
    if (!openaiClient) {
      throw new Error('OpenAI SDK not installed');
    }

    const response = await openaiClient.chat.completions.create({
      model: options.model || this.model,
      max_tokens: options.maxTokens || this.maxTokens,
      temperature: options.temperature ?? this.temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    });

    return {
      content: response.choices[0].message.content,
      usage: {
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens
      },
      model: response.model,
      stop_reason: response.choices[0].finish_reason
    };
  }

  async testConnection() {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Say "OK" and nothing else.' }
      ], { maxTokens: 10 });
      return { success: true, message: 'Connection successful', response: response.content };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

/**
 * Provider Mistral
 */
class MistralProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.base_url || 'https://api.mistral.ai/v1';
  }

  async chat(messages, options = {}) {
    const axios = require('axios');

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: options.model || this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature ?? this.temperature,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: {
        input_tokens: response.data.usage.prompt_tokens,
        output_tokens: response.data.usage.completion_tokens
      },
      model: response.data.model,
      stop_reason: response.data.choices[0].finish_reason
    };
  }

  async testConnection() {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Say "OK" and nothing else.' }
      ], { maxTokens: 10 });
      return { success: true, message: 'Connection successful', response: response.content };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }
}

/**
 * Provider Ollama (local)
 */
class OllamaProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.base_url || 'http://localhost:11434';
  }

  async chat(messages, options = {}) {
    const axios = require('axios');

    // Ollama utilise un format différent
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: options.model || this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: false,
        options: {
          num_predict: options.maxTokens || this.maxTokens,
          temperature: options.temperature ?? this.temperature
        }
      }
    );

    return {
      content: response.data.message.content,
      usage: {
        input_tokens: response.data.prompt_eval_count || 0,
        output_tokens: response.data.eval_count || 0
      },
      model: response.data.model,
      stop_reason: 'stop'
    };
  }

  async testConnection() {
    try {
      const axios = require('axios');
      // Vérifier que Ollama répond
      await axios.get(`${this.baseUrl}/api/tags`);

      const response = await this.chat([
        { role: 'user', content: 'Say "OK" and nothing else.' }
      ], { maxTokens: 10 });
      return { success: true, message: 'Connection successful', response: response.content };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return { success: false, message: 'Ollama server not running' };
      }
      return { success: false, message: error.message };
    }
  }
}

/**
 * Factory pour créer le bon provider
 */
function createProvider(config) {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'mistral':
      return new MistralProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Service principal LLM
 */
class LLMService {
  /**
   * Obtient le provider par défaut
   */
  async getDefaultProvider() {
    const config = await ConfigurationLLM.getDefault();
    if (!config) {
      throw new Error('No default LLM provider configured');
    }
    return createProvider(config);
  }

  /**
   * Obtient un provider par son ID
   */
  async getProviderById(id) {
    const config = await ConfigurationLLM.findByPk(id);
    if (!config) {
      throw new Error(`LLM configuration not found: ${id}`);
    }
    if (!config.actif) {
      throw new Error(`LLM provider is disabled: ${config.libelle}`);
    }
    return createProvider(config);
  }

  /**
   * Envoie un message au LLM
   * @param {Array} messages - Messages [{role, content}]
   * @param {Object} options - Options (providerId, model, maxTokens, temperature)
   */
  async chat(messages, options = {}) {
    let provider;
    let config;

    if (options.providerId) {
      config = await ConfigurationLLM.findByPk(options.providerId);
      if (!config) throw new Error(`Provider not found: ${options.providerId}`);
      provider = createProvider(config);
    } else {
      config = await ConfigurationLLM.getDefault();
      if (!config) throw new Error('No default LLM provider configured');
      provider = createProvider(config);
    }

    // Vérifier et incrémenter le compteur
    const canProceed = await config.incrementerCompteur();
    if (!canProceed) {
      throw new Error(`Daily request limit reached for ${config.libelle}`);
    }

    try {
      const result = await provider.chat(messages, options);

      logger.info('LLM request completed', {
        provider: config.provider,
        model: result.model,
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens
      });

      return result;
    } catch (error) {
      logger.error('LLM request failed', {
        provider: config.provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Teste la connexion d'un provider
   */
  async testConnection(configId) {
    const config = await ConfigurationLLM.findByPk(configId);
    if (!config) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    const provider = createProvider(config);
    return await provider.testConnection();
  }

  /**
   * Estime le coût d'une requête
   */
  estimateCost(provider, model, inputTokens, outputTokens) {
    const pricing = {
      anthropic: {
        'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
        'claude-3-5-haiku-20241022': { input: 0.001, output: 0.005 },
        'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
      },
      openai: {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
      },
      mistral: {
        'mistral-large-latest': { input: 0.004, output: 0.012 },
        'mistral-medium-latest': { input: 0.0027, output: 0.0081 },
        'mistral-small-latest': { input: 0.001, output: 0.003 },
        'open-mistral-7b': { input: 0.00025, output: 0.00025 }
      },
      ollama: {
        // Ollama est gratuit (local)
        default: { input: 0, output: 0 }
      }
    };

    const providerPricing = pricing[provider] || {};
    const modelPricing = providerPricing[model] || providerPricing.default || { input: 0, output: 0 };

    return {
      inputCost: (inputTokens / 1000) * modelPricing.input,
      outputCost: (outputTokens / 1000) * modelPricing.output,
      totalCost: ((inputTokens / 1000) * modelPricing.input) + ((outputTokens / 1000) * modelPricing.output)
    };
  }

  /**
   * Obtient les providers actifs
   */
  async getActiveProviders() {
    return await ConfigurationLLM.getActifs();
  }

  /**
   * Obtient les modèles disponibles pour un provider
   */
  getModelsForProvider(provider) {
    return ConfigurationLLM.getModelsForProvider(provider);
  }
}

module.exports = new LLMService();
