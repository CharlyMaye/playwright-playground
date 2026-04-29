Analyse de compatibilité du composant {{COMPONENT_NAME}} avec le moteur d'exploration Playwright

Contexte :

Le moteur d'exploration utilise DOMExtractor pour détecter les éléments interactifs via INTERACTIVE_SELECTOR
Les actions sont déterminées par json-rules-engine via les rules définies dans default-rules.ts
Les éléments sont identifiés par uid (priorité : data-testid > id > role+name > tag)
Analyse demandée :

Lis le template du composant ({{COMPONENT_TEMPLATE}}) et son CSS — l'élément interactif est-il visible et détectable par INTERACTIVE_SELECTOR ?
Si détecté, quelle rule dans default-rules.ts s'appliquerait ? Le role, tagName et type extraits matchent-ils une condition existante ?
Si aucune rule ne matche, propose la rule à ajouter (format json-rules-engine)
Vérifie si un data-testid est déjà présent dans le story component ({{STORY_COMPONENT}}). Si non, propose-le avec la convention type-label
