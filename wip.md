npx playwright test tests/iana-exploration.spec.ts --project=chromium -g "respects maxDepth:0"

npx playwright test tests/iana-exploration.spec.ts --project=chromium -g "exports graph"

Pour la v2, on pourrait imaginer un ExplorationPlan multi-pages avec des scopes par URL pattern, mais c'est un autre niveau d'abstraction.

Hors scope
Adaptation profonde Wijmo (shadow DOM, grids virtualisés)
Génération automatique des cibles depuis STORY_MANIFEST (manuel d'abord, automatisable plus tard)
Comparaison visuelle des screenshots light/dark

-> etre capable de réduir la taille des screenshot au selecteur avec possibilité de définir une marge et s'il y a un drop down, agrandir le scren pour prendre le drop down
