import * as fs from 'fs/promises';
import * as path from 'path';
import { CONFIG } from '@/shared/config';
import { DocumentMeta, GenerationRecord, Card, Quiz } from '@/shared/types';

/**
 * Cache fichier léger.
 *
 * Stocke uniquement :
 * - meta.json : nom du document, coûts cumulés
 * - generations/*.json : historique des générations (pour déduplication)
 *
 * Les images des pages ne sont PAS cachées côté serveur.
 * Elles vivent dans la mémoire du navigateur pendant la session.
 *
 * Structure :
 *   data/cache/{hash}/
 *     meta.json
 *     generations/
 *       gen-1234567890.json
 */
export const cache = {

  /** Chemin du dossier cache pour un document */
  dir(hash: string): string {
    return path.join(CONFIG.cacheDir, hash);
  },

  /**
   * Crée le dossier cache pour un document (si inexistant).
   * Initialise meta.json avec les infos de base.
   */
  async ensureDocument(hash: string, fileName: string, pageCount: number): Promise<void> {
    const dir = cache.dir(hash);
    await fs.mkdir(path.join(dir, 'generations'), { recursive: true });

    const metaPath = path.join(dir, 'meta.json');
    try {
      await fs.access(metaPath);
      // Existe déjà — rien à faire
    } catch {
      const meta: DocumentMeta = {
        hash,
        fileName,
        pageCount,
        createdAt: new Date().toISOString(),
        costs: { total: 0, history: [] },
      };
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
    }
  },

  /** Récupère les métadonnées d'un document */
  async getMeta(hash: string): Promise<DocumentMeta | null> {
    try {
      const raw = await fs.readFile(path.join(cache.dir(hash), 'meta.json'), 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Sauvegarde une génération et met à jour les coûts.
   */
  async saveGeneration(hash: string, record: GenerationRecord): Promise<void> {
    const dir = cache.dir(hash);
    await fs.mkdir(path.join(dir, 'generations'), { recursive: true });

    // Sauvegarder le record
    await fs.writeFile(
      path.join(dir, 'generations', `${record.id}.json`),
      JSON.stringify(record, null, 2)
    );

    // Mettre à jour les coûts dans meta.json
    const meta = await cache.getMeta(hash);
    if (meta) {
      meta.costs.total += record.costUsd;
      meta.costs.history.push({
        id: record.id,
        cost: record.costUsd,
        date: record.createdAt,
      });
      await fs.writeFile(
        path.join(dir, 'meta.json'),
        JSON.stringify(meta, null, 2)
      );
    }
  },

  /**
   * Récupère toutes les cartes déjà générées pour un document.
   * Utilisé pour la déduplication (injecté dans le prompt).
   */
  async getPreviousCards(hash: string): Promise<Card[]> {
    const cards: Card[] = [];
    try {
      const dir = path.join(cache.dir(hash), 'generations');
      const files = await fs.readdir(dir);
      for (const file of files) {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
        const record: GenerationRecord = JSON.parse(raw);
        cards.push(...record.cards);
      }
    } catch {
      // Pas de générations précédentes
    }
    return cards;
  },

  /** Idem pour les QCM */
  async getPreviousQuizzes(hash: string): Promise<Quiz[]> {
    const quizzes: Quiz[] = [];
    try {
      const dir = path.join(cache.dir(hash), 'generations');
      const files = await fs.readdir(dir);
      for (const file of files) {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
        const record: GenerationRecord = JSON.parse(raw);
        quizzes.push(...record.quizzes);
      }
    } catch {
      // Pas de générations précédentes
    }
    return quizzes;
  },
};
