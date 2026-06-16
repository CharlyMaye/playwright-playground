# Analyse du module `explorer/`

> Document d'analyse technique généré à partir d'une revue du code source.

## Vue d'ensemble

`explorer/` est un **moteur d'exploration automatique d'UI** (crawler de states). Il
navigue tout seul dans une application, déclenche des interactions (click, hover,
fill…), détecte les états distincts du DOM, et construit un **graphe
états/transitions** exploitable pour générer des scénarios de tests, des
visualisations ou des audits de couverture.

C'est de l'**automated model-based testing** : au lieu d'écrire des tests à la
main, on laisse l'explorer cartographier l'appli.

## Architecture — Ports & Adapters (hexagonale)

Le point fort du design : un **cœur driver-agnostic** + des **adapters** par
backend. Le cœur ne connaît jamais le DOM/CSS/Playwright — il manipule uniquement
des `ElementFact` normalisés et des tokens opaques.

```
┌─ Core (driver-agnostic) ──────────────────────────────┐
│  Explorer ........ boucle BFS/DFS, frontier, rollback  │
│  StateManager .... hash SHA-256 d'un état              │
│  RulesEngine ..... facts → actions (json-rules-engine) │
│  ExplorationGraph  nœuds/arêtes, cycles, scénarios     │
│  Ports (abstract): DOMExtractor, ActionExecutor,       │
│    StateRestorer, NavigationDriver, ReadinessChecker,  │
│    DefaultRules                                        │
└────────────────────────────────────────────────────────┘
                          ▲ implémentés par
┌─ adapters/playwright ──────────────────────────────────┐
│  PlaywrightDOMExtractor / ActionExecutor / Restorer /  │
│  NavigationDriver / ReadinessChecker / HtmlDefaultRules│
└────────────────────────────────────────────────────────┘
```

Tout est câblé via **injection de dépendances** (`@Injector`,
`registerScoped/Singleton`, scopes DI dans `fixture.ts`). Conséquence : on
pourrait brancher un adapter **Puppeteer ou WPF/desktop** sans toucher au cœur —
c'est explicitement anticipé dans les commentaires (`currentLocation()` opaque,
restore par replay d'actions, etc.).

## Boucle d'exploration (`Explorer.ts`, le cerveau)

1. **Capture état initial** → extraction des facts → hash → nœud S0, snapshot d'un
   restore-token.
2. **Frontier loop** (BFS = `shift`, DFS = `pop`) tant que
   `maxDepth`/`maxStates`/`timeout` non atteints.
3. Pour chaque état : `RulesEngine.evaluate(facts)` produit des actions
   candidates, filtrées (supportées + non déjà tentées).
4. **Exécution d'une action** → 3 issues :
   - **navigation** (in-app → nouveau state en mode crawler ; externe → arête
     `__external_navigation__`),
   - **self-loop** (hash inchangé — conservé pour rejouer hover/focus en visual
     regression),
   - **nouvel état / cycle** → enregistré dans le graphe.
5. **Rollback** vers l'état courant avant l'action suivante.

Le point le plus fin : le **rollback des états SPA**. Sur le web, le restore =
`page.goto(url)`. Mais des états atteints par pure interaction partagent la même
URL → un `goto` retomberait sur S0. L'explorer détecte ce cas
(`token === initialToken`) et **rejoue le chemin d'actions** depuis la racine
(`#actionPaths`). Solution propre à un vrai problème.

## Identité d'un état (`StateManager`)

Hash SHA-256 (tronqué 16) des facts **in-scope**, avec deux stratégies :

- `interactive-only` (défaut) — `uid|visible|enabled|ariaExpanded` : robuste au
  contenu dynamique (dates, compteurs).
- `structure` — ajoute `tag|role`.
- En mode crawler, la `location` est préfixée au hash (même DOM sur 2 URLs ≠ même
  état). Détail soigné : en mode SPA elle est omise pour **garder les hash
  identiques aux graphes historiques** → compat ascendante pensée.

## Configuration (`ExplorationConfig.ts`)

