Explosion combinatoire — Un formulaire avec 10 champs et 3 boutons génère potentiellement des centaines de chemins. La stratégie d'exploration (profondeur max, heuristiques de priorité) est critique dès le départ.

Hashing d'état DOM — Définir ce qui constitue un "état" est non trivial. Un hash naïf du DOM entier sera trop sensible (animations, timestamps). Il faudra extraire un sous-ensemble structurel pertinent.

Composants Angular Material — Les composants comme mat-select, mat-autocomplete, mat-menu ont des comportements spécifiques (overlays CDK attachés au body, pas dans le sous-arbre racine). Les règles devront en tenir compte.

Séquences composites — Le chaînage click → waitFor → select nécessite des mécanismes d'attente (waitForSelector, waitForFunction) entre les étapes. Ce n'est pas juste une file d'actions.
