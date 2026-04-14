npx playwright test tests/iana-exploration.spec.ts --project=chromium -g "respects maxDepth:0"

npx playwright test tests/iana-exploration.spec.ts --project=chromium -g "exports graph"

Pour la v2, on pourrait imaginer un ExplorationPlan multi-pages avec des scopes par URL pattern, mais c'est un autre niveau d'abstraction.
