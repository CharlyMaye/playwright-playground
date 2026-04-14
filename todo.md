# Plan de travaux — Moteur d'exploration UI symbolique

## Vue d'ensemble

Construire un moteur d'exploration automatique d'interface au-dessus de Playwright, piloté par des règles symboliques, scopé à un conteneur DOM arbitraire, produisant un graphe de dépendances dédié. Le système est **configurable** pour maîtriser l'explosion combinatoire.

---

## Phase 0 — Préparation

### 0.1 Installation des dépendances

- [ ] Installer `json-rules-engine` (moteur de règles symboliques)
- [ ] Installer `@axe-core/playwright` (enrichissement ARIA / rôles / accessibilité)
- [ ] Vérifier la compatibilité des versions avec Playwright 1.55+ et TypeScript 5.9+

### 0.2 Structure de fichiers

- [ ] Créer le dossier `explorer/` à la racine du projet
- [ ] Créer le sous-dossier `explorer/rules/` pour les fichiers de règles JSON
- [ ] Créer le fichier `explorer/types.ts` (types partagés)
- [ ] Créer le fichier `explorer/index.ts` (barrel export)
- [ ] Créer le dossier `explorer/__tests__/` pour les tests unitaires du moteur

---

## Phase 1 — Configuration

> **Objectif** : rendre le système entièrement configurable pour maîtriser l'explosion combinatoire dès le départ.

### 1.1 Définir le type `ExplorationConfig`

- [ ] Créer `explorer/ExplorationConfig.ts`
- [ ] Définir les paramètres de **stratégie d'exploration** :
  - `strategy` : `'bfs' | 'dfs'` — parcours en largeur ou profondeur
  - `maxDepth` : `number` — profondeur max depuis l'état initial (défaut : 5)
  - `maxStates` : `number` — nombre max d'états dans le graphe (défaut : 100)
  - `maxActionsPerState` : `number` — nombre max d'actions tentées par état (défaut : 10)
  - `timeout` : `number` — durée max d'exploration en ms (défaut : 30000)
- [ ] Définir les paramètres de **scope** :
  - `rootSelector` : `string` — sélecteur CSS ou rôle du conteneur racine
  - `boundary` : `'strict' | 'overflow'` — strict = dans le conteneur uniquement, overflow = suit les overlays CDK hors conteneur via `aria-controls`
  - `overflowSelectors` : `string[]` — sélecteurs supplémentaires hors scope à surveiller (ex : `.cdk-overlay-container`)
- [ ] Définir les paramètres de **filtrage** :
  - `ignoreSelectors` : `string[]` — éléments à ignorer (ex : `[aria-hidden="true"]`, `.ad-banner`)
  - `ignoreRepeatedElements` : `boolean` — éviter d'explorer N fois des éléments identiques dans une liste
  - `maxRepeatPerAction` : `number` — combien de fois une même action sur un même type d'élément peut être tentée
- [ ] Définir les paramètres de **données de test** :
  - `fillValues` : `Record<string, string>` — valeurs par défaut pour les champs texte par type (`email`, `text`, `password`, etc.)
  - `selectStrategy` : `'first' | 'random' | 'all'` — comment choisir une option dans un select/combobox
- [ ] Définir les paramètres d'**observation** :
  - `stabilizationTimeout` : `number` — temps d'attente après une action pour considérer le DOM stabilisé (défaut : 500ms)
  - `domHashStrategy` : `'structure' | 'interactive-only'` — quoi inclure dans le hash d'état
- [ ] Fournir une configuration par défaut (`defaultExplorationConfig`)
- [ ] Permettre le merge partiel (l'utilisateur ne fournit que ce qu'il veut surcharger)

### 1.2 Validation de la configuration

- [ ] Valider avec Zod (déjà installé dans le projet) que la config fournie est cohérente
- [ ] Lever des erreurs explicites si `maxDepth` < 1, `timeout` < 1000, etc.

### 1.3 Tests unitaires

- [ ] Tester le merge config par défaut + config partielle
- [ ] Tester la validation Zod (cas valides et invalides)

---

## Phase 2 — Types fondamentaux

> **Objectif** : définir les contrats de données utilisés par tous les modules.

### 2.1 `ElementFact` — représentation d'un élément détecté

- [ ] Créer dans `explorer/types.ts`
- [ ] Propriétés :
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

- [ ] Types d'actions unitaires :
  - `click` : `{ type: 'click'; targetUid: string; priority: number }`
  - `hover` : `{ type: 'hover'; targetUid: string; priority: number }`
  - `fill` : `{ type: 'fill'; targetUid: string; value: string; priority: number }`
  - `select` : `{ type: 'select'; targetUid: string; option: string; priority: number }`
  - `focus` : `{ type: 'focus'; targetUid: string; priority: number }`
  - `clear` : `{ type: 'clear'; targetUid: string; priority: number }`
