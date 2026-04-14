# DI Lifetimes — Dependency Injection Engine

Le moteur DI supporte trois durées de vie (lifetimes) pour les tokens enregistrés.

## Lifetimes

### Singleton (`registerSingleton`)

Une seule instance est créée pour toute la durée de vie de l'application.
Chaque appel à `resolve(Token)` retourne la même instance.

**Quand l'utiliser :** services stateless, services partagés entre les tests (TestContext, ExpectContext), moteurs de règles immuables.

### Scoped (`registerScoped`)

Une seule instance est créée par **scope**. Toutes les dépendances résolues durant un même scope partagent la même instance.
L'instance est détruite à la fin du scope (`endScope()`).

**Quand l'utiliser :** services avec état propre à une opération (exploration, graphe, state manager), configurations qui varient par test.

Le scope est géré automatiquement par le fixture `explorerTest`. Pour un usage manuel (ex: deux explorations dans le même test), utiliser `withExplorationScope` :

```ts
import { withExplorationScope } from '../explorer/fixture';

const graph = await withExplorationScope({ rootSelector: 'main', maxDepth: 1 }, async (explorer) => {
  await page.goto('https://example.com', { waitUntil: 'load' });
  await explorer.explore();
  return explorer.graph;
});
```

> **Note :** `beginScope()`, `endScope()` et `provideScopedInstance()` sont internes à l'Injector.
> Ils ne sont pas exposés dans l'API publique (`engine/index.ts`).
> Seul le fixture et `withExplorationScope` les utilisent.

### Transient (`register`)

Une nouvelle instance est créée à **chaque** appel à `resolve(Token)`.
Aucun cache, aucun partage.

**Quand l'utiliser :** POMs simples, services sans état et sans dépendances scoped.

## Registrations

| Token                | Lifetime  | Raison                                           |
| -------------------- | --------- | ------------------------------------------------ |
| `TestContext`        | singleton | 1 par worker Playwright, partagé entre les tests |
| `ExpectContext`      | singleton | 1 par worker Playwright                          |
| `ExplorationConfig`  | scoped    | Configuration différente par test/exploration    |
| `ExplorationScope`   | scoped    | Dépend de la config scoped                       |
| `DOMExtractor`       | scoped    | Dépend du scope d'exploration                    |
| `RulesEngine`        | singleton | Stateless, règles immuables                      |
| `ActionExecutor`     | scoped    | Dépend du scope d'exploration                    |
| `StateManager`       | scoped    | État (visited states) par exploration            |
| `ExplorationGraph`   | scoped    | Graphe d'états par exploration                   |
| `Explorer`           | scoped    | Orchestrateur, 1 par exploration                 |
| `AngularMaterialPOM` | transient | POM simple, nouvelle instance à chaque test      |

## Résolution par nom de paramètre

Le DI résout les dépendances par **nom de paramètre du constructeur** :

```ts
// Le paramètre "explorationConfig" est converti en "ExplorationConfig" (camelCase → PascalCase)
// puis recherché dans les maps singleton, scoped, et transient.
constructor(protected explorationConfig: ExplorationConfig) {}
```

L'alternative est d'utiliser le décorateur `@Injector({ Provide: [ExplorationConfig] })` pour déclarer explicitement les dépendances.
