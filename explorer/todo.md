~~ne pas dépendre de waitfortimeout mais d'une stabilisation de l'état du DOM. Cela permet d'éviter des délais d'attente inutiles et de rendre l'exploration plus rapide et plus fiable.~~
~~=> exemple: vérifier si les dimensions d'un éléments change ou non~~

✅ FAIT — voir le port `StabilizationChecker` + `PlaywrightStabilizationChecker`
(MutationObserver « calme DOM » + stabilité de la bounding box sur 2 frames rAF,
borné par `stabilizationTimeout`). Réglable via `stabilizationStrategy`
(`fixed` | `dom-quiet` | `dom-quiet+layout`, défaut `dom-quiet+layout`).
Détails dans `ANALYSE.md` (point 1).
