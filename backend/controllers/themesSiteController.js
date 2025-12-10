const { ThemeSite, ParametresFront } = require('../models');

/**
 * Controller pour la gestion des themes du site public
 */
class ThemesSiteController {
  /**
   * Recupere tous les themes actifs
   * GET /api/parametres/themes
   */
  static async getAll(req, res) {
    try {
      const themes = await ThemeSite.getActifs();

      res.json({
        themes: themes.map(t => ({
          id: t.id,
          code: t.code,
          nom: t.nom,
          description: t.description,
          type: t.type,
          mode: t.mode,
          couleur_primaire: t.couleur_primaire,
          couleur_secondaire: t.couleur_secondaire,
          preview_image: t.preview_image,
          ordre_affichage: t.ordre_affichage
        }))
      });
    } catch (error) {
      console.error('Erreur lors de la recuperation des themes:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation des themes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Recupere un theme par son code ou ID
   * GET /api/parametres/themes/:codeOrId
   */
  static async getByCodeOrId(req, res) {
    try {
      const { codeOrId } = req.params;
      let theme;

      // Essayer par ID si numerique
      if (!isNaN(codeOrId)) {
        theme = await ThemeSite.findByPk(parseInt(codeOrId));
      } else {
        theme = await ThemeSite.getByCode(codeOrId);
      }

      if (!theme) {
        return res.status(404).json({
          error: `Theme non trouve: ${codeOrId}`
        });
      }

      res.json(theme);
    } catch (error) {
      console.error('Erreur lors de la recuperation du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Genere le CSS d'un theme
   * GET /api/parametres/themes/:codeOrId/css
   */
  static async getCSS(req, res) {
    try {
      const { codeOrId } = req.params;
      let theme;

      if (!isNaN(codeOrId)) {
        theme = await ThemeSite.findByPk(parseInt(codeOrId));
      } else {
        theme = await ThemeSite.getByCode(codeOrId);
      }

      if (!theme) {
        return res.status(404).json({
          error: `Theme non trouve: ${codeOrId}`
        });
      }

      const css = theme.genererCSS();

      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.send(css);
    } catch (error) {
      console.error('Erreur lors de la generation du CSS:', error);
      res.status(500).json({
        error: 'Erreur lors de la generation du CSS',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cree un nouveau theme personnalise
   * POST /api/parametres/themes
   */
  static async create(req, res) {
    try {
      // Generer un code unique si non fourni
      if (!req.body.code) {
        req.body.code = `custom_${Date.now()}`;
      }

      // Forcer le type custom
      req.body.type = 'custom';

      const theme = await ThemeSite.create(req.body);

      res.status(201).json({
        message: 'Theme cree avec succes',
        theme
      });
    } catch (error) {
      console.error('Erreur lors de la creation du theme:', error);

      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          error: 'Un theme avec ce code existe deja'
        });
      }

      res.status(500).json({
        error: 'Erreur lors de la creation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Met a jour un theme
   * PUT /api/parametres/themes/:id
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      // Empecher la modification des themes systeme (sauf CSS personnalise)
      if (theme.type === 'system') {
        // Autoriser uniquement css_personnalise et ordre_affichage pour themes system
        const champsAutorises = ['css_personnalise', 'ordre_affichage', 'actif'];
        const champsDemandes = Object.keys(req.body);
        const champsNonAutorises = champsDemandes.filter(c => !champsAutorises.includes(c));

        if (champsNonAutorises.length > 0) {
          return res.status(403).json({
            error: 'Les themes systeme ne peuvent pas etre modifies',
            champs_bloques: champsNonAutorises
          });
        }
      }

      // Empecher de changer le type
      delete req.body.type;
      delete req.body.code;

      await theme.update(req.body);

      res.json({
        message: 'Theme mis a jour',
        theme
      });
    } catch (error) {
      console.error('Erreur lors de la mise a jour du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la mise a jour du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Supprime un theme personnalise
   * DELETE /api/parametres/themes/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      if (theme.type === 'system') {
        return res.status(403).json({
          error: 'Les themes systeme ne peuvent pas etre supprimes'
        });
      }

      await theme.destroy();

      res.json({
        message: 'Theme supprime'
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la suppression du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Duplique un theme
   * POST /api/parametres/themes/:id/duplicate
   */
  static async duplicate(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      // Creer une copie
      const data = theme.toExportJSON();
      data.code = `${theme.code}_copy_${Date.now()}`;
      data.nom = req.body.nom || `${theme.nom} (copie)`;
      data.type = 'custom';
      data.actif = true;

      const newTheme = await ThemeSite.create(data);

      res.status(201).json({
        message: 'Theme duplique',
        theme: newTheme
      });
    } catch (error) {
      console.error('Erreur lors de la duplication du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de la duplication du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Active un theme pour le site
   * POST /api/parametres/themes/:id/activate
   */
  static async activate(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      if (!theme.actif) {
        return res.status(400).json({
          error: 'Ce theme est desactive'
        });
      }

      // Mettre a jour ParametresFront
      let parametres = await ParametresFront.findOne();
      if (!parametres) {
        parametres = await ParametresFront.create({});
      }

      // Mettre a jour les couleurs depuis le theme
      parametres.couleur_primaire = theme.couleur_primaire;
      parametres.couleur_secondaire = theme.couleur_secondaire;

      // Si le champ theme_id existe
      if ('theme_id' in parametres) {
        parametres.theme_id = theme.id;
      }

      await parametres.save();

      res.json({
        message: `Theme "${theme.nom}" active`,
        theme: {
          id: theme.id,
          code: theme.code,
          nom: theme.nom
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'activation du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'activation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Exporte un theme en JSON
   * GET /api/parametres/themes/:id/export
   */
  static async exportTheme(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      const data = theme.toExportJSON();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="theme_${theme.code}.json"`);
      res.send(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Erreur lors de l\'export du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'export du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Importe un theme depuis JSON
   * POST /api/parametres/themes/import
   */
  static async importTheme(req, res) {
    try {
      const data = req.body;

      if (!data.nom) {
        return res.status(400).json({
          error: 'Le champ "nom" est requis'
        });
      }

      // Generer un code unique
      data.code = `imported_${Date.now()}`;
      data.type = 'custom';
      data.actif = true;

      const theme = await ThemeSite.create(data);

      res.status(201).json({
        message: 'Theme importe avec succes',
        theme
      });
    } catch (error) {
      console.error('Erreur lors de l\'import du theme:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'import du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Reordonne les themes
   * PUT /api/parametres/themes/reorder
   */
  static async reorder(req, res) {
    try {
      const { ordre } = req.body;

      if (!Array.isArray(ordre)) {
        return res.status(400).json({
          error: 'Le champ "ordre" doit etre un tableau d\'IDs'
        });
      }

      for (let i = 0; i < ordre.length; i++) {
        await ThemeSite.update(
          { ordre_affichage: i },
          { where: { id: ordre[i] } }
        );
      }

      res.json({
        message: 'Ordre mis a jour'
      });
    } catch (error) {
      console.error('Erreur lors du reordonnement:', error);
      res.status(500).json({
        error: 'Erreur lors du reordonnement',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Toggle actif/inactif
   * PATCH /api/parametres/themes/:id/toggle
   */
  static async toggle(req, res) {
    try {
      const { id } = req.params;
      const theme = await ThemeSite.findByPk(id);

      if (!theme) {
        return res.status(404).json({
          error: 'Theme non trouve'
        });
      }

      theme.actif = !theme.actif;
      await theme.save();

      res.json({
        message: `Theme ${theme.actif ? 'active' : 'desactive'}`,
        actif: theme.actif
      });
    } catch (error) {
      console.error('Erreur lors du toggle:', error);
      res.status(500).json({
        error: 'Erreur lors du toggle',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ============================================
  // ROUTES PUBLIQUES (pas d'auth)
  // ============================================

  /**
   * Recupere le theme actif pour le site public
   * GET /api/public/theme
   */
  static async getPublicTheme(req, res) {
    try {
      const parametres = await ParametresFront.findOne();

      let theme = null;
      let css = '';

      // Si un theme est defini
      if (parametres && parametres.theme_id) {
        theme = await ThemeSite.findByPk(parametres.theme_id);
        if (theme && theme.actif) {
          css = theme.genererCSS();
        }
      }

      // Sinon, generer CSS depuis les parametres
      if (!css && parametres) {
        css = `:root {
  --primary-color: ${parametres.couleur_primaire || '#667eea'};
  --secondary-color: ${parametres.couleur_secondaire || '#764ba2'};
}`;
        if (parametres.css_personnalise) {
          css += `\n\n/* CSS Personnalise */\n${parametres.css_personnalise}`;
        }
      }

      res.json({
        theme: theme ? {
          id: theme.id,
          code: theme.code,
          nom: theme.nom,
          mode: theme.mode
        } : null,
        css,
        allow_selection: parametres?.allow_theme_selection || false
      });
    } catch (error) {
      console.error('Erreur lors de la recuperation du theme public:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation du theme',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Liste les themes disponibles pour selection publique
   * GET /api/public/themes
   */
  static async getPublicThemes(req, res) {
    try {
      const parametres = await ParametresFront.findOne();

      if (!parametres || !parametres.allow_theme_selection) {
        return res.json({ themes: [], allow_selection: false });
      }

      const themes = await ThemeSite.getActifs();

      res.json({
        themes: themes.map(t => ({
          id: t.id,
          code: t.code,
          nom: t.nom,
          mode: t.mode,
          couleur_primaire: t.couleur_primaire,
          couleur_secondaire: t.couleur_secondaire,
          preview_image: t.preview_image
        })),
        allow_selection: true
      });
    } catch (error) {
      console.error('Erreur lors de la recuperation des themes publics:', error);
      res.status(500).json({
        error: 'Erreur lors de la recuperation des themes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Recupere le CSS d'un theme pour le public
   * GET /api/public/themes/:code/css
   */
  static async getPublicThemeCSS(req, res) {
    try {
      const { code } = req.params;
      const theme = await ThemeSite.getByCode(code);

      if (!theme) {
        return res.status(404).send('/* Theme not found */');
      }

      const css = theme.genererCSS();

      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(css);
    } catch (error) {
      console.error('Erreur lors de la generation du CSS public:', error);
      res.status(500).send('/* Error generating CSS */');
    }
  }
}

module.exports = ThemesSiteController;
