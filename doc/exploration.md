# Exploration automatique du DOM

Le module `explorer/` implémente un **fuzzer DOM structuré** en deux phases :
l'exploration automatique d'une page web et le replay des scénarios générés.

## Architecture

```
explorer/
├── Explorer.ts           # Orchestrateur — boucle BFS/DFS
├── DOMExtractor.ts       # Extraction des éléments interactifs du DOM
├── RulesEngine.ts        # Moteur de règles (json-rules-engine)
├── ActionExecutor.ts     # Exécution des actions Playwright
├── StateManager.ts       # Identification des états par hash SHA-256
├── ExplorationGraph.ts   # Graphe orienté états/transitions
├── ExplorationScope.ts   # Périmètre DOM (rootSelector, overflow)
├── ExplorationConfig.ts  # Configuration validée par Zod
├── ScenarioExporter.ts   # Export des scénarios (JSON, Mermaid, DOT)
├── fixture.ts            # Fixture Playwright pour les tests d'exploration
└── types.ts              # Types fondamentaux (ElementFact, CandidateAction, StateNode, Transition)
```

## Phase 1 — Exploration (génération)

### Principe

L'`Explorer` parcourt le DOM d'une page en construisant un **graphe d'états**.
Chaque état est un instantané des éléments interactifs visibles, identifié par un hash.

### Flux détaillé

1. **Extraction** (`DOMExtractor`) — Scanne le DOM à l'intérieur du `rootSelector` et collecte tous les éléments interactifs (`<button>`, `<a>`, `<input>`, `[role]`, `[tabindex]`, `[aria-expanded]`…) sous forme de `ElementFact[]`.

2. **Capture d'état** (`StateManager`) — Transforme les facts en un `StateNode` identifié par un hash SHA-256 des propriétés pertinentes. Deux DOM identiques → même hash → détection de cycles et d'états déjà visités.

