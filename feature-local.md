Let me re-examiner l'existant avec ces deux contraintes en tête.

Read [](file:///workspace/engine/type.ts)

Read [](file:///workspace/engine/injector.decorator.ts)

Read [](file:///workspace/POM/BuilderPOM.ts)

Read [](file:///workspace/engine/reflection.utils.ts#1-1), lines 1 to 40

Voici l'analyse complète reprise, avec les deux contraintes intégrées : **graphe dédié** et **exploration scopée à un conteneur**.

---

## 1. Résumé du besoin (reformulé)

Un **moteur d'exploration automatique d'UI** au-dessus de Playwright qui :

- Part d'un **conteneur arbitraire** (pas une URL, mais un `Locator` — une modale, un formulaire, un panneau, un composant)
- Détecte les éléments interactifs dans ce périmètre
- Applique des règles symboliques pour décider des actions
- Exécute les actions et observe les transitions d'état
- Enregistre tout dans un **graphe de dépendances dédié** (objet typé, pas une simple `Map`)
- Permet ensuite de générer des scénarios de test via POM

---

## 2. L'existant — ce qui est réutilisable

### Le DI Engine — prêt, aucun changement

| Fichier               | Rôle                                                             | Impact                                               |
| --------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| injector.ts           | Conteneur DI avec `register()` / `registerSingleton()` / `get()` | Injectera tous les nouveaux services                 |
| injector.decorator.ts | Décorateur `@Injector({ Provide: [...] })`                       | Les nouveaux services avec dépendances l'utiliseront |
| reflection.utils.ts   | Résolution par nom de paramètre constructeur                     | Fonctionne tel quel                                  |
| type.ts               | `Type<T>`, `AbstractType<T>`                                     | Types de base pour l'injection                       |

### TestContext — le point d'accès Playwright

test.context.ts expose `page`, `browser`, `request`. C'est via `testContext.page` que l'explorateur accèdera au DOM. **Pas de modification nécessaire.**

### ExpectContext — phase 2 (génération de tests)

expect-service.ts — utile plus tard pour les assertions générées. **Inchangé.**

### BuilderPOM — inspiration directe

BuilderPOM.ts a un pattern très proche du besoin :

- Queue d'actions (`#actionsToExecute`)
- Exécution séquentielle avec screenshots optionnels entre chaque étape
- Pattern fluent chaînable

Le `ActionExecutor` du moteur pourra s'en inspirer fortement. **Pas de modification du BuilderPOM lui-même.**

### Fixtures — point d'entrée

fixture.ts fournit `instance`, `testContext`, `expectContext`. On pourra ajouter une fixture `explorer` plus tard. **Adaptation mineure.**

### Setup DI

setup.ts — devra enregistrer les nouveaux services. **Adaptation nécessaire.**

---

## 3. Ce qu'il faut installer

| Package                    | Rôle                                | Justification                                                                         |
| -------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| **`json-rules-engine`**    | Moteur de règles symboliques        | Évalue conditions/faits → événements. Standard, bien maintenu, déterministe           |
| **`@axe-core/playwright`** | Enrichissement des faits d'éléments | Fournit rôles ARIA, noms accessibles, états d'interaction — sans avoir à tout recoder |

Rien d'autre. Le graphe sera un objet custom TypeScript (pas de lib externe type `graphlib`).

---

## 4. Ce qu'il faut coder — les 7 modules

### Module 1 : `ExplorationScope`

**Responsabilité** : définir le périmètre d'exploration.

```ts
// Ce n'est PAS une URL. C'est un Locator Playwright.
abstract class ExplorationScope {
  abstract get root(): Locator; // Le conteneur racine
  abstract get boundary(): 'strict' | 'overflow';
  // strict  = uniquement les éléments DANS le conteneur
  // overflow = aussi les overlays CDK (mat-select, mat-menu)
  //            attachés au body mais contrôlés par un élément du conteneur
}
```

**Pourquoi c'est critique** : Angular Material attache ses overlays (`cdk-overlay-container`) au `<body>`, pas dans le composant source. En mode `strict`, on ignore ces overlays. En mode `overflow`, on les suit via `aria-controls` / `aria-owns` pour ne capturer que ceux déclenchés depuis le conteneur.

### Module 2 : `DOMExtractor`

**Responsabilité** : extraire les faits normalisés depuis le scope.

- Reçoit un `ExplorationScope` via DI
- Parcourt `scope.root.locator('*')` (tous les descendants)
- Pour chaque élément, produit un `ElementFact` :

```ts
type ElementFact = {
  uid: string; // sélecteur stable ou data-testid
  tag: string;
  role: string | null; // ARIA role (natif ou explicite)
  visible: boolean;
  enabled: boolean;
  focusable: boolean;
  text: string;
  ariaExpanded: boolean | null;
  ariaControls: string | null;
  inputType: string | null;
  // ... enrichi par axe-core
};
```

- Si `boundary === 'overflow'`, suit les `aria-controls` vers les éléments hors conteneur
- Utilise `@axe-core/playwright` pour enrichir les rôles et états

### Module 3 : `RulesEngine` (wrapper)

**Responsabilité** : encapsuler `json-rules-engine`, charger les règles, retourner les actions candidates.

- Charge des fichiers JSON depuis un dossier `rules/`
- Chaque règle mappe des faits → une action ou une séquence
- Retourne des `CandidateAction[]` triées par priorité

```ts
type CandidateAction =
  | { type: 'click'; targetUid: string; priority: number }
  | { type: 'hover'; targetUid: string; priority: number }
  | { type: 'fill'; targetUid: string; value: string; priority: number }
  | { type: 'sequence'; steps: CandidateAction[]; priority: number };
```

### Module 4 : `ActionExecutor`

**Responsabilité** : transformer une `CandidateAction` en exécution Playwright réelle.

- Reçoit `TestContext` via DI (pour accéder à `page`)
- Reçoit `ExplorationScope` pour résoudre les `targetUid` en `Locator`
- Gère les séquences composites (click → waitFor → select)
- Gère les attentes entre étapes (`waitForSelector`, `waitForLoadState`)

### Module 5 : `StateManager`

**Responsabilité** : détecter et identifier les états.

- Hash l'état observable du DOM **dans le scope** (pas tout le `<body>`)
- Critères de hash : structure des éléments interactifs + leurs états (`aria-expanded`, `disabled`, visibilité, texte)
- Ignore le bruit (animations, timestamps, compteurs)
- Détermine si un état est **nouveau** ou **déjà visité**

### Module 6 : `ExplorationGraph` (objet dédié)

C'est le point que tu veux structurer. Pas une `Map<string, StateNode>` — un vrai graphe de dépendances typé.

```ts
// Nœud = un état observé de l'UI dans le scope
type StateNode = {
  id: string; // hash de l'état
  facts: ElementFact[]; // snapshot des faits à cet état
  depth: number; // profondeur depuis l'état initial
  timestamp: number;
};

// Arête = une transition déclenchée par une action
type Transition = {
  from: string; // StateNode.id source
  to: string; // StateNode.id destination
  action: CandidateAction; // l'action qui a provoqué la transition
  duration: number; // temps d'exécution
};

// Le graphe lui-même
abstract class ExplorationGraph {
  abstract addState(node: StateNode): void;
  abstract addTransition(transition: Transition): void;
  abstract hasState(id: string): boolean;
  abstract getState(id: string): StateNode | undefined;

  // Traversée
  abstract getTransitionsFrom(stateId: string): Transition[];
  abstract getTransitionsTo(stateId: string): Transition[];
  abstract getPathsFrom(stateId: string, maxDepth: number): Transition[][];

  // Analyse
  abstract getRoots(): StateNode[]; // états sans parent
  abstract getLeaves(): StateNode[]; // états sans enfant (dead ends)
  abstract getCycles(): Transition[][]; // boucles détectées
  abstract getScenarios(): Transition[][]; // tous les chemins root → leaf

  // Export
  abstract toJSON(): SerializedGraph;
  abstract toDOT(): string; // format Graphviz pour visualisation
}
```

**Pourquoi un objet dédié** :

- Permet de requêter le graphe (scénarios, cycles, chemins)
- Permet l'export (JSON pour persistence, DOT/Mermaid pour visualisation)
- Permet la détection de boucles et de dead ends
- Sépare clairement la structure de données de la logique d'exploration
- Injectible via DI comme singleton (un graphe par exploration)

### Module 7 : `Explorer`

**Responsabilité** : la boucle principale d'exploration.

```
1. Reçoit un ExplorationScope (le conteneur cible)
2. DOMExtractor → faits initiaux
3. StateManager → état initial → ajout au graphe
4. Boucle :
   a. RulesEngine.run(faits) → actions candidates
   b. Filtrer les actions déjà tentées depuis cet état
   c. ActionExecutor.execute(action)
   d. DOMExtractor → nouveaux faits
   e. StateManager → nouvel état ?
      - oui → addState + addTransition, continuer
      - non (déjà visité) → addTransition, passer à l'action suivante
   f. Vérifier limites (profondeur, nombre d'états, timeout)
5. Retourner le graphe
```

Stratégie configurable :

- `maxDepth: number` — profondeur max (défaut: 3-5)
- `maxStates: number` — nombre max d'états explorés
- `strategy: 'bfs' | 'dfs'` — parcours en largeur ou profondeur
- `timeout: number` — durée max d'exploration

---

## 5. La contrainte conteneur — impact transversal

Le fait de travailler sur un **conteneur** et pas une URL impacte **tout le pipeline** :

| Module               | Impact du scoping                                                 |
| -------------------- | ----------------------------------------------------------------- |
| **ExplorationScope** | Porte le `Locator` racine + la politique de boundary              |
| **DOMExtractor**     | Parcourt uniquement `scope.root`, pas `page.locator('body')`      |
| **StateManager**     | Hash uniquement le DOM du conteneur, pas toute la page            |
| **ActionExecutor**   | Résout les locators relativement au scope (sauf mode `overflow`)  |
| **RulesEngine**      | Pas impacté (travaille sur des faits abstraits)                   |
| **ExplorationGraph** | Pas impacté (stocke des états/transitions abstraits)              |
| **Explorer**         | Reçoit le scope en paramètre, le propage à tous les sous-services |

**Cas Angular Material spécifique** : quand un `mat-select` dans le conteneur ouvre un overlay attaché au `<body>`, le `DOMExtractor` en mode `overflow` doit :

1. Détecter que l'élément source a `aria-controls="cdk-overlay-X"`
2. Aller chercher `#cdk-overlay-X` dans le `<body>` (hors scope)
3. L'inclure temporairement dans les faits
4. Après fermeture, le retirer

---

## 6. Ce qui doit être adapté dans l'existant

| Fichier    | Adaptation                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| setup.ts   | Enregistrer : `ExplorationScope`, `DOMExtractor`, `RulesEngine`, `ActionExecutor`, `StateManager`, `ExplorationGraph` (singleton), `Explorer` |
| fixture.ts | Optionnel : ajouter une fixture `explorer` qui fournit un `Explorer` pré-configuré                                                            |
| index.ts   | Exporter les nouveaux POMs si on crée des POMs auto-générés (phase 2)                                                                         |

**Ce qui ne change PAS** : `Injector`, `TestContext`, `ExpectContext`, `BuilderPOM`, tests existants, V8 coverage.

---

## 7. Structure de fichiers proposée

```
explorer/                          # Nouveau dossier racine
  ExplorationScope.ts              # Abstract + Concrete
  DOMExtractor.ts                  # Extraction des faits depuis le scope
  RulesEngine.ts                   # Wrapper json-rules-engine
  ActionExecutor.ts                # Exécution Playwright des actions
  StateManager.ts                  # Hash d'état + détection nouveauté
  ExplorationGraph.ts              # Graphe de dépendances dédié
  Explorer.ts                      # Boucle principale
  types.ts                         # ElementFact, CandidateAction, StateNode, Transition
  rules/                           # Règles JSON
    button.rules.json
    input.rules.json
    combobox.rules.json
    menu.rules.json
```

---

## 8. Synthèse

| Catégorie          | Détail                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **À installer**    | `json-rules-engine`, `@axe-core/playwright`                                                                                 |
| **À coder**        | 7 modules dans un dossier `explorer/` + fichiers de règles JSON                                                             |
| **À adapter**      | setup.ts (enregistrement DI), optionnellement les fixtures                                                                  |
| **Inchangé**       | DI engine, TestContext, ExpectContext, BuilderPOM, tests existants, V8 coverage                                             |
| **Contrainte clé** | Tout est scopé à un `Locator` conteneur, pas à une URL — avec gestion optionnelle des overlays hors-scope (mode `overflow`) |
| **Graphe**         | Objet dédié avec traversée, détection de cycles, export JSON/DOT — pas une simple Map                                       |
