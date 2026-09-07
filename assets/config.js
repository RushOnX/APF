// Configuration partagée par le site public et l'espace admin.
// Ces valeurs sont utilisées par défaut pour savoir où lire/écrire data.json sur GitHub.
// Modifiables depuis l'espace admin (bouton "Paramètres du dépôt") sans toucher au code.
window.APF_CONFIG = {
  owner: "RushOnX",
  repo: "APF",
  branch: "main",
  dataPath: "data/data.json",

  // Le vrai token GitHub (droit d'écriture sur le dépôt) est stocké ICI, chiffré avec
  // le mot de passe éditeur choisi par le propriétaire du site. Personne ne peut s'en
  // servir sans connaître ce mot de passe (voir l'onglet "Générer les identifiants"
  // dans l'espace admin). Tant que ce champ est `null`, l'espace admin est en lecture
  // seule et affiche les instructions de configuration initiale.
  encryptedToken: null,
};
