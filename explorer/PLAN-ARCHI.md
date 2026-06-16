# Plan de refactorisation — module `explorer/`

> Revue d'architecture (clean archi / SOLID / simplification / design patterns) et
> plan d'exécution par lots. Établi à partir d'une lecture complète du cœur, des
> ports, des adapters et d'une vérification de l'usage réel de l'API (grep).
>
> **Périmètre** : `explorer/` n'est pas un « projet » au sens d'`AGENT.md` (pas
> d'`angular.json`/`Cargo.toml`) → pas de `CAHIER_DES_CHARGES.md`. Ce plan tient lieu
> de feuille de route.

## Verdict global

Module **au-dessus de la moyenne** : hexagonal réel, DI propre, TSDoc exemplaire,
bonne couverture de tests. Les défauts sont **localisés**, pas structurels :

1. **Interface trop large** (ISP) — le port `ExplorationGraph` expose ~20 méthodes,
   dont du code mort.
2. **Responsabilités d'export mal placées** (SRP) — la sérialisation vit dans la
   structure de données ; `ScenarioExporter` existe mais ne fait que re-déléguer.
3. **Orchestrateur qui fait trop** (SRP) — `Explorer.ts` (438 l.) entremêle boucle,
   screenshots, trace et éviction mémoire.

Aucune réécriture nécessaire — du **dégraissage** et **3 extractions de patterns**.

---

## ✅ Statut d'exécution (2026-06-16)

**Les 5 lots sont réalisés et validés** (`tsc` ✅, `eslint` ✅, **56/56 specs explorer ✅**).
Les 12 échecs du projet `unit-tests` sont des tests de démo `engine/__tests__` (token
`FakeClass` non enregistré — `register.ts` n'est importé nulle part) : **préexistants et
hors périmètre** (aucun fichier `engine/`/`setup/` touché).

| Lot | État | Écart assumé vs plan initial |
|---|---|---|
| 1 — Dégraissage | ✅ Fait | `formatActionLabel` **non fait** (changerait le format des noms de scénarios → risque compat replay) ; `GraphHtmlExporter→getStats` **non fait** (champs `selfLoops`/`external` absents de `getStats`, entrées différentes — fausse dup) |
| 2 — Observer | ✅ Fait | **Trace gardée inline** (narration intrinsèque de l'algo ; un `onMessage` passe-plat = indirection sans bénéfice SRP). Extraits : screenshots + éviction, via `ExplorationObserver` + 2 observers + `CompositeExplorationObserver` |
| 3 — Exporter/Visitor | ✅ Fait | `serializeGraph`/`graphToDOT`/`graphToMermaid` en **fonctions pures** (pas de classe/DI) ; graphe expose `getTransitions()` |
| 4 — Typage éviction | ✅ Fait | `StateNode.facts` = union honnête ; éviction **sans cast** ; un seul `as ElementFact[]` subsiste, centralisé et documenté dans `#liveFacts` (ré-assertion de l'invariant de frontière, pas un mensonge de type) |
| 5 — Frontier | ✅ Fait | `Frontier` + `FifoFrontier`/`LifoFrontier`, sélection une fois par run via `#createFrontier` ; pas de `PriorityFrontier` spéculatif (YAGNI) |

**Nouveaux fichiers** : `ExplorationObserver.ts`, `ScreenshotObserver.ts`,
`FactEvictionObserver.ts`, `CompositeExplorationObserver.ts`, `GraphSerializer.ts`,
`Frontier.ts`, `__tests__/graph-serializer.spec.ts`.

---

## Partie A — Constats détaillés

### A.1 Code mort / quasi-mort (vérifié par grep)

| Élément | Emplacement | Constat | Action |
|---|---|---|---|
| `getPathsFrom` | `ExplorationGraph.ts:158` (port `:46`) | **0 usage** (ni prod, ni test) | Supprimer port + impl |
| `getSuccessors` / `getPredecessors` | `ExplorationGraph.ts:138-148` (port `:33-35`) | Utilisés **uniquement par leur propre test** | Supprimer (ou marquer `@internal`) + retirer le test |
| `exportJSON` / `exportMermaid` / `exportDOT` | `ScenarioExporter.ts:58-68` | Pure délégation ; **la prod appelle `graph.toMermaid()`/`.toDOT()` en direct** (`tests/exploration/iana.generate.ts:119-120`) | Réduire `ScenarioExporter` à `exportScenarios()` |

> **Redondance principale** : deux chemins parallèles vers les mêmes exports
> (`graph.toX()` *vs* `exporter.exportX()`). La prod utilise le premier, les tests
> le second.

### A.2 Duplications

| Duplication | Emplacements | Action |
|---|---|---|
| Calcul de stats (states/transitions/maxDepth/selfLoops/external) | `GraphHtmlExporter.ts:96-102` recalcule à la main ce que `getStats()` fournit déjà | Brancher sur `graph.getStats()` |
| `#actionLabel` (libellé d'action) | 3 variantes : `Explorer.ts:407`, `ScenarioExporter.ts:77`, `POM/ExplorationPOM.ts:185` | Helper partagé dans `types.ts` (`formatActionLabel`) |
| Tri « par profondeur puis id » (labels S0/S1…) | `Explorer` (`#stateLabels`) et `GraphHtmlExporter.ts:31` (`buildLabels`) | Acceptable (fallback) — à laisser |

### A.3 SOLID — bilan par principe

| Principe | État | Détail |
|---|---|---|
| **D** — Dependency Inversion | ✅ Exemplaire | Tout via ports + DI ; le cœur n'importe jamais Playwright |
| **O** — Open/Closed | ✅ Excellent | `json-rules-engine`, ports par driver, stratégies par enum |
| **S** — Single Responsibility | ⚠️ | `ExplorationGraph` cumule **3 rôles** : structure + algos (cycles/paths) + **sérialisation 3 formats**. `Explorer` cumule boucle + screenshots + trace + éviction |
| **I** — Interface Segregation | ⚠️ | Port `ExplorationGraph` ~20 méthodes ; aucun client n'en consomme > 6. Séparation lecture/écriture possible |
| **L** — Liskov Substitution | ⚠️ | `Explorer.#evictFacts` (`Explorer.ts:394`) fabrique `{uid, nativeSelector} as ElementFact` → objet qui **ment sur son type**. `MinimalElementFact` existe pourtant déjà, mais `StateNode.facts` reste typé `ElementFact[]` |

### A.4 Clarté

- **Très bonne** globalement : le *pourquoi* est documenté partout.
- **Zones denses** (commentées, mais à surveiller) :
  - Replay SPA dans le rollback — `Explorer.ts:356-380`.
  - Traitement des self-loops dans `#dfsCollectPaths` — `ExplorationGraph.ts:277-324`.
- **Point le moins lisible** : `Explorer.ts` (438 l.), parce que la boucle mélange
  exploration / screenshots / log / éviction (cf. A.3 SRP). Traité par le Lot 2.

### A.5 Design patterns

**Déjà présents et bien employés** : Ports & Adapters (hexagonal), Dependency
Injection, Strategy (enums `domHashStrategy`/`selectStrategy`/`stabilizationStrategy`,
`bfs`/`dfs`), Rules engine, Command (`CandidateAction` + `ActionExecutor`),
Builder (`PartialExplorationConfig` → résolu), Memento (`RestoreToken`).

**À envisager** :

| Pattern | Cible | Gain |
|---|---|---|
| **Observer / Listener** (`ExplorationObserver` : `onStateDiscovered` / `onTransition` / `onActionFailed` / `onStateExhausted`) | Extrait screenshots + `#log` + `#evictFacts` d'`Explorer` | **Gain principal** : `Explorer` redevient une boucle pure ; screenshots/trace/éviction/progress deviennent des plugins branchables. Résout le SRP de l'orchestrateur |
| **Visitor / Exporter** | Sort `toJSON`/`toDOT`/`toMermaid` de `ExplorationGraph` vers des exporters dédiés | Résout **en une fois** le SRP du graphe **et** la redondance `ScenarioExporter` |
| **Strategy objet `Frontier`** (queue / stack / priority) | Remplace le ternaire `#takeNext` (`Explorer.ts:323`) | OCP ; ouvre l'exploration *priority-guided* (par `priority` d'action) |

---

## Partie B — Plan d'exécution par lots

Ordonné par **ratio gain / risque décroissant**. Chaque lot est indépendant et
livrable seul, avec sa propre validation (`npx playwright test explorer/__tests__`).

### Lot 1 — Dégraissage (risque nul, pur retrait)

**Objectif** : réduire la surface d'API au strict consommé.

- [ ] Supprimer `getPathsFrom` (port `ExplorationGraph.ts:46` + impl `:158-162`).
- [ ] Supprimer `getSuccessors` / `getPredecessors` (port `:33-35` + impl `:138-148`)
      **ou** les rendre `@internal` si on veut garder la primitive de graphe.
- [ ] Réduire `ScenarioExporter` à `exportScenarios()` ; retirer `exportJSON` /
      `exportMermaid` / `exportDOT`. Adapter `ScenarioExporter.spec.ts`.
- [ ] Brancher `GraphHtmlExporter` (`:96-102`) sur `graph.getStats()` au lieu du
      recalcul manuel.
- [ ] Extraire `formatActionLabel(action)` dans `types.ts`, réutilisé par `Explorer`,
      `ScenarioExporter`, `ExplorationPOM`.

**Fichiers** : `ExplorationGraph.ts`, `ScenarioExporter.ts`, `GraphHtmlExporter.ts`,
`types.ts`, `POM/ExplorationPOM.ts` + specs associées.
**Validation** : tests verts, `tsc` propre, API publique (`index.ts`) inchangée hors
symboles retirés.
**Risque** : nul (retrait de code non consommé en prod).

### Lot 2 — Observer (extrait les préoccupations transverses d'`Explorer`)

**Objectif** : `Explorer` = boucle d'exploration pure.

- [ ] Définir le port `ExplorationObserver` (abstract) avec hooks no-op par défaut :
      `onInitialState`, `onStateDiscovered`, `onTransition`, `onSelfLoop`,
      `onActionFailed`, `onStateExhausted`, `onDone`.
- [ ] Implémenter 3 observers concrets :
      - `ScreenshotObserver` (logique de `#captureScreenshot`),
      - `TraceObserver` (logique de `#log`, gardé par `debugTrace`),
      - `FactEvictionObserver` (logique de `#evictFacts`, gardé par `serializeFacts`).
- [ ] Injecter une **liste** d'observers dans `ConcreteExplorer` (multi-binding DI) ;
      retirer les méthodes privées correspondantes de la boucle.
- [ ] Tests : un observer espion vérifie l'ordre des hooks sur le fake-driver.

**Fichiers** : nouveau `ExplorationObserver.ts` + impls (adapter pour screenshots),
`Explorer.ts`, `index.ts`, `fixture.ts` (câblage), specs.
**Validation** : `explorer-fake-driver.spec.ts` + `explorer-integration.spec.ts` verts ;
l'assertion d'éviction existante reste valable.
**Risque** : moyen (touche la boucle centrale) — mitigé par les tests fake-driver.
**Dépend de** : rien (mais se fait mieux après le Lot 1).

### Lot 3 — Exporter / Visitor (sort la sérialisation du graphe)

**Objectif** : `ExplorationGraph` = structure + algos uniquement.

- [ ] Créer `GraphSerializer` (ou enrichir `ScenarioExporter`) portant `toJSON`,
      `toDOT`, `toMermaid` ; le graphe expose un parcours minimal (`getAllStates`,
      `getTransitions`).
- [ ] Retirer `toJSON`/`toDOT`/`toMermaid` du port `ExplorationGraph`.
- [ ] Mettre à jour les appelants : `Explorer` (export HTML), `iana.generate.ts`.
- [ ] (Option) Scinder le port en `GraphReader` / `GraphWriter` (ISP) — à évaluer
      selon le coût sur les tests.

**Fichiers** : `ExplorationGraph.ts`, `ScenarioExporter.ts` (ou nouveau
`GraphSerializer.ts`), `GraphHtmlExporter.ts`, `Explorer.ts`, `index.ts`,
`tests/exploration/iana.generate.ts`, specs.
**Validation** : sortie JSON/Mermaid/DOT **identique octet-à-octet** avant/après
(test de non-régression sur un petit graphe).
**Risque** : moyen (déplace une API publique) — neutralisé par le test d'identité.
**Dépend de** : Lot 1 (réduction préalable de `ScenarioExporter`).

### Lot 4 — Typage de l'éviction (résorbe le wart LSP)

**Objectif** : supprimer le `as ElementFact` de complaisance.

- [ ] Re-typer `StateNode.facts: ElementFact[] | MinimalElementFact[]` **ou** introduire
      un `EvictedStateNode` ; propager le type aux lecteurs (`StateManager` ne lit les
      facts complets qu'avant éviction, les exporters ne lisent que `uid`/`nativeSelector`).
- [ ] Retirer le cast dans `Explorer.#evictFacts` et `ExplorationGraph.toJSON`.

**Fichiers** : `types.ts`, `Explorer.ts`, `ExplorationGraph.ts`, `POM/ExplorationPOM.ts`.
**Validation** : `tsc` propre **sans cast**, tests verts.
**Risque** : moyen-élevé (le type ripple sur tous les lecteurs de `facts`) — à faire
en dernier, une fois la surface réduite par les lots 1 et 3.
**Dépend de** : Lots 1 et 3.

### Lot 5 — `Frontier` Strategy (optionnel, ouverture fonctionnelle)

**Objectif** : remplacer le ternaire `bfs/dfs` par un objet, ouvrir le *priority-guided*.

- [ ] Port `Frontier` : `push(state)`, `take(): StateNode`, `get size`.
- [ ] Impls : `FifoFrontier` (BFS), `LifoFrontier` (DFS), (futur) `PriorityFrontier`.
- [ ] `ConcreteExplorer` consomme `Frontier` au lieu du tableau + `#takeNext`.

**Risque** : faible. **Valeur** : surtout si l'exploration priorisée est au backlog —
sinon **YAGNI**, ne pas faire spéculativement.

---

## Partie C — Garde-fous

- **Ne pas** abstraire spéculativement (Lot 5 = seulement si besoin réel) — SOLID sert
  la changeabilité, pas l'abstraction pour elle-même.
- **Compat ascendante** : les hashes d'état et le format JSON consommé par
  `ExplorationPOM` ne doivent pas changer (lots 1–4 sont des refactos internes). Le Lot 3
  exige un test d'identité de sérialisation.
- **Chaîne fin-de-dev** après chaque lot : qualité (build/lint/test) → pas de RGPD/perf
  impactés ici (refacto interne, pas de données personnelles).
- **Git** : aucun commit sans demande explicite.

---

## Récapitulatif — priorisation

| Lot | Gain | Risque | Dépend de | État |
|---|---|---|---|---|
| 1 — Dégraissage | Réduit l'API morte immédiatement | Nul | — | ✅ Fait |
| 2 — Observer | `Explorer` boucle pure (SRP) | Moyen | (Lot 1) | ✅ Fait |
| 3 — Exporter/Visitor | SRP graphe + fin de la redondance | Moyen | Lot 1 | ✅ Fait |
| 4 — Typage éviction | Supprime le cast LSP | Moyen-élevé | Lots 1, 3 | ✅ Fait |
| 5 — Frontier | Ouvre priority-guided | Faible | — | ✅ Fait |
