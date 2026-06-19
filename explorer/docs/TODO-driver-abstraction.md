# TODO — Découpler le moteur d'exploration de Playwright

> **✅ ÉTAT (2026-06-12) : Phases 1 et 2 TERMINÉES.** tsc propre, eslint propre,
> 43/43 tests, grep de contrôle OK (aucun `@playwright/test` hors
> `adapters/playwright/`, `fixture.ts` et `__tests__/`).
>
> Décisions prises pendant l'implémentation :
> - `tag` **conservé** (pas renommé en `controlType`) — préserve les hash
>   d'états et les JSON existants (§2.5 reste optionnel).
> - `cssSelector → nativeSelector` **fait**, avec lecture rétro-compatible des
>   JSON legacy dans `ExplorationPOM.#findFactSelector`.
> - `ExplorationScope` déplacé **entièrement dans l'adapter** (son contrat
>   parle `Locator` à dessein) ; ses méthodes mortes `isInScope`/
>   `resolveOverflowTarget` supprimées. Le cœur ne le connaît plus.
> - `fixture.ts` **reste à la racine** d'`explorer/` (point d'entrée assumé de
>   l'adapter web, conformément au critère grep).
> - `ExplorationTarget<TSession>` générique ; les cibles web utilisent
>   `ExplorationTarget<Page>`.
> - Capacités : `ActionExecutor.supports(action)` ajouté au port, filtré dans
>   `Explorer.#unexploredActions` ; l'impl Playwright renvoie `true`.
> - Port `DefaultRules` injecté dans `ConcreteRulesEngine` ;
>   `DEFAULT_HTML_RULES` + `HtmlDefaultRules` vivent dans l'adapter.
>
> **Non-régression validée (2026-06-12)** : `iana.generate.ts` rejoué après le
> refactoring — hash d'états **identiques** sur les 5 scopes (body, main,
> header, footer, body-content), `nativeSelector` présent dans les JSON, zéro
> `cssSelector` résiduel. Écart : `iana-body` 15→19 transitions, dû à la
> variance du site live (failedActions 13→9, mêmes candidats), pas au code.
> Reste à rejouer `llamasticot.generate.ts` quand le serveur `:4206` tourne.
>
> Reste : **Phase 3 (WPF)** ci-dessous et les **Options différées** (section
> dédiée en fin de fichier).
>
> **Ajout (2026-06-12) — mode crawler `followNavigation`** : la config gagne
> `followNavigation: 'none' | 'same-application'` ('none' = SPA, défaut,
> hash inchangés). En mode 'same-application', une navigation intra-app
> devient un état découvert à `depth + 1` (la location opaque entre alors
> dans l'identité de l'état via `StateManager.captureState(..., location)`),
> au lieu d'une frontière `__external_navigation__`. Le port `StateRestorer`
> gagne `isWithinApplication(token)` (web : même origin ; WPF : même
> process/fenêtre — **à implémenter dans l'adapter WPF, §3.2**). Au passage,
> `PlaywrightDOMExtractor` batché en un seul `evaluateAll` (3 round-trips ×
> N éléments → 1 par page ; `visible` reproduit la sémantique
> `isVisible` de Playwright) — hash vérifiés identiques sur les 4 scopes
> IANA depth-1.

> Objectif : le moteur (`explorer/`) ne doit dépendre que d'abstractions (ports),
> pour pouvoir remplacer Playwright par Puppeteer, ou par un driver WPF
> (UI Automation / WinAppDriver / FlaUI), sans toucher au cœur.
>
> Architecture cible : **ports & adapters (hexagonal)**. La frontière se place au
> niveau des **intentions du domaine** (extraire des facts, exécuter une action,
> restaurer un état) — PAS au niveau d'une abstraction de `Page`/`Locator`
> (un "mini-Playwright" serait implémentable par Puppeteer mais jamais par WPF :
> pas de DOM, pas de CSS, pas de JS).
>
> **Règle de validation d'un port** : si une signature mentionne un concept
> inexistant en UIA (CSS, DOM, JS, URL), elle est au mauvais niveau.

---

## État des lieux du couplage

### Déjà neutres — aucun changement requis

- `RulesEngine` (json-rules-engine, ne voit que des `ElementFact`)
- `StateManager` (hash sur les facts)
- `ExplorationGraph`, `ScenarioExporter`, `ExplorationConfig`, `computeDomChanges`
- La boucle BFS/DFS d'`Explorer` (hors usages `#page`, voir ci-dessous)

### Couplés à Playwright

| Fichier | Fuite | Gravité |
|---|---|---|
| `ExplorationScope.ts` | `Locator` dans le **contrat abstrait** (`root`, `isInScope`, `resolveOverflowTarget`) | ⚠️ la pire : l'abstraction elle-même fuit |
| `Explorer.ts` | `#page` direct : `url()`, `goto()` (rollback), `screenshot()`, `waitForTimeout()` | Élevée |
| `DOMExtractor.ts` | `Locator` + `evaluate(collectElementProps)` = injection JS navigateur | Élevée (sémantique) |
| `ActionExecutor.ts` | API `Locator` (click/fill/getByRole/nth), `page.waitForFunction` | Moyenne |
| `ReadinessChecker.ts` | `page.locator().waitFor()` | Faible |
| `types.ts` | `ExplorationTarget.preExploreHook?: (page: Page)` | Faible |
| `fixture.ts` | Test runner Playwright (`base.extend`) + branchement `TestContext` | Structurelle — devient le point d'entrée de l'adapter |
| `engine/test.context.ts` | Expose `Page`/`Browser`/`APIRequestContext` ; tout le monde pioche `testContext.page` | Structurelle — migre côté adapter |

### Les deux vrais problèmes sémantiques (pas du typage)

1. **Rollback = "une URL restaure un état"** (`Explorer.#stateUrls`,
   `#rollbackToState` via `goto`, `#navigatedAwayFrom` via comparaison de
   `pathname`). Hypothèse web-only, déjà fragile (états atteints par interaction
   pure). En WPF : pas d'URL → restaurer = redémarrer l'app + rejouer le chemin
   d'actions, ou navigation applicative. ⇒ La stratégie de rollback devient un
   **port à part entière** (`StateRestorer`), pas une méthode utilitaire.
2. **Extraction = évaluation de JS dans la page** (`collectElementProps`,
   sélecteurs CSS calculés côté navigateur). Puppeteer : quasi identique. WPF :
   arbre UI Automation, zéro JS/CSS. ⇒ L'extraction reste entièrement derrière
   le port (déjà le cas ✅) ; les champs DOM-spécifiques d'`ElementFact`
   deviennent opaques (voir Phase 1).

### Ce qui mappe bien vers UIA (à préserver)

- `role`, `accessibleName`, `enabled`, `visible`, `focusable` = l'arbre
  d'accessibilité ≈ propriétés `AutomationElement` UIA.
- Schéma d'uid portable tel quel : `AutomationId` ↔ `data-testid`,
  `ControlType+Name` ↔ `role:"name"`.

---

## Phase 1 — Ports + adapter Playwright (Puppeteer-ready)

### 1.1 Créer les ports manquants

- [ ] Port `NavigationDriver` (ou nom équivalent) couvrant ce qu'`Explorer` fait
      via `#page` :
  - `currentLocation(): string` (URL web / identifiant d'écran WPF)
  - `captureScreenshot(path): Promise<void>`
  - `wait(ms): Promise<void>`
- [ ] Port `StateRestorer` : `snapshotRestorePoint(): RestoreToken` +
      `restore(token): Promise<void>`. Implémentation web : token = URL,
      restore = `goto(url, waitUntil: 'load')`. Le test `#navigatedAwayFrom`
      (comparaison de `pathname`) migre dans cette implémentation web —
      le cœur demande seulement "a-t-on quitté l'état ?".
- [ ] Les 4 ports existants restent les ports : `DOMExtractor`,
      `ActionExecutor`, `ReadinessChecker`, `ExplorationScope` (contrats
      abstraits actuels, nettoyés ci-dessous).

### 1.2 Purger Playwright des contrats du cœur

- [ ] `ExplorationScope` (abstrait) : supprimer `Locator` des signatures.
      Reformuler en termes neutres (le scope expose `rootSelector`/`boundary`/
      `overflowSelectors` comme données ; la résolution concrète vit dans
      l'adapter). Vérifier qui consomme `scope.root` (DOMExtractor concret →
      adapter, OK).
- [ ] `Explorer.ts` : supprimer `#page` ; injecter `NavigationDriver` +
      `StateRestorer` à la place de `TestContext`. Usages à remplacer :
      `#stateUrls` (→ `RestoreToken` par état), `#rollbackToState`,
      `#navigatedAwayFrom`, `#captureScreenshot`, `recordExternalNavigation`
      (`navigationUrl` ← `currentLocation()`).
- [ ] `ReadinessChecker` concret → adapter ; `readinessSelector` devient une
      "expression de readiness" opaque interprétée par le driver.
- [ ] `types.ts` : `preExploreHook?: (page: Page)` → prend l'abstraction de
      session/driver à la place de `Page`.
- [ ] `ElementFact` : opacifier les champs DOM-spécifiques.
  - `cssSelector` → `nativeSelector` (chaîne que seul le driver qui l'a
    produite sait résoudre — invariant OK : extracteur et exécuteur
    appartiennent toujours au même adapter).
  - `tag` → `controlType` (décision : renommage maintenant, ou alias en
    phase 1 + renommage en phase 2 ; voir impacts §2 — règles, hash, POM,
    JSON déjà générés).
  - `inputType`, `ariaControls`, `ariaOwns`, `ariaExpanded`,
    `contentEditable` : documenter comme "web-flavored" ; soit nullable et
    ignorés par les drivers non-web, soit déplacés dans un sac
    `nativeProps: Record<string, unknown>`.

### 1.3 Réorganiser en adapter

- [ ] Créer `explorer/adapters/playwright/` et y déplacer tous les
      `Concrete*` couplés : `ConcreteDOMExtractor` (+ `collectElementProps`),
      `ConcreteActionExecutor`, `ConcreteExplorationScope`,
      `ConcreteReadinessChecker`, les nouveaux `PlaywrightNavigationDriver` /
      `PlaywrightStateRestorer`.
- [ ] `TestContext` (engine) reste côté adapter : plus aucun fichier du cœur
      n'importe `engine/test.context`.
- [ ] Composition root : `registerExplorerDependencies()` (index.ts) se scinde
      en `registerExplorerCore()` (RulesEngine, StateManager, Graph, Explorer…)
      + `registerPlaywrightAdapter()` (les ports → implémentations Playwright).
      Un futur backend fournit son propre `registerXxxAdapter()`.
- [ ] `fixture.ts` = point d'entrée de l'adapter Playwright (assumé). Puppeteer
      aurait un runner Node simple ; WPF passerait par WinAppDriver/Appium
      (TypeScript) ou un pont FlaUI (.NET).

### 1.4 Capacités & règles

- [ ] `DEFAULT_HTML_RULES` appartient à l'adapter web (les conditions testent
      `tag === 'select'`, `inputType`…) : le chargement par défaut des règles
      devient une responsabilité de l'adapter / de la composition root.
- [ ] Actions sans équivalent WPF garanti : `mousedown` (dispatchEvent),
      `hover`, `WaitConditionFunction` (expression JS brute). Le port
      d'exécution déclare ses capacités (le driver annonce ce qu'il supporte ;
      les actions non supportées sont filtrées ou échouent proprement).
