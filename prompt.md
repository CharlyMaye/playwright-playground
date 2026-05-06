Tu es un expert Angular et Playwright dans le projet isagri-ng. Tu dois ajouter un test de non-régression visuelle pour un composant/story dans le système LlamaSticot.

## Architecture du pipeline

Le système fonctionne en 2 phases :

1. **Phase 1 (Exploration)** : `playwright-playground/tests/exploration/llamasticot.generate.ts` itère sur `LLAMASTICOT_TARGETS`, navigue vers chaque URL, extrait le DOM interactif, applique des rules pour déterminer les actions à effectuer, explore l'arbre d'états, et produit un JSON dans `.exploration-data/`.
2. **Phase 2 (Replay)** : `tests/llamasticot-exploration.spec.ts` relit ces JSON et rejoue tous les scénarios pour détecter les régressions.

## Moteur de rules (json-rules-engine)

L'exploration repose sur un **moteur de règles** (`RulesEngine.ts`) qui, pour chaque élément interactif détecté dans le DOM, évalue des conditions sur ses **facts** et décide quelle action effectuer.

### Facts disponibles par élément (extraits par DOMExtractor)

| Fact              | Type          | Description                                                         |
| ----------------- | ------------- | ------------------------------------------------------------------- |
| `tag`             | string        | Tag HTML (`button`, `input`, `a`, `select`, `textarea`, `summary`…) |
| `role`            | string\|null  | Attribut `role` ARIA                                                |
| `visible`         | boolean       | Élément visible dans le viewport                                    |
| `enabled`         | boolean       | Non désactivé (`disabled=false`)                                    |
| `inputType`       | string\|null  | Attribut `type` (pour `<input>`)                                    |
| `ariaExpanded`    | boolean\|null | Valeur de `aria-expanded`                                           |
| `ariaControls`    | string\|null  | Valeur de `aria-controls`                                           |
| `focusable`       | boolean       | `tabIndex >= 0`                                                     |
| `accessibleName`  | string\|null  | `aria-label` / `aria-labelledby` / label associé / `title`          |
| `text`            | string        | Contenu textuel (tronqué à 200 chars)                               |
| `contentEditable` | boolean       | `isContentEditable`                                                 |

### Sélecteur d'extraction DOM

Seuls les éléments matchant ce sélecteur sont extraits :

```css
a, button, input, select, textarea, [role], [tabindex], [contenteditable], details, summary, [aria-expanded], [aria-controls], [aria-haspopup]
```

**→ Si un élément interactif du composant n'a AUCUN de ces attributs/tags, il ne sera PAS détecté par l'explorateur.**

### Rules par défaut (default-rules.ts)

| Élément                                         | Condition       | Action | Priorité |
| ----------------------------------------------- | --------------- | ------ | -------- |
| `button` enabled visible                        | —               | click  | 10       |
| `button` + `aria-expanded=false`                | —               | click  | 15       |
| `a` visible                                     | —               | click  | 5        |
| `input` type text/email/password/search/tel/url | enabled visible | fill   | 8        |
| `input` type checkbox/radio                     | enabled visible | click  | 7        |
| `textarea`                                      | enabled visible | fill   | 8        |
| `select`                                        | enabled visible | select | 8        |
| `role=combobox`                                 | enabled visible | click  | 12       |
| `role=tab`                                      | visible         | click  | 7        |
| `role=menuitem`                                 | visible         | click  | 9        |
| `aria-expanded=false` (any)                     | enabled visible | click  | 13       |
| `summary`                                       | visible         | click  | 12       |

### Rules visuelles additionnelles (VISUAL_STATE_RULES dans llamasticot-rules.ts)

Appliquées automatiquement à tous les targets LlamaSticot :

- **hover** sur `button` (priorité 9), `a` (priorité 4)
- **focus** sur `button` (priorité 8), `a` (priorité 3)
- **mousedown** sur `button` (priorité 7), `a` (priorité 2)

### Ajout de rules custom par target

Si les rules par défaut ne couvrent pas le composant, on peut ajouter des rules custom via `configOverrides.additionalRules` :

```ts
createLlamasticotTarget('mon-composant', {
  theme: 'light',
  configOverrides: {
    additionalRules: [
      {
        conditions: {
          all: [
            { fact: 'role', operator: 'equal', value: 'slider' },
            { fact: 'visible', operator: 'equal', value: true },
            { fact: 'enabled', operator: 'equal', value: true },
          ],
        },
        event: { type: 'click', params: { priority: 10 } },
      },
    ],
  },
}),
```

## Identification des éléments (UID)

L'explorateur identifie chaque élément par ordre de priorité :

1. `data-testid` → `testid:<value>`
2. `id` → `#<value>`
3. `role` + `accessibleName` → `role:"name"`
4. `role` seul → `role[index]`
5. `tag` seul → `tag[index]`

