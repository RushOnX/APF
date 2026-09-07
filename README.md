# Ressources numériques — APF

Un site statique (hébergeable gratuitement sur **GitHub Pages**) qui regroupe toutes les ressources numériques (jeux, outils pédagogiques, clavier/souris, cybersécurité, accessibilité, réseaux sociaux...) classées par catégories, avec recherche et aperçu de chaque lien.

Un **espace admin** (`admin.html`) permet d'ajouter/modifier/supprimer des catégories et des ressources directement depuis le navigateur : chaque enregistrement crée un commit sur GitHub, donc **tout le monde qui visite le site voit la même version à jour**, sans base de données ni serveur à gérer.

## 1. Mettre le site en ligne avec GitHub Pages

1. Poussez ce dépôt sur GitHub (déjà fait si vous lisez ce fichier depuis GitHub 🙂).
2. Allez dans **Settings → Pages** du dépôt.
3. Dans **Build and deployment → Source**, choisissez **Deploy from a branch**.
4. Sélectionnez la branche à publier (par ex. `main`) et le dossier **`/ (root)`**.
5. Enregistrez. Au bout de quelques instants, le site est disponible à l'adresse indiquée en haut de la page (du type `https://<utilisateur>.github.io/<depot>/`).

> Important : si vous publiez depuis une branche différente de `main` (ou un autre dépôt), pensez à mettre à jour `assets/config.js` (`branch`) et les paramètres du dépôt dans l'espace admin, pour que les sauvegardes visent la bonne branche.

## 2. Utiliser l'espace admin pour ajouter des ressources

1. Ouvrez `admin.html` (lien "⚙️ Espace admin" en haut du site).
2. Cliquez sur **🔧 Paramètres du dépôt** et vérifiez `owner` / `repo` / `branche` (déjà pré-remplis avec `RushOnX/APF` / `main`).
3. Créez un **token GitHub à accès restreint** :
   - Allez sur GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - **Repository access** : sélectionnez uniquement ce dépôt.
   - **Permissions → Contents** : `Read and write`.
   - Générez le token et collez-le dans le champ **Token GitHub** de l'espace admin.
4. Le token est stocké **uniquement dans votre navigateur** (localStorage), il n'est jamais envoyé ailleurs qu'à l'API GitHub. Ne le partagez pas, et régénérez-le si besoin.
5. Ajoutez une catégorie (icône + nom), puis ajoutez des ressources : collez le lien, cliquez sur **🔍 Récupérer l'aperçu** (récupère automatiquement titre/description/image via une API publique de prévisualisation), ajustez si besoin, choisissez la catégorie, validez.
6. Une fois vos modifications faites, cliquez sur **Publier sur GitHub** (bandeau orange en bas) : cela crée un commit qui met à jour `data/data.json`. Le site public se met à jour pour tout le monde en quelques secondes.

Sans token (ou sans droits d'écriture), l'espace admin reste consultable mais le bouton "Publier" est désactivé — vous pouvez quand même parcourir les catégories/ressources existantes.

## 3. Structure du projet

```
index.html          → page publique (catégories, recherche, cartes avec aperçu)
admin.html           → espace d'administration (ajout/modif/suppression, publication GitHub)
assets/style.css      → styles partagés
assets/app.js         → logique de la page publique
assets/admin.js       → logique de l'espace admin (appels API GitHub + microlink.io)
assets/config.js      → dépôt/branche/chemin par défaut utilisés par l'admin
data/data.json        → toutes les catégories et ressources (source de vérité, synchronisée pour tous)
```

## 4. Ressources encore à compléter

Certaines ressources de la liste fournie n'avaient pas de lien exploitable au moment de la création du site (juste un titre, sans URL). Elles ne sont donc pas encore dans `data.json`. Ajoutez-les via l'espace admin dès que vous avez le lien :

- Lancement de la MalletteCyber (inclusion numérique)
- Malette IA (autre que "Aïe Aïe iA !", déjà ajoutée)
- Metacartes « Numérique Éthique »
- Odyssée du numérique (Sensi)
- « Jouons le(s) jeu(x) du numérique » (Les Bases du numérique d'intérêt général)
- Jeux sensibilisation numérique (Les Bases du numérique d'intérêt général)
- #YouToo — jeu sur le cyberharcèlement et le cybersexisme
- Exercices souris / souris-clavier, Les rois de la souris
- DistroSea — tester des distributions Linux en ligne
- AI or Not — jeu pour détecter les images générées par IA
- Une IA par jour
- Bien débuter sur GNU/Linux (initiation Debian)
- Jigsaw — quiz sur l'hameçonnage
- Kahoot / QuizIn, Quizizz (Wayground)
- Padlet Board
- ePoc Mobile Learning
- CyberEspace — cours Carsat
- Have I Been Pwned
- Optery
- Webi'Num #4 — Réseaux sociaux, l'usage des jeunes (déjà présente dans le site, catégorie "Cybersécurité & Vie privée", mais **sans lien** — à compléter)

Une fois le lien collé dans l'espace admin, cliquez sur **🔍 Récupérer l'aperçu** pour générer automatiquement l'image/description, puis **Publier sur GitHub**.
