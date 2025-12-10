/**
 * Service d'export comptable multi-formats
 * Supporte: FEC, Sage, Ciel, EBP, Quadra, OpenConcerto, Dolibarr, CSV, JSON
 */

const { EcritureComptable, ConfigurationExportComptable } = require('../models');
const { Op } = require('sequelize');
const dayjs = require('dayjs');
const iconv = require('iconv-lite');

/**
 * Classe de base pour les exporters
 */
class BaseExporter {
  constructor(config) {
    this.config = config;
    this.colonnes = config.colonnes || [];
    this.mapping_comptes = config.mapping_comptes || {};
    this.mapping_journaux = config.mapping_journaux || {};
    this.options = config.options_format || {};
  }

  /**
   * Formate une date selon le format configure
   */
  formatDate(date, format = null) {
    if (!date) return '';
    const formatFinal = format || this.config.format_date;
    return dayjs(date).format(formatFinal);
  }

  /**
   * Formate un montant selon la configuration
   */
  formatMontant(montant, options = {}) {
    if (montant === null || montant === undefined) return '';

    const val = parseFloat(montant) || 0;

    // Option: montant en centimes (Quadra)
    if (options.centimes || this.options.montant_centimes) {
      return Math.round(val * 100).toString().padStart(options.largeur || 12, '0');
    }

    // Precision decimale
    const precision = this.config.precision_decimale || 2;
    let formatted = val.toFixed(precision);

    // Separateur decimal
    if (this.config.separateur_decimal === ',') {
      formatted = formatted.replace('.', ',');
    }

    // Separateur milliers
    if (this.config.separateur_milliers) {
      const parts = formatted.split(this.config.separateur_decimal === ',' ? ',' : '.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.config.separateur_milliers);
      formatted = parts.join(this.config.separateur_decimal === ',' ? ',' : '.');
    }

    return formatted;
  }

  /**
   * Resout un compte via le mapping
   */
  resoudreCompte(compteInterne) {
    if (!compteInterne) return '';
    return this.mapping_comptes[compteInterne] || compteInterne;
  }

  /**
   * Resout un journal via le mapping
   */
  resoudreJournal(journalInterne) {
    if (!journalInterne) return '';
    return this.mapping_journaux[journalInterne] || journalInterne;
  }

  /**
   * Tronque ou pad une chaine selon largeur
   */
  formatChamp(valeur, largeur = null) {
    if (valeur === null || valeur === undefined) return '';
    let str = String(valeur);
    if (largeur) {
      str = str.substring(0, largeur);
    }
    return str;
  }

  /**
   * Echappe les guillemets dans une chaine
   */
  escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
  }

  /**
   * Obtient la valeur d'un champ depuis une ecriture
   */
  getChampValue(ecriture, champDef) {
    const { champ, format, largeur, defaut } = champDef;

    // Valeur par defaut
    if (defaut !== undefined && (ecriture[champ] === null || ecriture[champ] === undefined)) {
      return defaut;
    }

    let valeur = ecriture[champ];

    // Traitement selon le type de format
    switch (format) {
      case 'date':
      case 'DD/MM/YYYY':
      case 'YYYY-MM-DD':
      case 'YYYYMMDD':
      case 'DDMMYYYY':
        return this.formatDate(valeur, format === 'date' ? null : format);

      case 'decimal':
        return this.formatMontant(valeur);

      case 'entier_centimes':
        return this.formatMontant(valeur, { centimes: true, largeur });

      default:
        return this.formatChamp(valeur, largeur);
    }
  }

  /**
   * Genere une ligne depuis une ecriture
   */
  genererLigne(ecriture) {
    const valeurs = this.colonnes.map(colDef => {
      let valeur = this.getChampValue(ecriture, colDef);

      // Mapping pour comptes et journaux
      if (colDef.champ === 'compte_general' || colDef.champ === 'compte_numero') {
        valeur = this.resoudreCompte(valeur);
      }
      if (colDef.champ === 'journal_code') {
        valeur = this.resoudreJournal(valeur);
      }

      // Guillemets si configure
      if (this.config.guillemets_texte && typeof valeur === 'string' && !colDef.format) {
        valeur = `"${this.escapeQuotes(valeur)}"`;
      }

      return valeur;
    });

    return valeurs.join(this.config.separateur);
  }

  /**
   * Genere l'entete
   */
  genererEntete() {
    if (!this.config.inclure_entete) return null;

    const noms = this.colonnes.map(col => {
      if (this.config.guillemets_texte) {
        return `"${col.nom}"`;
      }
      return col.nom;
    });

    return noms.join(this.config.separateur);
  }

  /**
   * Genere le pied
   */
  genererPied(ecritures) {
    if (!this.config.inclure_pied) return null;
    // Par defaut, pas de pied
    return null;
  }