- [ ] Type séquence composite :
  - `sequence` : `{ type: 'sequence'; steps: SequenceStep[]; priority: number }`
- [ ] `SequenceStep` :
  - `action` : type d'action unitaire
  - `waitAfter` : condition d'attente post-action (voir 2.3)

### 2.3 `WaitCondition` — conditions d'attente entre étapes d'une séquence

- [ ] Types :
  - `{ type: 'selector'; selector: string; state: 'visible' | 'attached' | 'hidden' }` — attend qu'un élément apparaisse/disparaisse
  - `{ type: 'stable'; timeout: number }` — attend que le DOM ne change plus pendant N ms
  - `{ type: 'function'; expression: string }` — attend qu'une expression JS retourne `true` dans le contexte page
  - `{ type: 'delay'; ms: number }` — attente fixe (fallback, à utiliser rarement)

### 2.4 `StateNode` — nœud du graphe

- [ ] `id` : hash de l'état
- [ ] `facts` : `ElementFact[]` — snapshot des faits interactifs à cet état
- [ ] `depth` : profondeur depuis l'état initial
- [ ] `timestamp` : date de capture
- [ ] `scopeSelector` : le conteneur racine utilisé (traçabilité)

### 2.5 `Transition` — arête du graphe

- [ ] `id` : identifiant unique de la transition
- [ ] `from` : `StateNode.id` source
- [ ] `to` : `StateNode.id` destination
- [ ] `action` : `CandidateAction` exécutée
- [ ] `success` : boolean (l'action a-t-elle réussi ?)
- [ ] `duration` : temps d'exécution en ms
- [ ] `domChanges` : résumé des changements (éléments apparus, disparus, modifiés)

### 2.6 `ActionResult` — résultat d'exécution d'une action

- [ ] `success` : boolean
- [ ] `error` : `string | null`
- [ ] `newFacts` : `ElementFact[]`
- [ ] `domChanged` : boolean
- [ ] `duration` : number

---

## Phase 3 — ExplorationScope

> **Objectif** : encapsuler le périmètre d'exploration (conteneur + politique de boundary).

### 3.1 Classe abstraite + concrète

- [ ] Créer `explorer/ExplorationScope.ts`
- [ ] Classe abstraite `ExplorationScope` :
  - `get root(): Locator` — le conteneur racine
  - `get boundary(): 'strict' | 'overflow'`
  - `get overflowSelectors(): string[]`
  - `isInScope(element: Locator): Promise<boolean>` — vérifie si un élément est dans le périmètre
  - `resolveOverflowTarget(ariaControls: string): Locator | null` — résout un `aria-controls` vers un élément hors scope
- [ ] Classe concrète `ConcreteExplorationScope` :
  - Reçoit `TestContext` et `ExplorationConfig` via constructeur (DI)
  - Construit le `root` via `page.locator(config.rootSelector)`
  - Implémente `isInScope` en vérifiant si l'élément est descendant du root ou dans un overflow selector
  - Implémente `resolveOverflowTarget` : cherche dans `config.overflowSelectors` les éléments dont l'`id` correspond à `ariaControls`

### 3.2 Gestion spécifique Angular Material CDK

- [ ] Documenter les cas CDK overlay (`mat-select`, `mat-autocomplete`, `mat-menu`, `mat-dialog`)
- [ ] Le `cdk-overlay-container` est attaché au `<body>` — le scope `overflow` doit le suivre
- [ ] Vérifier que les éléments dans l'overlay sont bien rattachés à leur déclencheur via `aria-controls` ou `aria-owns`

### 3.3 Tests unitaires

- [ ] Tester `isInScope` avec un élément dans le conteneur → `true`
- [ ] Tester `isInScope` avec un élément hors conteneur en mode `strict` → `false`
- [ ] Tester `isInScope` avec un overlay CDK en mode `overflow` → `true`
- [ ] Tester `resolveOverflowTarget` avec un `aria-controls` valide

---

## Phase 4 — DOMExtractor

> **Objectif** : extraire les faits normalisés depuis le scope.

### 4.1 Classe abstraite + concrète

- [ ] Créer `explorer/DOMExtractor.ts`
- [ ] Classe abstraite `DOMExtractor` :
  - `extract(): Promise<ElementFact[]>`
- [ ] Classe concrète `ConcreteDOMExtractor` :
  - Reçoit `ExplorationScope` et `ExplorationConfig` via DI
  - Parcourt `scope.root.locator('*')` pour les éléments du scope
  - Si `boundary === 'overflow'`, parcourt aussi les `overflowSelectors`

### 4.2 Extraction des propriétés par élément

- [ ] Pour chaque élément candidat, extraire via `evaluate` ou API Playwright :
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
- [ ] Filtrer les éléments non pertinents selon `config.ignoreSelectors`
- [ ] Gérer `config.ignoreRepeatedElements` : détecter les éléments structurellement identiques dans une liste et n'en garder qu'un représentant

### 4.3 Enrichissement axe-core

- [ ] Utiliser `@axe-core/playwright` pour récupérer :
  - Les rôles computés (pas juste l'attribut `role`, mais le rôle implicite)
  - Les noms accessibles
  - Les états ARIA complets
- [ ] Merger ces informations dans les `ElementFact`

### 4.4 Génération de `uid` stables

- [ ] Stratégie de génération du `uid` par ordre de priorité :
  1. `data-testid` si présent
  2. `#id` si unique dans le scope
  3. `role` + nom accessible (ex : `button:"Submit"`)
  4. `tag` + position relative dans le scope (fallback, fragile)
- [ ] Documenter que les `uid` ne sont stables que pour un état donné

### 4.5 Tests unitaires

- [ ] Tester l'extraction sur une page HTML statique simple (boutons, inputs, links)
- [ ] Tester le filtrage `ignoreSelectors`
- [ ] Tester le mode `overflow` avec un overlay simulé
- [ ] Tester la déduplication des éléments répétés

---

## Phase 5 — RulesEngine (wrapper)

> **Objectif** : encapsuler `json-rules-engine`, charger les règles, retourner des actions candidates.

### 5.1 Classe abstraite + concrète

- [ ] Créer `explorer/RulesEngine.ts`
- [ ] Classe abstraite `RulesEngine` :
  - `evaluate(facts: ElementFact[]): Promise<CandidateAction[]>`
  - `loadRules(path: string): void`
- [ ] Classe concrète `ConcreteRulesEngine` :
  - Instancie `json-rules-engine.Engine`
  - Charge les fichiers JSON depuis `explorer/rules/`
  - Pour chaque `ElementFact`, exécute `engine.run({ ...fact })` et collecte les événements
  - Trie les actions par priorité décroissante
  - Limite au `config.maxActionsPerState`

### 5.2 Fichiers de règles — lot initial

- [ ] `explorer/rules/button.rules.json` :
  - Bouton visible + enabled → `click` (priorité 10)
  - Bouton disabled → rien
  - Bouton avec `aria-expanded="false"` → `click` (priorité 15, ouvre quelque chose)
- [ ] `explorer/rules/input.rules.json` :
  - Input text/email/password visible + enabled → `fill` avec valeur selon type depuis config
  - Input checkbox/radio visible + enabled → `click`
  - Input avec `type="search"` → `fill` (priorité basse)
- [ ] `explorer/rules/select.rules.json` :
  - Select natif visible → `select` (priorité 8)
- [ ] `explorer/rules/combobox.rules.json` :
  - Élément avec `role="combobox"` → `sequence` : click → waitFor options visibles → select option
  - Élément avec `role="listbox"` déjà visible → `select` option directe
- [ ] `explorer/rules/menu.rules.json` :
  - Élément avec `role="menuitem"` dans un menu visible → `click`
  - Élément avec `aria-haspopup="true"` → `hover` ou `click` (priorité élevée, ouvre un sous-menu)
- [ ] `explorer/rules/link.rules.json` :
  - Lien avec `href` interne → `click` (priorité 5)
  - Lien avec `href` externe → ignorer (sauf config contraire)
- [ ] `explorer/rules/tab.rules.json` :
  - Élément avec `role="tab"` → `click` (priorité 7)
- [ ] `explorer/rules/accordion.rules.json` :
  - Élément `summary` ou `role="button"` avec `aria-expanded` → `click` (priorité 12)

### 5.3 Gestion des séquences composites avec conditions d'attente

- [ ] Les règles de type `sequence` doivent inclure des `WaitCondition` entre chaque étape
- [ ] Exemple pour combobox :
  ```
  step 1 : click sur le combobox
  wait   : { type: 'selector', selector: '[role="listbox"]', state: 'visible' }
  step 2 : click sur la première option
  wait   : { type: 'selector', selector: '[role="listbox"]', state: 'hidden' }
  ```
- [ ] Exemple pour menu hover :
  ```
  step 1 : hover sur le trigger
  wait   : { type: 'selector', selector: '[role="menu"]', state: 'visible' }
  step 2 : click sur le menuitem
  ```
- [ ] Documenter le pattern : chaque `SequenceStep` a une `action` + un `waitAfter` optionnel

### 5.4 Tests unitaires

- [ ] Tester qu'un bouton visible produit une action `click`
- [ ] Tester qu'un input text produit une action `fill`
- [ ] Tester qu'un combobox produit une `sequence`
- [ ] Tester le tri par priorité
- [ ] Tester la limite `maxActionsPerState`

---

## Phase 6 — ActionExecutor

> **Objectif** : transformer une `CandidateAction` en exécution Playwright réelle, avec gestion des attentes.

### 6.1 Classe abstraite + concrète

- [ ] Créer `explorer/ActionExecutor.ts`
- [ ] Classe abstraite `ActionExecutor` :
  - `execute(action: CandidateAction): Promise<ActionResult>`
- [ ] Classe concrète `ConcreteActionExecutor` :
  - Reçoit `TestContext`, `ExplorationScope`, `ExplorationConfig` via DI
  - Résout `targetUid` → `Locator` (via le scope)

### 6.2 Exécution des actions unitaires

- [ ] `click` : `locator.click()` avec timeout configurable
- [ ] `hover` : `locator.hover()`
- [ ] `fill` : `locator.fill(value)` (valeur depuis la config ou la règle)
- [ ] `select` : `locator.selectOption(option)` pour les selects natifs
- [ ] `focus` : `locator.focus()`
- [ ] `clear` : `locator.clear()`
- [ ] Chaque action est wrappée dans un try/catch → `ActionResult.success = false` si échec

### 6.3 Exécution des séquences composites

- [ ] Itérer sur `steps[]`
- [ ] Après chaque step, évaluer la `WaitCondition` :
  - `selector` → `page.locator(selector).waitFor({ state })`
  - `stable` → boucle : snapshot DOM → attendre → re-snapshot → comparer
  - `function` → `page.waitForFunction(expression)`
  - `delay` → `page.waitForTimeout(ms)` (fallback)
- [ ] Si une étape de la séquence échoue, marquer toute la séquence comme échouée
- [ ] Timeout global de la séquence = `config.stabilizationTimeout * steps.length`

### 6.4 Stabilisation post-action

- [ ] Après chaque action (unitaire ou fin de séquence), attendre `config.stabilizationTimeout` ms
- [ ] Optionnel : attendre `page.waitForLoadState('networkidle')` si approprié (configurable)

### 6.5 Tests unitaires

- [ ] Tester un `click` sur un bouton → succès
- [ ] Tester un `click` sur un élément invisible → échec
- [ ] Tester une séquence combobox (click → wait listbox → click option)
- [ ] Tester le timeout d'une attente qui ne se résout pas

---

## Phase 7 — StateManager

> **Objectif** : identifier les états, les comparer, détecter les doublons.

### 7.1 Classe abstraite + concrète

- [ ] Créer `explorer/StateManager.ts`
- [ ] Classe abstraite `StateManager` :
  - `captureState(facts: ElementFact[]): StateNode`
  - `isNewState(stateId: string): boolean`
  - `registerState(node: StateNode): void`
- [ ] Classe concrète `ConcreteStateManager` :
  - Reçoit `ExplorationConfig` via DI

### 7.2 Hashing d'état

- [ ] Selon `config.domHashStrategy` :
  - `'structure'` : hash basé sur l'arbre des tags + rôles + visibilité + enabled/disabled
  - `'interactive-only'` : hash basé uniquement sur les éléments interactifs détectés (uid + état ARIA)
- [ ] Ignorer dans le hash :
  - Les textes dynamiques (compteurs, timestamps)
  - Les classes CSS d'animation
  - Les attributs `style` de position/taille (trop volatils)
- [ ] Utiliser un hash déterministe (SHA-256 tronqué ou similaire)

### 7.3 Comparaison d'états

- [ ] Deux états sont identiques si même hash
- [ ] Stocker un `Set<string>` des hashes déjà vus
- [ ] Si un état est nouveau → le retourner pour ajout au graphe
- [ ] Si un état est déjà vu → retourner une référence à l'existant (pour créer l'arête)

### 7.4 Tests unitaires

- [ ] Tester que deux DOM identiques produisent le même hash
- [ ] Tester que l'ajout d'un bouton produit un hash différent
- [ ] Tester que le changement d'un texte quelconque ne change PAS le hash (en mode `interactive-only`)
- [ ] Tester `isNewState` → true puis false après `registerState`

---

## Phase 8 — ExplorationGraph

> **Objectif** : graphe de dépendances dédié, typé, avec traversée et export.

### 8.1 Classe abstraite + concrète

- [ ] Créer `explorer/ExplorationGraph.ts`
- [ ] Classe abstraite `ExplorationGraph` avec le contrat suivant :

#### Mutations

- [ ] `addState(node: StateNode): void`
- [ ] `addTransition(transition: Transition): void`

#### Requêtes

- [ ] `hasState(id: string): boolean`
- [ ] `getState(id: string): StateNode | undefined`
- [ ] `getAllStates(): StateNode[]`
- [ ] `getTransitionsFrom(stateId: string): Transition[]`
- [ ] `getTransitionsTo(stateId: string): Transition[]`
- [ ] `getSuccessors(stateId: string): StateNode[]`
- [ ] `getPredecessors(stateId: string): StateNode[]`

#### Traversée

- [ ] `getRoots(): StateNode[]` — états sans parent (état initial)
- [ ] `getLeaves(): StateNode[]` — états sans enfant (dead ends)
- [ ] `getPathsFrom(stateId: string, maxDepth: number): Transition[][]` — tous les chemins depuis un état
- [ ] `getScenarios(): Transition[][]` — tous les chemins root → leaf

#### Analyse

- [ ] `getCycles(): Transition[][]` — boucles détectées
- [ ] `getUnexploredActions(stateId: string, allCandidates: CandidateAction[]): CandidateAction[]` — actions pas encore tentées depuis cet état
- [ ] `getDepth(): number` — profondeur max du graphe
- [ ] `getStats(): { states: number; transitions: number; maxDepth: number; cycles: number; deadEnds: number }`

#### Export

- [ ] `toJSON(): SerializedGraph` — format JSON sérialisable
- [ ] `toDOT(): string` — format Graphviz pour visualisation
- [ ] `toMermaid(): string` — format Mermaid (intégrable dans Markdown)

### 8.2 Implémentation concrète `ConcreteExplorationGraph`

- [ ] Stockage interne :
  - `Map<string, StateNode>` pour les nœuds
  - `Map<string, Transition[]>` (adjacency list) pour les arêtes sortantes
  - `Map<string, Transition[]>` pour les arêtes entrantes (index inversé)
- [ ] Enregistré comme **singleton** dans le DI (un graphe par exploration)
- [ ] `getScenarios()` : parcours DFS depuis chaque root, collecte les chemins complets
- [ ] `getCycles()` : détection par marquage visited/in-stack (algorithme classique DFS)

### 8.3 Tests unitaires

- [ ] Tester `addState` + `hasState`
- [ ] Tester `addTransition` + `getTransitionsFrom`
- [ ] Tester `getRoots` / `getLeaves` sur un graphe simple à 3 nœuds
- [ ] Tester `getScenarios` sur un graphe à branches
- [ ] Tester `getCycles` sur un graphe avec boucle
- [ ] Tester `toJSON` → sérialisable → re-parsable
- [ ] Tester `toMermaid` → produit du Mermaid valide

---

## Phase 9 — Explorer (boucle principale)

> **Objectif** : orchestrer le cycle complet d'exploration.

### 9.1 Classe abstraite + concrète

- [ ] Créer `explorer/Explorer.ts`
- [ ] Classe abstraite `Explorer` :
  - `explore(): Promise<ExplorationGraph>`
- [ ] Classe concrète `ConcreteExplorer` :
  - Reçoit via DI : `ExplorationScope`, `DOMExtractor`, `RulesEngine`, `ActionExecutor`, `StateManager`, `ExplorationGraph`, `ExplorationConfig`

### 9.2 Boucle d'exploration

- [ ] Implémenter le cycle :
  ```
  1. DOMExtractor.extract() → faits initiaux
  2. StateManager.captureState(faits) → état initial
  3. ExplorationGraph.addState(état initial)
  4. Ajouter état initial à la file/pile (selon BFS/DFS)
  5. Tant que la file n'est pas vide ET limites non atteintes :
     a. Dépiler/défiler un état
     b. RulesEngine.evaluate(état.facts) → actions candidates
     c. Filtrer : ExplorationGraph.getUnexploredActions(état, candidates)
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

- [ ] `BFS` : file FIFO — explore en largeur, favorise la couverture
- [ ] `DFS` : pile LIFO — explore en profondeur, favorise les scénarios longs
- [ ] La stratégie est choisie via `config.strategy`

### 9.4 Gestion du rollback d'état

- [ ] **Problème** : après avoir exploré un état profond, comment revenir à un état précédent pour explorer une autre branche ?
- [ ] **Solution 1** : recharger la page + rejouer le chemin depuis la racine (fiable mais lent)
- [ ] **Solution 2** : tenter de "défaire" l'action (click toggle, Escape pour fermer) — fragile mais rapide
- [ ] **Décision** : documenter les deux approches, implémenter la solution 1 en premier (fiabilité), prévoir un hook pour la solution 2

### 9.5 Logging et reporting

- [ ] Logger chaque étape (état exploré, action tentée, résultat)
- [ ] Produire un résumé en fin d'exploration :
  - Nombre d'états découverts
  - Nombre de transitions
  - Profondeur max atteinte
  - Nombre de cycles détectés
  - Nombre de dead ends
  - Durée totale
  - Actions échouées

### 9.6 Tests unitaires et d'intégration

- [ ] Test unitaire : mock de tous les services, vérifier que la boucle s'arrête à `maxDepth`
- [ ] Test unitaire : vérifier que la boucle s'arrête à `maxStates`
- [ ] Test unitaire : vérifier que `timeout` interrompt l'exploration
- [ ] Test unitaire : vérifier que les états déjà visités ne sont pas ré-explorés
- [ ] Test d'intégration : exécuter sur une page HTML minimaliste avec 2 boutons → vérifier le graphe produit

---

## Phase 10 — Enregistrement DI

> **Objectif** : câbler tous les nouveaux services dans le conteneur d'injection.

### 10.1 Mise à jour de `setup/setup.ts`

- [ ] Importer tous les nouveaux services abstraits + concrets
- [ ] Enregistrements transient (nouveau à chaque `resolve()`) :
  - `register(ExplorationScope, ConcreteExplorationScope)`
  - `register(DOMExtractor, ConcreteDOMExtractor)`
  - `register(ActionExecutor, ConcreteActionExecutor)`
  - `register(Explorer, ConcreteExplorer)`
- [ ] Enregistrements singleton :
  - `registerSingleton(ExplorationGraph, ConcreteExplorationGraph)`
  - `registerSingleton(StateManager, ConcreteStateManager)`
  - `registerSingleton(RulesEngine, ConcreteRulesEngine)`
- [ ] `ExplorationConfig` : enregistrer comme singleton avec la config par défaut, ou fournir via fixture

### 10.2 Décorateurs `@Injector`

- [ ] Ajouter `@Injector({ Provide: [...] })` sur chaque classe concrète qui a des dépendances constructeur
- [ ] Vérifier que les noms de paramètres constructeur correspondent aux noms des classes (convention DI du projet)

### 10.3 Enregistrement pour les tests unitaires

- [ ] Mettre à jour `engine/__tests__/register.ts` avec les enregistrements nécessaires aux tests du moteur

---

## Phase 11 — Fixture Playwright (optionnel mais recommandé)

> **Objectif** : fournir une fixture `explorer` prête à l'emploi dans les tests.

### 11.1 Fixture `explorer`

- [ ] Étendre le système de fixtures dans `engine/fixtures/fixture.ts`
- [ ] Ajouter une fixture `explorer` :
  ```ts
  explorer: async ({ page }, use) => {
    const explorer = resolve(Explorer);
    await use(explorer);
  };
  ```
- [ ] Permettre de passer une `ExplorationConfig` partielle via les options du test

### 11.2 Fixture `explorationGraph`

- [ ] Fournir l'accès direct au graphe pour les assertions dans les tests

---

## Phase 12 — Scénario Exporter (phase 2)

> **Objectif** : transformer le graphe en artefacts exploitables.

### 12.1 Export scénarios bruts

- [ ] Parcourir `graph.getScenarios()` → liste de chemins (séquences de transitions)
- [ ] Pour chaque chemin, produire un objet `Scenario` :
  - `name` : auto-généré à partir des actions (ex : `"click_submit → fill_email → click_send"`)
  - `steps` : liste d'actions ordonnées
  - `selectors` : les `uid` utilisés (pour un futur POM)

### 12.2 Export Mermaid / DOT

- [ ] `graph.toMermaid()` → copiable dans un README ou une issue
- [ ] `graph.toDOT()` → visualisable avec Graphviz

### 12.3 Export JSON

- [ ] `graph.toJSON()` → persistable dans `test-results/` pour analyse ultérieure

### 12.4 Génération POM (futur)

- [ ] À partir des sélecteurs stables détectés, proposer un squelette de POM
- [ ] À partir des scénarios, proposer des squelettes de tests
- [ ] **Non prévu dans la phase 1**

---

## Phase 13 — Tests d'intégration end-to-end

> **Objectif** : valider le système complet sur des cas réels.

### 13.1 Cas de test sur `material.angular.dev`

- [ ] Explorer la page d'accueil (conteneur : `body`) → vérifier que le graphe contient les liens de nav et le bouton "Get started"
- [ ] Explorer la page button examples (conteneur : `.docs-example-viewer`) → vérifier les boutons et leurs états
- [ ] Explorer un composant select (conteneur spécifique) → vérifier la séquence composite

### 13.2 Cas de test sur page HTML minimaliste

- [ ] Créer une page HTML de test avec :
  - 2 boutons
  - 1 input text
  - 1 select avec 3 options
  - 1 checkbox qui révèle un champ caché
- [ ] Explorer avec config par défaut → vérifier le graphe attendu
- [ ] Explorer avec `maxDepth: 1` → vérifier que seul le premier niveau est exploré
- [ ] Explorer avec `boundary: 'strict'` sur un sous-conteneur → vérifier le scoping

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

- [ ] Créer le fichier de test
- [ ] Importer `test as baseTest` et `expect` depuis `'../engine'`
- [ ] Utiliser la fixture `explorer` et `explorationGraph`

### 14.3 Test 1 — Exploration page complète (`body`)

> Valide que le moteur détecte tous les éléments interactifs d'une page entière.

- [ ] **Config** :
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
- [ ] **Navigation** : `page.goto('https://www.iana.org/help/example-domains', { waitUntil: 'load' })`
- [ ] **Assertions sur le graphe** :
  - [ ] L'état initial (state root) existe et contient des faits
  - [ ] `graph.getRoots().length === 1` (un seul état initial)
  - [ ] Les faits de l'état initial contiennent **au moins 20 éléments** de type lien (`role === 'link'`)
  - [ ] Aucun fait de type `button`, `input`, `select`, `combobox` (la page n'en a pas)
  - [ ] Les liens RFC 2606 et RFC 6761 sont présents dans les faits (par leur `accessibleName` ou `text`)
  - [ ] Le lien "IANA-managed Reserved Domains" est détecté
- [ ] **Assertions sur les actions candidates** :
  - [ ] Toutes les actions candidates sont de type `click` (ce sont des liens)
  - [ ] Aucune action de type `fill`, `select`, `hover`, `sequence`
  - [ ] Les actions sont triées par priorité (liens de nav en premier si priorisés)

### 14.4 Test 2 — Exploration scopée à la navigation (`nav`)

> Valide le scoping par conteneur : seuls les liens de la barre de navigation sont détectés.

- [ ] **Config** :
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
- [ ] **Assertions sur les faits** :
  - [ ] Éléments détectés : uniquement les liens de la nav (~5 liens : logo, Domains, Protocols, Numbers, About)
  - [ ] **Aucun lien du footer** ne doit apparaître (Privacy Policy, Terms of Service, etc.)
  - [ ] **Aucun lien du contenu principal** ne doit apparaître (RFC 2606, RFC 6761, Reserved Domains)
  - [ ] **Aucun lien de la sidebar** ne doit apparaître (Root Zone Registry, .INT Registry, etc.)
- [ ] **Assertions sur le graphe** :
  - [ ] `graph.getAllStates().length` <= 6 (état initial + 1 par lien de nav si cliqués)
  - [ ] `graph.getStats().states` correspond au nombre d'états réellement explorés

### 14.5 Test 3 — Exploration scopée au contenu principal (`main` ou `article`)

> Valide que le scope restreint bien au contenu éditorial.

- [ ] **Config** :
  ```ts
  {
    rootSelector: '#main_right',  // sélecteur à confirmer lors de l'implémentation
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,
    maxStates: 20,
    timeout: 10000
  }
  ```
- [ ] **Assertions sur les faits** :
  - [ ] Lien "RFC 2606" détecté → `accessibleName` contient "RFC 2606" ou `text` contient "RFC 2606"
  - [ ] Lien "RFC 6761" détecté
  - [ ] Lien "IANA-managed Reserved Domains" détecté
  - [ ] **Aucun lien de la nav** (Domains, Protocols, Numbers, About)
  - [ ] **Aucun lien du footer** (Privacy Policy, Terms of Service)
- [ ] **Assertions sur le nombre** :
  - [ ] Exactement 3 liens détectés dans le contenu principal

### 14.6 Test 4 — Exploration scopée au footer

> Valide le scoping sur le footer et la détection des liens externes.

- [ ] **Config** :
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
- [ ] **Assertions sur les faits** :
  - [ ] Liens internes détectés : "About Us", "News", "Performance", "Excellence", "Archive", "Contact Us"
  - [ ] Liens externes détectés : "Public Technical Identifiers" (`pti.icann.org`), "ICANN" (`icann.org`), "Privacy Policy", "Terms of Service"
  - [ ] **Aucun lien du contenu principal** (RFC 2606, RFC 6761)
  - [ ] **Aucun lien de la nav** dans les faits
- [ ] **Assertions sur la classification** :
  - [ ] Les liens externes sont bien marqués (par convention, les liens vers un domaine différent de `iana.org`)

### 14.7 Test 5 — Exploration scopée à la sidebar

> Valide la détection des liens de la sidebar thématique.

- [ ] **Config** :
  ```ts
  {
    rootSelector: '#sidebar_left',  // sélecteur à confirmer
    boundary: 'strict',
    strategy: 'bfs',
    maxDepth: 1,
    maxStates: 20,
    timeout: 10000
  }
  ```
- [ ] **Assertions sur les faits** :
  - [ ] Liens détectés : "Domain Names", "Root Zone Registry", ".INT Registry", ".ARPA Registry", "IDN Repository", "Number Resources", "Abuse Information", "Protocols", "Protocol Registries", "Time Zone Database"
  - [ ] ~10 liens détectés
  - [ ] Aucun lien du contenu principal, de la nav ou du footer

### 14.8 Test 6 — Vérification de la profondeur (`maxDepth`)

> Valide que la configuration `maxDepth` est respectée.

- [ ] **Config** : `maxDepth: 0` (état initial uniquement, aucune action exécutée)
- [ ] **Assertions** :
  - [ ] `graph.getAllStates().length === 1` (seul l'état initial)
  - [ ] `graph.getScenarios()` retourne un tableau vide ou un seul scénario sans transition
  - [ ] Les faits sont bien extraits (on détecte les éléments) mais aucune action n'a été exécutée
- [ ] **Config** : `maxDepth: 1`
- [ ] **Assertions** :
  - [ ] Le graphe contient l'état initial + les états atteints en 1 clic
  - [ ] `graph.getDepth() <= 1`

### 14.9 Test 7 — Vérification de la limite `maxStates`

> Valide que l'exploration s'arrête quand le nombre max d'états est atteint.

- [ ] **Config** : `rootSelector: 'body'`, `maxStates: 3`, `maxDepth: 10`
- [ ] **Assertions** :
  - [ ] `graph.getAllStates().length <= 3`
  - [ ] L'exploration s'est arrêtée avant d'explorer tous les liens

### 14.10 Test 8 — Vérification du timeout

> Valide que l'exploration s'arrête quand le timeout est atteint.

- [ ] **Config** : `rootSelector: 'body'`, `timeout: 2000`, `maxDepth: 10`, `maxStates: 1000`
- [ ] **Assertions** :
  - [ ] L'exploration a terminé en moins de 3 secondes (tolérance)
  - [ ] Le graphe contient au moins 1 état (l'initial)
  - [ ] Le graphe ne contient PAS tous les liens (preuve que le timeout a coupé)

### 14.11 Test 9 — Export du graphe et validation du format

> Valide les fonctions d'export sur un cas réel.

- [ ] Explorer la page complète (`body`, `maxDepth: 1`, `maxStates: 10`)
- [ ] **Assertions `toJSON()`** :
  - [ ] Le JSON est parsable (`JSON.parse(JSON.stringify(graph.toJSON()))`)
  - [ ] Le JSON contient les clés `states` et `transitions`
  - [ ] `states.length >= 1`
- [ ] **Assertions `toMermaid()`** :
  - [ ] Le Mermaid commence par `graph TD` ou `stateDiagram-v2`
  - [ ] Le Mermaid contient des nœuds et des arêtes
  - [ ] Aucune ligne vide ou syntaxe cassée (validation basique)
- [ ] **Assertions `toDOT()`** :
  - [ ] Le DOT commence par `digraph {`
  - [ ] Le DOT contient des arêtes `->` entre nœuds
  - [ ] Se termine par `}`
- [ ] **Persistance** :
  - [ ] Écrire le JSON dans `test-results/iana-exploration-graph.json`
  - [ ] Écrire le Mermaid dans `test-results/iana-exploration-graph.md`

### 14.12 Test 10 — Stabilité et idempotence

> Valide que deux explorations identiques produisent le même graphe.

- [ ] Exécuter l'exploration 2 fois avec la même config (`body`, `maxDepth: 1`, `strategy: 'bfs'`, `maxStates: 10`)
- [ ] **Assertions** :
  - [ ] Les deux graphes ont le même nombre d'états
  - [ ] Les deux graphes ont le même nombre de transitions
  - [ ] Les hash des états initiaux sont identiques
  - [ ] Le `toJSON()` des deux graphes est strictement égal (deep equal)

### 14.13 Test 11 — Graphe de dépendances : structure attendue

> Valide la forme du graphe produit sur cette page spécifique.

- [ ] Explorer `body` en `maxDepth: 1`, `strategy: 'bfs'`
- [ ] **Structure attendue du graphe** :
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
- [ ] **Assertions** :
  - [ ] `graph.getRoots().length === 1`
  - [ ] `graph.getLeaves().length >= 1` (les états atteints en 1 clic sont des feuilles à `maxDepth: 1`)
  - [ ] `graph.getCycles().length === 0` (pas de cycle possible en profondeur 1)
  - [ ] Chaque transition part de l'état initial (structure en étoile)
  - [ ] `graph.getTransitionsFrom(rootState.id).length` correspond au nombre de liens cliqués

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

- [ ] Créer un fichier de config dédié ou un objet partagé :
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
- [ ] Chaque test surcharge uniquement les propriétés nécessaires (`rootSelector`, `maxDepth`, `maxStates`, etc.)

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
