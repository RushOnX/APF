(function () {
  "use strict";

  var LS_CONFIG = "apf_admin_config";
  var SS_TOKEN = "apf_admin_session_token";

  var cfg = Object.assign({}, window.APF_CONFIG, JSON.parse(localStorage.getItem(LS_CONFIG) || "{}"));
  var sessionToken = sessionStorage.getItem(SS_TOKEN) || "";

  var CAT_COLORS = ["#4f46e5", "#db2777", "#0d9488", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#16a34a", "#ea580c", "#4338ca"];
  var EMOJI_CHOICES = ["🎮", "⌨️", "🔒", "🤖", "📱", "🎓", "♿", "👴", "📎", "🧩", "🛡️", "🌐", "🖱️", "🧠", "💡"];

  var state = {
    categories: [],
    resources: [],
    activeCategory: "all",
    query: "",
    sha: null,
    savedSnapshot: "",
    editingCategoryId: null,
    editingResourceId: null,
    lastPreview: null,
  };

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

  function utf8ToBase64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function base64ToUtf8(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, "")))); }

  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }
  function faviconUrl(url) {
    var d = domainOf(url);
    return d ? "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(d) + "&sz=64" : "";
  }

  function isLocalFile(url) { return !!url && !/^https?:\/\//i.test(url); }

  var FILE_ICONS = {
    pdf: "📄", doc: "📝", docx: "📝", odt: "📝", txt: "📃",
    xls: "📊", xlsx: "📊", csv: "📊", ods: "📊",
    ppt: "📽️", pptx: "📽️", odp: "📽️",
    zip: "🗜️", rar: "🗜️", "7z": "🗜️", tar: "🗜️", gz: "🗜️",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", svg: "🖼️", webp: "🖼️",
    mp4: "🎬", mov: "🎬", avi: "🎬", mp3: "🎵", wav: "🎵",
  };
  function fileExt(url) {
    var m = /\.([a-z0-9]+)$/i.exec((url || "").split(/[?#]/)[0]);
    return m ? m[1].toLowerCase() : "";
  }
  function fileEmoji(url) { return FILE_ICONS[fileExt(url)] || "📁"; }

  function downloadNameFor(r) {
    var ext = fileExt(r.url);
    var base = (r.title || "fichier").replace(/[\\/:*?"<>|]+/g, "").trim() || "fichier";
    return ext ? base + "." + ext : base;
  }

  function catColor(categoryId) {
    var idx = state.categories.findIndex(function (c) { return c.id === categoryId; });
    return CAT_COLORS[Math.max(0, idx) % CAT_COLORS.length];
  }

  function isEditMode() { return !!sessionToken; }

  function setStatus(el, type, msg) {
    el.className = "status-msg show " + type;
    el.textContent = msg;
  }
  function clearStatus(el) { el.className = "status-msg"; el.textContent = ""; }

  function openModal(id) { $(id).classList.add("show"); }
  function closeModal(id) { $(id).classList.remove("show"); }

  // ---------------- rendering (public + edit affordances) ----------------

  function renderChips() {
    var wrap = $("categoryFilters");
    var html = '<button class="chip' + (state.activeCategory === "all" ? " active" : "") + '" data-cat="all">Tout</button>';
    state.categories.forEach(function (c) {
      var count = state.resources.filter(function (r) { return r.categoryId === c.id; }).length;
      if (count === 0 && !isEditMode()) return;
      html += '<button class="chip' + (state.activeCategory === c.id ? " active" : "") + '" data-cat="' + c.id + '">' +
        (c.icon || "") + " " + escapeHtml(c.name) + '</button>';
    });
    if (isEditMode()) {
      html += '<button class="chip add-chip" id="addCategoryChip">+ Catégorie</button>';
    }
    wrap.innerHTML = html;
    Array.prototype.forEach.call(wrap.querySelectorAll("[data-cat]"), function (btn) {
      btn.addEventListener("click", function () { state.activeCategory = btn.getAttribute("data-cat"); render(); });
    });
    var addChip = $("addCategoryChip");
    if (addChip) addChip.addEventListener("click", function () { openCategoryModal(null); });
  }

  function cardHtml(r) {
    var hasLink = !!(r.url && r.url.trim());
    var isFile = hasLink && isLocalFile(r.url);
    var domain = hasLink && !isFile ? domainOf(r.url) : (isFile ? "Fichier · " + (fileExt(r.url).toUpperCase() || "?") : "");
    var img = r.image
      ? '<img class="og-image" src="' + escapeHtml(r.image) + '" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'\'">'
      : (isFile
          ? '<span class="fallback-icon">' + fileEmoji(r.url) + "</span>"
          : (hasLink
              ? '<span class="fallback-icon"><img src="' + faviconUrl(r.url) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{textContent:\'🔗\'}))"></span>'
              : '<span class="fallback-icon">🔗</span>'));

    var editActions = '<div class="card-edit-actions">' +
      '<button data-edit-res="' + r.id + '" title="Modifier">✏️</button>' +
      '<button class="danger" data-del-res="' + r.id + '" title="Supprimer">🗑️</button>' +
      "</div>";

    var inner = editActions +
      '<div class="resource-preview">' + img + (isFile ? '<span class="download-badge">⬇ Télécharger</span>' : "") + "</div>" +
      '<div class="resource-body">' +
      (domain ? '<span class="domain">' + escapeHtml(domain) + "</span>" : "") +
      "<h3>" + escapeHtml(r.title) + "</h3>" +
      (r.description ? "<p>" + escapeHtml(r.description) + "</p>" : "") +
      (!hasLink ? '<span class="missing-link-badge">Lien à ajouter</span>' : "") +
      "</div>";

    if (isFile) {
      return '<a class="resource-card" href="' + escapeHtml(r.url) + '" download="' + escapeHtml(downloadNameFor(r)) + '">' + inner + "</a>";
    }
    if (hasLink) {
      return '<a class="resource-card" href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener noreferrer">' + inner + "</a>";
    }
    return '<div class="resource-card no-link">' + inner + "</div>";
  }

  function matchesQuery(r) {
    if (!state.query) return true;
    var q = state.query.toLowerCase();
    return (
      (r.title || "").toLowerCase().indexOf(q) !== -1 ||
      (r.description || "").toLowerCase().indexOf(q) !== -1 ||
      (r.url || "").toLowerCase().indexOf(q) !== -1
    );
  }

  function render() {
    document.body.classList.toggle("edit-mode", isEditMode());
    renderChips();

    var main = $("categorySections");
    var visibleCats = state.categories.filter(function (c) {
      return state.activeCategory === "all" || state.activeCategory === c.id;
    });

    var html = "";
    var totalShown = 0;

    visibleCats.forEach(function (c) {
      var items = state.resources.filter(function (r) { return r.categoryId === c.id && matchesQuery(r); });
      if (items.length === 0 && !isEditMode()) return;
      totalShown += items.length;
      var color = catColor(c.id);
      html += '<section class="category-section">' +
        '<h2 class="category-title">' +
        '<span class="cat-icon" style="background:' + color + '22;color:' + color + ';">' + (c.icon || "📁") + "</span>" +
        escapeHtml(c.name) +
        '<span class="count">' + items.length + "</span>" +
        '<span class="cat-actions">' +
        '<button class="icon-mini" data-edit-cat="' + c.id + '" title="Modifier la catégorie">✏️</button>' +
        '<button class="icon-mini danger" data-del-cat="' + c.id + '" title="Supprimer la catégorie">🗑️</button>' +
        "</span></h2>" +
        '<div class="resource-grid">' + items.map(cardHtml).join("") +
        '<button class="add-tile" data-add-res="' + c.id + '"><span class="plus">＋</span>Ajouter une ressource</button>' +
        "</div></section>";
    });

    if (totalShown === 0 && !isEditMode()) {
      html = '<div class="empty-state">Aucune ressource ne correspond à votre recherche.</div>';
    }
    if (state.categories.length === 0 && isEditMode()) {
      html = '<div class="empty-state">Aucune catégorie pour le moment — cliquez sur « + Catégorie » ci-dessus pour commencer.</div>';
    }

    main.innerHTML = html;

    Array.prototype.forEach.call(main.querySelectorAll("[data-edit-res]"), function (btn) {
      btn.addEventListener("click", function (e) { e.preventDefault(); openResourceModal(btn.getAttribute("data-edit-res")); });
    });
    Array.prototype.forEach.call(main.querySelectorAll("[data-del-res]"), function (btn) {
      btn.addEventListener("click", function (e) { e.preventDefault(); deleteResource(btn.getAttribute("data-del-res")); });
    });
    Array.prototype.forEach.call(main.querySelectorAll("[data-add-res]"), function (btn) {
      btn.addEventListener("click", function () { openResourceModal(null, btn.getAttribute("data-add-res")); });
    });
    Array.prototype.forEach.call(main.querySelectorAll("[data-edit-cat]"), function (btn) {
      btn.addEventListener("click", function () { openCategoryModal(btn.getAttribute("data-edit-cat")); });
    });
    Array.prototype.forEach.call(main.querySelectorAll("[data-del-cat]"), function (btn) {
      btn.addEventListener("click", function () { deleteCategory(btn.getAttribute("data-del-cat")); });
    });

    refreshSaveBar();
  }

  function isDirty() { return JSON.stringify({ categories: state.categories, resources: state.resources }) !== state.savedSnapshot; }

  function refreshSaveBar() {
    var bar = $("saveBar");
    var dirty = isDirty() && isEditMode();
    bar.classList.toggle("show", dirty);
  }

  // ---------------- data loading ----------------

  function loadPublicData() {
    fetch("data/data.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        state.categories = data.categories || [];
        state.resources = data.resources || [];
        state.savedSnapshot = JSON.stringify({ categories: state.categories, resources: state.resources });
        render();
      })
      .catch(function (err) {
        $("categorySections").innerHTML = '<div class="empty-state">Impossible de charger les ressources (' + escapeHtml(err.message) + ").</div>";
      });
  }

  function contentsUrl(path) {
    return "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/" + path;
  }
  function apiUrl() { return contentsUrl(cfg.dataPath); }
  function ghHeaders() {
    return { Accept: "application/vnd.github+json", Authorization: "Bearer " + sessionToken };
  }

  var MAX_FILE_SIZE = 90 * 1024 * 1024; // 90 Mo (limite pratique de l'API Git de GitHub)

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Lecture du fichier impossible.")); };
      reader.onload = function () { resolve(String(reader.result).split(",")[1] || ""); };
      reader.readAsDataURL(blob);
    });
  }

  function ghApi(path, opts) {
    return fetch("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + path, Object.assign({
      headers: Object.assign({ Accept: "application/vnd.github+json" }, ghHeaders(), (opts && opts.body) ? { "Content-Type": "application/json" } : {}),
    }, opts)).then(function (res) {
      if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || ("Erreur GitHub API (" + res.status + ")")); });
      return res.json();
    });
  }

  // Envoie un ou plusieurs fichiers binaires dans un seul commit via l'API Git de GitHub
  // (blobs + tree + commit), qui supporte des fichiers bien plus volumineux que l'API
  // Contents utilisée pour data.json (limitée en pratique à quelques Mo).
  function commitFiles(entries, message) {
    var branchRef = "heads/" + cfg.branch;
    return ghApi("/git/ref/" + branchRef, {})
      .then(function (refJson) {
        var parentSha = refJson.object.sha;
        return ghApi("/git/commits/" + parentSha, {}).then(function (commitJson) {
          return { parentSha: parentSha, baseTreeSha: commitJson.tree.sha };
        });
      })
      .then(function (ctx) {
        return Promise.all(entries.map(function (e) {
          return ghApi("/git/blobs", { method: "POST", body: JSON.stringify({ content: e.base64, encoding: "base64" }) })
            .then(function (blobJson) { return { path: e.path, sha: blobJson.sha }; });
        })).then(function (blobs) { return { ctx: ctx, blobs: blobs }; });
      })
      .then(function (r) {
        var treeEntries = r.blobs.map(function (b) { return { path: b.path, mode: "100644", type: "blob", sha: b.sha }; });
        return ghApi("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: r.ctx.baseTreeSha, tree: treeEntries }) })
          .then(function (treeJson) { return { treeSha: treeJson.sha, parentSha: r.ctx.parentSha }; });
      })
      .then(function (r) {
        return ghApi("/git/commits", { method: "POST", body: JSON.stringify({ message: message, tree: r.treeSha, parents: [r.parentSha] }) });
      })
      .then(function (commitJson) {
        return ghApi("/git/refs/" + branchRef, { method: "PATCH", body: JSON.stringify({ sha: commitJson.sha }) })
          .then(function () { return commitJson; });
      });
  }

  function isPdfFile(file) { return file.type === "application/pdf" || /\.pdf$/i.test(file.name); }

  function renderPdfThumbnail(file) {
    if (!window.pdfjsLib) return Promise.reject(new Error("pdf.js indisponible"));
    return file.arrayBuffer()
      .then(function (buf) { return window.pdfjsLib.getDocument({ data: buf }).promise; })
      .then(function (pdf) { return pdf.getPage(1); })
      .then(function (page) {
        var baseViewport = page.getViewport({ scale: 1 });
        var scale = 480 / baseViewport.width;
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        return page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise.then(function () {
          return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error("canvas vide")); }, "image/png");
          });
        });
      });
  }

  function uploadFile(file, onStage) {
    if (file.size > MAX_FILE_SIZE) {
      return Promise.reject(new Error(
        "Fichier trop volumineux : " + (file.size / 1024 / 1024).toFixed(1) + " Mo (max " + (MAX_FILE_SIZE / 1024 / 1024) + " Mo, limite de GitHub). " +
        "Déposez-le sur Google Drive / WeTransfer / YouTube et collez le lien dans le champ « Lien (URL) » à la place."
      ));
    }

    var extMatch = /\.[a-z0-9]+$/i.exec(file.name);
    var ext = extMatch ? extMatch[0] : "";
    var base = slugify(file.name.replace(/\.[a-z0-9]+$/i, ""));
    var stamp = Date.now().toString(36);
    var path = "files/" + stamp + "-" + base + ext;
    var result = { path: path, name: file.name, image: "" };

    if (onStage) onStage("Import du fichier en cours…");

    return blobToBase64(file).then(function (base64) {
      if (file.type.indexOf("image/") === 0) {
        return commitFiles([{ path: path, base64: base64 }], "Ajout du fichier " + file.name).then(function () {
          result.image = path;
          return result;
        });
      }
      if (isPdfFile(file)) {
        if (onStage) onStage("Génération de l'aperçu du PDF…");
        return renderPdfThumbnail(file)
          .then(blobToBase64)
          .then(function (thumbBase64) {
            var thumbPath = "files/" + stamp + "-" + base + "-apercu.png";
            return commitFiles(
              [{ path: path, base64: base64 }, { path: thumbPath, base64: thumbBase64 }],
              "Ajout du fichier " + file.name
            ).then(function () { result.image = thumbPath; return result; });
          })
          .catch(function () {
            // aperçu PDF best-effort : si la génération échoue, on importe quand même le fichier seul
            return commitFiles([{ path: path, base64: base64 }], "Ajout du fichier " + file.name).then(function () { return result; });
          });
      }
      return commitFiles([{ path: path, base64: base64 }], "Ajout du fichier " + file.name).then(function () { return result; });
    });
  }

  function loadForEditing() {
    fetch(apiUrl() + "?ref=" + encodeURIComponent(cfg.branch) + "&t=" + Date.now(), { headers: ghHeaders(), cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("Erreur GitHub API (" + res.status + ")");
        return res.json();
      })
      .then(function (json) {
        state.sha = json.sha;
        var parsed = JSON.parse(base64ToUtf8(json.content));
        state.categories = parsed.categories || [];
        state.resources = parsed.resources || [];
        state.savedSnapshot = JSON.stringify({ categories: state.categories, resources: state.resources });
        render();
      })
      .catch(function (err) {
        setStatus($("saveStatus"), "err", "⚠️ Impossible de charger la version éditable : " + err.message);
      });
  }

  function saveData() {
    var el = $("saveStatus");
    if (!sessionToken) return;
    setStatus(el, "info", "Publication en cours…");
    $("saveBtn").disabled = true;

    var payload = JSON.stringify(
      { version: 1, updatedAt: new Date().toISOString(), categories: state.categories, resources: state.resources },
      null, 2
    );
    var body = { message: "Mise à jour des ressources", content: utf8ToBase64(payload), branch: cfg.branch };
    if (state.sha) body.sha = state.sha;

    fetch(apiUrl(), { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders()), body: JSON.stringify(body) })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (e) { throw new Error(e.message || ("Erreur GitHub API (" + res.status + ")")); });
        return res.json();
      })
      .then(function (json) {
        state.sha = json.content.sha;
        state.savedSnapshot = JSON.stringify({ categories: state.categories, resources: state.resources });
        refreshSaveBar();
        setStatus(el, "ok", "✅ Publié ! Visible pour tout le monde d'ici quelques secondes.");
        setTimeout(function () { clearStatus(el); }, 4000);
      })
      .catch(function (err) {
        setStatus(el, "err", "⚠️ Échec : " + err.message);
      })
      .finally(function () { $("saveBtn").disabled = false; });
  }

  // ---------------- login / logout ----------------

  function attemptLogin() {
    var password = $("loginPassword").value;
    var el = $("loginStatus");
    if (!cfg.encryptedToken) {
      setStatus(el, "err", "Aucun accès éditeur n'est configuré pour ce site (voir admin.html).");
      return;
    }
    if (!password) return;
    setStatus(el, "info", "Vérification…");
    window.APF_CRYPTO.decrypt(cfg.encryptedToken, password)
      .then(function (token) {
        sessionToken = token;
        sessionStorage.setItem(SS_TOKEN, token);
        clearStatus(el);
        $("loginPassword").value = "";
        closeModal("loginBackdrop");
        updateLockButton();
        loadForEditing();
      })
      .catch(function () { setStatus(el, "err", "Mot de passe incorrect."); });
  }

  function logout() {
    if (isDirty() && !confirm("Des modifications ne sont pas publiées. Se déconnecter quand même ?")) return;
    sessionToken = "";
    sessionStorage.removeItem(SS_TOKEN);
    updateLockButton();
    loadPublicData();
  }

  function updateLockButton() {
    var btn = $("lockBtn");
    if (isEditMode()) {
      btn.textContent = "🔓 Connecté — Se déconnecter";
      btn.classList.add("unlocked");
    } else {
      btn.textContent = "🔒 Se connecter";
      btn.classList.remove("unlocked");
    }
  }

  // ---------------- category modal ----------------

  function fillEmojiRow() {
    $("emojiRow").innerHTML = EMOJI_CHOICES.map(function (e) {
      return '<button type="button" data-emoji="' + e + '">' + e + "</button>";
    }).join("");
    Array.prototype.forEach.call($("emojiRow").querySelectorAll("[data-emoji]"), function (btn) {
      btn.addEventListener("click", function () { $("catIcon").value = btn.getAttribute("data-emoji"); });
    });
  }

  function openCategoryModal(id) {
    state.editingCategoryId = id;
    var c = id ? state.categories.find(function (x) { return x.id === id; }) : null;
    $("catModalTitle").textContent = c ? "Modifier la catégorie" : "Ajouter une catégorie";
    $("catName").value = c ? c.name : "";
    $("catIcon").value = c ? (c.icon || "") : "";
    $("catSubmitBtn").textContent = c ? "Enregistrer" : "Ajouter";
    $("catDeleteBtn").style.display = c ? "inline-flex" : "none";
    openModal("categoryBackdrop");
    $("catName").focus();
  }

  function submitCategoryForm(e) {
    e.preventDefault();
    var name = $("catName").value.trim();
    var icon = $("catIcon").value.trim();
    if (!name) return;
    if (state.editingCategoryId) {
      var c = state.categories.find(function (x) { return x.id === state.editingCategoryId; });
      c.name = name; c.icon = icon;
    } else {
      var ids = state.categories.map(function (x) { return x.id; });
      state.categories.push({ id: uniqueId(slugify(name), ids), name: name, icon: icon });
    }
    closeModal("categoryBackdrop");
    render();
  }

  function deleteCategoryFromModal() {
    if (!state.editingCategoryId) return;
    deleteCategory(state.editingCategoryId);
    closeModal("categoryBackdrop");
  }

  function deleteCategory(id) {
    var count = state.resources.filter(function (r) { return r.categoryId === id; }).length;
    var msg = count > 0 ? "Cette catégorie contient " + count + " ressource(s) qui seront aussi supprimées. Continuer ?" : "Supprimer cette catégorie ?";
    if (!confirm(msg)) return;
    state.categories = state.categories.filter(function (c) { return c.id !== id; });
    state.resources = state.resources.filter(function (r) { return r.categoryId !== id; });
    if (state.activeCategory === id) state.activeCategory = "all";
    render();
  }

  // ---------------- resource modal ----------------

  function fillCategorySelect(preselect) {
    var sel = $("resCategory");
    sel.innerHTML = state.categories.map(function (c) {
      return '<option value="' + c.id + '">' + (c.icon || "") + " " + escapeHtml(c.name) + "</option>";
    }).join("");
    if (preselect) sel.value = preselect;
  }

  function openResourceModal(id, presetCategoryId) {
    state.editingResourceId = id;
    state.lastPreview = null;
    state.lastPreviewUrl = null;
    var r = id ? state.resources.find(function (x) { return x.id === id; }) : null;
    fillCategorySelect(r ? r.categoryId : presetCategoryId);
    var isFileBacked = !!(r && r.url && isLocalFile(r.url));
    $("resModalTitle").textContent = r ? "Modifier la ressource" : "Ajouter une ressource";
    $("resUrl").value = r && !isFileBacked ? (r.url || "") : "";
    $("resTitle").value = r ? r.title : "";
    $("resDescription").value = r ? (r.description || "") : "";
    $("resSubmitBtn").textContent = r ? "Enregistrer" : "Ajouter";
    $("resDeleteBtn").style.display = r ? "inline-flex" : "none";
    $("previewBox").style.display = "none";
    clearStatus($("previewStatus"));
    $("resFile").value = "";
    clearStatus($("fileStatus"));
    if (isFileBacked) {
      setStatus($("fileStatus"), "info", "📎 Fichier actuel : " + r.url.replace(/^files\/[a-z0-9]+-/i, "") + " — importez un autre fichier ci-dessus pour le remplacer.");
    }
    if (r && r.image) {
      state.lastPreview = { image: r.image };
      state.lastPreviewUrl = r.url;
      showPreviewBox({ title: r.title, description: r.description, image: r.image });
    }
    openModal("resourceBackdrop");
    $("resTitle").focus();
  }

  function submitResourceForm(e) {
    e.preventDefault();
    var title = $("resTitle").value.trim();
    var description = $("resDescription").value.trim();
    var categoryId = $("resCategory").value;
    var file = $("resFile").files[0];
    if (!title) return;

    var fileStatusEl = $("fileStatus");
    var submitBtn = $("resSubmitBtn");
    var finish = function (url, imageOverride) {
      if (state.editingResourceId) {
        var r = state.resources.find(function (x) { return x.id === state.editingResourceId; });
        r.title = title; r.url = url; r.description = description; r.categoryId = categoryId;
        if (imageOverride !== undefined) r.image = imageOverride;
        else if (state.lastPreview && state.lastPreview.image) r.image = state.lastPreview.image;
      } else {
        var ids = state.resources.map(function (x) { return x.id; });
        state.resources.push({
          id: uniqueId(slugify(title), ids),
          title: title, url: url, description: description, categoryId: categoryId,
          image: imageOverride !== undefined ? imageOverride : ((state.lastPreview && state.lastPreview.image) || ""),
          addedAt: new Date().toISOString(),
        });
      }
      closeModal("resourceBackdrop");
      render();
    };

    if (file) {
      submitBtn.disabled = true;
      uploadFile(file, function (stage) { setStatus(fileStatusEl, "info", stage); })
        .then(function (result) {
          clearStatus(fileStatusEl);
          submitBtn.disabled = false;
          finish(result.path, result.image || "");
        })
        .catch(function (err) {
          submitBtn.disabled = false;
          setStatus(fileStatusEl, "err", "⚠️ Échec de l'import : " + err.message);
        });
      return;
    }

    var typedUrl = $("resUrl").value.trim();
    if (!typedUrl && state.editingResourceId) {
      var existing = state.resources.find(function (x) { return x.id === state.editingResourceId; });
      if (existing && isLocalFile(existing.url)) typedUrl = existing.url; // conserve le fichier déjà importé
    }
    finish(typedUrl);
  }

  function deleteResourceFromModal() {
    if (!state.editingResourceId) return;
    deleteResource(state.editingResourceId);
    closeModal("resourceBackdrop");
  }

  function deleteResource(id) {
    if (!confirm("Supprimer cette ressource ?")) return;
    state.resources = state.resources.filter(function (r) { return r.id !== id; });
    render();
  }

  function showPreviewBox(p) {
    var box = $("previewBox");
    box.style.display = "flex";
    var img = $("previewImg");
    img.style.visibility = "visible";
    img.onerror = function () { img.style.visibility = "hidden"; };
    img.src = p.image || faviconUrl($("resUrl").value.trim());
    $("previewTitle").textContent = p.title || "(sans titre)";
    $("previewDesc").textContent = p.description || "";
  }

  function fetchPreview() {
    var url = $("resUrl").value.trim();
    var el = $("previewStatus");
    if (!url) { setStatus(el, "err", "Renseignez d'abord un lien."); return; }
    state.lastPreviewUrl = url;
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
        setStatus(el, "err", "Aperçu automatique indisponible — remplissez les champs manuellement.");
        showPreviewBox({ title: $("resTitle").value, description: $("resDescription").value, image: "" });
      });
  }

  // ---------------- wiring ----------------

  document.addEventListener("DOMContentLoaded", function () {
    fillEmojiRow();
    updateLockButton();

    $("lockBtn").addEventListener("click", function () {
      if (isEditMode()) logout(); else openModal("loginBackdrop");
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (btn) {
      btn.addEventListener("click", function () { closeModal(btn.getAttribute("data-close")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".modal-backdrop"), function (bd) {
      bd.addEventListener("click", function (e) { if (e.target === bd) bd.classList.remove("show"); });
    });

    $("loginSubmitBtn").addEventListener("click", attemptLogin);
    $("loginPassword").addEventListener("keydown", function (e) { if (e.key === "Enter") attemptLogin(); });

    $("catForm").addEventListener("submit", submitCategoryForm);
    $("catDeleteBtn").addEventListener("click", deleteCategoryFromModal);

    $("resForm").addEventListener("submit", submitResourceForm);
    $("resDeleteBtn").addEventListener("click", deleteResourceFromModal);
    $("fetchPreviewBtn").addEventListener("click", fetchPreview);
    $("resUrl").addEventListener("blur", function () {
      var url = $("resUrl").value.trim();
      if (url && url !== state.lastPreviewUrl && !$("resFile").files[0]) fetchPreview();
    });
    $("resFile").addEventListener("change", function () {
      var file = $("resFile").files[0];
      if (!file) { clearStatus($("fileStatus")); return; }
      if (!$("resTitle").value.trim()) $("resTitle").value = file.name.replace(/\.[a-z0-9]+$/i, "");
      setStatus($("fileStatus"), "info", "Sélectionné : " + file.name + " (" + (file.size / 1024 / 1024).toFixed(1) + " Mo) — sera importé à la validation.");
    });

    $("saveBtn").addEventListener("click", saveData);
    $("discardBtn").addEventListener("click", function () {
      if (!confirm("Annuler toutes les modifications non publiées ?")) return;
      loadForEditing();
    });

    var search = $("searchInput");
    search.addEventListener("input", function () { state.query = search.value.trim(); render(); });

    if (isEditMode()) loadForEditing(); else loadPublicData();
  });
})();