- [ ] `ExplorationConfig` : champs web-flavored (`rootSelector`,
      `overflowSelectors`, `readinessSelector`, `fillValues` clés = types
      d'input HTML). Décision : garder opaques (interprétés par le driver) —
      pragmatique — ou scinder config cœur / config driver. Recommandé phase 1 :
      opaque, documenter.

---

## Phase 2 — Mettre à jour les consommateurs de l'explorateur

> Inventaire vérifié (grep) : `POM/ExplorationPOM.ts`,
> `tests/exploration/{iana.generate, llamasticot.generate, llamasticot-factory,
> llamasticot-config, llamasticot-targets}.ts`, `explorer/__tests__/*`.

### 2.1 `POM/ExplorationPOM.ts` (replay des graphes exportés)

- [ ] Utilise `_page.goto/_page.locator` directement et lit `fact.cssSelector`
      depuis les `SerializedGraph` JSON : impacté par le renommage
      `cssSelector → nativeSelector`.
- [ ] **Duplique la logique `#resolveLocator` d'`ActionExecutor`** (testid:/#id/
      role:"name"/tag[index]) : extraire un résolveur partagé dans l'adapter
      Playwright et l'utiliser des deux côtés (dédup + cohérence garantie).
- [ ] Le POM est intrinsèquement Playwright (il rejoue dans un navigateur) :
      le déplacer/le déclarer comme composant de l'adapter web, ou le faire
      consommer les ports s'il doit un jour rejouer sur un autre backend.

