/**
 * Permet à `node --test` d'exécuter directement les modules TypeScript de
 * `src/` : Node 26 efface les types tout seul, il lui manque seulement la
 * résolution de l'alias `@/` et des imports relatifs sans extension.
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', 'src');

function resolveTs(base) {
  for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && !existsSync(path.join(candidate, '.'))) return candidate;
  }
  return existsSync(`${base}.ts`) ? `${base}.ts` : null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = resolveTs(path.join(SRC, specifier.slice(2)));
      if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
    }

    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const from = path.dirname(fileURLToPath(context.parentURL));
        const target = resolveTs(path.resolve(from, specifier));
        if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
      }
      throw err;
    }
  },
});
