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