### 2.2 `tests/exploration/`

- [ ] `llamasticot-config.ts` : importe `Page` de `@playwright/test` pour les
      `preExploreHook` → adapter à la nouvelle signature du hook.
- [ ] `llamasticot-targets.ts`, `llamasticot-factory.ts` : `ExplorationTarget`
      change si `preExploreHook` change ; vérifier aussi les configs.
      (Note : 3 erreurs tsc pré-existantes dans `llamasticot-targets.ts`
      lignes 118/122/126 — boolean→string dans queryParams — indépendantes de
      ce chantier.)
- [ ] `iana.generate.ts`, `llamasticot.generate.ts` : importent `explorerTest`
      depuis `explorer/fixture` → suivre le déplacement de la fixture vers
      l'adapter (mettre à jour les chemins d'import).

### 2.3 Tests unitaires `explorer/__tests__/`

- [ ] `explorer-integration.spec.ts` : suit la fixture déplacée.
- [ ] `exploration-config.spec.ts`, `state-manager.spec.ts` : impactés
      uniquement si renommage de champs (`tag`/`cssSelector`) — mettre à jour
      les facts de test.
- [ ] **Nouveau test rendu possible** : un `FakeDriver` en mémoire pour tester
      la boucle BFS/DFS d'`Explorer` sans navigateur (gros gain : aujourd'hui
      la boucle n'est testée qu'en intégration).

