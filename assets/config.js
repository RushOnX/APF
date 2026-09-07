// Configuration partagée par le site public et l'espace admin.
// Ces valeurs sont utilisées par défaut pour savoir où lire/écrire data.json sur GitHub.
// Modifiables depuis l'espace admin (bouton "Paramètres du dépôt") sans toucher au code.
window.APF_CONFIG = {
  owner: "RushOnX",
  repo: "APF",
  branch: "claude/digital-resources-site-rce6ud",
  dataPath: "data/data.json",

  // Le vrai token GitHub (droit d'écriture sur le dépôt) est stocké ICI, chiffré avec
  // le mot de passe éditeur choisi par le propriétaire du site. Personne ne peut s'en
  // servir sans connaître ce mot de passe (voir l'onglet "Générer les identifiants"
  // dans l'espace admin). Tant que ce champ est `null`, l'espace admin est en lecture
  // seule et affiche les instructions de configuration initiale.
  encryptedToken: {
    salt: "k1wHHhB6dSEYV31REq9P2Q==",
    iv: "KiWoR13kqU2Ex2rm",
    cipher: "jMApjXMfjH15IUHeyOQKZhhYuxrTutx+qF/AT9J2Gi6WpcacPhZahBEGS3S8hrV3pU6cMvPa7gOfvk5d2rVDYF1VAWw9gjfXqA5uIdtsUaUGzMP0O+bQRHw8rIq6b3DbLKfaPPLTZ8gu5QjkdQ==",
  },
};
