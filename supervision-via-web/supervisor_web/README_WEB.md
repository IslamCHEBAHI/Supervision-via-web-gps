# Medical BioTop Supervisor Web

Cette page web est separee du code Flutter. Elle lit et ecrit dans le meme projet Firebase que l'application mobile.

## Lancer en local

1. Ouvrir un terminal dans ce dossier.
2. Lancer un petit serveur statique :

```powershell
python -m http.server 8080
```

3. Ouvrir `http://localhost:8080`.

## Acces superviseur

Le login utilise Firebase Authentication.

1. Activer `Authentication > Sign-in method > Email/Password`.
2. Creer un compte superviseur dans `Authentication > Users`.
3. Activer aussi `Authentication > Sign-in method > Anonymous` pour l'app mobile.
4. Se connecter sur le site avec cet email et ce mot de passe.

## Fonctions incluses

- Login superviseur.
- Dashboard avec total utilisateurs, online et offline.
- Ajouter, modifier et supprimer les utilisateurs dans Firestore.
- Voir le statut online/offline via `lastSeenAt`, comme dans l'application.
- Voir la derniere position GPS d'un utilisateur.
- Suivi live toutes les 5 secondes.
- Historique GPS filtre par date et heure avec trace animee.
- Points GPS cliquables avec utilisateur, date, heure et coordonnees.
- Bouton plein ecran sur la carte.
- Bouton pause/reprendre pour l'animation du trajet.
- Affichage des etablissements de sante proches via Geoapify.

## Notes Firebase

La configuration utilise le meme projet Firebase :

- `projectId`: `trackingapp-70264`
- collection utilisateurs : `users`
- sous-collection GPS : `users/{username}/locations`

Si vos regles Firestore refusent les acces web, ajoutez une application Web dans Firebase Console et adaptez les regles pour autoriser le domaine de deploiement.

Un modele de regles est fourni dans `firestore.rules`. Remplacez l'email exemple par l'email reel du superviseur avant publication. Ces regles exigent maintenant Firebase Auth pour le site web et pour l'envoi GPS mobile.
