// Petit utilitaire de chiffrement cote navigateur (Web Crypto API).
// Sert a stocker le token GitHub (qui donne le droit d'ecriture sur le depot)
// chiffre avec un mot de passe simple choisi par le proprietaire du site.
// Sans le mot de passe, le blob chiffre present dans assets/config.js est inutilisable.
window.APF_CRYPTO = (function () {
  "use strict";

  var ITERATIONS = 250000;

  function bufToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function base64ToBuf(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function deriveKey(password, saltBuf, usage) {
    var enc = new TextEncoder();
    return crypto.subtle
      .importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: saltBuf, iterations: ITERATIONS, hash: "SHA-256" },
          baseKey,
          { name: "AES-GCM", length: 256 },
          false,
          [usage]
        );
      });
  }

  function encrypt(plaintext, password) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(password, salt, "encrypt").then(function (key) {
      var enc = new TextEncoder();
      return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(plaintext)).then(function (cipherBuf) {
        return { salt: bufToBase64(salt), iv: bufToBase64(iv), cipher: bufToBase64(cipherBuf) };
      });
    });
  }

  function decrypt(blob, password) {
    var salt = base64ToBuf(blob.salt);
    var iv = base64ToBuf(blob.iv);
    var cipher = base64ToBuf(blob.cipher);
    return deriveKey(password, salt, "decrypt").then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, cipher).then(function (plainBuf) {
        return new TextDecoder().decode(plainBuf);
      });
    });
  }

  return { encrypt: encrypt, decrypt: decrypt };
})();
