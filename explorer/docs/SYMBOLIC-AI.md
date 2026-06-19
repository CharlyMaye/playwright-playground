# Explorer — Analyse IA Symbolique

> Analyse générée le 2026-06-18.  
> Référence : [aiwiki.ai/wiki/symbolic_ai](https://aiwiki.ai/wiki/symbolic_ai)

---

## L'explorer est-il une IA symbolique ?

**Oui — à 100 %**. C'est un système d'IA symbolique classique (GOFAI), bien structuré, sans aucune composante apprenante.

| Pilier IA Symbolique | Équivalent dans l'explorer |
|---|---|
| **Représentation symbolique** | `ElementFact` — chaque élément UI est un vecteur discret de symboles (`uid`, `role`, `tag`, `visible`, `enabled`, `ariaExpanded`…) |
| **Base de faits** | La snapshot extraite par `DOMExtractor` à chaque état |
| **Règles de production** | `RulesEngine` + `json-rules-engine` : `IF tag='button' AND visible AND enabled THEN click` |
| **Moteur d'inférence (chaînage avant)** | `ConcreteRulesEngine.evaluate()` : faits → actions candidates, tri par priorité |
| **Connaissance experte encodée à la main** | `DefaultRules` / `HtmlDefaultRules` (port, implémenté par adapter) |
| **Recherche d'états** | BFS (`FifoFrontier`) / DFS (`LifoFrontier`) — algorithmes de recherche symbolique |
| **Machine à états explicite** | `ExplorationGraph` — nœuds discrets, transitions nommées |
| **Identité d'état déterministe** | SHA-256 sur les faits in-scope (`StateManager`) |

---

## Ce qu'on peut exploiter en l'état

L'architecture est déjà solide et tout est **branché et prêt** :

1. **Génération de scénarios** — `ScenarioExporter` produit des scénarios rejouables directement depuis le graphe (BFS/DFS). 431 scénarios sur IANA avec le fix `#scenarioEntryPoints`.

2. **Exports multi-formats** — JSON compact, Mermaid, DOT, HTML interactif via `GraphHtmlExporter`. Intégrable dans CI/reporting sans modification.

3. **Extensibilité des règles** — `additionalRules` dans la config permet d'injecter des règles métier sans toucher le cœur (`json-rules-engine` format).

4. **`preExploreHook`** — setup contextuel avant exploration (dismiss banners, login, consentement cookies).

5. **Observer pattern** — `ScreenshotObserver`, `FactEvictionObserver` sont des plugins branchables. On peut ajouter un observer de couverture, de performance, d'accessibilité sans toucher la boucle.

6. **Stratégie BFS/DFS configurable** — `Frontier` est un objet échangeable, sélectionné une fois par run.

---

## Ce qu'il faut modifier pour aller plus loin

Le verrou principal : **les règles sont fixes et aveugles aux résultats**. La boucle est de la recherche exhaustive, pas de l'exploration guidée. Trois pistes progressives :

### 1. `PriorityFrontier` — exploration guidée par métrique (symbolique amélioré)

L'infrastructure est **déjà en place** (`Frontier` strategy, OCP). Il manque uniquement l'implémentation :

```typescript
// Frontier.ts — à ajouter
export class PriorityFrontier implements Frontier {
  readonly #heap: [number, StateNode][] = [];

  push(state: StateNode, score: number): void {
    // min-heap sur score (plus grand score = exploré en premier)
    this.#heap.push([score, state]);
    this.#heap.sort((a, b) => b[0] - a[0]);
  }
  take(): StateNode { return this.#heap.shift()![1]; }
  get size(): number { return this.#heap.length; }
}
```

Scores possibles dès maintenant depuis les données existantes :
- `actionsCount` — états avec plus d'actions non essayées en premier
- `depth` inversé — favorise la largeur avant la profondeur (plus fin que BFS pur)
- `domChanges.appeared.length` — récompense les transitions qui révèlent du nouveau DOM

### 2. Feedback loop sur les priorités de règles (symbolic reinforcement)

Actuellement la `priority` dans chaque règle JSON est statique. On peut la rendre **adaptative** sans IA apprenante : un `AdaptiveDefaultRules` qui ajuste les priorités en mémoire selon les résultats de l'observer :

```typescript
// Branchable sur ExplorationObserver.onTransition
// Si la transition a généré un nouvel état → +1 sur la priorité de la règle source
// Si self-loop → -0.5
// → rules.sort() avant chaque loadRules() du prochain run
```

Cela reste 100 % symbolique (compteurs explicites, pas de gradient) mais rend l'explorer
**empiriquement plus intelligent** d'un run à l'autre.

### 3. Intégration neuro-symbolique (LLM comme `DefaultRules`)

L'architecture hexagonale permet de remplacer `HtmlDefaultRules` par un port LLM-backed
**sans toucher le cœur** :

```
DOMExtractor → ElementFact[] (symbolique)
         ↓
LLMRulesEngine → appel LLM avec accessibilityTree + screenshot
         ↓
CandidateAction[] (symbolique) → même interface que ConcreteRulesEngine
```

L'`accessibleName` est déjà capturé dans `ElementFact`. Le LLM pourrait décider :
*"le bouton 'Confirmer la commande' mérite une priorité 10, le bouton 'Fermer' une priorité 1"*.
Le reste de la boucle est inchangé.

---

## Récapitulatif — feuille de route

| Niveau | Action | Prérequis |
|---|---|---|
| **Maintenant** | Exploiter le graphe, les scénarios, les observers, les exports | Rien — déjà fonctionnel |
| **Court terme** | Implémenter `PriorityFrontier` (l'infra est prête) | ~50 lignes, 0 risque sur le cœur |
| **Moyen terme** | Feedback loop sur les priorités de règles | Observer pattern en place, ~100 lignes |
| **Long terme** | Port `LLMRulesEngine` pour exploration sémantique | Hexagonal ready, nouvelle implémentation isolée |
