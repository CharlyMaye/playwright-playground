Tu es un expert Angular, Playwright et accessibilité dans le projet isagri-ng. Tu dois concevoir et implémenter la couche **agent LLM** manquante dans le pipeline d'exploration LlamaSticot.

## Contexte du système actuel

Le pipeline de non-régression visuelle fonctionne aujourd'hui en 3 couches :

1. **Couche LLM (manuelle)** : un développeur fournit `prompt.md` à un LLM pour analyser un composant Angular et rédiger les entrées `LLAMASTICOT_TARGETS` à la main
2. **Moteur de règles** (`RulesEngine.ts`, `default-rules.ts`, `llamasticot-rules.ts`) : explore automatiquement l'arbre d'états du composant, produit un JSON dans `.exploration-data/`
3. **Playwright** (`llamasticot-exploration.spec.ts`) : relit le JSON et rejoue les scénarios pour détecter les régressions

La couche 1 est un goulot d'étranglement : elle est manuelle, non reproductible, et ne s'intègre pas dans la CI.

## Objectif

Créer un **agent LLM intégré** qui automatise la couche 1. L'agent doit :

1. **Analyser** un composant Angular (code source `.component.ts` + template) sans interaction humaine
2. **Valider** que ses éléments interactifs sont correctement annotés (rôles ARIA, `data-testid`, `aria-label`)
3. **Identifier** les lacunes : éléments non détectables par l'explorateur, rôles manquants, identifiants instables
4. **Proposer des corrections** ciblées au composant (attributs ARIA, `data-testid`) — sans toucher à la logique fonctionnelle
5. **Générer les entrées `LLAMASTICOT_TARGETS`** correspondantes avec les bons `queryParams`, `theme`, `configOverrides`

L'agent ne doit **jamais** :
- Générer du code Playwright
- Modifier le moteur d'exploration (`explorer/`)
- Écrire directement dans `.exploration-data/`
- Inventer des scénarios — c'est le rôle du moteur de règles

## Contraintes de conception

### Entrées attendues de l'agent

```ts
interface AgentInput {
  componentPath: string;    // chemin absolu vers .component.ts
  storyPath: string;        // chemin absolu vers .story.ts
  storyIndexPath: string;   // chemin absolu vers stories/index.ts
  targetsFilePath: string;  // chemin absolu vers llamasticot-targets.ts (pour append)
}
```

### Sorties attendues de l'agent

```ts
interface AgentOutput {
  componentCorrections: ComponentCorrection[];  // modifications ARIA à appliquer au composant
  targetsToAdd: string;                         // code TypeScript à insérer dans LLAMASTICOT_TARGETS
  missingRules: RuleProperties[];               // additionalRules suggérées si besoin
  report: string;                               // résumé lisible de l'analyse
}

interface ComponentCorrection {
  elementDescription: string;   // description humaine de l'élément ciblé
  attributesToAdd: Record<string, string>;  // attributs à ajouter
  reason: string;               // pourquoi (détectabilité, stabilité, accessibilité)
}
```

### Ce que l'agent doit vérifier sur chaque élément interactif

Pour chaque élément interactif du template Angular :

**Détectabilité** — le tag ou un attribut matche-t-il ce sélecteur ?
```css
a, button, input, select, textarea, [role], [tabindex], [contenteditable], details, summary, [aria-expanded], [aria-controls], [aria-haspopup]
```

**Couverture par une rule** — tag + role + inputType + état ARIA matche-t-il au moins une rule ?

| Élément | Condition | Action | Priorité |
|---|---|---|---|
| `button` enabled visible | — | click | 10 |
| `button` + `aria-expanded=false` | — | click | 15 |
| `a` visible | — | click | 5 |
| `input` text/email/password/search/tel/url | enabled visible | fill | 8 |
| `input` checkbox/radio | enabled visible | click | 7 |
| `textarea` | enabled visible | fill | 8 |
| `select` | enabled visible | select | 8 |
| `role=combobox` | enabled visible | click | 12 |
| `role=tab` | visible | click | 7 |
| `role=menuitem` | visible | click | 9 |
| `role=option` | visible | click | 8 |
| `role=treeitem` | visible | click | 8 |
| `aria-expanded=false` (any) | enabled visible | click | 13 |
| `summary` | visible | click | 12 |

