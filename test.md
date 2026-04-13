# Étape 1 — scanner le DOM et produire les JSON (une seule fois)

npx playwright test --project=analyze

# Étape 2 — tests visuels basés sur les JSON (rapide, sans re-scan)

npx playwright test tests/visual-regression.spec.ts --project=chromium