Schéma **Zod** ~25 options avec defaults et TSDoc exhaustive (stratégie,
scope/`rootSelector`, `boundary`+overflow pour les CDK overlays, filtres,
`fillValues`, readiness, screenshots, règles custom, export HTML). Pattern propre :
`PartialExplorationConfig` (input) vs `ExplorationConfigData` (résolu), exposé via
getters read-only servant aussi de token DI.

## Points forts

- **Documentation exemplaire** : TSDoc anglais sur quasiment tout symbole public,
  conforme aux instructions `angular.md`/`rust.md`. Les commentaires expliquent le
  *pourquoi* (ex. batch `evaluateAll` = 1 round-trip au lieu de 3/élément).
- **SOLID/hexagonal** respecté à la lettre : SRP par classe, ports minces,
  dépendances inversées via DI.
- **Robustesse** : erreurs avalées là où il faut (screenshots best-effort, règles
  par fact, readiness timeout), garde-fous (`maxStates`/`timeout`).
- **Couverture de test** : 6 specs (~1300 lignes), dont un fake-driver pour tester
  le cœur sans navigateur + une intégration avec `test-page.html`.

## Points d'attention / améliorations

1. **`todo.md` (note interne)** — ✅ *résolu* : nouveau port `StabilizationChecker`
   (impl `PlaywrightStabilizationChecker`) qui remplace les `waitForTimeout` fixes
   par une **détection de quiescence bornée** — `MutationObserver` (calme DOM
   pendant `stabilizationQuietPeriod`) + stabilité de la bounding box du root sur
   2 frames `requestAnimationFrame` (capte les transitions CSS, cf. *« dimensions
   d'un élément »* du todo). Plafonné par `stabilizationTimeout` : pire cas = ancien
   comportement, cas courant quasi instantané. Stratégie réglable via
   `stabilizationStrategy: 'fixed' | 'dom-quiet' | 'dom-quiet+layout'`
   (défaut `'dom-quiet+layout'`). `'fixed'` reproduit l'ancien comportement.
   ⚠️ Le défaut ayant changé, les graphes/hashes découverts par les suites
   existantes (IANA) peuvent légèrement différer ; repasser en `'fixed'` pour
   reproduire à l'identique.
2. **`ignoreSelectors` trompeur** — ✅ *résolu* : le filtrage est désormais appliqué
   **dans le navigateur** (`collectAllElementProps`) avec un vrai matching CSS
   (`matches` / `closest`), donc un `.cookie-banner button` ou un
   `[data-testid="logout-btn"]` est réellement exclu, y compris via un ancêtre.
3. **`selectStrategy: 'random'`/`'all'`** — ✅ *résolu* : l'extracteur capture les
   labels d'`<option>` (`ElementFact.options`) et le `RulesEngine` génère 1 action
   (`first`/`random`) ou N actions (`all`, une par option). `Explorer.#actionKey`
   intègre l'option pour ne pas dédupliquer les actions `all`.
   ⚠️ `random` rend le graphe non-déterministe (par conception, documenté).
4. **Mélange FR/EN** dans `ExplorationGraph` — ✅ *résolu* : les abstracts d'export
   (`toJSON`/`toDOT`/`toMermaid`) sont repassés en anglais, conformément aux
   instructions sur les API publiques.
5. ~~**`adapters/playwright` vide listé**~~ — ❌ *faux positif* : il n'y a aucun
   sous-dossier vide ; la ligne `0 adapters/playwright` venait de `wc -l` appliqué
   à un répertoire.
6. **`getScenarios()` renvoyait 0 sur graphe sans root** — ✅ *résolu* : `getScenarios`
   itérait sur `getRoots()` ; un simple back-edge vers l'état initial (lien « accueil »
   qui reboucle sur la page de départ) supprimait **tout** root → 0 scénario malgré des
   centaines de transitions découvertes. Vérifié sur les données réelles : scope `body`
   = 0 root, **0 scénario** stocké → **431 scénarios** après correctif. Fix : nouvel
   `#scenarioEntryPoints()` qui retombe sur l'état le moins profond (`depth === 0`, l'état
   initial) quand aucun root n'existe ; le `visited` du DFS garde le parcours fini. Cas
   « avec roots » (ex. `footer`) inchangé. ⚠️ Les JSON déjà générés (`body`, `header`)
   gardent `scenarios: 0` tant qu'on ne relance pas `npm run explore` (réseau live).