**Identifiabilité stable** — présence d'un `data-testid`, `id`, ou `role` + `aria-label`

### Règles de génération des targets

```ts
createLlamasticotTarget(storyPath, {
  theme: 'light' | 'dark',
  queryParams: { inputName: 'stringValue', ... },  // booléens : 'true'/'false'
  captureScreenshots: true,
  configOverrides: {
    additionalRules: [...],  // si un role non couvert par défaut
    maxDepth: 3,
  },
})
```

Combinaisons à couvrir systématiquement :
- `theme: 'light'` et `theme: 'dark'` (utiliser `createLlamasticotThemeMatrix` si pas de queryParams spécifiques)
- État enabled vs disabled si le composant a un `input()` disabled
- État expanded/collapsed si le composant a un état dépliable

### Fichiers de référence à lire obligatoirement

Avant de produire toute sortie, lire :

- `playwright-playground/explorer/default-rules.ts` — rules par défaut complètes
- `playwright-playground/tests/exploration/llamasticot-rules.ts` — rules visuelles
- `playwright-playground/tests/exploration/llamasticot-factory.ts` — builders disponibles
- `playwright-playground/tests/exploration/llamasticot-config.ts` — constantes (base URL, ready selector, overflow selectors)
- `playwright-playground/tests/exploration/llamasticot-targets.ts` — patterns existants à reproduire

## Architecture de l'agent à implémenter

### Option A — Agent CLI (recommandée pour commencer)

Un script Node.js/TypeScript invocable en ligne de commande :

```bash
npx ts-node agent/analyze-component.ts \
  --component isagri-ng/apps/demo-app/src/stories/my-component.component.ts \
  --story isagri-ng/apps/demo-app/src/stories/my-component.story.ts
```

Sorties :
- Affichage console du rapport
- Fichier `agent-output/<component-name>.json` avec `AgentOutput`
- Option `--apply` pour appliquer automatiquement les corrections au composant et append les targets

### Option B — Agent Claude SDK intégré

Utiliser `@anthropic-ai/sdk` avec le modèle `claude-sonnet-4-6` pour un agent avec tool use :

```ts
import Anthropic from '@anthropic-ai/sdk';

const tools = [
  { name: 'read_file', ... },
  { name: 'write_file', ... },
  { name: 'append_targets', ... },
  { name: 'apply_component_correction', ... },
];

// L'agent lit les fichiers sources, analyse, produit les corrections et targets
```

### Fichiers à créer

```
playwright-playground/
└── agent/
    ├── analyze-component.ts    // point d'entrée CLI
    ├── component-analyzer.ts   // extraction des éléments interactifs du template Angular
    ├── aria-validator.ts       // validation détectabilité + couverture rules
    ├── target-generator.ts     // génération du code LLAMASTICOT_TARGETS
    └── types.ts                // AgentInput, AgentOutput, ComponentCorrection
```

## Contraintes de qualité

- L'agent ne doit proposer que des corrections **minimales et ciblées** : uniquement les attributs ARIA ou `data-testid` manquants pour la testabilité — aucun changement fonctionnel
- Chaque correction doit être justifiée (détectabilité, stabilité, ou accessibilité EAA/WCAG 2.1 AA)
- Les targets générés doivent suivre exactement les patterns de `llamasticot-targets.ts` existants
- L'agent doit être **idempotent** : relancé sur le même composant, il ne duplique pas les targets

## Évolutions possibles (hors scope immédiat)

- Intégration CI/CD : déclencher l'agent sur chaque nouveau composant mergé
- Mode "watch" : surveiller les modifications de composants existants et mettre à jour les targets
- Rapport d'accessibilité consolidé : agréger les corrections de tous les composants en un rapport EAA
- Auto-validation : après `--apply`, lancer automatiquement `npm run explore:llama -- --grep <target>` pour vérifier que l'exploration réussit