### 2.4 Artefacts générés

- [ ] Les JSON `SerializedGraph` déjà exportés sur disque contiennent
      `cssSelector` (et `tag`) : après renommage, régénérer les graphes ou
      fournir une lecture rétro-compatible dans `ExplorationPOM`
      (mapper `cssSelector → nativeSelector` au chargement).
- [ ] `ScenarioExporter` : vérifier les noms de champs émis dans les scénarios.

### 2.5 Impacts du renommage `tag → controlType` (si retenu)

- [ ] `default-rules.ts` (conditions sur `fact.tag`)
- [ ] `StateManager.#hashFacts` (stratégie 'structure' sérialise `tag`) —
      ⚠️ change les hash d'état → invalide les graphes déjà générés
- [ ] `DOMExtractor.#deduplicateRepeated` (structureKey)
- [ ] `ExplorationPOM` + JSON existants (cf. 2.4)

---

## Phase 3 — Préparation WPF (ne s'engager qu'après phase 1 validée)

> **✅ DÉCISION (2026-06-12) — outillage : WinAppDriver/Appium.**
> Le driver WPF sera un **agent distant** : le moteur TypeScript (devcontainer
> Linux) parle en WebDriver HTTP à WinAppDriver tournant sur une machine
> Windows. L'hôte WSL2 du poste de dev peut jouer ce rôle (joignable depuis le
> conteneur via `host.docker.internal`). Conséquence : **pas de SDK .NET ni de
> C# dans le repo** — côté conteneur, le client Appium est un simple paquet
> npm. L'option « pont FlaUI » est abandonnée (sauf blocage technique
> découvert au prototypage).

### 3.0 Infra / devcontainer

- [ ] **Configurer le devcontainer** pour le mode agent distant :
  - [ ] Ajouter la dépendance npm du client WebDriver/Appium
        (`webdriverio` ou `appium` client) dans `playwright-playground`.
  - [ ] Exposer l'URL de l'agent via une variable d'environnement
        (ex. `WPF_DRIVER_URL`, défaut `http://host.docker.internal:4723`)
        dans `containerEnv` de `devcontainer.json` — PAS de valeur en dur
        dans le code.
  - [ ] Vérifier la connectivité conteneur → hôte Windows
        (`host.docker.internal`, pare-feu Windows : autoriser le port 4723
        en entrée depuis WSL2/Docker).
  - [ ] **Ne PAS ajouter** la feature .NET (`dotnet`) : inutile avec
        l'option Appium, elle alourdirait le build pour tout le monde.
  - Côté Windows (hors devcontainer) : installer WinAppDriver, activer le
    Developer Mode, lancer l'agent (manuel ou tâche planifiée).
