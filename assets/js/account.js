/* Shared account control and progress sync for Academy and its courses. */
(function (global) {
  "use strict";
  const keys = {
    academy: "resqly-academy-v1",
    ekg: "ekg-lernen-v1",
    sono: "sono-learning-v1",
    roentgen: "roentgen-learning-v1",
    profile: "resqly-profile-v1",
  };
  const ownerKey = "resqly-progress-owner";
  let user = null;
  let app = null;
  let button = null;
  const pendingSave = {}; // specialty -> latest unsent snapshot
  let saving = false;

  function storage() {
    try { return global.localStorage; } catch (_) { return null; }
  }
  function clearLocal() {
    const local = storage();
    if (!local) return;
    Object.values(keys).forEach((key) => local.removeItem(key));
    local.removeItem(ownerKey);
  }
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    let response;
    try {
      response = await fetch("/api/" + path, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        ...options,
      });
    } finally {
      clearTimeout(timer);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Der Server ist gerade nicht erreichbar.");
      error.status = response.status;
      throw error;
    }
    return data;
  }
  async function syncAll() {
    const local = storage();
    if (!local || !user) return;
    const owner = local.getItem(ownerKey);
    if (owner && owner !== String(user.id)) clearLocal();
    await Promise.all(Object.entries(keys).map(async ([specialty, key]) => {
      let saved = null;
      try { saved = JSON.parse(local.getItem(key)); } catch (_) { /* ignore corrupt cache */ }
      try {
        const result = saved && typeof saved === "object"
          ? await request("progress/" + specialty, { method: "PUT", body: JSON.stringify(saved) })
          : await request("progress/" + specialty);
        if (result && result.data) local.setItem(key, JSON.stringify(result.data));
      } catch (_) {
        // Local learning remains available when the API is temporarily offline.
      }
    }));
    local.setItem(ownerKey, String(user.id));
  }
  function refreshButton() {
    if (!button) return;
    button.textContent = user ? "👤 " + user.email.split("@")[0] : "👤 Anmelden";
    button.title = user ? "Konto: " + user.email : "Anmelden und Lernstand synchronisieren";
  }
  function closeDialog(dialog) {
    dialog.remove();
    button?.focus();
  }
  function openDialog() {
    const overlay = document.createElement("div");
    overlay.className = "account-overlay";
    overlay.setAttribute("role", "presentation");
    const box = document.createElement("section");
    box.className = "account-dialog card";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Resqly Konto");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "iconbtn account-close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Schließen");
    close.onclick = () => closeDialog(overlay);
    box.append(close);
    overlay.append(box);
    overlay.onclick = (event) => { if (event.target === overlay) closeDialog(overlay); };
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeDialog(overlay);
    });

    const title = document.createElement("h2");
    title.textContent = user ? "Dein Konto" : "Lernstand speichern";
    box.append(title);
    if (user) {
      const email = document.createElement("p");
      email.textContent = user.email;
      const info = document.createElement("p");
      info.textContent = "Dein Fortschritt für Academy, EKG und Röntgen wird in diesem Konto gespeichert.";
      const logout = document.createElement("button");
      logout.type = "button";
      logout.className = "btn gray wide";
      logout.textContent = "Abmelden";
      logout.onclick = async () => {
        logout.disabled = true;
        try {
          await request("account/logout", { method: "POST", body: "{}" });
          clearLocal();
          global.location.reload();
        } catch (error) { message.textContent = error.message; logout.disabled = false; }
      };
      const message = document.createElement("p");
      message.className = "account-error";
      box.append(email, info, logout, message);
    } else {
      const intro = document.createElement("p");
      intro.textContent = "Ein Konto verbindet deinen Fortschritt in allen Kursen und auf deinen Geräten.";
      const form = document.createElement("form");
      const email = document.createElement("input");
      email.type = "email";
      email.required = true;
      email.placeholder = "E-Mail-Adresse";
      email.autocomplete = "email";
      email.setAttribute("aria-label", "E-Mail-Adresse");
      const password = document.createElement("input");
      password.type = "password";
      password.required = true;
      password.minLength = 10;
      password.placeholder = "Passwort (mindestens 10 Zeichen)";
      password.autocomplete = "current-password";
      password.setAttribute("aria-label", "Passwort");
      const submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "btn wide";
      submit.textContent = "Anmelden";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "btn-ghost wide";
      toggle.textContent = "Neues Konto erstellen";
      let registering = false;
      toggle.onclick = () => {
        registering = !registering;
        submit.textContent = registering ? "Konto erstellen" : "Anmelden";
        toggle.textContent = registering ? "Ich habe schon ein Konto" : "Neues Konto erstellen";
        password.autocomplete = registering ? "new-password" : "current-password";
        message.textContent = "";
      };
      const message = document.createElement("p");
      message.className = "account-error";
      form.append(email, password, submit, toggle, message);
      form.onsubmit = async (event) => {
        event.preventDefault();
        submit.disabled = true;
        message.textContent = "";
        try {
          const result = await request("account/" + (registering ? "register" : "login"), {
            method: "POST",
            body: JSON.stringify({ email: email.value, password: password.value }),
          });
          user = result.user;
          await syncAll();
          global.location.reload();
        } catch (error) {
          message.textContent = error.message;
          submit.disabled = false;
        }
      };
      box.append(intro, form);
      setTimeout(() => email.focus(), 0);
    }
    document.body.append(overlay);
  }

  async function init(application) {
    app = application;
    if (global.location.protocol === "file:") return;
    try {
      const result = await request("account/me");
      user = result.user;
    } catch (error) {
      if (error.status !== 401) return; // No account API on a static server.
    }
    if (user) await syncAll();
    button = document.createElement("button");
    button.type = "button";
    button.className = "account-trigger";
    button.onclick = openDialog;
    document.querySelector(".topbar-in")?.append(button);
    refreshButton();
  }

  // Every page saves its own course and the academy-wide profile.
  function saveProgress(specialty, data) {
    if (!user || (specialty !== app && specialty !== "profile")) return;
    pendingSave[specialty] = JSON.stringify(data);
    if (saving) return;
    saving = true;
    (async () => {
      for (let specialty; (specialty = Object.keys(pendingSave)[0]); ) {
        const snapshot = pendingSave[specialty];
        delete pendingSave[specialty];
        try {
          await request("progress/" + specialty, { method: "PUT", body: snapshot });
        } catch (_) {
          // The local copy is retried at the next page load.
        }
      }
      saving = false;
    })();
  }

  global.ResqlyAccount = { init, saveProgress };
})(window);
