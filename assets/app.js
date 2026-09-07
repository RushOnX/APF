(function () {
  "use strict";

  var state = {
    categories: [],
    resources: [],
    activeCategory: "all",
    query: "",
  };

  function domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function faviconUrl(url) {
    var d = domainOf(url);
    return d ? "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(d) + "&sz=64" : "";
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderChips() {
    var wrap = document.getElementById("categoryFilters");
    var html = '<button class="chip' + (state.activeCategory === "all" ? " active" : "") + '" data-cat="all">Tout</button>';
    state.categories.forEach(function (c) {
      var count = state.resources.filter(function (r) { return r.categoryId === c.id; }).length;
      if (count === 0) return;
      html += '<button class="chip' + (state.activeCategory === c.id ? " active" : "") + '" data-cat="' + c.id + '">' +
        (c.icon || "") + " " + escapeHtml(c.name) + '</button>';
    });
    wrap.innerHTML = html;
    Array.prototype.forEach.call(wrap.querySelectorAll(".chip"), function (btn) {
      btn.addEventListener("click", function () {
        state.activeCategory = btn.getAttribute("data-cat");
        render();
      });
    });
  }

  function cardHtml(r) {
    var hasLink = !!(r.url && r.url.trim());
    var domain = hasLink ? domainOf(r.url) : "";
    var img = r.image
      ? '<img class="og-image" src="' + escapeHtml(r.image) + '" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'\'">'
      : (hasLink
          ? '<span class="fallback-icon"><img src="' + faviconUrl(r.url) + '" alt="" loading="lazy"></span>'
          : '<span class="fallback-icon">🔗</span>');

    var inner =
      '<div class="resource-preview">' + img + "</div>" +
      '<div class="resource-body">' +
      (domain ? '<span class="domain">' + escapeHtml(domain) + "</span>" : "") +
      "<h3>" + escapeHtml(r.title) + "</h3>" +
      (r.description ? "<p>" + escapeHtml(r.description) + "</p>" : "") +
      (!hasLink ? '<span class="missing-link-badge">Lien à ajouter</span>' : "") +
      "</div>";

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
    renderChips();
    var main = document.getElementById("categorySections");
    var visibleCats = state.categories.filter(function (c) {
      return state.activeCategory === "all" || state.activeCategory === c.id;
    });

    var html = "";
    var totalShown = 0;

    visibleCats.forEach(function (c) {
      var items = state.resources.filter(function (r) {
        return r.categoryId === c.id && matchesQuery(r);
      });
      if (items.length === 0) return;
      totalShown += items.length;
      html += '<section class="category-section">' +
        '<h2 class="category-title">' + (c.icon || "") + " " + escapeHtml(c.name) +
        '<span class="count">' + items.length + "</span></h2>" +
        '<div class="resource-grid">' + items.map(cardHtml).join("") + "</div>" +
        "</section>";
    });

    if (totalShown === 0) {
      html = '<div class="empty-state">Aucune ressource ne correspond à votre recherche.</div>';
    }

    main.innerHTML = html;
  }

  function load() {
    fetch("data/data.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        state.categories = data.categories || [];
        state.resources = data.resources || [];
        render();
      })
      .catch(function (err) {
        document.getElementById("categorySections").innerHTML =
          '<div class="empty-state">Impossible de charger les ressources (' + escapeHtml(err.message) + ").</div>";
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    load();
    var search = document.getElementById("searchInput");
    search.addEventListener("input", function () {
      state.query = search.value.trim();
      render();
    });
  });
})();