- [ ] CI : les tests WPF nécessitent un runner Windows (ou une VM dédiée
      joignable) — à prévoir dans le pipeline, séparé des tests web.

### 3.1 Échelle de validation AVANT d'écrire l'adapter (go/no-go à chaque étape)

Dans l'ordre, de la moins chère à la plus chère :

- [ ] **1. Audit UIA de l'app WPF cible** (manuel, Windows, zéro code) :
      ouvrir l'app avec *Accessibility Insights for Windows* et inspecter
      l'arbre — les contrôles ont-ils `AutomationId`/`Name`/`ControlType` ?
      **No-go** : arbre pauvre → instrumenter l'app
      (`AutomationProperties.AutomationId`) AVANT l'adapter. C'est le
      risque n°1 du chantier.
- [x] **2. FakeDriver en mémoire** ✅ (2026-06-12) :
      `explorer/__tests__/explorer-fake-driver.spec.ts` — machine à écrans
      en mémoire branchée sur les 6 ports, pilotée par le VRAI cœur
      (`ConcreteExplorer` + `ConcreteRulesEngine` + `ConcreteStateManager` +
      `ConcreteExplorationGraph`). 3 tests : découverte/cycle/self-loop/
      navigation externe, filtre de capacités (`hover` non supporté →
      filtré, 0 échec), stratégie DFS. **46/46 tests** au total.
      → Preuve architecturale acquise : le travail WPF = un adapter, rien
      d'autre.
- [ ] **3. Connectivité conteneur → hôte Windows** :
      `curl http://host.docker.internal:4723/status` depuis le devcontainer
      avec WinAppDriver lancé sur l'hôte. **No-go** : pare-feu/WSL2 à régler
      avant tout.
      - ⚠️ Constat (2026-06-12) : `host.docker.internal` **ne résolvait pas**
        dans ce devcontainer (Docker/WSL2 sans Docker Desktop ne le fournit
        pas). Correctif appliqué dans `devcontainer.json` :
        `--add-host=host.docker.internal:host-gateway` dans `runArgs`.
      - ✅ Rebuild fait : `host.docker.internal` résout (→ 172.18.0.1,
        passerelle bridge Docker). Reste à valider le `/status` avec
        WinAppDriver lancé côté Windows.
      - ⚠️ Topologie : 172.18.0.1 = la **VM WSL2** (où tourne dockerd), pas
        Windows. En réseau WSL **NAT** (défaut), le service Windows doit
        écouter sur l'IP du vEthernet WSL et être visé via cette IP ; en
        mode **mirrored** (Win11, `.wslconfig` : `networkingMode=mirrored`),
        localhost est partagé et c'est plus simple. Procédure côté Windows
        (PowerShell **admin** — indépendant de la langue de l'OS) :
        ```powershell
        # 1. Developer Mode (sans passer par les menus)
        reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d 1
        # 2. Installer WinAppDriver
        winget search winappdriver   # puis winget install <id>, ou
        # https://github.com/microsoft/WinAppDriver/releases (v1.2.1)
        # 3. Ouvrir le pare-feu
        New-NetFirewallRule -DisplayName "WinAppDriver (WSL)" -Direction Inbound -LocalPort 4723 -Protocol TCP -Action Allow
        # 4. IP du vEthernet WSL
        Get-NetIPAddress -AddressFamily IPv4 | ? InterfaceAlias -like "*WSL*" | select IPAddress
        # 5. Lancer WinAppDriver à l'écoute sur cette IP (console admin)
        & "C:\Program Files (x86)\Windows Application Driver\WinAppDriver.exe" <IP_WSL> 4723
        ```
        Puis depuis le devcontainer, dans l'ordre :
        `curl http://host.docker.internal:4723/status` ; si échec,
        `curl http://<IP_WSL>:4723/status` → l'URL gagnante devient la
        valeur de `WPF_DRIVER_URL`.
- [ ] **4. Hello-world WinAppDriver** (Calculatrice Windows) depuis un
      mini-script dans le devcontainer : session WebDriver, `findElement`,
      clic, et surtout vérifier qu'on récupère TOUS les attributs requis par
      `ElementFact` : `ControlType`, `Name`, `AutomationId`, `IsEnabled`,
      `IsOffscreen`, `BoundingRectangle`.
- [ ] **5. Spike « restore » + mesure de coût** : lancer l'app, 2-3 actions,
      tuer la session, relancer, rejouer le chemin → même hash de facts ?
      **Chronométrer** : un restart à 5-15 s × dizaines de rollbacks peut
      rendre l'exploration impraticable → stratégie alternative à concevoir
      (navigation interne, réutilisation de session).

> **Plan B agent** : WinAppDriver n'est plus activement maintenu. Si
> l'étape 4 est instable → **FlaUI.WebDriver** (serveur WebDriver maintenu,
> basé FlaUI) : même protocole, même client npm, zéro impact sur l'adapter
> ni le devcontainer.

