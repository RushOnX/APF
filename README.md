# Ressources numériques — APF

Un site statique (hébergeable gratuitement sur **GitHub Pages**) qui regroupe toutes les ressources numériques (jeux, outils pédagogiques, clavier/souris, cybersécurité, accessibilité, réseaux sociaux...) classées par catégories, avec recherche et aperçu de chaque lien.

Un **espace admin** (`admin.html`), protégé par un simple mot de passe partagé, permet à toutes les personnes de confiance à qui vous le donnez d'ajouter/modifier/supprimer des catégories et des ressources directement depuis le navigateur : chaque enregistrement crée un commit sur GitHub, donc **tout le monde qui visite le site voit la même version à jour**, sans base de données ni serveur à gérer.

## 1. Mettre le site en ligne avec GitHub Pages

1. Poussez ce dépôt sur GitHub (déjà fait si vous lisez ce fichier depuis GitHub 🙂).
2. Allez dans **Settings → Pages** du dépôt `RushOnX/APF`.
3. Dans **Build and deployment → Source**, choisissez **Deploy from a branch**.
4. Sélectionnez la branche **`claude/digital-resources-site-rce6ud`** (c'est actuellement la seule branche du dépôt) et le dossier **`/ (root)`**.
5. Enregistrez. Au bout de quelques instants, le site est disponible à l'adresse indiquée en haut de la page (normalement `https://rushonx.github.io/APF/`).

> Vous pouvez renommer cette branche en `main` plus tard si vous préférez (Settings → Branches) — dans ce cas, mettez aussi à jour `branch` dans `assets/config.js` pour que l'espace admin continue de publier au bon endroit.

## 2. Configuration initiale (à faire une seule fois, par vous)

L'espace admin est protégé par un **mot de passe éditeur simple** (ex : `APF2026!`) que vous choisissez et donnez ensuite à qui vous voulez. En coulisses, ce mot de passe déverrouille un vrai token GitHub qui reste **chiffré** dans le code du site (`assets/config.js`) — personne ne peut l'utiliser sans connaître le mot de passe, et ce token n'est jamais transmis nulle part (tout se calcule dans le navigateur).

1. Créez un **token GitHub à accès restreint** :
   - GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - **Repository access** : sélectionnez uniquement ce dépôt.
   - **Permissions → Contents** : `Read and write`.
2. Ouvrez `admin.html`, cliquez sur **🛠️ Générer les identifiants**.
3. Collez le token et choisissez votre mot de passe éditeur, cliquez sur **Générer**.
4. Copiez le bloc obtenu (`encryptedToken: { salt, iv, cipher }`) et collez-le dans `assets/config.js` à la place de `encryptedToken: null`. Committez et poussez ce fichier.
5. Donnez le **mot de passe** (pas le token !) aux personnes qui doivent pouvoir modifier le site.

> ⚠️ Ce mot de passe protège contre les visiteurs occasionnels, mais n'est pas un secret de qualité bancaire (le blob chiffré, public, pourrait théoriquement être attaqué hors-ligne si le mot de passe est très faible). Pour un usage entre personnes de confiance, c'est largement suffisant — évitez juste un mot de passe trop évident, et régénérez le token/mot de passe si une personne qui le connaissait ne doit plus avoir accès.

## 3. Utiliser l'espace admin au quotidien

1. Ouvrez `admin.html` (lien "⚙️ Espace admin" en haut du site) et connectez-vous avec le mot de passe éditeur.
2. Ajoutez une catégorie (icône + nom), puis ajoutez des ressources : collez le lien, cliquez sur **🔍 Récupérer l'aperçu** (récupère automatiquement titre/description/image via une API publique de prévisualisation), ajustez si besoin, choisissez la catégorie, validez.
3. Une fois vos modifications faites, cliquez sur **Publier sur GitHub** (bandeau orange en bas) : cela crée un commit qui met à jour `data/data.json`. Le site public se met à jour pour tout le monde en quelques secondes.

Sans connexion, l'espace admin affiche uniquement l'écran de mot de passe — la consultation des ressources se fait normalement depuis la page principale (`index.html`), accessible à tous sans rien à saisir.

## 4. Structure du projet

```
index.html          → page publique (catégories, recherche, cartes avec aperçu)
admin.html           → espace d'administration (connexion, ajout/modif/suppression, publication GitHub)
assets/style.css      → styles partagés
assets/app.js         → logique de la page publique
assets/admin.js       → logique de l'espace admin (login, appels API GitHub, microlink.io)
assets/crypto.js       → chiffrement/déchiffrement du token GitHub avec le mot de passe éditeur
assets/config.js      → dépôt/branche/chemin par défaut + token GitHub chiffré
data/data.json        → toutes les catégories et ressources (source de vérité, synchronisée pour tous)
```

## 5. Ressources encore à compléter

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