  /**
   * Exporte les ecritures
   */
  async exporter(ecritures) {
    const lignes = [];

    // Entete
    const entete = this.genererEntete();
    if (entete) lignes.push(entete);

    // Lignes de donnees
    for (const ecriture of ecritures) {
      lignes.push(this.genererLigne(ecriture));
    }

    // Pied
    const pied = this.genererPied(ecritures);
    if (pied) lignes.push(pied);

    // Assembler le contenu
    const contenu = lignes.join('\r\n');

    // Encoder selon la configuration
    return this.encoder(contenu);
  }

  /**
   * Encode le contenu selon l'encodage configure
   */
  encoder(contenu) {
    const encodage = this.config.encodage || 'UTF-8';

    switch (encodage) {
      case 'ISO-8859-1':
        return iconv.encode(contenu, 'ISO-8859-1');
      case 'CP1252':
        return iconv.encode(contenu, 'CP1252');
      case 'UTF-16':
        return iconv.encode(contenu, 'UTF-16LE');
      case 'UTF-8':
      default:
        return Buffer.from(contenu, 'utf-8');
    }
  }
}

/**
 * Exporter specialise FEC
 */
class FECExporter extends BaseExporter {
  constructor(config) {
    super(config);
    // Le FEC a des colonnes fixes obligatoires
    this.colonnesFEC = [
      { nom: 'JournalCode', champ: 'journal_code' },
      { nom: 'JournalLib', champ: 'journal_libelle' },
      { nom: 'EcritureNum', champ: 'piece_reference' },
      { nom: 'EcritureDate', champ: 'date_ecriture', format: 'YYYYMMDD' },
      { nom: 'CompteNum', champ: 'compte_numero' },
      { nom: 'CompteLib', champ: 'compte_libelle' },
      { nom: 'CompAuxNum', champ: 'compte_auxiliaire' },
      { nom: 'CompAuxLib', champ: 'compte_aux_lib' },
      { nom: 'PieceRef', champ: 'piece_reference' },
      { nom: 'PieceDate', champ: 'piece_date', format: 'YYYYMMDD' },
      { nom: 'EcritureLib', champ: 'libelle' },
      { nom: 'Debit', champ: 'debit', format: 'decimal' },
      { nom: 'Credit', champ: 'credit', format: 'decimal' },
      { nom: 'EcritureLet', champ: 'lettrage' },
      { nom: 'DateLet', champ: 'date_lettrage', format: 'YYYYMMDD' },
      { nom: 'ValidDate', champ: 'date_validation', format: 'YYYYMMDD' },
      { nom: 'Montantdevise', champ: 'montant_devise', format: 'decimal' },
      { nom: 'Idevise', champ: 'devise' }
    ];

    // Utiliser les colonnes FEC
    if (!this.colonnes || this.colonnes.length === 0) {
      this.colonnes = this.colonnesFEC;
    }
  }
}

/**
 * Exporter specialise Quadra (format avec montant en centimes)
 */
class QuadraExporter extends BaseExporter {
  constructor(config) {
    super(config);
    this.options = config.options_format || {
      sens_debit: 'D',
      sens_credit: 'C',
      montant_centimes: true
    };
  }

  /**
   * Override pour gerer le sens debit/credit
   */
  getChampValue(ecriture, champDef) {
    const { champ } = champDef;

    // Champ special "sens"
    if (champ === 'sens') {
      const debit = parseFloat(ecriture.debit) || 0;
      return debit > 0 ? this.options.sens_debit : this.options.sens_credit;
    }

    // Champ special "montant" (valeur absolue)
    if (champ === 'montant') {
      const debit = parseFloat(ecriture.debit) || 0;
      const credit = parseFloat(ecriture.credit) || 0;
      const montant = Math.max(debit, credit);
      return this.formatMontant(montant, { centimes: true, largeur: champDef.largeur });
    }

    return super.getChampValue(ecriture, champDef);
  }
}

/**
 * Exporter JSON
 */
class JSONExporter extends BaseExporter {
  async exporter(ecritures) {
    const data = ecritures.map(e => ({
      journal_code: this.resoudreJournal(e.journal_code),
      journal_libelle: e.journal_libelle,
      numero_ecriture: e.numero_ecriture,
      date_ecriture: this.formatDate(e.date_ecriture),
      compte_numero: this.resoudreCompte(e.compte_numero),
      compte_libelle: e.compte_libelle,
      compte_auxiliaire: e.compte_auxiliaire,
      piece_reference: e.piece_reference,
      piece_date: this.formatDate(e.piece_date),
      libelle: e.libelle,
      debit: parseFloat(e.debit) || 0,
      credit: parseFloat(e.credit) || 0,
      lettrage: e.lettrage,
      date_validation: this.formatDate(e.date_validation)
    }));

    const contenu = JSON.stringify({
      export_date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      format: 'assotheque_comptable',
      version: '1.0',
      ecritures: data
    }, null, 2);

    return Buffer.from(contenu, 'utf-8');
  }
}

/**
 * Factory pour creer le bon exporter selon le format
 */
function createExporter(config) {
  switch (config.format) {
    case 'fec':
      return new FECExporter(config);
    case 'quadra':
      return new QuadraExporter(config);
    case 'json':
      return new JSONExporter(config);
    case 'sage':
    case 'ciel':
    case 'ebp':
    case 'openconcerto':
    case 'dolibarr':
    case 'csv':
    default:
      return new BaseExporter(config);
  }
}

