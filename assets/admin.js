(function () {
  "use strict";

  var LS_CONFIG = "apf_admin_config";
  var SS_TOKEN = "apf_admin_session_token";

  var cfg = Object.assign({}, window.APF_CONFIG, JSON.parse(localStorage.getItem(LS_CONFIG) || "{}"));
  var sessionToken = sessionStorage.getItem(SS_TOKEN) || "";

  var state = {
    data: { categories: [], resources: [] },
    sha: null,
    savedSnapshot: "",
    editingCategoryId: null,
    editingResourceId: null,
    lastPreview: null, // {image, logo}
  };

  // ---------- helpers ----------

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function slugify(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "item";
  }

  function uniqueId(base, existingIds) {
    var id = base, n = 2;
    while (existingIds.indexOf(id) !== -1) { id = base + "-" + n; n++; }
    return id;
  }

  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function base64ToUtf8(str) {
    return decodeURIComponent(escape(atob(str.replace(/\n/g, ""))));
  }

  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }
  function faviconUrl(url) {
    var d = domainOf(url);
    return d ? "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(d) + "&sz=64" : "";
  }

  function setStatus(el, type, msg) {
    el.className = "status-msg show " + type;
    el.textContent = msg;
  }
  function clearStatus(el) {
    el.className = "status-msg";
    el.textContent = "";
  }

  function isDirty() {
    return JSON.stringify(state.data) !== state.savedSnapshot;
  }

  function refreshSaveBar() {
    var bar = $("saveBar");
    var dirty = isDirty();
    bar.style.display = dirty ? "flex" : "none";
    $("saveBtn").disabled = !sessionToken;
  }

  // ---------- GitHub API ----------

  function apiUrl() {
    return "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/" + cfg.dataPath;
  }

  function ghHeaders(withToken) {
    var h = { Accept: "application/vnd.github+json" };
    if (withToken && sessionToken) h.Authorization = "Bearer " + sessionToken;
    return h;
  }

  function loadData() {
    var el = $("loadStatus");
    setStatus(el, "info", "Chargement des données depuis GitHub…");
    fetch(apiUrl() + "?ref=" + encodeURIComponent(cfg.branch) + "&t=" + Date.now(), {
      headers: ghHeaders(true),
      cache: "no-store",
    })
      .then(function (res) {
        if (res.status === 404) {
          throw new Error(
            "Fichier " + cfg.dataPath + " introuvable sur " + cfg.owner + "/" + cfg.repo + " (branche " + cfg.branch + "). Vérifiez les paramètres du dépôt."
          );
        }
        if (!res.ok) throw new Error("Erreur GitHub API (" + res.status + ")");
        return res.json();
      })
      .then(function (json) {
        state.sha = json.sha;
        var parsed = JSON.parse(base64ToUtf8(json.content));
        state.data.categories = parsed.categories || [];
        state.data.resources = parsed.resources || [];
        state.savedSnapshot = JSON.stringify(state.data);
        clearStatus(el);
        renderAll();
      })
      .catch(function (err) {
        setStatus(el, "err", "⚠️ " + err.message);
      });
  }

  function saveData(commitMessage) {
    var el = $("saveStatus");
    if (!sessionToken) {
      setStatus(el, "err", "Connectez-vous avec le mot de passe éditeur avant de publier.");
      return;
    }
    setStatus(el, "info", "Enregistrement sur GitHub…");
    $("saveBtn").disabled = true;

    var payload = JSON.stringify(
      Object.assign({}, state.data, { version: 1, updatedAt: new Date().toISOString() }),
      null,
      2
    );

    var body = {
      message: commitMessage || "Mise à jour des ressources",
      content: utf8ToBase64(payload),
      branch: cfg.branch,
    };
    if (state.sha) body.sha = state.sha;

    fetch(apiUrl(), {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders(true)),
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (e) {
            throw new Error(e.message || ("Erreur GitHub API (" + res.status + ")"));
          });
        }
        return res.json();
      })
      .then(function (json) {
        state.sha = json.content.sha;
        state.savedSnapshot = JSON.stringify(state.data);
        refreshSaveBar();
        setStatus(el, "ok", "✅ Modifications enregistrées ! Elles seront visibles pour tout le monde d'ici quelques secondes.");
      })
      .catch(function (err) {
        setStatus(el, "err", "⚠️ Échec de l'enregistrement : " + err.message + (/bad credentials|401/i.test(err.message) ? " — le token stocké n'est peut-être plus valide, régénérez les identifiants." : ""));
      })
      .finally(function () {
        $("saveBtn").disabled = !sessionToken;
      });
  }

  // ---------- Settings (owner/repo/branch/path) ----------

  function openSettings() {
    $("cfgOwner").value = cfg.owner || "";
    $("cfgRepo").value = cfg.repo || "";
    $("cfgBranch").value = cfg.branch || "main";
    $("cfgPath").value = cfg.dataPath || "data/data.json";
    $("settingsPanel").style.display = "block";
  }
  function closeSettings() { $("settingsPanel").style.display = "none"; }

  function saveSettings() {
    cfg.owner = $("cfgOwner").value.trim();
    cfg.repo = $("cfgRepo").value.trim();
    cfg.branch = $("cfgBranch").value.trim() || "main";
    cfg.dataPath = $("cfgPath").value.trim() || "data/data.json";
    localStorage.setItem(LS_CONFIG, JSON.stringify({
      owner: cfg.owner, repo: cfg.repo, branch: cfg.branch, dataPath: cfg.dataPath,
    }));
    closeSettings();
    $("repoBadge").textContent = "📦 dépôt : " + cfg.owner + "/" + cfg.repo + " (" + cfg.branch + ")";
    if (sessionToken) loadData();
  }

  // ---------- Setup (génération des identifiants chiffrés) ----------

  function toggleSetup(show) {
    $("setupPanel").style.display = show ? "block" : "none";
  }

  function generateCredentials() {
    var token = $("setupToken").value.trim();
    var password = $("setupPassword").value.trim();
    var el = $("setupStatus");
    if (!token || !password) {
      setStatus(el, "err", "Renseignez le token et le mot de passe.");
      return;
    }
    setStatus(el, "info", "Chiffrement en cours…");
    window.APF_CRYPTO.encrypt(token, password)
      .then(function (blob) {
        var snippet =
          "encryptedToken: {\n" +
          '    salt: "' + blob.salt + '",\n' +
          '    iv: "' + blob.iv + '",\n' +
          '    cipher: "' + blob.cipher + '",\n' +
          "  },";
        $("setupOutput").value = snippet;
        $("setupOutputWrap").style.display = "block";
        clearStatus(el);
      })
      .catch(function (err) {
        setStatus(el, "err", "Erreur de chiffrement : " + err.message);
      });
  }

  function copyOutput() {
    var text = $("setupOutput").value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      setStatus($("setupStatus"), "ok", "Copié ! Collez ce bloc dans assets/config.js puis commitez/pushez.");
    }).catch(function () {
      $("setupOutput").select();
    });
  }

  // ---------- Login ----------

  function attemptLogin() {
    var password = $("loginPassword").value;
    var el = $("loginStatus");
    if (!cfg.encryptedToken) {
      setStatus(el, "err", "Aucun identifiant n'est encore configuré (voir « Générer les identifiants »).");
      return;
    }
    if (!password) return;
    setStatus(el, "info", "Vérification…");
    window.APF_CRYPTO.decrypt(cfg.encryptedToken, password)
      .then(function (token) {
        sessionToken = token;
        sessionStorage.setItem(SS_TOKEN, token);
        clearStatus(el);
        showLoggedInUI();
        loadData();
      })
      .catch(function () {
        setStatus(el, "err", "Mot de passe incorrect.");
      });
  }

  function logout() {
    sessionToken = "";
    sessionStorage.removeItem(SS_TOKEN);
    showLoggedOutUI();
  }

  function showLoggedInUI() {
    $("loginPanel").style.display = "none";
    $("editorArea").style.display = "block";
    $("logoutBtn").style.display = "inline-flex";
  }

  function showLoggedOutUI() {
    $("editorArea").style.display = "none";
    $("logoutBtn").style.display = "none";
    if (cfg.encryptedToken) {
      $("loginPanel").style.display = "block";
    } else {
      toggleSetup(true);
    }
  }

  // ---------- Categories ----------

  function renderCategories() {
    var wrap = $("categoryList");
    if (state.data.categories.length === 0) {
      wrap.innerHTML = '<p style="color:var(--text-muted);font-size:13.5px;">Aucune catégorie pour le moment.</p>';
      return;
    }
    wrap.innerHTML = state.data.categories.map(function (c) {
      var count = state.data.resources.filter(function (r) { return r.categoryId === c.id; }).length;
      return (
        '<div class="list-item">' +
        '<span class="thumb" style="font-size:18px;">' + (c.icon || "📁") + "</span>" +
        '<div class="info"><div class="t">' + escapeHtml(c.name) + "</div>" +
        '<div class="u">' + c.id + " · " + count + " ressource(s)</div></div>" +
        '<div class="actions">' +
        '<button data-edit-cat="' + c.id + '" title="Modifier">✏️</button>' +
        '<button data-del-cat="' + c.id + '" title="Supprimer">🗑️</button>' +
        "</div></div>"
      );
    }).join("");

    Array.prototype.forEach.call(wrap.querySelectorAll("[data-edit-cat]"), function (btn) {
      btn.addEventListener("click", function () { editCategory(btn.getAttribute("data-edit-cat")); });
    });
    Array.prototype.forEach.call(wrap.querySelectorAll("[data-del-cat]"), function (btn) {
      btn.addEventListener("click", function () { deleteCategory(btn.getAttribute("data-del-cat")); });
    });
  }

  function fillCategorySelect() {
    var sel = $("resCategory");
    sel.innerHTML = state.data.categories.map(function (c) {
      return '<option value="' + c.id + '">' + (c.icon || "") + " " + escapeHtml(c.name) + "</option>";
    }).join("");
  }

  function resetCategoryForm() {
    state.editingCategoryId = null;
    $("catName").value = "";
    $("catIcon").value = "";
    $("catFormTitle").textContent = "Ajouter une catégorie";
    $("catSubmitBtn").textContent = "Ajouter";
    $("catCancelBtn").style.display = "none";
  }

  function editCategory(id) {
    var c = state.data.categories.find(function (x) { return x.id === id; });
    if (!c) return;
    state.editingCategoryId = id;
    $("catName").value = c.name;
    $("catIcon").value = c.icon || "";
    $("catFormTitle").textContent = "Modifier la catégorie";
    $("catSubmitBtn").textContent = "Enregistrer";
    $("catCancelBtn").style.display = "inline-flex";
    $("catName").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteCategory(id) {
    var count = state.data.resources.filter(function (r) { return r.categoryId === id; }).length;
    var msg = count > 0
      ? "Cette catégorie contient " + count + " ressource(s). Les supprimer aussi ?"
      : "Supprimer cette catégorie ?";
    if (!confirm(msg)) return;
    state.data.categories = state.data.categories.filter(function (c) { return c.id !== id; });
    state.data.resources = state.data.resources.filter(function (r) { return r.categoryId !== id; });
    renderAll();
  }

  function submitCategoryForm(e) {
    e.preventDefault();
    var name = $("catName").value.trim();
    var icon = $("catIcon").value.trim();
    if (!name) return;

    if (state.editingCategoryId) {
      var c = state.data.categories.find(function (x) { return x.id === state.editingCategoryId; });
      c.name = name;
      c.icon = icon;
    } else {
      var ids = state.data.categories.map(function (x) { return x.id; });
      var id = uniqueId(slugify(name), ids);
      state.data.categories.push({ id: id, name: name, icon: icon });
    }
    resetCategoryForm();
    renderAll();
  }

  // ---------- Resources ----------

  function renderResources() {
    var wrap = $("resourceList");
    var q = ($("resSearch").value || "").toLowerCase();
    var items = state.data.resources.filter(function (r) {
      if (!q) return true;
      return (r.title || "").toLowerCase().indexOf(q) !== -1 || (r.url || "").toLowerCase().indexOf(q) !== -1;
    });

    if (items.length === 0) {
      wrap.innerHTML = '<p style="color:var(--text-muted);font-size:13.5px;">Aucune ressource.</p>';
      return;
    }

    wrap.innerHTML = items.map(function (r) {
      var cat = state.data.categories.find(function (c) { return c.id === r.categoryId; });
      var icon = r.image || (r.url ? faviconUrl(r.url) : "");
      var thumb = icon
        ? '<img src="' + escapeHtml(icon) + '" alt="" onerror="this.style.display=\'none\'">'
        : "🔗";
      return (
        '<div class="list-item">' +
        '<span class="thumb">' + thumb + "</span>" +
        '<div class="info"><div class="t">' + escapeHtml(r.title) + "</div>" +
        '<div class="u">' + (r.url ? escapeHtml(r.url) : "⚠️ pas de lien") + " · " + (cat ? escapeHtml(cat.name) : "sans catégorie") + "</div></div>" +
        '<div class="actions">' +
        '<button data-edit-res="' + r.id + '" title="Modifier">✏️</button>' +
        '<button data-del-res="' + r.id + '" title="Supprimer">🗑️</button>' +
        "</div></div>"
      );
    }).join("");

    Array.prototype.forEach.call(wrap.querySelectorAll("[data-edit-res]"), function (btn) {
      btn.addEventListener("click", function () { editResource(btn.getAttribute("data-edit-res")); });
    });
    Array.prototype.forEach.call(wrap.querySelectorAll("[data-del-res]"), function (btn) {
      btn.addEventListener("click", function () { deleteResource(btn.getAttribute("data-del-res")); });
    });
  }

  function resetResourceForm() {
    state.editingResourceId = null;
    state.lastPreview = null;
    $("resUrl").value = "";
    $("resTitle").value = "";
    $("resDescription").value = "";
    if (state.data.categories[0]) $("resCategory").value = state.data.categories[0].id;
    $("resFormTitle").textContent = "Ajouter une ressource";
    $("resSubmitBtn").textContent = "Ajouter";
    $("resCancelBtn").style.display = "none";
    $("previewBox").style.display = "none";
    clearStatus($("previewStatus"));
  }

  function editResource(id) {
    var r = state.data.resources.find(function (x) { return x.id === id; });
    if (!r) return;
    state.editingResourceId = id;
    state.lastPreview = { image: r.image || "" };
    $("resUrl").value = r.url || "";
    $("resTitle").value = r.title || "";
    $("resDescription").value = r.description || "";
    if (r.categoryId) $("resCategory").value = r.categoryId;
    $("resFormTitle").textContent = "Modifier la ressource";
    $("resSubmitBtn").textContent = "Enregistrer";
    $("resCancelBtn").style.display = "inline-flex";
    if (r.image) showPreviewBox({ title: r.title, description: r.description, image: r.image });
    $("resTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function deleteResource(id) {
    if (!confirm("Supprimer cette ressource ?")) return;
    state.data.resources = state.data.resources.filter(function (r) { return r.id !== id; });
    renderAll();
  }

  function submitResourceForm(e) {
    e.preventDefault();
    var title = $("resTitle").value.trim();
    var url = $("resUrl").value.trim();
    var description = $("resDescription").value.trim();
    var categoryId = $("resCategory").value;
    if (!title) return;

    if (state.editingResourceId) {
      var r = state.data.resources.find(function (x) { return x.id === state.editingResourceId; });
      r.title = title;
      r.url = url;
      r.description = description;
      r.categoryId = categoryId;
      if (state.lastPreview && state.lastPreview.image) r.image = state.lastPreview.image;
    } else {
      var ids = state.data.resources.map(function (x) { return x.id; });
      var id = uniqueId(slugify(title), ids);
      state.data.resources.push({
        id: id,
        title: title,
        url: url,
        description: description,
        categoryId: categoryId,
        image: (state.lastPreview && state.lastPreview.image) || "",
        addedAt: new Date().toISOString(),
      });
    }
    resetResourceForm();
    renderAll();
  }

  function showPreviewBox(p) {
    var box = $("previewBox");
    box.style.display = "flex";
    $("previewImg").src = p.image || faviconUrl($("resUrl").value.trim());
    $("previewTitle").textContent = p.title || "(sans titre)";
    $("previewDesc").textContent = p.description || "";
  }

  function fetchPreview() {
    var url = $("resUrl").value.trim();
    var el = $("previewStatus");
    if (!url) { setStatus(el, "err", "Renseignez d'abord un lien."); return; }
    setStatus(el, "info", "Récupération de l'aperçu…");

    fetch("https://api.microlink.io/?url=" + encodeURIComponent(url) + "&meta=true")
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json.status !== "success") throw new Error("aperçu indisponible");
        var d = json.data || {};
        var image = (d.image && d.image.url) || (d.logo && d.logo.url) || "";
        state.lastPreview = { image: image };
        if (!$("resTitle").value.trim() && d.title) $("resTitle").value = d.title;
        if (!$("resDescription").value.trim() && d.description) $("resDescription").value = d.description;
        showPreviewBox({ title: d.title, description: d.description, image: image });
        clearStatus(el);
      })
      .catch(function () {
        setStatus(el, "err", "Impossible de récupérer un aperçu automatique — vous pouvez remplir les champs manuellement.");
        showPreviewBox({ title: $("resTitle").value, description: $("resDescription").value, image: "" });
      });
  }

  // ---------- wiring ----------

  function renderAll() {
    fillCategorySelect();
    renderCategories();
    renderResources();
    refreshSaveBar();
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("repoBadge").textContent = "📦 dépôt : " + (cfg.owner || "?") + "/" + (cfg.repo || "?") + " (" + (cfg.branch || "main") + ")";

    $("openSettingsBtn").addEventListener("click", openSettings);
    $("cancelSettingsBtn").addEventListener("click", closeSettings);
    $("saveSettingsBtn").addEventListener("click", saveSettings);

    $("openSetupBtn").addEventListener("click", function () { toggleSetup($("setupPanel").style.display !== "block"); });
    $("hideSetupBtn").addEventListener("click", function () { toggleSetup(false); });
    $("generateBtn").addEventListener("click", generateCredentials);
    $("copyOutputBtn").addEventListener("click", copyOutput);

    $("loginBtn").addEventListener("click", attemptLogin);
    $("loginPassword").addEventListener("keydown", function (e) { if (e.key === "Enter") attemptLogin(); });
    $("logoutBtn").addEventListener("click", logout);

    $("catForm").addEventListener("submit", submitCategoryForm);
    $("catCancelBtn").addEventListener("click", resetCategoryForm);

    $("resForm").addEventListener("submit", submitResourceForm);
    $("resCancelBtn").addEventListener("click", resetResourceForm);
    $("fetchPreviewBtn").addEventListener("click", fetchPreview);
    $("resSearch").addEventListener("input", renderResources);

    $("saveBtn").addEventListener("click", function () {
      saveData("Mise à jour des ressources depuis l'espace admin");
    });
    $("discardBtn").addEventListener("click", function () {
      if (!confirm("Annuler toutes les modifications non enregistrées ?")) return;
      loadData();
    });

    if (sessionToken) {
      showLoggedInUI();
      loadData();
    } else {
      showLoggedOutUI();
    }
  });
})();
