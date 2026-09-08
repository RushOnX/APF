# Ressources numériques — APF

Un site statique (hébergeable gratuitement sur **GitHub Pages**) qui regroupe toutes les ressources numériques (jeux, outils pédagogiques, clavier/souris, cybersécurité, accessibilité, réseaux sociaux...) classées par catégories, avec recherche et aperçu de chaque lien.

Toutes les personnes de confiance à qui vous donnez le **mot de passe éditeur** peuvent ajouter/modifier/supprimer des catégories et des ressources **directement sur la page principale** (bouton "🔒 Se connecter") : chaque publication crée un commit sur GitHub, donc **tout le monde qui visite le site voit la même version à jour**, sans base de données ni serveur à gérer.

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

## 3. Ajouter/modifier des ressources au quotidien

Tout se passe sur `index.html`, la page publique :

1. Cliquez sur **🔒 Se connecter** (en haut à droite) et entrez le mot de passe éditeur.
2. Une fois connecté : chaque catégorie affiche une tuile **"+ Ajouter une ressource"** à la fin de sa grille, et chaque carte affiche des icônes ✏️ (modifier) / 🗑️ (supprimer) au survol. Un bouton **"+ Catégorie"** apparaît aussi dans la barre de filtres, et chaque titre de catégorie a ses propres icônes modifier/supprimer.
3. Dans le formulaire d'ajout d'une ressource, deux façons d'ajouter le contenu :
   - **Un lien** : collez l'URL — une vraie **capture d'écran du site** (le rendu réel de la page, pas juste son logo) se récupère automatiquement dès que vous quittez le champ, ou en cliquant sur **🔍 Aperçu**.
   - **Un fichier** (PDF, image, ZIP, document...) : utilisez le champ **"Ou importer un fichier"**. Le fichier est envoyé directement dans le dépôt GitHub (dossier `files/`, 90 Mo max) dès que vous validez le formulaire, et devient le lien de la ressource :
     - une **image** est affichée telle quelle comme aperçu de la carte ;
     - un **PDF** génère automatiquement une vraie miniature de sa première page (via pdf.js) ;
     - les autres types (ZIP, Word, Excel...) affichent une icône adaptée (🗜️ 📝 📊...).
     Sur la page publique, cliquer sur une ressource-fichier le **télécharge** directement (au lieu d'ouvrir un nouvel onglet comme pour un lien classique).
   Choisissez la catégorie puis validez.

   > 90 Mo est proche du maximum possible : GitHub refuse tout fichier de plus de 100 Mo dans un dépôt. Pour une vidéo ou un gros fichier, déposez-le plutôt sur Google Drive / WeTransfer / YouTube et collez ce lien dans le champ **Lien (URL)** au lieu d'importer le fichier.
4. Une fois vos modifications faites, cliquez sur **Publier** (bandeau en bas de l'écran) : cela crée un commit qui met à jour `data/data.json`. Le site se met à jour pour tout le monde en quelques secondes.

Sans connexion, la page reste en lecture seule et consultable par tous, sans rien à saisir.

> Note : supprimer une ressource qui pointait vers un fichier importé retire l'entrée de `data/data.json` mais ne supprime pas le fichier lui-même du dossier `files/` — à faire manuellement sur GitHub si besoin de libérer de la place.

## 4. Structure du projet

```
index.html          → page publique + édition directe une fois connecté (modales, catégories, recherche)
admin.html           → configuration technique unique (génération des identifiants chiffrés)
assets/style.css      → styles partagés
assets/app.js         → logique complète de la page principale (affichage, login, édition, publication)
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

Une fois le lien collé dans le formulaire, cliquez sur **🔍 Aperçu** pour générer automatiquement l'image/description, puis **Publier**.