/**
 * Service principal d'export comptable
 */
class ExportComptableService {
  /**
   * Recupere les formats d'export disponibles
   */
  static async getFormatsDisponibles() {
    return await ConfigurationExportComptable.getActifs();
  }

  /**
   * Recupere la configuration d'un format
   */
  static async getConfigurationFormat(format) {
    return await ConfigurationExportComptable.getByFormat(format);
  }

  /**
   * Exporte les ecritures dans le format specifie
   * @param {string} format - Format d'export (fec, sage, ciel, etc.)
   * @param {Object} filtres - Filtres pour les ecritures
   * @param {number} filtres.exercice - Exercice comptable
   * @param {Date} filtres.dateDebut - Date de debut
   * @param {Date} filtres.dateFin - Date de fin
   * @param {string} filtres.journal - Code journal
   * @returns {Object} { buffer, filename, contentType, extension }
   */
  static async exporter(format, filtres = {}) {
    // Recuperer la configuration du format
    const config = await ConfigurationExportComptable.getByFormat(format);
    if (!config) {
      throw new Error(`Format d'export non trouve: ${format}`);
    }

    // Construire les conditions de filtrage
    const where = {};

    if (filtres.exercice) {
      where.exercice = filtres.exercice;
    }

    if (filtres.dateDebut && filtres.dateFin) {
      where.date_ecriture = {
        [Op.between]: [filtres.dateDebut, filtres.dateFin]
      };
    } else if (filtres.dateDebut) {
      where.date_ecriture = {
        [Op.gte]: filtres.dateDebut
      };
    } else if (filtres.dateFin) {
      where.date_ecriture = {
        [Op.lte]: filtres.dateFin
      };
    }

    if (filtres.journal) {
      where.journal_code = filtres.journal;
    }

    // Recuperer les ecritures
    const ecritures = await EcritureComptable.findAll({
      where,
      order: [
        ['date_ecriture', 'ASC'],
        ['numero_ecriture', 'ASC'],
        ['id', 'ASC']
      ]
    });

    if (ecritures.length === 0) {
      throw new Error('Aucune ecriture trouvee pour les criteres specifies');
    }

    // Creer l'exporter et generer le fichier
    const exporter = createExporter(config.toJSON());
    const buffer = await exporter.exporter(ecritures);

    // Generer le nom de fichier
    const exercice = filtres.exercice || dayjs().year();
    const dateExport = dayjs().format('YYYYMMDD_HHmmss');
    const nomBase = format === 'fec'
      ? `${exercice}FEC${dateExport}`
      : `export_${format}_${exercice}_${dateExport}`;

    const extension = config.extension || '.txt';
    const filename = `${nomBase}${extension}`;

    // Determiner le content-type
    let contentType;
    switch (extension) {
      case '.json':
        contentType = 'application/json';
        break;
      case '.csv':
        contentType = 'text/csv';
        break;
      case '.xml':
        contentType = 'application/xml';
        break;
      default:
        contentType = 'text/plain';
    }

    // Ajouter le charset
    if (config.encodage === 'UTF-8') {
      contentType += '; charset=utf-8';
    } else if (config.encodage === 'ISO-8859-1') {
      contentType += '; charset=iso-8859-1';
    } else if (config.encodage === 'CP1252') {
      contentType += '; charset=windows-1252';
    }

    return {
      buffer,
      filename,
      contentType,
      extension,
      nbEcritures: ecritures.length,
      format: config.format,
      libelle: config.libelle
    };
  }

  /**
   * Genere les statistiques d'un exercice pour chaque format
   */
  static async getStatistiquesExercice(exercice) {
    const ecritures = await EcritureComptable.findAll({
      where: { exercice },
      attributes: [
        'journal_code',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'nb_ecritures'],
        [require('sequelize').fn('SUM', require('sequelize').col('debit')), 'total_debit'],
        [require('sequelize').fn('SUM', require('sequelize').col('credit')), 'total_credit']
      ],
      group: ['journal_code']
    });

    const totalGeneral = await EcritureComptable.findOne({
      where: { exercice },
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'nb_ecritures'],
        [require('sequelize').fn('SUM', require('sequelize').col('debit')), 'total_debit'],
        [require('sequelize').fn('SUM', require('sequelize').col('credit')), 'total_credit'],
        [require('sequelize').fn('MIN', require('sequelize').col('date_ecriture')), 'date_debut'],
        [require('sequelize').fn('MAX', require('sequelize').col('date_ecriture')), 'date_fin']
      ],
      raw: true
    });

    const formats = await ConfigurationExportComptable.getActifs();

    return {
      exercice,
      total: totalGeneral,
      par_journal: ecritures,
      formats_disponibles: formats.map(f => ({
        format: f.format,
        libelle: f.libelle,
        extension: f.extension
      }))
    };
  }
}

module.exports = ExportComptableService;
