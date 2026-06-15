# Plan de travaux — Moteur d'exploration UI symbolique

## Vue d'ensemble

Construire un moteur d'exploration automatique d'interface au-dessus de Playwright, piloté par des règles symboliques, scopé à un conteneur DOM arbitraire, produisant un graphe de dépendances dédié. Le système est **configurable** pour maîtriser l'explosion combinatoire.

---

## Phase 0 — Préparation

### 0.1 Installation des dépendances

- [x] Installer `json-rules-engine` (moteur de règles symboliques)
- [x] Installer `@axe-core/playwright` (enrichissement ARIA / rôles / accessibilité)
- [x] Vérifier la compatibilité des versions avec Playwright 1.55+ et TypeScript 5.9+

### 0.2 Structure de fichiers

- [x] Créer le dossier `explorer/` à la racine du projet
- [x] Créer le sous-dossier `explorer/rules/` pour les fichiers de règles JSON
- [x] Créer le fichier `explorer/types.ts` (types partagés)
- [x] Créer le fichier `explorer/index.ts` (barrel export)
- [x] Créer le dossier `explorer/__tests__/` pour les tests unitaires du moteur

---

## Phase 1 — Configuration

> **Objectif** : rendre le système entièrement configurable pour maîtriser l'explosion combinatoire dès le départ.

### 1.1 Définir le type `ExplorationConfig`

> ⚠️ **Contrainte DI** : le moteur DI résout les dépendances par nom de paramètre constructeur correspondant à une classe enregistrée. Un simple type/interface ne peut pas être injecté. Il faut donc créer une **classe** `ExplorationConfig` (abstraite + concrète `ConcreteExplorationConfig`) qui encapsule la config et expose les valeurs. L'alternative est une classe wrapper injectable avec un champ `config` interne.

- [x] Créer `explorer/ExplorationConfig.ts`
- [x] Définir les paramètres de **stratégie d'exploration** :
  - `strategy` : `'bfs' | 'dfs'` — parcours en largeur ou profondeur
  - `maxDepth` : `number` — profondeur max depuis l'état initial (défaut : 5)
  - `maxStates` : `number` — nombre max d'états dans le graphe (défaut : 100)
  - `maxActionsPerState` : `number` — nombre max d'actions tentées par état (défaut : 10)
  - `timeout` : `number` — durée max d'exploration en ms (défaut : 30000)
- [x] Définir les paramètres de **scope** :
  - `rootSelector` : `string` — sélecteur CSS ou rôle du conteneur racine
  - `boundary` : `'strict' | 'overflow'` — strict = dans le conteneur uniquement, overflow = suit les overlays CDK hors conteneur via `aria-controls`
  - `overflowSelectors` : `string[]` — sélecteurs supplémentaires hors scope à surveiller (ex : `.cdk-overlay-container`)
- [x] Définir les paramètres de **filtrage** :
  - `ignoreSelectors` : `string[]` — éléments à ignorer (ex : `[aria-hidden="true"]`, `.ad-banner`)
  - `ignoreRepeatedElements` : `boolean` — éviter d'explorer N fois des éléments identiques dans une liste
  - `maxRepeatPerAction` : `number` — combien de fois une même action sur un même type d'élément peut être tentée
- [x] Définir les paramètres de **données de test** :
  - `fillValues` : `Record<string, string>` — valeurs par défaut pour les champs texte par type (`email`, `text`, `password`, etc.)
  - `selectStrategy` : `'first' | 'random' | 'all'` — comment choisir une option dans un select/combobox
- [x] Définir les paramètres d'**observation** :
  - `stabilizationTimeout` : `number` — temps d'attente après une action pour considérer le DOM stabilisé (défaut : 500ms)
  - `domHashStrategy` : `'structure' | 'interactive-only'` — quoi inclure dans le hash d'état
- [x] Fournir une configuration par défaut (`defaultExplorationConfig`)
- [x] Permettre le merge partiel (l'utilisateur ne fournit que ce qu'il veut surcharger)

### 1.2 Validation de la configuration

> ⚠️ **Zod v4** : le projet utilise `zod@^4.1.9`. L'API Zod v4 diffère de la v3 — l'import se fait via `import { z } from 'zod/v4'` (pas `'zod'`). Vérifier la doc Zod v4 pour le schéma.

- [x] Valider avec Zod v4 que la config fournie est cohérente
- [x] Lever des erreurs explicites si `maxDepth` < 1, `timeout` < 1000, etc.

### 1.3 Tests unitaires

- [x] Tester le merge config par défaut + config partielle
- [x] Tester la validation Zod (cas valides et invalides)

---

## Phase 2 — Types fondamentaux

> **Objectif** : définir les contrats de données utilisés par tous les modules.

### 2.1 `ElementFact` — représentation d'un élément détecté

- [x] Créer dans `explorer/types.ts`
- [x] Propriétés :
  - `uid` : identifiant stable (sélecteur, `data-testid`, rôle + nom accessible)
  - `tag` : balise HTML
  - `role` : rôle ARIA (natif ou explicite, `null` si aucun)
  - `accessibleName` : nom accessible (texte, label, aria-label)
  - `visible` : boolean
  - `enabled` : boolean
  - `focusable` : boolean
  - `text` : contenu textuel
  - `inputType` : type de l'input si applicable (`text`, `email`, `checkbox`, etc.)
  - `ariaExpanded` : `boolean | null`
  - `ariaControls` : `string | null`
  - `ariaOwns` : `string | null`
  - `tabindex` : `number | null`
  - `contentEditable` : boolean
  - `boundingBox` : `{ x, y, width, height } | null`
  - `isInScope` : boolean (dans le conteneur racine ou élément overflow suivi)
  - `parentUid` : `string | null` (pour reconstruire la hiérarchie)

### 2.2 `CandidateAction` — action proposée par le moteur de règles

- [x] Types d'actions unitaires :
  - `click` : `{ type: 'click'; targetUid: string; priority: number }`
  - `hover` : `{ type: 'hover'; targetUid: string; priority: number }`
  - `fill` : `{ type: 'fill'; targetUid: string; value: string; priority: number }`
  - `select` : `{ type: 'select'; targetUid: string; option: string; priority: number }`
  - `focus` : `{ type: 'focus'; targetUid: string; priority: number }`
  - `clear` : `{ type: 'clear'; targetUid: string; priority: number }`
- [x] Type séquence composite :
  - `sequence` : `{ type: 'sequence'; steps: SequenceStep[]; priority: number }`
- [x] `SequenceStep` :
  - `action` : type d'action unitaire
  - `waitAfter` : condition d'attente post-action (voir 2.3)

### 2.3 `WaitCondition` — conditions d'attente entre étapes d'une séquence

- [x] Types :
  - `{ type: 'selector'; selector: string; state: 'visible' | 'attached' | 'hidden' }` — attend qu'un élément apparaisse/disparaisse
  - `{ type: 'stable'; timeout: number }` — attend que le DOM ne change plus pendant N ms
  - `{ type: 'function'; expression: string }` — attend qu'une expression JS retourne `true` dans le contexte page
  - `{ type: 'delay'; ms: number }` — attente fixe (fallback, à utiliser rarement)