3. **Évaluation des règles** (`RulesEngine`) — Pour chaque `ElementFact` visible et activé, le moteur de règles produit des `CandidateAction[]` (click, hover, fill, select, focus, clear, ou séquences d'actions). Les actions sont triées par priorité et limitées par `maxActionsPerState`.

4. **Exécution** (`ActionExecutor`) — Exécute l'action via les locators Playwright, attend la stabilisation DOM.

5. **Boucle d'exploration** (BFS ou DFS selon `config.strategy`) :
   - Dépile un état de la frontière
   - Évalue les actions candidates
   - Exécute chaque action non encore explorée
   - Extrait le nouvel état DOM
   - Si **nouvel état** → ajout au graphe + à la frontière
   - Si **self-loop** (même hash) → ignore
   - Si **navigation externe** (changement de pathname) → transition spéciale, pas d'extraction
   - **Rollback** systématique vers l'état courant avant l'action suivante

6. **Export** (`ScenarioExporter`) — Extrait du graphe les chemins racine→feuille comme scénarios rejouables. Export en JSON, Mermaid ou DOT.

### Conditions d'arrêt

- `maxDepth` atteint
- `maxStates` atteint
- `timeout` dépassé

### Lancer l'exploration

```bash
cd playwright-playground

# Via le script npm
npm run explore

# Ou directement
npx playwright test --project=exploration
```

Le projet `exploration` est configuré dans `playwright.config.ts` :
il cible `./tests/exploration/` et matche les fichiers `*.generate.ts`.

### Fichier de génération

Le fichier `tests/exploration/iana.generate.ts` explore le site IANA avec 5 scopes différents :

| Scope          | rootSelector | Description                   |
| -------------- | ------------ | ----------------------------- |
| `body`         | `body`       | Page entière                  |
| `main`         | `main`       | Contenu principal             |
| `header`       | `header`     | En-tête de la page            |
| `footer`       | `footer`     | Pied de page                  |
| `body-content` | `#body`      | Zone de contenu (div `#body`) |

Chaque scope produit un fichier JSON dans `.exploration-data/` :

```
.exploration-data/
├── iana-body.json
├── iana-main.json
├── iana-header.json
├── iana-footer.json
└── iana-body-content.json
```

### Contenu d'un fichier JSON généré

```jsonc
{
  "url": "https://www.iana.org/help/example-domains",
  "scope": "body",
  "config": { /* PartialExplorationConfig */ },
  "graph": { "states": [...], "transitions": [...] },
  "summary": { "statesDiscovered": 5, "transitions": 12, ... },
  "actions": [...],
  "scenarios": [
    { "name": "click_btn-1 → hover_link-3", "steps": [...], "selectors": [...] }
  ],
  "mermaid": "graph TD\n  ...",
  "dot": "digraph { ... }",
  "generatedAt": "2026-04-28T10:00:00.000Z"
}
```

## Phase 2 — Replay (validation)

### Principe

Les tests de replay chargent les JSON générés et rejouent les scénarios comme des tests de régression.

### Fichier de replay

`tests/iana-exploration.spec.ts` utilise le `ExplorationPOM` (Page Object Model) :

```ts
const test = baseTest<ExplorationPOM>(ExplorationPOM);

describe('IANA Exploration — Replay', () => {
  for (const scope of SCOPES) {
    const jsonPath = path.join(DATA_DIR, `iana-${scope}.json`);

    test(`replay all scenarios (${scope})`, {}, async ({ instance, testContext }) => {
      await instance.load(jsonPath).goto().enableScreenshot().replayAll().execute();
    });
  }
});
```

### Flux du replay

1. **`load(jsonPath)`** — Lit le fichier JSON, extrait l'URL, la config et les scénarios.
2. **`goto()`** — Navigue vers l'URL d'origine. Ferme un éventuel bandeau cookie.
3. **`replayAll()`** — Pour chaque scénario : re-navigue puis exécute séquentiellement chaque action (click, hover, fill…) via les sélecteurs CSS stockés.
4. **`execute()`** — Exécute la chaîne d'actions du builder POM.

### Lancer le replay

```bash
cd playwright-playground

# Via le script npm
npm run replay

# Ou directement
npx playwright test iana-exploration
```

## Configuration de l'exploration

Toutes les options sont définies dans `ExplorationConfig.ts` et validées par Zod :

| Option                         | Type                                  | Défaut                 | Description                                                                          |
| ------------------------------ | ------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `strategy`                     | `'bfs'` \| `'dfs'`                    | `'bfs'`                | Stratégie de parcours                                                                |
| `maxDepth`                     | `number`                              | `5`                    | Profondeur maximale d'exploration                                                    |
| `maxStates`                    | `number`                              | `100`                  | Nombre maximal d'états dans le graphe                                                |
| `maxActionsPerState`           | `number`                              | `10`                   | Actions candidates max par état                                                      |
| `timeout`                      | `number` (ms)                         | `30 000`               | Timeout global de l'exploration                                                      |
| `rootSelector`                 | `string`                              | `'body'`               | Sélecteur CSS racine du scope                                                        |
| `boundary`                     | `'strict'` \| `'overflow'`            | `'strict'`             | `overflow` inclut les popups (ex: CDK overlay)                                       |
| `overflowSelectors`            | `string[]`                            | `['.cdk-overlay…']`    | Sélecteurs des conteneurs overflow                                                   |
| `ignoreSelectors`              | `string[]`                            | `[]`                   | Éléments à ignorer                                                                   |
| `fillValues`                   | `Record<string, string>`              | emails, mots de passe… | Valeurs de remplissage par type d'input                                              |
| `selectStrategy`               | `'first'` \| `'random'` \| `'all'`    | `'first'`              | Stratégie de sélection dans les `<select>`                                           |
| `stabilizationTimeout`         | `number` (ms)                         | `500`                  | Attente après chaque action pour stabilisation                                       |
| `domHashStrategy`              | `'structure'` \| `'interactive-only'` | `'interactive-only'`   | Quels éléments inclure dans le hash d'état                                           |
| `readinessSelector`            | `string` (optionnel)                  | —                      | Sélecteur CSS attendu visible avant chaque extraction (SPA ready)                    |
| `readinessTimeout`             | `number` (ms)                         | `5 000`                | Timeout d'attente du `readinessSelector` (échec silencieux)                          |
| `captureStateScreenshots`      | `boolean`                             | `false`                | Capture 1 PNG par état découvert (`state-<hash>.png`)                                |
| `captureTransitionScreenshots` | `boolean`                             | `false`                | Capture 1 PNG après chaque action exécutée (`transition-NNNN-<type>-<uid>.png`)      |
| `screenshotsDir`               | `string` (optionnel)                  | —                      | Répertoire de sortie. Si omis, aucune capture n'est écrite.                          |
| `screenshotsPrefix`            | `string`                              | `''`                   | Préfixe ajouté à chaque nom de fichier (utile pour partager un dossier entre cibles) |

### Screenshots de génération (opt-in)

L'exploration peut produire des PNG bruts pendant la génération pour
documenter visuellement le graphe ou déboguer une exécution. Ces captures
sont **indépendantes** du système de baselines Playwright :

- Aucune assertion : un changement visuel ne fait jamais échouer la génération.
- Best-effort : une erreur de capture est silencieuse.
- Désactivées par défaut.

Deux modes indépendants, combinables :

| Mode                                 | Effet                                                                        | Quand                                 |
| ------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------- |
| `captureStateScreenshots: true`      | 1 PNG par état découvert, nommé `<prefix>-state-<hash>.png`                  | Après chaque ajout au graphe          |
| `captureTransitionScreenshots: true` | 1 PNG après chaque action, nommé `<prefix>-transition-NNNN-<type>-<uid>.png` | Après chaque action (succès ou échec) |

Les deux exigent `screenshotsDir` défini, sinon ils sont silencieusement ignorés.

**Activation via la fabrique LlamaSticot** :

```ts
// Active state + transition screenshots dans
// .exploration-data/screenshots/, préfixés par le nom de la cible
createLlamasticotTarget('mat-button', { theme: 'light', captureScreenshots: true });
```

**Activation manuelle** (config brute) :

```ts
{
  captureStateScreenshots: true,
  captureTransitionScreenshots: false,
  screenshotsDir: '/abs/path/to/screenshots',
  screenshotsPrefix: 'my-target',
}
```

## Injection de dépendances

Tous les composants sont enregistrés via le DI du moteur (voir [di-lifetimes.md](di-lifetimes.md)) :

| Token               | Lifetime  | Raison                            |
| ------------------- | --------- | --------------------------------- |
| `ExplorationConfig` | scoped    | Config différente par exploration |
| `ExplorationScope`  | scoped    | Dépend de la config               |
| `DOMExtractor`      | scoped    | Dépend du scope                   |
| `RulesEngine`       | singleton | Stateless, règles immuables       |
| `ReadinessChecker`  | scoped    | Attente de readinessSelector      |
| `ActionExecutor`    | scoped    | Dépend du scope                   |
| `StateManager`      | scoped    | État visité par exploration       |
| `ExplorationGraph`  | scoped    | Graphe par exploration            |
| `Explorer`          | scoped    | Orchestrateur, 1 par exploration  |

## Commandes résumé

| Commande                | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run explore`       | Lance l'exploration IANA, génère les JSON |
| `npm run explore:llama` | Lance l'exploration LlamaSticot           |
| `npm run replay`        | Rejoue les scénarios IANA depuis les JSON |
| `npm run replay:llama`  | Rejoue les scénarios LlamaSticot          |
| `npm run test`          | Lance tous les tests (y compris replay)   |
