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

    var src = origin + "/embed/" + encodeURIComponent(clubId);
    if (teamId) {
      src += "?team=" + encodeURIComponent(teamId);
    }

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "LiveClub";
    iframe.style.width = "100%";
    iframe.style.maxWidth = "360px";
    iframe.style.height = "120px";
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