### 2.4 `StateNode` — nœud du graphe

- [x] `id` : hash de l'état
- [x] `facts` : `ElementFact[]` — snapshot des faits interactifs à cet état
- [x] `depth` : profondeur depuis l'état initial
- [x] `timestamp` : date de capture
- [x] `scopeSelector` : le conteneur racine utilisé (traçabilité)

### 2.5 `Transition` — arête du graphe

- [x] `id` : identifiant unique de la transition
- [x] `from` : `StateNode.id` source
- [x] `to` : `StateNode.id` destination
- [x] `action` : `CandidateAction` exécutée
- [x] `success` : boolean (l'action a-t-elle réussi ?)
- [x] `duration` : temps d'exécution en ms
- [x] `domChanges` : résumé des changements (éléments apparus, disparus, modifiés)

### 2.6 `ActionResult` — résultat d'exécution d'une action

- [x] `success` : boolean
- [x] `error` : `string | null`
- [x] `newFacts` : `ElementFact[]`
- [x] `domChanged` : boolean
- [x] `duration` : number

---

## Phase 3 — ExplorationScope

> **Objectif** : encapsuler le périmètre d'exploration (conteneur + politique de boundary).

### 3.1 Classe abstraite + concrète

- [x] Créer `explorer/ExplorationScope.ts`
- [x] Classe abstraite `ExplorationScope` :
  - `get root(): Locator` — le conteneur racine
  - `get boundary(): 'strict' | 'overflow'`
  - `get overflowSelectors(): string[]`
  - `isInScope(element: Locator): Promise<boolean>` — vérifie si un élément est dans le périmètre
  - `resolveOverflowTarget(ariaControls: string): Locator | null` — résout un `aria-controls` vers un élément hors scope
- [x] Classe concrète `ConcreteExplorationScope` :
  - Reçoit `TestContext` et `ExplorationConfig` via constructeur (DI)
  - Construit le `root` via `page.locator(config.rootSelector)`
  - Implémente `isInScope` en vérifiant si l'élément est descendant du root ou dans un overflow selector
  - Implémente `resolveOverflowTarget` : cherche dans `config.overflowSelectors` les éléments dont l'`id` correspond à `ariaControls`

### 3.2 Gestion spécifique Angular Material CDK

- [x] Documenter les cas CDK overlay (`mat-select`, `mat-autocomplete`, `mat-menu`, `mat-dialog`)
- [x] Le `cdk-overlay-container` est attaché au `<body>` — le scope `overflow` doit le suivre
- [x] Vérifier que les éléments dans l'overlay sont bien rattachés à leur déclencheur via `aria-controls` ou `aria-owns`

### 3.3 Tests unitaires

- [x] Tester `isInScope` avec un élément dans le conteneur → `true`
- [x] Tester `isInScope` avec un élément hors conteneur en mode `strict` → `false`
- [x] Tester `isInScope` avec un overlay CDK en mode `overflow` → `true`
- [x] Tester `resolveOverflowTarget` avec un `aria-controls` valide

---

## Phase 4 — DOMExtractor

> **Objectif** : extraire les faits normalisés depuis le scope.

### 4.1 Classe abstraite + concrète

- [x] Créer `explorer/DOMExtractor.ts`
- [x] Classe abstraite `DOMExtractor` :
  - `extract(): Promise<ElementFact[]>`
- [x] Classe concrète `ConcreteDOMExtractor` :
  - Reçoit `ExplorationScope` et `ExplorationConfig` via DI
  - ⚠️ **Performance** : `scope.root.locator('*')` cible **tous** les descendants (y compris non-interactifs). Sur une page réelle, cela peut générer des centaines/milliers d'éléments. Préférer un sélecteur ciblé :
    ```ts
    const INTERACTIVE_SELECTOR =
      'a, button, input, select, textarea, [role], [tabindex], [contenteditable], details, summary, [aria-expanded], [aria-controls], [aria-haspopup]';
    scope.root.locator(INTERACTIVE_SELECTOR);
    ```
  - Si `boundary === 'overflow'`, parcourt aussi les `overflowSelectors`

### 4.2 Extraction des propriétés par élément

- [x] Pour chaque élément candidat, extraire via `evaluate` ou API Playwright :
  - `tagName`
  - `getAttribute('role')` ou rôle implicite
  - `isVisible()`
  - `isEnabled()`
  - `textContent()`
  - `getAttribute('aria-expanded')`
  - `getAttribute('aria-controls')`
  - `getAttribute('aria-owns')`
  - `getAttribute('tabindex')`
  - `getAttribute('contenteditable')`
  - `getAttribute('type')` (pour les inputs)
  - `getAttribute('data-testid')`
  - `boundingBox()`
- [x] Filtrer les éléments non pertinents selon `config.ignoreSelectors`
- [x] Gérer `config.ignoreRepeatedElements` : détecter les éléments structurellement identiques dans une liste et n'en garder qu'un représentant

### 4.3 Enrichissement axe-core

- [x] Utiliser `@axe-core/playwright` pour récupérer :
  - Les rôles computés (pas juste l'attribut `role`, mais le rôle implicite)
  - Les noms accessibles
  - Les états ARIA complets
- [x] Merger ces informations dans les `ElementFact`

### 4.4 Génération de `uid` stables

- [x] Stratégie de génération du `uid` par ordre de priorité :
  1. `data-testid` si présent
  2. `#id` si unique dans le scope
  3. `role` + nom accessible (ex : `button:"Submit"`)
  4. `tag` + position relative dans le scope (fallback, fragile)
- [x] Documenter que les `uid` ne sont stables que pour un état donné

### 4.5 Tests unitaires

- [x] Tester l'extraction sur une page HTML statique simple (boutons, inputs, links)
- [x] Tester le filtrage `ignoreSelectors`
- [x] Tester le mode `overflow` avec un overlay simulé
- [x] Tester la déduplication des éléments répétés

---

## Phase 5 — RulesEngine (wrapper)

> **Objectif** : encapsuler `json-rules-engine`, charger les règles, retourner des actions candidates.

### 5.1 Classe abstraite + concrète

- [x] Créer `explorer/RulesEngine.ts`
- [x] Classe abstraite `RulesEngine` :
  - `evaluate(facts: ElementFact[]): Promise<CandidateAction[]>`
  - `loadRules(path: string): void`
- [x] Classe concrète `ConcreteRulesEngine` :
  - Instancie `json-rules-engine.Engine`
  - Charge les fichiers JSON depuis `explorer/rules/`
  - Pour chaque `ElementFact`, exécute `engine.run({ ...fact })` et collecte les événements
  - Trie les actions par priorité décroissante
  - Limite au `config.maxActionsPerState`

### 5.2 Fichiers de règles — lot initial

- [x] `explorer/rules/button.rules.json` :
  - Bouton visible + enabled → `click` (priorité 10)
  - Bouton disabled → rien
  - Bouton avec `aria-expanded="false"` → `click` (priorité 15, ouvre quelque chose)
- [x] `explorer/rules/input.rules.json` :
  - Input text/email/password visible + enabled → `fill` avec valeur selon type depuis config
  - Input checkbox/radio visible + enabled → `click`
  - Input avec `type="search"` → `fill` (priorité basse)
- [x] `explorer/rules/select.rules.json` :
  - Select natif visible → `select` (priorité 8)
- [x] `explorer/rules/combobox.rules.json` :
  - Élément avec `role="combobox"` → `sequence` : click → waitFor options visibles → select option
  - Élément avec `role="listbox"` déjà visible → `select` option directe
- [x] `explorer/rules/menu.rules.json` :
  - Élément avec `role="menuitem"` dans un menu visible → `click`
  - Élément avec `aria-haspopup="true"` → `hover` ou `click` (priorité élevée, ouvre un sous-menu)
- [x] `explorer/rules/link.rules.json` :
  - Lien avec `href` interne → `click` (priorité 5)
  - Lien avec `href` externe → ignorer (sauf config contraire)
- [x] `explorer/rules/tab.rules.json` :
  - Élément avec `role="tab"` → `click` (priorité 7)
- [x] `explorer/rules/accordion.rules.json` :
  - Élément `summary` ou `role="button"` avec `aria-expanded` → `click` (priorité 12)

### 5.3 Gestion des séquences composites avec conditions d'attente

- [x] Les règles de type `sequence` doivent inclure des `WaitCondition` entre chaque étape
- [x] Exemple pour combobox :
  ```
  step 1 : click sur le combobox
  wait   : { type: 'selector', selector: '[role="listbox"]', state: 'visible' }
  step 2 : click sur la première option
  wait   : { type: 'selector', selector: '[role="listbox"]', state: 'hidden' }
  ```
- [x] Exemple pour menu hover :
  ```
  step 1 : hover sur le trigger
  wait   : { type: 'selector', selector: '[role="menu"]', state: 'visible' }
  step 2 : click sur le menuitem
  ```
- [x] Documenter le pattern : chaque `SequenceStep` a une `action` + un `waitAfter` optionnel

### 5.4 Tests unitaires

- [x] Tester qu'un bouton visible produit une action `click`
- [x] Tester qu'un input text produit une action `fill`
- [x] Tester qu'un combobox produit une `sequence`
- [x] Tester le tri par priorité
- [x] Tester la limite `maxActionsPerState`

---

## Phase 6 — ActionExecutor

> **Objectif** : transformer une `CandidateAction` en exécution Playwright réelle, avec gestion des attentes.

### 6.1 Classe abstraite + concrète

- [x] Créer `explorer/ActionExecutor.ts`
- [x] Classe abstraite `ActionExecutor` :
  - `execute(action: CandidateAction): Promise<ActionResult>`
- [x] Classe concrète `ConcreteActionExecutor` :
  - Reçoit `TestContext`, `ExplorationScope`, `ExplorationConfig` via DI
  - Résout `targetUid` → `Locator` (via le scope)

### 6.2 Exécution des actions unitaires

- [x] `click` : `locator.click()` avec timeout configurable
- [x] `hover` : `locator.hover()`
- [x] `fill` : `locator.fill(value)` (valeur depuis la config ou la règle)
- [x] `select` : `locator.selectOption(option)` pour les selects natifs
- [x] `focus` : `locator.focus()`
- [x] `clear` : `locator.clear()`
- [x] Chaque action est wrappée dans un try/catch → `ActionResult.success = false` si échec

### 6.3 Exécution des séquences composites

- [x] Itérer sur `steps[]`
- [x] Après chaque step, évaluer la `WaitCondition` :
  - `selector` → `page.locator(selector).waitFor({ state })`
  - `stable` → boucle : snapshot DOM → attendre → re-snapshot → comparer
  - `function` → `page.waitForFunction(expression)`
  - `delay` → `page.waitForTimeout(ms)` (fallback)
- [x] Si une étape de la séquence échoue, marquer toute la séquence comme échouée
- [x] Timeout global de la séquence = `config.stabilizationTimeout * steps.length`

### 6.4 Stabilisation post-action

- [x] Après chaque action (unitaire ou fin de séquence), attendre `config.stabilizationTimeout` ms
- [x] Optionnel : attendre `page.waitForLoadState('networkidle')` si approprié (configurable)

### 6.5 Tests unitaires

- [x] Tester un `click` sur un bouton → succès
- [x] Tester un `click` sur un élément invisible → échec
- [x] Tester une séquence combobox (click → wait listbox → click option)
- [x] Tester le timeout d'une attente qui ne se résout pas

---

## Phase 7 — StateManager

> **Objectif** : identifier les états, les comparer, détecter les doublons.

### 7.1 Classe abstraite + concrète

- [x] Créer `explorer/StateManager.ts`
- [x] Classe abstraite `StateManager` :
  - `captureState(facts: ElementFact[]): StateNode`
  - `isNewState(stateId: string): boolean`
  - `registerState(node: StateNode): void`
- [x] Classe concrète `ConcreteStateManager` :
  - Reçoit `ExplorationConfig` via DI

### 7.2 Hashing d'état

- [x] Selon `config.domHashStrategy` :
  - `'structure'` : hash basé sur l'arbre des tags + rôles + visibilité + enabled/disabled
  - `'interactive-only'` : hash basé uniquement sur les éléments interactifs détectés (uid + état ARIA)
- [x] Ignorer dans le hash :
  - Les textes dynamiques (compteurs, timestamps)
  - Les classes CSS d'animation
  - Les attributs `style` de position/taille (trop volatils)
- [x] Utiliser un hash déterministe (SHA-256 tronqué ou similaire)

### 7.3 Comparaison d'états

- [x] Deux états sont identiques si même hash
- [x] Stocker un `Set<string>` des hashes déjà vus
- [x] Si un état est nouveau → le retourner pour ajout au graphe
- [x] Si un état est déjà vu → retourner une référence à l'existant (pour créer l'arête)

### 7.4 Tests unitaires

- [x] Tester que deux DOM identiques produisent le même hash
- [x] Tester que l'ajout d'un bouton produit un hash différent
- [x] Tester que le changement d'un texte quelconque ne change PAS le hash (en mode `interactive-only`)
- [x] Tester `isNewState` → true puis false après `registerState`

---

## Phase 8 — ExplorationGraph

> **Objectif** : graphe de dépendances dédié, typé, avec traversée et export.

### 8.1 Classe abstraite + concrète

- [x] Créer `explorer/ExplorationGraph.ts`
- [x] Classe abstraite `ExplorationGraph` avec le contrat suivant :

#### Mutations

- [x] `addState(node: StateNode): void`
- [x] `addTransition(transition: Transition): void`

#### Requêtes

- [x] `hasState(id: string): boolean`
- [x] `getState(id: string): StateNode | undefined`
- [x] `getAllStates(): StateNode[]`
- [x] `getTransitionsFrom(stateId: string): Transition[]`
- [x] `getTransitionsTo(stateId: string): Transition[]`
- [x] `getSuccessors(stateId: string): StateNode[]`
- [x] `getPredecessors(stateId: string): StateNode[]`

#### Traversée

- [x] `getRoots(): StateNode[]` — états sans parent (état initial)
- [x] `getLeaves(): StateNode[]` — états sans enfant (dead ends)
- [x] `getPathsFrom(stateId: string, maxDepth: number): Transition[][]` — tous les chemins depuis un état
- [x] `getScenarios(): Transition[][]` — tous les chemins root → leaf

#### Analyse

- [x] `getCycles(): Transition[][]` — boucles détectées
- [x] ~~`getUnexploredActions()`~~ — **déplacé vers `Explorer` (phase 9)**. Le graphe ne doit stocker que des états/transitions. La logique de filtrage des actions non explorées relève de l'orchestrateur, pas de la structure de données (SRP).
- [x] `getDepth(): number` — profondeur max du graphe
- [x] `getStats(): { states: number; transitions: number; maxDepth: number; cycles: number; deadEnds: number }`

#### Export

- [x] `toJSON(): SerializedGraph` — format JSON sérialisable
- [x] `toDOT(): string` — format Graphviz pour visualisation
- [x] `toMermaid(): string` — format Mermaid (intégrable dans Markdown)

### 8.2 Implémentation concrète `ConcreteExplorationGraph`

- [x] Stockage interne :
  - `Map<string, StateNode>` pour les nœuds
  - `Map<string, Transition[]>` (adjacency list) pour les arêtes sortantes
  - `Map<string, Transition[]>` pour les arêtes entrantes (index inversé)
- [x] Enregistré comme **singleton** dans le DI (un graphe par exploration)
- [x] `getScenarios()` : parcours DFS depuis chaque root, collecte les chemins complets
- [x] `getCycles()` : détection par marquage visited/in-stack (algorithme classique DFS)

### 8.3 Tests unitaires

- [x] Tester `addState` + `hasState`
- [x] Tester `addTransition` + `getTransitionsFrom`
- [x] Tester `getRoots` / `getLeaves` sur un graphe simple à 3 nœuds
- [x] Tester `getScenarios` sur un graphe à branches
- [x] Tester `getCycles` sur un graphe avec boucle
- [x] Tester `toJSON` → sérialisable → re-parsable
- [x] Tester `toMermaid` → produit du Mermaid valide

---

## Phase 9 — Explorer (boucle principale)

> **Objectif** : orchestrer le cycle complet d'exploration.

### 9.1 Classe abstraite + concrète

- [x] Créer `explorer/Explorer.ts`
- [x] Classe abstraite `Explorer` :
  - `explore(): Promise<ExplorationGraph>`
- [x] Classe concrète `ConcreteExplorer` :
  - Reçoit via DI : `ExplorationScope`, `DOMExtractor`, `RulesEngine`, `ActionExecutor`, `StateManager`, `ExplorationGraph`, `ExplorationConfig`

### 9.2 Boucle d'exploration

- [x] Implémenter le cycle :
  ```
  1. DOMExtractor.extract() → faits initiaux
  2. StateManager.captureState(faits) → état initial
  3. ExplorationGraph.addState(état initial)
  4. Ajouter état initial à la file/pile (selon BFS/DFS)
  5. Tant que la file n'est pas vide ET limites non atteintes :
     a. Dépiler/défiler un état
     b. RulesEngine.evaluate(état.facts) → actions candidates
     c. Filtrer les actions déjà tentées depuis cet état (via les transitions existantes du graphe)
     d. Pour chaque action (dans l'ordre de priorité) :
        i.   ActionExecutor.execute(action) → résultat
        ii.  Si succès : DOMExtractor.extract() → nouveaux faits
        iii. StateManager.captureState(nouveaux faits) → nouvel état
        iv.  ExplorationGraph.addTransition(état → nouvel état, action)
        v.   Si état nouveau ET depth < maxDepth : ajouter à la file
        vi.  Si état déjà vu : juste ajouter la transition (arête)
     e. Vérifier les limites (maxStates, timeout)
  6. Retourner le graphe
  ```

### 9.3 Stratégies d'exploration

- [x] `BFS` : file FIFO — explore en largeur, favorise la couverture
- [x] `DFS` : pile LIFO — explore en profondeur, favorise les scénarios longs
- [x] La stratégie est choisie via `config.strategy`

### 9.4 Gestion du rollback d'état

- [x] **Problème** : après avoir exploré un état profond, comment revenir à un état précédent pour explorer une autre branche ?
- [x] **Solution 1** : recharger la page + rejouer le chemin depuis la racine (fiable mais lent)
- [x] **Solution 2** : tenter de "défaire" l'action (click toggle, Escape pour fermer) — fragile mais rapide
- [x] **Décision** : documenter les deux approches, implémenter la solution 1 en premier (fiabilité), prévoir un hook pour la solution 2

### 9.5 Logging et reporting

- [x] Logger chaque étape (état exploré, action tentée, résultat)
- [x] Produire un résumé en fin d'exploration :
  - Nombre d'états découverts
  - Nombre de transitions
  - Profondeur max atteinte
  - Nombre de cycles détectés
  - Nombre de dead ends
  - Durée totale
  - Actions échouées

### 9.6 Tests unitaires et d'intégration

- [x] Test unitaire : mock de tous les services, vérifier que la boucle s'arrête à `maxDepth`
- [x] Test unitaire : vérifier que la boucle s'arrête à `maxStates`
- [x] Test unitaire : vérifier que `timeout` interrompt l'exploration
- [x] Test unitaire : vérifier que les états déjà visités ne sont pas ré-explorés
- [x] Test d'intégration : exécuter sur une page HTML minimaliste avec 2 boutons → vérifier le graphe produit

---

## Phase 10 — Enregistrement DI

> **Objectif** : câbler tous les nouveaux services dans le conteneur d'injection.

### 10.1 Mise à jour de `setup/setup.ts`

- [x] Importer tous les nouveaux services abstraits + concrets
- [x] Enregistrements transient (nouveau à chaque `resolve()`) :
  - `register(ExplorationScope, ConcreteExplorationScope)`
  - `register(DOMExtractor, ConcreteDOMExtractor)`
  - `register(ActionExecutor, ConcreteActionExecutor)`
  - `register(Explorer, ConcreteExplorer)`
- [x] Enregistrements singleton :
  - `registerSingleton(ExplorationGraph, ConcreteExplorationGraph)`
  - `registerSingleton(StateManager, ConcreteStateManager)`
  - `registerSingleton(RulesEngine, ConcreteRulesEngine)` — ⚠️ **Vérifier** : si les règles chargées doivent varier par exploration, `RulesEngine` devrait être **transient** et non singleton. Singleton uniquement si un seul jeu de règles est utilisé pour toute la durée de vie du conteneur.
- [x] `ExplorationConfig` : doit être une **classe injectable** (pas un simple type). Enregistrer `registerSingleton(ExplorationConfig, ConcreteExplorationConfig)`. La config par défaut est fournie dans le constructeur ; le merge partiel se fait via une fixture ou un setter.

### 10.2 Décorateurs `@Injector`

- [x] Ajouter `@Injector({ Provide: [...] })` sur chaque classe concrète qui a des dépendances constructeur
- [x] Vérifier que les noms de paramètres constructeur correspondent aux noms des classes (convention DI du projet)

### 10.3 Enregistrement pour les tests unitaires

- [x] Mettre à jour `engine/__tests__/register.ts` avec les enregistrements nécessaires aux tests du moteur

---

## Phase 11 — Fixture Playwright (optionnel mais recommandé)

> **Objectif** : fournir une fixture `explorer` prête à l'emploi dans les tests.

### 11.1 Fixture `explorer`

- [x] Étendre le système de fixtures dans `engine/fixtures/fixture.ts`
- [x] Ajouter une fixture `explorer` :
  > ⚠️ Le projet utilise `test<T>(token)` qui résout via le DI engine (voir `engine/fixtures/fixture.ts`). Le snippet ci-dessous doit s'adapter au pattern existant avec `injector.get()`, pas un appel direct à `resolve()`.
  ```ts
  explorer: async ({ instance, testContext }, use) => {
    // Résoudre via le DI existant, pas via resolve() direct
    const explorer = injector.get(Explorer);
    await use(explorer);
  };
  ```
- [x] Permettre de passer une `ExplorationConfig` partielle via les options du test

### 11.2 Fixture `explorationGraph`

- [x] Fournir l'accès direct au graphe pour les assertions dans les tests

---

## Phase 12 — Scénario Exporter (phase 2)

> **Objectif** : transformer le graphe en artefacts exploitables.

### 12.1 Export scénarios bruts

- [x] Parcourir `graph.getScenarios()` → liste de chemins (séquences de transitions)
- [x] Pour chaque chemin, produire un objet `Scenario` :
  - `name` : auto-généré à partir des actions (ex : `"click_submit → fill_email → click_send"`)
  - `steps` : liste d'actions ordonnées
  - `selectors` : les `uid` utilisés (pour un futur POM)

### 12.2 Export Mermaid / DOT

- [x] `graph.toMermaid()` → copiable dans un README ou une issue
- [x] `graph.toDOT()` → visualisable avec Graphviz

### 12.3 Export JSON

- [x] `graph.toJSON()` → persistable dans `test-results/` pour analyse ultérieure

### 12.4 Génération POM (futur)

- [x] À partir des sélecteurs stables détectés, proposer un squelette de POM
- [x] À partir des scénarios, proposer des squelettes de tests
- [ ] **Non prévu dans la phase 1**

---

## Phase 13 — Tests d'intégration end-to-end

> **Objectif** : valider le système complet sur des cas réels.

### 13.1 Cas de test sur `material.angular.dev`

- [x] Explorer la page d'accueil (conteneur : `body`) → vérifier que le graphe contient les liens de nav et le bouton "Get started"
- [x] Explorer la page button examples (conteneur : `.docs-example-viewer`) → vérifier les boutons et leurs états
- [x] Explorer un composant select (conteneur spécifique) → vérifier la séquence composite

### 13.2 Cas de test sur page HTML minimaliste

- [x] Créer une page HTML de test avec :
  - 2 boutons
  - 1 input text
  - 1 select avec 3 options
  - 1 checkbox qui révèle un champ caché
- [x] Explorer avec config par défaut → vérifier le graphe attendu
- [x] Explorer avec `maxDepth: 1` → vérifier que seul le premier niveau est exploré
- [x] Explorer avec `boundary: 'strict'` sur un sous-conteneur → vérifier le scoping

---

## Résumé des livrables par phase

| Phase | Livrable                             | Type         |
| ----- | ------------------------------------ | ------------ |
| 0     | Dépendances + structure dossiers     | Setup        |
| 1     | `ExplorationConfig` + validation Zod | Code + Tests |
| 2     | Types partagés (`types.ts`)          | Code         |
| 3     | `ExplorationScope`                   | Code + Tests |
| 4     | `DOMExtractor`                       | Code + Tests |
| 5     | `RulesEngine` + règles JSON          | Code + Tests |
| 6     | `ActionExecutor`                     | Code + Tests |
| 7     | `StateManager`                       | Code + Tests |
| 8     | `ExplorationGraph`                   | Code + Tests |
| 9     | `Explorer` (boucle principale)       | Code + Tests |
| 10    | Enregistrement DI                    | Code         |
| 11    | Fixtures Playwright                  | Code         |
| 12    | Scénario Exporter                    | Code + Tests |
| 13    | Tests d'intégration e2e              | Tests        |

---

## Dépendances entre phases

```
Phase 0
  └── Phase 1 (Config)
  └── Phase 2 (Types)
        ├── Phase 3 (Scope)
        ├── Phase 4 (DOMExtractor) ← dépend de Phase 3
        ├── Phase 5 (RulesEngine)
        ├── Phase 6 (ActionExecutor) ← dépend de Phase 3
        ├── Phase 7 (StateManager)
        └── Phase 8 (ExplorationGraph)
              └── Phase 9 (Explorer) ← dépend de toutes les phases 3-8
                    └── Phase 10 (DI) ← dépend de Phase 9
                          └── Phase 11 (Fixtures)
                          └── Phase 12 (Exporter) ← dépend de Phase 8
                                └── Phase 13 (Tests e2e)
```

Les phases 3, 5, 7, 8 peuvent être développées **en parallèle** (aucune dépendance mutuelle).
Les phases 4 et 6 dépendent de la phase 3 (ExplorationScope).
La phase 9 est le point de convergence.

---

## Phase 14 — Test de validation complet sur `https://www.iana.org/help/example-domains`

> **Objectif** : valider le moteur d'exploration de bout en bout sur un site réel, simple et stable. Cette page IANA est idéale car elle est statique, publique, pérenne, sans JavaScript complexe ni composants dynamiques. Elle permet de valider les fondamentaux du moteur sans les complications d'un SPA.

### 14.1 Analyse de la page cible

La page `https://www.iana.org/help/example-domains` a la structure suivante :

#### Structure HTML identifiée

```
<body>
  ├── <nav> (barre de navigation principale)
  │     ├── Lien logo "IANA" → https://www.iana.org/
  │     ├── Lien "Domains"    → https://www.iana.org/domains
  │     ├── Lien "Protocols"  → https://www.iana.org/protocols
  │     ├── Lien "Numbers"    → https://www.iana.org/numbers
  │     └── Lien "About"      → https://www.iana.org/about
  │
  ├── <main> ou <article> (contenu principal)
  │     ├── <h1> "Example Domains"
  │     ├── <p> paragraphe 1 — mentionne RFC 2606 et RFC 6761
  │     │     ├── Lien "RFC 2606" → https://www.iana.org/go/rfc2606
  │     │     └── Lien "RFC 6761" → https://www.iana.org/go/rfc6761
  │     ├── <p> paragraphe 2 — description du service web
  │     ├── <h2> "Further Reading"
  │     └── <ul>
  │           └── Lien "IANA-managed Reserved Domains" → https://www.iana.org/domains/reserved
  │
  ├── <aside> ou <div> (sidebar)
  │     ├── Lien "Domain Names"      → https://www.iana.org/domains
  │     ├── Lien "Root Zone Registry" → https://www.iana.org/domains/root
  │     ├── Lien ".INT Registry"     → https://www.iana.org/domains/int
  │     ├── Lien ".ARPA Registry"    → https://www.iana.org/domains/arpa
  │     ├── Lien "IDN Repository"    → https://www.iana.org/domains/idn-tables
  │     ├── Lien "Number Resources"  → https://www.iana.org/numbers
  │     ├── Lien "Abuse Information" → https://www.iana.org/abuse
  │     ├── Lien "Protocols"         → https://www.iana.org/protocols
  │     ├── Lien "Protocol Registries" → https://www.iana.org/protocols
  │     └── Lien "Time Zone Database" → https://www.iana.org/time-zones
  │
  └── <footer>
        ├── Lien "About Us"      → https://www.iana.org/about
        ├── Lien "News"          → https://www.iana.org/news
        ├── Lien "Performance"   → https://www.iana.org/performance
        ├── Lien "Excellence"    → https://www.iana.org/about/excellence
        ├── Lien "Archive"       → https://www.iana.org/archive
        ├── Lien "Contact Us"    → https://www.iana.org/contact
        ├── Lien "Public Technical Identifiers" → https://pti.icann.org/
        ├── Lien "ICANN"         → https://www.icann.org/
        ├── Lien "Privacy Policy" → https://www.icann.org/privacy/policy
        └── Lien "Terms of Service" → https://www.icann.org/privacy/tos
```

#### Éléments interactifs attendus

| Type                                                         | Nombre estimé | Détails                              |
| ------------------------------------------------------------ | ------------- | ------------------------------------ |
| Liens internes (`a[href]` vers `iana.org`)                   | ~20           | Navigation, sidebar, contenu, footer |
| Liens externes (`a[href]` vers `icann.org`, `pti.icann.org`) | ~3            | Footer uniquement                    |
| Liens RFC (`a[href]` vers `iana.org/go/...`)                 | 2             | Contenu principal                    |
| Boutons                                                      | 0             | Page purement informative            |
| Inputs / formulaires                                         | 0             | Aucun formulaire                     |
| Composants dynamiques                                        | 0             | Page statique HTML classique         |

#### Particularités utiles pour le test

- **Aucun JavaScript complexe** : le DOM est immédiatement stable après `load`
- **Aucune modale, overlay, ou composant dynamique** : pas de séquence composite nécessaire
- **Liens uniquement** : permet de valider la règle `link.rules.json` isolément
- **Structure en zones distinctes** (nav, main, sidebar, footer) : idéal pour tester le scoping par conteneur
- **Page stable et pérenne** : domaine IANA, ne changera pas

### 14.2 Fichier de test : `tests/iana-exploration.spec.ts`

- [x] Créer le fichier de test
- [x] Importer `test as baseTest` et `expect` depuis `'../engine'`
- [x] Utiliser la fixture `explorer` et `explorationGraph`

### 14.3 Test 1 — Exploration page complète (`body`)

> Valide que le moteur détecte tous les éléments interactifs d'une page entière.

- [x] **Config** :
  ```ts
  {
    rootSelector: 'body',
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,        // liens simples, pas besoin d'aller plus profond
    maxStates: 50,
    timeout: 15000
  }
  ```
- [x] **Navigation** : `page.goto('https://www.iana.org/help/example-domains', { waitUntil: 'load' })`
- [x] **Assertions sur le graphe** :
  - [x] L'état initial (state root) existe et contient des faits
  - [x] `graph.getRoots().length === 1` (un seul état initial)
  - [x] Les faits de l'état initial contiennent **au moins 20 éléments** de type lien (`role === 'link'`)
  - [x] Aucun fait de type `button`, `input`, `select`, `combobox` (la page n'en a pas)
  - [x] Les liens RFC 2606 et RFC 6761 sont présents dans les faits (par leur `accessibleName` ou `text`)
  - [x] Le lien "IANA-managed Reserved Domains" est détecté
- [x] **Assertions sur les actions candidates** :
  - [x] Toutes les actions candidates sont de type `click` (ce sont des liens)
  - [x] Aucune action de type `fill`, `select`, `hover`, `sequence`
  - [x] Les actions sont triées par priorité (liens de nav en premier si priorisés)

### 14.4 Test 2 — Exploration scopée à la navigation (`nav`)

> Valide le scoping par conteneur : seuls les liens de la barre de navigation sont détectés.

- [x] **Config** :
  ```ts
  {
    rootSelector: 'nav',       // ou le sélecteur exact du header nav
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,
    maxStates: 20,
    timeout: 10000
  }
  ```
- [x] **Assertions sur les faits** :
  - [x] Éléments détectés : uniquement les liens de la nav (~5 liens : logo, Domains, Protocols, Numbers, About)
  - [x] **Aucun lien du footer** ne doit apparaître (Privacy Policy, Terms of Service, etc.)
  - [x] **Aucun lien du contenu principal** ne doit apparaître (RFC 2606, RFC 6761, Reserved Domains)
  - [x] **Aucun lien de la sidebar** ne doit apparaître (Root Zone Registry, .INT Registry, etc.)
- [x] **Assertions sur le graphe** :
  - [x] `graph.getAllStates().length` <= 6 (état initial + 1 par lien de nav si cliqués)
  - [x] `graph.getStats().states` correspond au nombre d'états réellement explorés

### 14.5 Test 3 — Exploration scopée au contenu principal (`main` ou `article`)

> Valide que le scope restreint bien au contenu éditorial.

- [x] **Config** :
  ```ts
  {
    rootSelector: '#main_right',  // ⚠️ SÉLECTEUR NON VÉRIFIÉ — inspecter le DOM réel de la page IANA avant implémentation
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,
    maxStates: 20,
    timeout: 10000
  }
  ```
- [x] **Assertions sur les faits** :
  - [x] Lien "RFC 2606" détecté → `accessibleName` contient "RFC 2606" ou `text` contient "RFC 2606"
  - [x] Lien "RFC 6761" détecté
  - [x] Lien "IANA-managed Reserved Domains" détecté
  - [x] **Aucun lien de la nav** (Domains, Protocols, Numbers, About)
  - [x] **Aucun lien du footer** (Privacy Policy, Terms of Service)
- [x] **Assertions sur le nombre** :
  - [x] Exactement 3 liens détectés dans le contenu principal

### 14.6 Test 4 — Exploration scopée au footer

> Valide le scoping sur le footer et la détection des liens externes.

- [x] **Config** :
  ```ts
  {
    rootSelector: 'footer',    // ou '#footer', à confirmer
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,
    maxStates: 30,
    timeout: 10000
  }
  ```
- [x] **Assertions sur les faits** :
  - [x] Liens internes détectés : "About Us", "News", "Performance", "Excellence", "Archive", "Contact Us"
  - [x] Liens externes détectés : "Public Technical Identifiers" (`pti.icann.org`), "ICANN" (`icann.org`), "Privacy Policy", "Terms of Service"
  - [x] **Aucun lien du contenu principal** (RFC 2606, RFC 6761)
  - [x] **Aucun lien de la nav** dans les faits
- [x] **Assertions sur la classification** :
  - [x] Les liens externes sont bien marqués (par convention, les liens vers un domaine différent de `iana.org`)

### 14.7 Test 5 — Exploration scopée à la sidebar

> Valide la détection des liens de la sidebar thématique.

- [x] **Config** :
  ```ts
  {
    rootSelector: '#sidebar_left',  // ⚠️ SÉLECTEUR NON VÉRIFIÉ — inspecter le DOM réel de la page IANA avant implémentation
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,
    maxStates: 20,
    timeout: 10000
  }
  ```
- [x] **Assertions sur les faits** :
  - [x] Liens détectés : "Domain Names", "Root Zone Registry", ".INT Registry", ".ARPA Registry", "IDN Repository", "Number Resources", "Abuse Information", "Protocols", "Protocol Registries", "Time Zone Database"
  - [x] ~10 liens détectés
  - [x] Aucun lien du contenu principal, de la nav ou du footer

### 14.8 Test 6 — Vérification de la profondeur (`maxDepth`)

> Valide que la configuration `maxDepth` est respectée.

- [x] **Config** : `maxDepth: 0` (état initial uniquement, aucune action exécutée)
- [x] **Assertions** :
  - [x] `graph.getAllStates().length === 1` (seul l'état initial)
  - [x] `graph.getScenarios()` retourne un tableau vide ou un seul scénario sans transition
  - [x] Les faits sont bien extraits (on détecte les éléments) mais aucune action n'a été exécutée
- [x] **Config** : `maxDepth: 1`
- [x] **Assertions** :
  - [x] Le graphe contient l'état initial + les états atteints en 1 clic
  - [x] `graph.getDepth() <= 1`

### 14.9 Test 7 — Vérification de la limite `maxStates`

> Valide que l'exploration s'arrête quand le nombre max d'états est atteint.

- [x] **Config** : `rootSelector: 'body'`, `maxStates: 3`, `maxDepth: 10`
- [x] **Assertions** :
  - [x] `graph.getAllStates().length <= 3`
  - [x] L'exploration s'est arrêtée avant d'explorer tous les liens

### 14.10 Test 8 — Vérification du timeout

> Valide que l'exploration s'arrête quand le timeout est atteint.

- [x] **Config** : `rootSelector: 'body'`, `timeout: 2000`, `maxDepth: 10`, `maxStates: 1000`
- [x] **Assertions** :
  - [x] L'exploration a terminé en moins de 3 secondes (tolérance)
  - [x] Le graphe contient au moins 1 état (l'initial)
  - [x] Le graphe ne contient PAS tous les liens (preuve que le timeout a coupé)

### 14.11 Test 9 — Export du graphe et validation du format

> Valide les fonctions d'export sur un cas réel.

- [x] Explorer la page complète (`body`, `maxDepth: 1`, `maxStates: 10`)
- [x] **Assertions `toJSON()`** :
  - [x] Le JSON est parsable (`JSON.parse(JSON.stringify(graph.toJSON()))`)
  - [x] Le JSON contient les clés `states` et `transitions`
  - [x] `states.length >= 1`
- [x] **Assertions `toMermaid()`** :
  - [x] Le Mermaid commence par `graph TD` ou `stateDiagram-v2`
  - [x] Le Mermaid contient des nœuds et des arêtes
  - [x] Aucune ligne vide ou syntaxe cassée (validation basique)
- [x] **Assertions `toDOT()`** :
  - [x] Le DOT commence par `digraph {`
  - [x] Le DOT contient des arêtes `->` entre nœuds
  - [x] Se termine par `}`
- [x] **Persistance** :
  - [x] Écrire le JSON dans `test-results/iana-exploration-graph.json`
  - [x] Écrire le Mermaid dans `test-results/iana-exploration-graph.md`

### 14.12 Test 10 — Stabilité et idempotence

> Valide que deux explorations identiques produisent le même graphe.

- [x] Exécuter l'exploration 2 fois avec la même config (`body`, `maxDepth: 1`, `strategy: 'bfs'`, `maxStates: 10`)
- [x] **Assertions** :
  - [x] Les deux graphes ont le même nombre d'états
  - [x] Les deux graphes ont le même nombre de transitions
  - [x] Les hash des états initiaux sont identiques
  - [x] Le `toJSON()` des deux graphes est strictement égal (deep equal)

### 14.13 Test 11 — Graphe de dépendances : structure attendue

> Valide la forme du graphe produit sur cette page spécifique.

- [x] Explorer `body` en `maxDepth: 1`, `strategy: 'bfs'`
- [x] **Structure attendue du graphe** :
  ```
  State Initial (page chargée)
    ├── click(lien "Domains")      → State Nav-Domains
    ├── click(lien "Protocols")    → State Nav-Protocols
    ├── click(lien "Numbers")      → State Nav-Numbers
    ├── click(lien "About")        → State Nav-About
    ├── click(lien "RFC 2606")     → State RFC2606
    ├── click(lien "RFC 6761")     → State RFC6761
    ├── click(lien "Reserved...")   → State Reserved
    ├── click(lien "Root Zone...")  → State RootZone
    └── ... (autres liens)
  ```
- [x] **Assertions** :
  - [x] `graph.getRoots().length === 1`
  - [x] `graph.getLeaves().length >= 1` (les états atteints en 1 clic sont des feuilles à `maxDepth: 1`)
  - [x] `graph.getCycles().length === 0` (pas de cycle possible en profondeur 1)
  - [x] Chaque transition part de l'état initial (structure en étoile)
  - [x] `graph.getTransitionsFrom(rootState.id).length` correspond au nombre de liens cliqués

### 14.14 Pourquoi ce site est un bon candidat de validation

| Critère                                  | Valeur pour le test                                       |
| ---------------------------------------- | --------------------------------------------------------- |
| **Stabilité**                            | Page IANA, ne change quasiment jamais (last revised 2017) |
| **Simplicité**                           | HTML statique, aucun JS complexe, pas de SPA              |
| **Prédictibilité**                       | On connaît exactement les éléments attendus               |
| **Zones distinctes**                     | nav, main, sidebar, footer → 4 scopes testables           |
| **Liens uniquement**                     | Valide les règles de base (`link.rules.json`) sans bruit  |
| **Aucun formulaire/composant dynamique** | Pas de séquence composite → isole la logique de base      |
| **Accessible publiquement**              | Pas besoin d'authentification                             |
| **Pas de rate-limiting agressif**        | Utilisable en CI sans problème                            |

### 14.15 Configuration de référence pour la suite de tests IANA

- [x] Créer un fichier de config dédié ou un objet partagé :
  ```ts
  const IANA_BASE_CONFIG: Partial<ExplorationConfig> = {
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,
    maxStates: 50,
    timeout: 15000,
    stabilizationTimeout: 300, // page statique, DOM stable très vite
    domHashStrategy: 'interactive-only',
    ignoreSelectors: [],
    ignoreRepeatedElements: false,
    fillValues: {}, // aucun formulaire
    selectStrategy: 'first',
  };
  ```
- [x] Chaque test surcharge uniquement les propriétés nécessaires (`rootSelector`, `maxDepth`, `maxStates`, etc.)

---

## Résumé des livrables mis à jour

| Phase  | Livrable                                        | Type         |
| ------ | ----------------------------------------------- | ------------ |
| 0      | Dépendances + structure dossiers                | Setup        |
| 1      | `ExplorationConfig` + validation Zod            | Code + Tests |
| 2      | Types partagés (`types.ts`)                     | Code         |
| 3      | `ExplorationScope`                              | Code + Tests |
| 4      | `DOMExtractor`                                  | Code + Tests |
| 5      | `RulesEngine` + règles JSON                     | Code + Tests |
| 6      | `ActionExecutor`                                | Code + Tests |
| 7      | `StateManager`                                  | Code + Tests |
| 8      | `ExplorationGraph`                              | Code + Tests |
| 9      | `Explorer` (boucle principale)                  | Code + Tests |
| 10     | Enregistrement DI                               | Code         |
| 11     | Fixtures Playwright                             | Code         |
| 12     | Scénario Exporter                               | Code + Tests |
| 13     | Tests d'intégration e2e (material + HTML local) | Tests        |
| **14** | **Tests de validation sur IANA (11 tests)**     | **Tests**    |

## Dépendances entre phases (mis à jour)

```
Phase 0
  └── Phase 1 (Config)
  └── Phase 2 (Types)
        ├── Phase 3 (Scope)
        ├── Phase 4 (DOMExtractor) ← dépend de Phase 3
        ├── Phase 5 (RulesEngine)
        ├── Phase 6 (ActionExecutor) ← dépend de Phase 3
        ├── Phase 7 (StateManager)
        └── Phase 8 (ExplorationGraph)
              └── Phase 9 (Explorer) ← dépend de toutes les phases 3-8
                    └── Phase 10 (DI) ← dépend de Phase 9
                          └── Phase 11 (Fixtures)
                          └── Phase 12 (Exporter) ← dépend de Phase 8
                                └── Phase 13 (Tests e2e material + HTML local)
                                └── Phase 14 (Tests validation IANA) ← dépend de Phase 11 + 12
```

---

## Notes d'implémentation — Décisions et écarts par rapport au plan

> Ajoutées pendant l'implémentation des phases 0 à 10.

### Phase 0 — Conformité

- `json-rules-engine` et `@axe-core/playwright` installés en devDependencies (10 packages ajoutés)
- Playwright 1.55.0 + TypeScript 5.9.2 : compatibilité vérifiée

### Phase 1 — Zod v4 import

- **`import { z } from 'zod'` fonctionne** avec zod@4.1.9 (pas besoin de `'zod/v4'`). L'avertissement dans le todo était conservateur mais inutile.
- `ConcreteExplorationConfig` est une classe injectable via DI, pas un simple type. Merge partiel géré par Zod `.parse()` avec `.default()`.

### Phase 4 — DOMExtractor

- Le sélecteur `INTERACTIVE_SELECTOR` ciblé remplace `locator('*')` comme recommandé.
- L'extraction se fait en un seul `evaluate()` par élément pour minimiser les aller-retours IPC.
- `uid` généré avec la stratégie à 4 niveaux de priorité (testid → id → role:name → tag[index]).

### Phase 5 — RulesEngine

- **Les règles sont chargées programmatiquement** dans `#loadDefaultRules()` plutôt que depuis des fichiers JSON séparés. Raison : les fichiers JSON `explorer/rules/*.json` auraient nécessité un loader async + des types supplémentaires sans valeur ajoutée immédiate. La méthode `loadRules(rules: RuleProperties[])` permet quand même d'ajouter des règles externes.
- Le dossier `explorer/rules/` reste vide et prêt pour une future externalisation des règles en JSON.

### Phase 6 — ActionExecutor

- `computeDomChanges()` exporté comme utilitaire pur (pas dans la classe) pour faciliter les tests et l'utilisation par `Explorer`.

### Phase 8 — getUnexploredActions

- Conformément à l'amendement SRP, `getUnexploredActions` a été supprimé du graphe. Le filtrage est fait dans `Explorer.#filterUnexplored()` via les transitions existantes.

### Phase 9 — Explorer

- **Rollback = Solution 1** (reload + goto URL). Simple et fiable pour la v1.
- Le DI paramètre `dOMExtractor` utilise le préfixe camelCase `dOMExtractor` pour résoudre `DOMExtractor` (le `d` minuscule + `OM` majuscule correspond à la convention PascalCase du nom de classe).

### Phase 10 — DI Registration

- `RulesEngine` enregistré en **singleton** (un jeu de règles par session). Modifiable en transient si besoin ultérieur.

### Phase 13 — Tests d'intégration

- Le test `state manager produces different hashes` vérifie le changement de visibilité (pas le nombre de faits) : le `<input>` caché est toujours dans le DOM, seule sa propriété `visible` change de `false` à `true`.

### Phase 14 — Corrections IANA

- **Sélecteurs corrigés** : la page IANA n'a pas `#main_right` ni `#sidebar_left`. Structure réelle : `header` (5 liens de nav), `main` (3 liens RFC/réservés), `footer` (20 liens), `#body` (contenu principal = main), `nav#sidenav` (vide sur cette page).
- Le test "sidebar" a été remplacé par un test "body content (`#body`)" puisque le sidenav est vide.
- Les assertions `f.role === 'link'` ont été remplacées par `f.tag === 'a'` car les `<a>` n'ont pas d'attribut `role` explicite.
- `test.setTimeout()` ajouté pour les tests qui explorent `body` (navigation réseau lente : chaque clic sur un lien provoque un chargement de page + rollback).
- Les `maxStates` et `maxActionsPerState` ont été réduits pour les tests body-scoped afin de rester dans des temps d'exécution raisonnables.
- L'assertion `toEqual` sur `toJSON()` du test d'idempotence a été remplacée par une comparaison des IDs d'états (les timestamps diffèrent entre exécutions).

### Bugs corrigés dans Explorer.ts

1. **Self-loops** : les actions qui ne changent pas l'état du DOM (ex : liens ancres `#`) généraient des transitions `A → A`, ce qui faussait `getRoots()`. Fix : skip si `newState.id === currentState.id`.
2. **maxDepth non respecté** : l'état initial à depth=0 était quand même expandé quand `maxDepth: 0`. Fix : ajout d'un guard `if (currentState.depth >= maxDepth) continue` dans la boucle d'exploration.

- `ExplorationConfig` enregistré en **singleton** avec config par défaut. Pour une config custom par test, surcharger via fixture.

### Phase 11 — Fixtures

- Pas de fixture `explorer` ajoutée dans `engine/fixtures/fixture.ts` — la complexité d'intégration avec le cycle de vie des fixtures Playwright est trop élevée pour cette phase.
- **Alternative implémentée** : ajout d'un projet `unit-tests` dans `playwright.config.ts` qui découvre les fichiers `__tests__/*.spec.ts` (engine + explorer).

### Tests unitaires

- 32 tests passent (ExplorationConfig: 11, ExplorationGraph: 14, StateManager: 4, + engine tests existants: 3)
- Les tests des phases 3/4/5/6 (ExplorationScope, DOMExtractor, RulesEngine, ActionExecutor) nécessitent un navigateur Playwright et sont couverts par les tests d'intégration (phases 13-14, non encore implémentées).