### 3.2 Adapter WPF

- [ ] `explorer/adapters/wpf/` : implémenter les 6 ports (`DOMExtractor`,
      `ActionExecutor`, `ReadinessChecker`, `NavigationDriver`,
      `StateRestorer`, `DefaultRules`) + `registerWpfAdapter()`.
- [ ] `DEFAULT_WPF_RULES` (conditions sur `controlType`/`role` UIA).
- [ ] Déclaration de capacités : `supports()` renvoie `false` pour
      `hover` (non fiable), `mousedown` (dispatchEvent web-only) et les
      séquences contenant `WaitConditionFunction` (JS).
- [ ] Runner dédié (hors fixture Playwright) — un script/runner Node
      simple suffit, le client Appium n'a pas besoin du test-runner
      Playwright.

---

## Options différées (non bloquantes — à décider plus tard)

Consolidation des cases restées ouvertes dans les phases 1-2 :

- [x] **`FakeDriver` en mémoire** (§2.3) ✅ fait (2026-06-12) — voir
      `explorer/__tests__/explorer-fake-driver.spec.ts` et l'étape 2 de
      l'échelle de validation §3.1.
- [ ] **Rejouer `llamasticot.generate.ts`** (critère de validation) — demande
      le serveur LlamaSticot sur `:4206`. Vérifier les hash d'états comme
      fait pour IANA. ⚠️ Au passage : les JSON `llamasticot-*.json` sont
      actuellement **supprimés du working tree** (restaurables via git).
- [ ] **`tag → controlType`** (§2.5) — non retenu : invalide les hash et les
      JSON. À grouper avec le chantier WPF (seul vrai demandeur).
- [ ] **Régénérer les JSON `.exploration-data` restants** pour basculer sur
      `nativeSelector` partout (IANA : fait ✅), puis supprimer la lecture
      rétro-compatible dans `ExplorationPOM.#findFactSelector`.
- [ ] **Champs web-flavored d'`ElementFact`** (§1.2) — `inputType`,
      `ariaControls`, `ariaOwns`, `contentEditable`… : option « sac
      `nativeProps` » à trancher quand le driver WPF existera.
- [ ] **Scission config cœur / config driver** (§1.4) — option pragmatique
      retenue (champs opaques interprétés par le driver) ; à réévaluer si un
      2ᵉ adapter rend la config ambiguë.
- [ ] **Déplacer `ExplorationPOM` dans l'adapter web** (§2.1) — il consomme
      déjà le résolveur partagé ; pur rangement.

## Risques & vigilance

- **Rollback** : le plus structurant ; toute la sémantique de `#exploreAction`
  repose dessus. À traiter en premier en phase 1.
- **Hash d'états** : tout renommage de champ sérialisé dans `#hashFacts`
  invalide les graphes/baselines existants.
- **Opacité des sélecteurs** : invariant à documenter — un `nativeSelector`
  n'est résolu QUE par le driver qui l'a produit (pas de mélange d'adapters
  sur un même graphe).
- **ExplorationPOM** : consommateur silencieux des formats JSON ; à inclure
  dans chaque changement de format.

## Critères de validation (chaque phase)

- [ ] `npx tsc --noEmit` propre (hors erreurs pré-existantes
      `llamasticot-targets.ts`)
- [ ] `npx eslint explorer` propre
- [ ] `npx playwright test explorer/__tests__` → 43/43 (+ nouveaux tests
      FakeDriver)
- [ ] Grep de contrôle : aucun `from '@playwright/test'` hors
      `explorer/adapters/playwright/` et `fixture.ts`
- [ ] `tests/exploration/*.generate.ts` rejouent et produisent des graphes
      identiques (mêmes hash d'états) — sauf renommages assumés en 2.5
