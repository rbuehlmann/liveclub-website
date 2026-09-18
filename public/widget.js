// URL shape here must stay in sync with buildEmbedUrl() in
// src/lib/publicRoutes.ts — this file is plain JS (served as-is, not built)
// so it can't import that helper directly.
(function () {
  var scriptEl = document.currentScript;
  var origin = new URL(scriptEl.src).origin;

  function mount(container) {
    var clubId = container.getAttribute("data-club-id");
    if (!clubId) return;
    var teamId = container.getAttribute("data-team-id");
    // data-mode="feed" is new (see dashboard/share/page.tsx's generator) —
    // omitting it entirely keeps every pre-existing embed on the original
    // single-game behavior, unchanged.
    var mode = container.getAttribute("data-mode");
    var theme = container.getAttribute("data-theme");
    var scope = container.getAttribute("data-scope");
    var height = container.getAttribute("data-height");

    var params = [];
    if (teamId) params.push("team=" + encodeURIComponent(teamId));
    if (mode) params.push("mode=" + encodeURIComponent(mode));
    if (theme) params.push("theme=" + encodeURIComponent(theme));
    if (scope) params.push("scope=" + encodeURIComponent(scope));

    var src = origin + "/embed/" + encodeURIComponent(clubId);
    if (params.length > 0) {
      src += "?" + params.join("&");
    }

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "LiveClub";
    iframe.style.width = "100%";
    iframe.style.maxWidth = "360px";
    iframe.style.height = (height || (mode === "feed" ? "340" : "120")) + "px";
    iframe.style.border = "1px solid #e5e7eb";
    iframe.style.borderRadius = "12px";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");

    container.innerHTML = "";
    container.appendChild(iframe);
  }

  function init() {
    var containers = document.querySelectorAll(".liveclub-widget");
    for (var i = 0; i < containers.length; i++) {
      mount(containers[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
