Oui. Pour obtenir une image cohérente avec la dernière version (et éviter les dérives où le LLM génère le JSON ou devient le moteur), je rédigerais un prompt très prescriptif.

---

# Prompt de génération

Créer une infographie professionnelle au format slide PowerPoint 16:9, fond blanc, style architecture logicielle moderne, couleurs sobres (bleu, vert, violet), icônes vectorielles simples.

Titre principal :

**"Préparation des composants et génération de scénarios pilotée par règles"**

Sous-titre :

**"Validation par LLM, génération de scénarios par le moteur de règles, exécution par Playwright"**

---

## Structure générale

L'image est divisée en deux grandes sections horizontales.

### SECTION 1 (haut)

Titre :

**"1. Préparation & validation des composants (analyse par LLM + moteur de règles)"**

Afficher un flux de gauche à droite.

---

### Bloc 1 : Entrées

Icône composant.

Contenu :

- Composant Angular / React / HTML
- Code source disponible
- Moteur de règles existant

Texte :

```text
Entrées

• Composant (code HTML / TS / JSX)
• Moteur de règles
  - rôles ARIA
  - interactions
  - actions possibles
  - scénarios existants
```

---

### Bloc 2 : LLM (analyse & validation)

Icône cerveau IA.

Titre :

```text
LLM
(analyse & validation)
```

Description :

Le LLM reçoit un prompt décrivant précisément le moteur de règles.

Le LLM :

✔ Vérifie la présence des rôles ARIA

✔ Ajoute ou corrige les rôles manquants

✔ Vérifie que les rôles sont cohérents

✔ Vérifie que le moteur possède les règles nécessaires

✔ Détecte les règles manquantes

✔ Propose de nouvelles règles si nécessaire

✔ Propose des scénarios d'interaction

✔ Ne génère aucun test Playwright

✔ Ne génère aucun JSON

---

### Bloc latéral

Encadré violet :

Titre :

```text
Ce que le LLM ne fait pas
```

Contenu :

```text
✖ N'exécute aucun test

✖ Ne génère pas de code Playwright

✖ Ne génère pas le JSON

✖ Ne prend pas de screenshots
```

---

### Bloc 3 : Moteur de règles

Icône engrenage vert.

Titre :

```text
Moteur de règles
```

Contenu :

Le moteur contient :

```text
• Rôles ARIA connus

• Actions possibles

• Interactions supportées

• Navigation

• Hover

• Focus

• Active

• Click

• Scroll

• Keyboard
```

Sous-bloc :

```text
Construction du scénario
```

Texte :

```text
Le moteur construit et maintient
le scénario d'exécution.

Il produit un fichier JSON décrivant :

• les cibles

• les rôles

• les règles

• les actions

• les étapes
```

---

### Bloc 4 : Sortie JSON

Icône fichier JSON.

Titre :

```text
Scénario JSON
```

Contenu :

Exemple :

```json
{
  "component": "...",
  "roles": [...],
  "rules": [...],
  "scenario": [
    { "action": "hover" },
    { "action": "focus" },
    { "action": "click" }
  ]
}
```

---

### Bandeau objectif

Sous la section.

Icône cible.

Texte :

```text
Objectif :

S'assurer que le composant possède les rôles attendus
et que le moteur de règles sait le manipuler.

Le scénario JSON est généré par le moteur de règles,
pas par le LLM.
```

Mettre cette phrase en évidence.

---

## SECTION 2 (bas)

Titre :

```text
2. Exécution du scénario (moteur Playwright)
```

---

### Entrée

Icône JSON.

Texte :

```text
Scénario JSON
(fourni par le moteur de règles)
```

---

### Bloc central : Moteur Playwright

Logo Playwright.

Pipeline horizontal :

```text
Charger le composant
        ↓
Exécuter les actions
        ↓
Hover
Focus
Active
Click
Keyboard
Scroll
Navigation
        ↓
Vérifier les états
        ↓
Capturer les screenshots
        ↓
Collecter les résultats
```

---

### Bloc sorties

Titre :

```text
Sorties
```

Icônes :

📸 Screenshots

📋 Rapport

📈 Logs & métriques

---

### Bloc bénéfices

Titre :

```text
Bénéfices
```

Contenu :

```text
✔ Tests visuels de non-régression

✔ Hover / Focus / Active couverts

✔ Scénarios générés automatiquement

✔ Séparation claire :
  Validation (LLM)
  Génération (moteur de règles)
  Exécution (Playwright)

✔ Intégration CI/CD
```

---

## Flux global (tout en bas)

Grand bandeau horizontal :

```text
Composant
      ↓
LLM
(validation)
      ↓
Moteur de règles
(génération du scénario JSON)
      ↓
JSON
      ↓
Playwright
(exécution)
      ↓
Screenshots & rapports
```

---

## Contraintes importantes

Ne jamais représenter le LLM comme générant le JSON.

Le LLM valide et enrichit.

Le moteur de règles génère le scénario JSON.

Playwright exécute le scénario.

Mettre visuellement en évidence la séparation :

- Validation = LLM
- Génération = moteur de règles
- Exécution = Playwright

Style professionnel, lisible en présentation PowerPoint, police moderne, icônes simples, fond blanc, diagramme technique destiné à des architectes logiciels et ingénieurs QA.
