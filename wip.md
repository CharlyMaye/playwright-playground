npx playwright test tests/iana-exploration.spec.ts --project=chromium -g "respects maxDepth:0"

npx playwright test tests/iana-exploration.spec.ts --project=chromium -g "exports graph"

Pour la v2, on pourrait imaginer un ExplorationPlan multi-pages avec des scopes par URL pattern, mais c'est un autre niveau d'abstraction.

Hors scope
Adaptation profonde Wijmo (shadow DOM, grids virtualisés)
Génération automatique des cibles depuis STORY_MANIFEST (manuel d'abord, automatisable plus tard)
Comparaison visuelle des screenshots light/dark

-> etre capable de réduir la taille des screenshot au selecteur avec possibilité de définir une marge et s'il y a un drop down, agrandir le scren pour prendre le drop down

sortie console à écrire dans un fichier lcoal

## Navigation externe — comportement actuel et limitations

**Comportement actuel** : `replayAll()` distingue deux cas selon `navigationUrl` dans la transition :
- **Même domaine** (ex: `iana.org → iana.org/domains`) : le clic est exécuté normalement. Le screenshot peut capturer la source ou la destination selon la vitesse de navigation (race condition connue).
- **Domaine différent** (ex: `iana.org → ietf.org`) : le `click` est remplacé par un `hover`. Le screenshot capture l'état hover du lien sans quitter la page.

**Ce qui n'est pas couvert** :
- L'état `:active` (mousedown) sur un lien externe n'est pas rejoué
- Si plusieurs scénarios pointent vers le même lien externe, le hover est rejoué autant de fois (redondant mais non bloquant)
- Les liens externes sont toujours explorés en phase 1 (génération) — on pourrait les filtrer dès l'exploration avec une option `ignoreExternalLinks: true` dans la config pour éviter d'explorer des pages tierces

**À faire** :
- [ ] Ajouter `ignoreExternalLinks?: boolean` dans `ExplorationConfig` — si `true`, le `DOMExtractor` ou le `ActionExecutor` exclut les liens dont `href` pointe vers un domaine différent du `rootSelector`'s origin
- [ ] Ou filtrer côté `ExplorationScope` en vérifiant le domaine cible avant d'exécuter un clic sur un `<a>`