**→ Pour des tests stables, le composant DOIT exposer des `data-testid` ou des `role` + `aria-label` sur ses éléments interactifs.**

## Structure d'une story (côté Angular)

- **Composant** (`<nom>.component.ts`) : Angular standalone, `input()` signals
- **Story** (`<nom>.story.ts`) : exporte `StoryRoute[]` avec `loadCmpType`, `properties`, `theme`, `colorScheme`
- **Enregistrement** dans `apps/demo-app/src/stories/index.ts` : entrée dans `STORY_DEFINITIONS`

## Structure d'un target d'exploration (côté Playwright)

Dans `llamasticot-factory.ts` (builders) / `llamasticot-targets.ts` (liste) :

```ts
createLlamasticotTarget(storyPath, {
  theme: 'light' | 'dark',
  queryParams: { inputName: 'stringValue', ... },
  captureScreenshots: true | false,
  configOverrides: { additionalRules: [...], maxDepth: 3, ... },
})
```

- `storyPath` = le `path` dans `STORY_DEFINITIONS`
- `queryParams` = noms des `input()` → valeurs stringifiées (booléens : `'true'`/`'false'`)
- Le nom auto-généré : `<slug>-<queryParams>-<theme>`

## URL d'une story

```
http://localhost:4206/<path>?standalone=true&culture=fr-FR&theme=<light|dark>&<input>=<value>
```

## Ce que tu dois faire pour le composant : **[COMPONENT NAME]**

### Étape 1 — Analyser le composant

1. Lire le fichier `.component.ts` : identifier tous les `input()`, leurs types/valeurs
2. Identifier le template HTML : quels éléments interactifs sont rendus ?
3. Vérifier la story dans index.ts : noter le `path`

### Étape 2 — Vérifier la couverture par les rules

Pour chaque élément interactif du template, vérifier :

1. **Est-il détecté ?** Son tag ou attribut doit matcher le sélecteur d'extraction :
   `a, button, input, select, textarea, [role], [tabindex], [contenteditable], details, summary, [aria-expanded], [aria-controls], [aria-haspopup]`

2. **Est-il couvert par une rule ?** Son `tag` + `role` + `inputType` + état ARIA doit matcher au moins une rule par défaut

3. **Est-il identifiable de façon stable ?** Présence d'un `data-testid`, `id`, ou `role` + `aria-label`

**Si un élément n'est PAS détecté ou couvert** :

- Modifier le composant pour ajouter les attributs nécessaires :
  - `role="..."` (pour la détection ET le matching des rules)
  - `aria-label="..."` (pour l'identification stable)
  - `aria-expanded="true|false"` (pour les éléments dépliables)
  - `data-testid="..."` (pour l'identification stable)
  - `tabindex="0"` (en dernier recours, pour forcer la détection)

**Si une rule custom est nécessaire** (élément avec un `role` non couvert par défaut) :

- Ajouter une `additionalRules` dans le `configOverrides` du target

### Étape 3 — Créer les targets

Ajouter dans `LLAMASTICOT_TARGETS` les entrées couvrant les combinaisons pertinentes :

- État enabled / disabled
- Variantes visuelles
- États interactifs significatifs (expanded/collapsed si applicable)

## Fichiers à modifier

1. `llamasticot-targets.ts` — ajouter les targets dans `LLAMASTICOT_TARGETS` (utiliser `createLlamasticotTarget` / `createLlamasticotThemeMatrix` depuis `llamasticot-factory.ts`)
2. `isagri-ng/apps/demo-app/src/stories/<nom>.component.ts` — **si nécessaire** : ajouter `role`, `aria-*`, `data-testid` pour que les éléments soient détectés et identifiés

## Fichiers en lecture seule (contexte)

- `isagri-ng/apps/demo-app/src/stories/<nom>.story.ts`
- index.ts
- default-rules.ts
- llamasticot-rules.ts (règles visuelles appliquées automatiquement)
- llamasticot-config.ts (constantes et type `LlamasticotTargetOptions`)
- llamasticot-factory.ts (builders `createLlamasticotTarget`, `createLlamasticotThemeMatrix`)
- DOMExtractor.ts (sélecteur d'extraction)

## Contraintes

- Ne pas modifier le moteur d'exploration (`explorer/`)
- Respecter les patterns existants dans `LLAMASTICOT_TARGETS`
- Chaque combinaison significative de propriétés = un target séparé
- Privilégier `data-testid` pour les identifiants stables
- Privilégier les attributs ARIA sémantiques (`role`, `aria-label`) plutôt que `tabindex` brut
- Ne modifier le composant QUE pour l'accessibilité/testabilité (pas de changements fonctionnels)
