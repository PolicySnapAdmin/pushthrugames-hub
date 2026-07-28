/**
 * QR — privacy notice + Do Not Sell/Share preferences.
 * Essential storage only; no ad SDKs. Honors GPC. Separate keys from Push Thru.
 */
(function () {
  const NOTICE_KEY = "qr-privacy-notice-v1";
  const OPT_OUT_KEY = "qr-dns-opt-out";
  const GPC_APPLIED_KEY = "qr-gpc-applied";

  function gpcEnabled() {
    try {
      return !!(navigator.globalPrivacyControl || navigator.globalPrivacyControl === true);
    } catch (_) {
      return false;
    }
  }

  function getOptOut() {
    try {
      const v = localStorage.getItem(OPT_OUT_KEY);
      if (v === "0") return false;
      return true;
    } catch (_) {
      return true;
    }
  }

  function setOptOut(on) {
    try {
      localStorage.setItem(OPT_OUT_KEY, on ? "1" : "0");
    } catch (_) {}
  }

  function noticeSeen() {
    try {
      return localStorage.getItem(NOTICE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function markNoticeSeen() {
    try {
      localStorage.setItem(NOTICE_KEY, "1");
    } catch (_) {}
  }

  function applyGpcIfNeeded() {
    if (!gpcEnabled()) return;
    setOptOut(true);
    try {
      localStorage.setItem(GPC_APPLIED_KEY, "1");
    } catch (_) {}
  }

  function removeBanner() {
    document.getElementById("qr-consent-banner")?.remove();
  }

  function showBanner() {
    if (noticeSeen()) return;
    if (document.getElementById("qr-consent-banner")) return;

    const el = document.createElement("div");
    el.id = "qr-consent-banner";
    el.className = "pt-consent";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Privacy notice");
    el.innerHTML =
      "<p><strong>Privacy &amp; storage</strong> — We never sell your data (opt-out is always on in our view). " +
      "QR uses essential browser storage for sign-in, progress, Memory/RAM, and preferences — not ad tracking. " +
      "See <a href=\"privacy-stance.html\">Our stance</a>, <a href=\"privacy.html\">Privacy</a>, " +
      "<a href=\"cookies.html\">Cookies</a>.</p>" +
      '<div class="pt-consent-actions">' +
      '<button type="button" class="solid-btn" id="qr-consent-ok">Got it</button>' +
      '<a class="ghost-btn" href="privacy-choices.html">Privacy choices</a>' +
      "</div>";

    if (!document.querySelector('link[href*="legal.css"]')) {
      const s = document.createElement("style");
      s.textContent =
        ".pt-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:10000;max-width:520px;margin:0 auto;" +
        "padding:14px 16px;border-radius:14px;border:1px solid #2a2a36;background:rgba(18,18,26,.96);" +
        "box-shadow:0 12px 40px rgba(0,0,0,.45);color:#e8e8f0;font:14px/1.45 system-ui,sans-serif}" +
        ".pt-consent p{margin:0 0 10px;color:#9a9aab}.pt-consent strong{color:#e8e8f0}.pt-consent a{color:#7cffb2}" +
        ".pt-consent-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}" +
        ".pt-consent .solid-btn{appearance:none;border:0;border-radius:10px;padding:8px 12px;font:inherit;font-weight:700;" +
        "background:#1a9e6a;color:#fff;cursor:pointer}" +
        ".pt-consent .ghost-btn{appearance:none;border:1px solid #2a2a36;border-radius:10px;padding:8px 12px;font:inherit;" +
        "font-weight:600;background:transparent;color:#e8e8f0;cursor:pointer;text-decoration:none;display:inline-block}" +
        "@media(min-width:640px){.pt-consent{left:50%;right:auto;transform:translateX(-50%);width:min(520px,calc(100% - 24px))}}";
      document.head.appendChild(s);
    }

    document.body.appendChild(el);
    el.querySelector("#qr-consent-ok")?.addEventListener("click", () => {
      markNoticeSeen();
      removeBanner();
    });
  }

  function mountChoicesPage() {
    applyGpcIfNeeded();
    const gpcEl = document.getElementById("gpc-status");
    const box = document.getElementById("opt-out-sale-share");
    const saved = document.getElementById("choice-saved");
    const btn = document.getElementById("save-privacy-choices");

    if (gpcEl) {
      if (gpcEnabled()) {
        gpcEl.textContent =
          "Global Privacy Control (GPC) detected — treated as an opt-out of sale/share on this device.";
        gpcEl.style.color = "#3dd68c";
      } else {
        gpcEl.textContent = "No GPC signal detected. You can still opt out manually below.";
      }
    }
    if (box) box.checked = getOptOut() || gpcEnabled();

    btn?.addEventListener("click", () => {
      setOptOut(!!box?.checked);
      markNoticeSeen();
      if (saved) {
        saved.hidden = false;
        setTimeout(() => {
          saved.hidden = true;
        }, 2000);
      }
    });
  }

  function ensureDefaultOptOut() {
    try {
      if (localStorage.getItem(OPT_OUT_KEY) === null) setOptOut(true);
    } catch (_) {}
  }

  window.QRPrivacy = {
    getOptOut,
    setOptOut,
    gpcEnabled,
    mountChoicesPage,
    showBanner,
  };

  function boot() {
    ensureDefaultOptOut();
    applyGpcIfNeeded();
    setTimeout(showBanner, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