## Performances & mémoire (OOM sur exploration IANA)

**Symptôme** : `JavaScript heap out of memory` (~4 Go) pendant la génération JSON ;
`iana-body.json` = **68 Mo**, dont **96 % de facts** (78 789 facts retenus, un seul
état `#body` = 11 552 facts) alors que les consommateurs (`ExplorationPOM`,
`GraphHtmlExporter`) ne lisent que `uid → nativeSelector` et `facts.length`.

**Causes & correctifs** :

1. **Facts surdimensionnés dans le JSON** — ✅ : `toJSON({ facts })` projette en
   `'minimal'` (uid + nativeSelector, défaut), `'none'` ou `'full'` ; config
   `serializeFacts`. **68 Mo → 11 Mo (×6)** sur `body`.
2. **`JSON.stringify(data, null, 2)`** — ✅ : écriture **compacte** (pas
   d'indentation) dans le générateur — supprime le pic de string et ~×2 la taille.
3. **`getScenarios()` exponentiel** (`Infinity`) — ✅ : borné par `maxScenarios`
   (défaut 1000) + `maxDepth`, arrêt anticipé dans `#dfsCollectPaths`.
4. **Facts retenus en mémoire vive toute la session** — ✅ : `Explorer.#evictFacts`
   réduit `StateNode.facts` à `{uid, nativeSelector}` dès qu'un état est exploré
   (ou est une feuille) ; désactivé sous `serializeFacts: 'full'`. Libère le tas
   **pendant** l'exploration, pas seulement à l'écriture.

**Piste restante (opt-in, non faite)** : cap d'extraction `maxFacts` pour borner
les ~11k éléments extraits/hashés à chaque capture sur les très gros scopes —
change les hashes/résultats, donc à activer explicitement.

## Refactorisation archi / SOLID (5 lots — voir `PLAN-ARCHI.md`)

Revue clean-archi/SOLID et exécution complète (56/56 specs explorer ✅, `tsc`/`eslint` ✅).

1. **Dégraissage (ISP)** — ✅ : suppression du code mort (`getPathsFrom`,
   `getSuccessors`/`getPredecessors`) et de la redondance d'export (`ScenarioExporter`
   réduit à `exportScenarios()`). *Non faits, justifiés* : unification de `#actionLabel`
   (changerait le format des noms de scénarios → compat replay) et `GraphHtmlExporter→
   getStats` (fausse dup : champs et entrées différents).
2. **Observer** — ✅ : `Explorer` redevient une boucle pure ; screenshots et éviction
   extraits dans `ScreenshotObserver`/`FactEvictionObserver`, agrégés par
   `CompositeExplorationObserver` derrière le port `ExplorationObserver`. La trace
   (`#log`) reste inline (narration intrinsèque de l'algo).
3. **Exporter/Visitor (SRP)** — ✅ : la sérialisation quitte `ExplorationGraph` pour
   `GraphSerializer` (`serializeGraph`/`graphToDOT`/`graphToMermaid`, fonctions pures) ;
   le graphe n'est plus que structure + algos et expose `getTransitions()`.
4. **Typage de l'éviction (LSP)** — ✅ : `StateNode.facts` devient un union honnête
   `ElementFact[] | MinimalElementFact[]` ; l'éviction n'a plus de cast. Le seul `as`
   restant est centralisé/documenté dans `Explorer.#liveFacts` (ré-assertion de
   l'invariant « un nœud de la frontière porte toujours ses facts complets »).
5. **Frontier Strategy (OCP)** — ✅ : le ternaire `bfs/dfs` par itération devient un
   objet `Frontier` (`FifoFrontier`/`LifoFrontier`), choisi une fois par run. Ouvre la
   voie à une exploration *priority-guided* sans toucher la boucle.
