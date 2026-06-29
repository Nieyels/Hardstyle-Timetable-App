const DEFAULT_TIMETABLE_CONFIG = {
  id: "defqon-1",
  name: "Defqon.1",
  edition: "Weekend Festival 2026",
  dates: "25 - 28 June 2026",
  sourceFile: "timetable.csv?v=2",
  storagePrefix: "defqon-2026",
  assetBase: "",
  heroCompactTitle: "DEFQON.1 - TIMETABLE",
  tagline: "Tap sets you want to see and use the star to mark the ones you definitely do not want to miss.",
  disclaimer: "Unofficial fan-made project. Not affiliated with or endorsed by Q-dance or Defqon.1.",
  defaultHost: "Defqon.1",
  privacyLabel: "Defqon.1 Timetable",
  syncLabel: "Defqon.1 sync",
};

const currentFestival = {
  ...DEFAULT_TIMETABLE_CONFIG,
  ...(window.TIMETABLE_CONFIG || {}),
};
const SOURCE_FILE = currentFestival.sourceFile;
const STORAGE_KEY = getFestivalStorageKey(currentFestival, "want-to-see");
const IMPORTANT_STORAGE_KEY = getFestivalStorageKey(currentFestival, "important");
const PROFILE_STORAGE_KEY = getFestivalStorageKey(currentFestival, "profile");
const SUPABASE_URL = "https://junvfbxjafaksjsxcdmi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5mOH1tzVIvvrKy3JDZa4kg_eAaBVHi7";
const SUPABASE_CLIENT_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const MAX_USERNAME_LENGTH = 40;
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 6000;
const MAX_AVATAR_BLOB_SIZE = 500000;
const DEFAULT_DURATION = 45;
const HORIZONTAL_HOUR_WIDTH = 230;
const VERTICAL_HEADER_HEIGHT = 126;
const MOBILE_VERTICAL_HEADER_HEIGHT = 112;
const VERTICAL_HOUR_HEIGHT = 128;
const CUSTOM_STAGE_ORDER = [
  "red",
  "blue",
  "black",
  "uv",
  "magenta",
  "indigo",
  "yellow",
  "gold",
  "purple",
  "silver",
  "blue night",
  "magenta night",
  "stampkroeg",
];
const DEFAULT_STAGE_IMAGE_PATHS = {
  red: "stages/1732195700-head-image-red.jpg",
  purple: "stages/1732195724-head-image-purple.jpg",
  blue: "stages/1732195756-head-image-blue.jpg",
  black: "stages/1742206699-head-image-black.jpg",
  indigo: "stages/1742206842-head-image-indigo.png",
  uv: "stages/1742206879-head-image-uv.png",
  magenta: "stages/1742206909-head-image-magenta.jpg",
  yellow: "stages/1742206945-head-image-yellow.png",
  gold: "stages/1742207192-head-image-gold.png",
  orange: "stages/1742207209-head-image-orange.png",
  silver: "stages/1742207270-head-image-silver.jpg",
  green: "stages/1742207284-head-image-green.png",
  pink: "stages/1742979553-pink.jpg",
  brown: "stages/1778587016-brown.jpg",
  stampkroeg: "stages/1778587030-stampkroeg.jpg",
  "blue night": "stages/1778587043-blue-night.jpg",
  "magenta night": "stages/1778587064-magenta-night.jpg",
};
const STAGE_IMAGE_PATHS = normalizeAssetMap(currentFestival.stageImagePaths || DEFAULT_STAGE_IMAGE_PATHS);
const CLOSING_RED_IMAGE_PATH = resolveAssetPath(currentFestival.closingRedImagePath || "stages/1742835588-closing_red.jpeg");

const state = {
  days: [],
  selectedDay: "",
  selectedStage: "all",
  viewMode: "horizontal",
  favoritesOnly: false,
  searchQuery: "",
  favorites: new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")),
  important: new Set(JSON.parse(localStorage.getItem(IMPORTANT_STORAGE_KEY) || "[]")),
  supabase: null,
  session: null,
  authMode: "login",
  profile: JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "null"),
  pendingAvatarDataUrl: "",
  pendingAvatarBlob: null,
  party: null,
  partyMembers: [],
  partyMembersByEvent: new Map(),
  partySignature: "",
  partyRefreshTimer: null,
  currentSetTimer: null,
  syncTimer: null,
  isRemoteHydrating: false,
  commonControlsBound: false,
  controlsBound: false,
};

const els = {
  hero: document.querySelector(".hero"),
  heroKicker: document.getElementById("heroKicker"),
  heroTitle: document.getElementById("heroTitle"),
  heroSubtitle: document.getElementById("heroSubtitle"),
  heroCompactTitle: document.getElementById("heroCompactTitle"),
  daySelect: document.getElementById("daySelect"),
  stageSelect: document.getElementById("stageSelect"),
  viewModeButtons: [...document.querySelectorAll("[data-view-mode]")],
  moreFiltersToggle: document.getElementById("moreFiltersToggle"),
  advancedFilters: document.getElementById("advancedFilters"),
  favoritesOnly: document.getElementById("showFavoritesOnly"),
  searchInput: document.getElementById("searchInput"),
  timeline: document.getElementById("timeline"),
  personalList: document.getElementById("personalList"),
  dayTitle: document.getElementById("dayTitle"),
  accountButton: document.getElementById("accountButton"),
  accountAvatar: document.getElementById("accountAvatar"),
  accountDialog: document.getElementById("accountDialog"),
  accountDialogClose: document.getElementById("accountDialogClose"),
  accountForm: document.getElementById("accountForm"),
  accountUsername: document.getElementById("accountUsername"),
  accountPassword: document.getElementById("accountPassword"),
  accountSubmit: document.getElementById("accountSubmit"),
  accountLogout: document.getElementById("accountLogout"),
  deleteAccountSection: document.getElementById("deleteAccountSection"),
  deleteAccount: document.getElementById("deleteAccount"),
  accountModeButtons: [...document.querySelectorAll("[data-auth-mode]")],
  accountStatus: document.getElementById("accountStatus"),
  profileSection: document.getElementById("profileSection"),
  profileUsername: document.getElementById("profileUsername"),
  profileAvatarPreview: document.getElementById("profileAvatarPreview"),
  profileAvatarInput: document.getElementById("profileAvatarInput"),
  profileSave: document.getElementById("profileSave"),
  partySection: document.getElementById("partySection"),
  partyStatus: document.getElementById("partyStatus"),
  partyCodeInput: document.getElementById("partyCodeInput"),
  partyCreate: document.getElementById("partyCreate"),
  partyJoin: document.getElementById("partyJoin"),
  partyLeave: document.getElementById("partyLeave"),
  partyMembers: document.getElementById("partyMembers"),
  privacyButton: document.getElementById("privacyButton"),
  privacyDialog: document.getElementById("privacyDialog"),
  privacyDialogClose: document.getElementById("privacyDialogClose"),
};

init();

async function init() {
  if (isTimetablePage()) {
    applyFestivalCopy(currentFestival);
  }
  bindCommonControlsOnce();

  if (!isTimetablePage()) {
    initSupabaseSync();
    return;
  }

  try {
    const response = await fetch(SOURCE_FILE);
    if (!response.ok) throw new Error(`Could not load ${SOURCE_FILE}.`);

    const csv = await response.text();
    state.days = normalizeTimetableCsv(csv);
    state.selectedDay = getAutomaticFestivalDay();

    syncDayOptions();
    bindTimetableControlsOnce();
    bindCurrentSetRefresh();
    render();
    playContentEnterAnimation();
    cleanupOldOfflineCache();
    initSupabaseSync();
  } catch (error) {
    els.timeline.innerHTML = `
      <div class="error-state">
        <strong>The timetable could not be loaded.</strong>
        <span>Serve this folder through a local web server, for example with <code>python -m http.server 8080</code>, then open <code>http://localhost:8080</code>.</span>
      </div>
    `;
    console.error(error);
  }
}

function applyFestivalCopy(festival) {
  document.title = `${festival.name} ${festival.edition} Timetable | Hardstyle Timetable App`;
  const timetableLabel = festival.dates ? `Timetable - ${festival.dates}` : `Timetable - ${festival.edition}`;
  if (els.heroKicker) els.heroKicker.textContent = timetableLabel;
  if (els.heroTitle) els.heroTitle.textContent = festival.name;
  if (els.heroSubtitle) els.heroSubtitle.textContent = festival.tagline;
  if (els.heroCompactTitle) els.heroCompactTitle.textContent = festival.heroCompactTitle;
  document.querySelectorAll("[data-festival-disclaimer]").forEach((node) => {
    node.textContent = festival.disclaimer;
  });
  document.querySelectorAll("[data-festival-sync-label]").forEach((node) => {
    node.textContent = festival.syncLabel;
  });
  document.querySelectorAll("[data-festival-privacy-label]").forEach((node) => {
    node.textContent = festival.privacyLabel;
  });
}

function bindCommonControlsOnce() {
  if (state.commonControlsBound) return;
  bindAccountControls();
  bindPrivacyControls();
  bindHeaderScroll();
  state.commonControlsBound = true;
}

function bindTimetableControlsOnce() {
  if (state.controlsBound) return;
  bindControls();
  bindResponsiveLayout();
  state.controlsBound = true;
}

function isTimetablePage() {
  return Boolean(els.timeline && els.daySelect && els.stageSelect && els.personalList);
}

function getFestivalStorageKey(festival, suffix) {
  return `${festival.storagePrefix}-${suffix}`;
}

function normalizeAssetMap(paths) {
  return Object.fromEntries(
    Object.entries(paths).map(([key, path]) => [key, resolveAssetPath(path)])
  );
}

function resolveAssetPath(path) {
  if (!path || /^(?:https?:|data:|\/)/.test(path)) return path;
  return new URL(`${currentFestival.assetBase || ""}${path}`, window.location.href).href;
}

function bindCurrentSetRefresh() {
  window.clearInterval(state.currentSetTimer);
  state.currentSetTimer = window.setInterval(() => {
    renderPersonalList();
  }, 60000);
}

function getAutomaticFestivalDay(now = new Date()) {
  const festivalDays = {
    0: "Sunday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  const adjustedDate = new Date(now);

  if (adjustedDate.getHours() < 6) {
    adjustedDate.setDate(adjustedDate.getDate() - 1);
  }

  const dayName = festivalDays[adjustedDate.getDay()] || "";

  return state.days.some((day) => day.day === dayName)
    ? dayName
    : state.days.find((day) => day.day === "Thursday")?.day || state.days[0]?.day || "";
}

async function cleanupOldOfflineCache() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames
        .filter((cacheName) => cacheName.startsWith("defqon-timetable-stable-"))
        .map((cacheName) => caches.delete(cacheName)));
    }

    Object.keys(localStorage)
      .filter((key) => key.startsWith("defqon-offline-"))
      .forEach((key) => localStorage.removeItem(key));

    Object.keys(sessionStorage)
      .filter((key) => key.startsWith("defqon-sw-reload-"))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    console.warn("The old offline cache could not be fully cleared.", error);
  }
}

function bindHeaderScroll() {
  let ticking = false;

  const updateHeader = () => {
    document.body.classList.toggle("is-header-compact", window.scrollY > 72);
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateHeader);
  }, { passive: true });

  updateHeader();
}

function bindResponsiveLayout() {
  const mobileQuery = window.matchMedia("(max-width: 680px)");
  const handleChange = () => {
    if (state.viewMode === "vertical") render();
  };

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener("change", handleChange);
  } else {
    mobileQuery.addListener(handleChange);
  }
}

function normalizeTimetableCsv(csv) {
  const rows = parseCsv(csv);
  const headers = rows.shift()?.map((header) => header.trim()) || [];
  const dayMap = new Map();

  rows.forEach((cells) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    const dayName = row.day?.trim();
    const stageName = row.stage?.trim();
    const time = row.time?.trim();
    const artist = row.artist?.trim();
    const endTime = row.end?.trim() || "";
    if (!dayName || !stageName || !artist) return;

    if (!dayMap.has(dayName)) {
      dayMap.set(dayName, { day: dayName, stageMap: new Map(), stages: [] });
    }

    const day = dayMap.get(dayName);
    const stageKey = `${stageName}::${row.host || ""}::${row.color || ""}`;
    if (!day.stageMap.has(stageKey)) {
      const stage = {
        stage: stageName,
        stageIndex: day.stages.length,
        host: row.host?.trim() || "",
        color: row.color?.trim() || "#c5a059",
        events: [],
      };
      day.stageMap.set(stageKey, stage);
      day.stages.push(stage);
    }

    const stage = day.stageMap.get(stageKey);
    const eventIndex = stage.events.length;
    const eventTime = time || "TBA";
    const id = slugify(`${dayName}-${stageName}-${eventTime}-${artist}-${eventIndex}`);
    stage.events.push({
      id,
      day: dayName,
      stage: stageName,
      stageIndex: stage.stageIndex,
      host: stage.host,
      color: stage.color,
      time: eventTime,
      artist,
      start: time ? minutesFromTime(time) : eventIndex,
      isTimeTba: !time,
      explicitEnd: optionalMinutesFromTime(endTime),
      end: null,
    });
  });

  return [...dayMap.values()].map((day) => {
    day.stages.forEach((stage) => {
      stage.events.forEach((event, index) => {
        const next = stage.events[index + 1];
        event.end = event.isTimeTba ? event.start + 1 : event.explicitEnd ?? (next && !next.isTimeTba ? next.start : event.start + DEFAULT_DURATION);
        if (event.end <= event.start) event.end += 24 * 60;
      });
    });

    return { day: day.day, stages: day.stages };
  }).filter((day) => day.stages.length);
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function bindControls() {
  syncDayOptions();

  els.daySelect.addEventListener("change", () => {
    state.selectedDay = els.daySelect.value;
    state.selectedStage = "all";
    animateRender();
  });

  els.stageSelect.addEventListener("change", () => {
    state.selectedStage = els.stageSelect.value;
    animateRender();
  });

  els.viewModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.viewMode = button.dataset.viewMode;
      animateRender();
    });
  });

  els.favoritesOnly.addEventListener("change", () => {
    state.favoritesOnly = els.favoritesOnly.checked;
    animateRender();
  });

  els.searchInput.addEventListener("input", () => {
    state.searchQuery = els.searchInput.value.trim();
    render();
  });

  els.moreFiltersToggle.addEventListener("click", () => {
    const expanded = els.moreFiltersToggle.getAttribute("aria-expanded") === "true";
    els.moreFiltersToggle.setAttribute("aria-expanded", String(!expanded));
    els.advancedFilters.hidden = expanded;
  });

  els.timeline.addEventListener("click", (event) => {
    const importantButton = event.target.closest("[data-toggle-important]");
    if (importantButton) {
      toggleImportant(importantButton.dataset.toggleImportant, importantButton);
      return;
    }

    const card = event.target.closest("[data-toggle-selected]");
    if (!card) return;
    toggleFavorite(card.dataset.toggleSelected, card);
    card.blur();
  });

  els.timeline.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const importantButton = event.target.closest("[data-toggle-important]");
    if (importantButton) {
      event.preventDefault();
      toggleImportant(importantButton.dataset.toggleImportant, importantButton);
      return;
    }

    const card = event.target.closest("[data-toggle-selected]");
    if (!card) return;
    event.preventDefault();
    toggleFavorite(card.dataset.toggleSelected, card);
    card.blur();
  });
}

function syncDayOptions() {
  if (!els.daySelect) return;
  els.daySelect.innerHTML = state.days.map((day) => `<option value="${escapeAttr(day.day)}">${day.day}</option>`).join("");
  els.daySelect.value = state.selectedDay;
}

function bindAccountControls() {
  if (!els.accountForm) return;

  els.accountUsername.value = localStorage.getItem(getFestivalStorageKey(currentFestival, "last-email")) || "";
  setAuthMode("login");

  els.accountButton.addEventListener("click", () => {
    openAccountDialog();
  });

  els.accountDialogClose.addEventListener("click", () => {
    closeAccountDialog();
  });

  els.accountDialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-account]")) closeAccountDialog();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.accountDialog.hidden) closeAccountDialog();
  });

  els.accountModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAuthMode(button.dataset.authMode);
    });
  });

  els.accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitAccount();
  });

  els.accountLogout.addEventListener("click", async () => {
    if (!state.supabase) return;
    setAccountStatus("Logging out...", "ok");
    await state.supabase.auth.signOut({ scope: "local" });
    state.session = null;
    state.profile = null;
    state.pendingAvatarDataUrl = "";
    state.pendingAvatarBlob = null;
    clearPartyState();
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    updateAccountUi();
    setAccountStatus("Logged out. Your selection remains stored locally on this device.", "");
  });

  els.deleteAccount.addEventListener("click", async () => {
    await deleteCurrentAccount();
  });

  els.profileAvatarInput.addEventListener("change", async () => {
    const file = els.profileAvatarInput.files?.[0];
    if (!file) return;

    try {
      const avatar = await imageFileToAvatar(file);
      state.pendingAvatarDataUrl = avatar.previewDataUrl;
      state.pendingAvatarBlob = avatar.blob;
      updateProfilePreview();
      setAccountStatus("New profile picture ready. Click Save profile.", "ok");
    } catch (error) {
      console.error(error);
      state.pendingAvatarDataUrl = "";
      state.pendingAvatarBlob = null;
      els.profileAvatarInput.value = "";
      setAccountStatus(error.message || "This image could not be processed.", "error");
    }
  });

  els.profileSave.addEventListener("click", async () => {
    await saveProfile();
  });

  els.partyCreate.addEventListener("click", async () => {
    await createParty();
  });

  els.partyJoin.addEventListener("click", async () => {
    await joinPartyByCode(els.partyCodeInput.value);
  });

  els.partyCodeInput.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    await joinPartyByCode(els.partyCodeInput.value);
  });

  els.partyLeave.addEventListener("click", async () => {
    await leaveParty();
  });
}

function bindPrivacyControls() {
  if (!els.privacyButton || !els.privacyDialog) return;

  els.privacyButton.addEventListener("click", openPrivacyDialog);
  els.privacyDialogClose.addEventListener("click", closePrivacyDialog);
  els.privacyDialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-privacy]")) closePrivacyDialog();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.privacyDialog.hidden) closePrivacyDialog();
  });
}

function openPrivacyDialog() {
  els.privacyDialog.hidden = false;
  document.body.classList.add("is-account-dialog-open");
  els.privacyButton.setAttribute("aria-expanded", "true");
  window.setTimeout(() => els.privacyDialogClose.focus(), 40);
}

function closePrivacyDialog() {
  els.privacyDialog.hidden = true;
  document.body.classList.remove("is-account-dialog-open");
  els.privacyButton.setAttribute("aria-expanded", "false");
  els.privacyButton.focus();
}

function openAccountDialog() {
  els.accountDialog.hidden = false;
  document.body.classList.add("is-account-dialog-open");
  els.accountButton.setAttribute("aria-expanded", "true");

  const focusTarget = state.session ? els.accountLogout : els.accountUsername;
  window.setTimeout(() => focusTarget.focus(), 40);
}

function closeAccountDialog() {
  els.accountDialog.hidden = true;
  document.body.classList.remove("is-account-dialog-open");
  els.accountButton.setAttribute("aria-expanded", "false");
  els.accountButton.focus();
}

function setAuthMode(mode) {
  state.authMode = mode === "register" ? "register" : "login";
  els.accountModeButtons.forEach((button) => {
    const active = button.dataset.authMode === state.authMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  els.accountSubmit.textContent = state.authMode === "register" ? "Register" : "Log in";
  els.accountPassword.autocomplete = state.authMode === "register" ? "new-password" : "current-password";
}

async function initSupabaseSync() {
  await loadSupabaseClient();

  if (!window.supabase?.createClient) {
    setAccountStatus("Supabase is unavailable. Local storage remains active.", "error");
    return;
  }

  state.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const { data } = await state.supabase.auth.getSession();
  if (data.session) {
    await applySession(data.session, { mergeLocal: true });
  } else {
    updateAccountUi();
  }

  state.supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      state.session = null;
      clearPartyState();
      updateAccountUi();
      return;
    }

    applySession(session, { mergeLocal: true });
  });
}

function loadSupabaseClient() {
  if (window.supabase?.createClient) return Promise.resolve();
  if (!navigator.onLine) return Promise.resolve();

  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${SUPABASE_CLIENT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SUPABASE_CLIENT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);

    window.setTimeout(resolve, 5000);
  });
}

async function submitAccount() {
  if (!state.supabase) {
    setAccountStatus("Supabase is not available yet.", "error");
    return;
  }

  const email = els.accountUsername.value.trim().toLowerCase();
  const password = els.accountPassword.value;
  if (!email || !password) {
    setAccountStatus("Enter an email address and password.", "error");
    return;
  }

  if (!email.includes("@")) {
    setAccountStatus("Enter a valid email address.", "error");
    return;
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    setAccountStatus(`Email addresses can contain at most ${MAX_EMAIL_LENGTH} characters.`, "error");
    return;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    setAccountStatus(`Passwords can contain at most ${MAX_PASSWORD_LENGTH} characters.`, "error");
    return;
  }

  localStorage.setItem(getFestivalStorageKey(currentFestival, "last-email"), email);
  setAccountBusy(true);
  setAccountStatus(state.authMode === "register" ? "Creating account..." : "Logging in...", "ok");

  const result = state.authMode === "register"
    ? await state.supabase.auth.signUp({
        email,
        password,
        options: { data: { username: normalizeProfileUsername(email.split("@")[0]) } },
      })
    : await state.supabase.auth.signInWithPassword({ email, password });

  setAccountBusy(false);

  if (result.error) {
    const message = /invalid login credentials/i.test(result.error.message || "")
      ? "No account was found for this email and password. Select Register if you are using this email address for the first time."
      : result.error.message || "Account action failed.";
    setAccountStatus(message, "error");
    return;
  }

  if (!result.data.session) {
    setAccountStatus("Account created, but email confirmation is still enabled in Supabase.", "error");
    return;
  }

  els.accountPassword.value = "";
  await applySession(result.data.session, { mergeLocal: true });
}

async function applySession(session, { mergeLocal }) {
  state.session = session;
  updateAccountUi();
  setAccountStatus("Account connected. Syncing timetable...", "ok");

  let profileFailed = false;
  try {
    await hydrateProfileFromSupabase();
  } catch (error) {
    profileFailed = true;
    console.error(error);
  }

  try {
    await hydratePreferencesFromSupabase({ mergeLocal });
    await loadPartyContext();
    startPartyRefresh();
    setAccountStatus(
      profileFailed
        ? "Logged in. Timetable sync works, but the new profile schema still needs to be applied."
        : "Logged in. Your timetable is synced automatically.",
      profileFailed ? "error" : "ok"
    );
  } catch (error) {
    console.error(error);
    setAccountStatus("Logged in, but sync failed. Check whether the Supabase table has been created.", "error");
  }
}

async function hydrateProfileFromSupabase() {
  if (!state.supabase || !state.session) return;

  const { data, error } = await state.supabase
    .from("profiles")
    .select("username, avatar_url, avatar_data_url")
    .eq("user_id", state.session.user.id)
    .maybeSingle();

  if (error) throw error;

  const fallbackUsername = normalizeProfileUsername(getAuthUsername());
  let avatarUrl = data?.avatar_url || "";
  const legacyAvatar = data?.avatar_data_url || "";
  if (!avatarUrl && legacyAvatar.startsWith("data:image/")) {
    avatarUrl = await uploadProfileAvatar(dataUrlToBlob(legacyAvatar));
  }

  state.profile = {
    username: normalizeProfileUsername(data?.username || fallbackUsername),
    avatarDataUrl: avatarUrl,
  };
  state.pendingAvatarDataUrl = "";
  state.pendingAvatarBlob = null;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profile));
  updateAccountUi();
  await upsertProfile();
}

async function saveProfile() {
  if (!state.supabase || !state.session) {
    setAccountStatus("Log in before saving your profile.", "error");
    return;
  }

  const username = els.profileUsername.value.trim();
  if (!username) {
    setAccountStatus("Enter a name.", "error");
    return;
  }

  if (username.length > MAX_USERNAME_LENGTH) {
    setAccountStatus(`Names can contain at most ${MAX_USERNAME_LENGTH} characters.`, "error");
    return;
  }

  setAccountBusy(true);
  try {
    let avatarUrl = state.profile?.avatarDataUrl || "";
    if (state.pendingAvatarBlob) {
      setAccountStatus("Uploading profile picture...", "ok");
      avatarUrl = await uploadProfileAvatar(state.pendingAvatarBlob);
    } else {
      setAccountStatus("Saving profile...", "ok");
    }

    state.profile = {
      username,
      avatarDataUrl: avatarUrl,
    };

    await upsertProfile();
    const { data, error } = await state.supabase.auth.updateUser({
      data: {
        username: state.profile.username,
      },
    });
    if (error) throw error;
    if (data.user) state.session = { ...state.session, user: data.user };

    state.pendingAvatarDataUrl = "";
    state.pendingAvatarBlob = null;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(state.profile));
    updateAccountUi();
    await loadPartyContext();
    setAccountStatus("Profile saved.", "ok");
  } catch (error) {
    console.error(error);
    setAccountStatus("Could not save the profile. Please try again.", "error");
  } finally {
    setAccountBusy(false);
  }
}

async function deleteCurrentAccount() {
  if (!state.supabase || !state.session) return;

  const confirmed = window.confirm(
    "Permanently delete your account, profile, timetable sync data, party membership and profile picture? This cannot be undone."
  );
  if (!confirmed) return;

  setAccountBusy(true);
  setAccountStatus("Deleting account...", "");

  try {
    const avatarPath = `${state.session.user.id}/avatar.jpg`;
    const { error: avatarError } = await state.supabase.storage
      .from("avatars")
      .remove([avatarPath]);
    if (avatarError && !/not found|does not exist/i.test(avatarError.message || "")) {
      console.warn("Could not remove avatar before account deletion.", avatarError);
    }

    const { error } = await state.supabase.rpc("delete_current_account");
    if (error) throw error;

    await state.supabase.auth.signOut({ scope: "local" });
    state.session = null;
    state.profile = null;
    state.pendingAvatarDataUrl = "";
    state.pendingAvatarBlob = null;
    state.favorites = new Set();
    state.important = new Set();
    clearPartyState();
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(IMPORTANT_STORAGE_KEY);
    localStorage.removeItem(getFestivalStorageKey(currentFestival, "last-email"));
    els.accountUsername.value = "";
    els.accountPassword.value = "";
    updateAccountUi();
    render();
    closeAccountDialog();
  } catch (error) {
    console.error(error);
    const schemaMissing = error?.code === "PGRST202"
      || /delete_current_account|function.*not found|schema cache/i.test(error?.message || "");
    setAccountStatus(
      schemaMissing
        ? "Account deletion is not configured yet. Run the latest supabase-schema.sql first."
        : "Could not delete the account. Please try again.",
      "error"
    );
  } finally {
    setAccountBusy(false);
  }
}

async function upsertProfile() {
  if (!state.supabase || !state.session || !state.profile) return;

  const { error } = await state.supabase
    .from("profiles")
    .upsert({
      user_id: state.session.user.id,
      username: state.profile.username,
      avatar_url: state.profile.avatarDataUrl || "",
      avatar_data_url: "",
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

async function createParty() {
  if (!state.supabase || !state.session) {
    setAccountStatus("Log in before creating a party.", "error");
    return;
  }

  setAccountBusy(true);
  setAccountStatus("Creating party...", "ok");

  try {
    const { data: party, error } = await state.supabase
      .rpc("create_party")
      .single();
    if (error) throw error;
    state.party = party;
    await loadPartyContext({ forceRender: true });
    startPartyRefresh();
    setAccountStatus(`Party created. Code: ${party.code}`, "ok");
  } catch (error) {
    console.error(error);
    setAccountStatus("Could not create the party. Check whether the party schema has been applied.", "error");
  } finally {
    setAccountBusy(false);
  }
}

async function joinPartyByCode(rawCode) {
  if (!state.supabase || !state.session) {
    setAccountStatus("Log in before joining a party.", "error");
    return;
  }

  const code = normalizePartyCode(rawCode);
  if (code.length !== 6) {
    setAccountStatus("Enter a valid 6-character party code.", "error");
    return;
  }

  setAccountBusy(true);
  setAccountStatus("Joining party...", "ok");

  try {
    const { data: party, error } = await state.supabase
      .rpc("join_party_by_code", { input_code: code })
      .maybeSingle();

    if (error) throw error;
    if (!party) {
      setAccountStatus("No party was found with this code.", "error");
      return;
    }

    state.party = party;
    els.partyCodeInput.value = "";
    await loadPartyContext({ forceRender: true });
    startPartyRefresh();
    setAccountStatus(`Party joined. Code: ${party.code}`, "ok");
  } catch (error) {
    console.error(error);
    setAccountStatus("Could not join the party.", "error");
  } finally {
    setAccountBusy(false);
  }
}

async function leaveParty(options = {}) {
  if (!state.supabase || !state.session) return;

  const partyId = state.party?.id;
  if (partyId) {
    const { error } = await state.supabase
      .from("party_members")
      .delete()
      .eq("party_id", partyId)
      .eq("user_id", state.session.user.id);

    if (error && !options.silent) throw error;
  }

  clearPartyState();
  if (!options.silent) render();
  if (!options.silent) setAccountStatus("Party left.", "ok");
}

async function loadPartyContext(options = {}) {
  if (!state.supabase || !state.session) return;

  const { data: ownMemberships, error: ownError } = await state.supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", state.session.user.id)
    .limit(1);

  if (ownError) throw ownError;
  const ownMembership = ownMemberships?.[0];
  if (!ownMembership) {
    const hadParty = Boolean(state.partySignature);
    clearPartyState({ keepTimer: true });
    if (hadParty || options.forceRender) render();
    return;
  }

  const { data: party, error: partyError } = await state.supabase
    .from("parties")
    .select("id, code")
    .eq("id", ownMembership.party_id)
    .single();

  if (partyError) throw partyError;

  const { data: memberships, error: membersError } = await state.supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", party.id);

  if (membersError) throw membersError;

  const userIds = (memberships || []).map((member) => member.user_id);
  const otherUserIds = userIds.filter((userId) => userId !== state.session.user.id);
  const profiles = await fetchProfiles(userIds);
  const preferences = await fetchPreferences(otherUserIds);

  const nextMembers = userIds.map((userId) => {
    const profile = profiles.get(userId);
    return {
      userId,
      username: profile?.username || "Party member",
      avatarDataUrl: profile?.avatar_data_url || "",
      favorites: new Set(preferences.get(userId)?.favorites || []),
    };
  });

  const nextSignature = createPartySignature(party, nextMembers);
  const changed = nextSignature !== state.partySignature;

  state.party = party;
  state.partyMembers = nextMembers;
  state.partySignature = nextSignature;
  rebuildPartyMemberIndex();
  renderPartyPanel();
  if (changed || options.forceRender) render();
}

async function fetchProfiles(userIds) {
  if (!userIds.length) return new Map();

  const { data, error } = await state.supabase
    .from("profiles")
    .select("user_id, username, avatar_url, avatar_data_url")
    .in("user_id", userIds);

  if (error) throw error;
  return new Map((data || []).map((profile) => [
    profile.user_id,
    {
      ...profile,
      avatar_data_url: profile.avatar_url || profile.avatar_data_url || "",
    },
  ]));
}

async function fetchPreferences(userIds) {
  if (!userIds.length) return new Map();

  const { data, error } = await state.supabase
    .from("timetable_preferences")
    .select("user_id, favorites")
    .in("user_id", userIds);

  if (error) throw error;
  return new Map((data || []).map((preferences) => [preferences.user_id, preferences]));
}

function rebuildPartyMemberIndex() {
  const nextMap = new Map();
  state.partyMembers
    .filter((member) => member.userId !== state.session?.user?.id)
    .forEach((member) => {
      member.favorites.forEach((eventId) => {
        if (!nextMap.has(eventId)) nextMap.set(eventId, []);
        nextMap.get(eventId).push(member);
      });
    });

  state.partyMembersByEvent = nextMap;
}

function createPartySignature(party, members) {
  const memberParts = members
    .map((member) => {
      const favorites = [...member.favorites].sort().join(".");
      return [
        member.userId,
        member.username,
        member.avatarDataUrl,
        favorites,
      ].join(":");
    })
    .sort();

  return `${party.id}:${party.code}:${memberParts.join("|")}`;
}

function renderPartyPanel() {
  if (!els.partySection) return;

  if (!state.party) {
    els.partyStatus.textContent = "No party joined yet.";
    els.partyMembers.innerHTML = "";
    els.partyLeave.hidden = true;
    return;
  }

  els.partyStatus.textContent = `Code: ${state.party.code}`;
  els.partyLeave.hidden = false;
  els.partyMembers.innerHTML = state.partyMembers.map((member) => `
    <span class="party-member-chip">
      ${renderAvatar("party-member-chip__avatar", member.username, member.avatarDataUrl)}
      <span>${escapeHtml(member.username)}</span>
    </span>
  `).join("");
}

function renderPartyAvatars(eventId) {
  const members = state.partyMembersByEvent.get(eventId) || [];
  if (!members.length) return "";

  const visible = members.slice(0, 4);
  const hiddenCount = members.length - visible.length;
  return `
    <div class="party-avatar-stack" aria-label="${members.length} party members want to see this set">
      ${hiddenCount > 0 ? `<span class="party-avatar-count">+${hiddenCount}</span>` : ""}
      ${visible.map((member) => renderAvatar("party-avatar", member.username, member.avatarDataUrl)).join("")}
    </div>
  `;
}

function renderAvatar(className, displayName, avatarDataUrl) {
  if (avatarDataUrl) {
    return `<span class="${className} has-image" title="${escapeAttr(displayName)}" style="background-image: url('${escapeAttr(avatarDataUrl)}')"></span>`;
  }

  return `<span class="${className}" title="${escapeAttr(displayName)}">${escapeHtml(getAvatarInitial(displayName))}</span>`;
}

function startPartyRefresh() {
  window.clearInterval(state.partyRefreshTimer);
  if (!state.session) return;

  state.partyRefreshTimer = window.setInterval(() => {
    loadPartyContext().catch((error) => {
      console.error(error);
    });
  }, 20000);
}

function clearPartyState(options = {}) {
  state.party = null;
  state.partyMembers = [];
  state.partyMembersByEvent = new Map();
  state.partySignature = "";
  if (!options.keepTimer) window.clearInterval(state.partyRefreshTimer);
  renderPartyPanel();
}

function normalizePartyCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

async function hydratePreferencesFromSupabase({ mergeLocal }) {
  if (!state.supabase || !state.session) return;

  const { data, error } = await state.supabase
    .from("timetable_preferences")
    .select("favorites, important")
    .eq("user_id", state.session.user.id)
    .maybeSingle();

  if (error) throw error;

  state.isRemoteHydrating = true;
  if (data) {
    const remoteFavorites = new Set(Array.isArray(data.favorites) ? data.favorites : []);
    const remoteImportant = new Set(Array.isArray(data.important) ? data.important : []);

    state.favorites = mergeLocal ? new Set([...remoteFavorites, ...state.favorites]) : remoteFavorites;
    state.important = mergeLocal ? new Set([...remoteImportant, ...state.important]) : remoteImportant;
  }

  saveLocalPreferences();
  render();
  state.isRemoteHydrating = false;
  await savePreferencesToSupabase();
}

function queueSupabaseSave() {
  if (state.isRemoteHydrating || !state.supabase || !state.session) return;

  window.clearTimeout(state.syncTimer);
  state.syncTimer = window.setTimeout(() => {
    savePreferencesToSupabase().catch((error) => {
      console.error(error);
      setAccountStatus("Local change saved, but cloud sync failed.", "error");
    });
  }, 350);
}

async function savePreferencesToSupabase() {
  if (!state.supabase || !state.session) return;

  const { error } = await state.supabase
    .from("timetable_preferences")
    .upsert({
      user_id: state.session.user.id,
      favorites: [...state.favorites],
      important: [...state.important],
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  setAccountStatus("Logged in. Your timetable is synced automatically.", "ok");
}

function updateAccountUi() {
  const loggedIn = Boolean(state.session);
  els.accountSubmit.hidden = loggedIn;
  els.accountLogout.hidden = !loggedIn;
  els.accountUsername.disabled = loggedIn;
  els.accountPassword.disabled = loggedIn;
  els.accountForm.classList.toggle("is-logged-in", loggedIn);
  els.accountButton.classList.toggle("is-logged-in", loggedIn);
  els.accountButton.setAttribute("aria-expanded", String(!els.accountDialog.hidden));
  els.profileSection.hidden = !loggedIn;
  els.partySection.hidden = !loggedIn;
  els.deleteAccountSection.hidden = !loggedIn;

  const displayName = loggedIn ? getAccountDisplayName() : "Account";
  els.accountButton.title = loggedIn ? `Logged in as ${displayName}` : "Open account";
  setAvatarElement(els.accountAvatar, displayName, getAvatarDataUrl());
  updateProfilePreview();
}

function setAccountBusy(busy) {
  els.accountSubmit.disabled = busy;
  els.accountLogout.disabled = busy;
  els.profileSave.disabled = busy;
  els.partyCreate.disabled = busy;
  els.partyJoin.disabled = busy;
  els.partyLeave.disabled = busy;
  els.deleteAccount.disabled = busy;
}

function setAccountStatus(message, tone) {
  if (!els.accountStatus) return;
  els.accountStatus.textContent = message;
  els.accountStatus.hidden = !message;
  els.accountStatus.classList.toggle("is-ok", tone === "ok");
  els.accountStatus.classList.toggle("is-error", tone === "error");
}

function getAccountDisplayName() {
  return state.profile?.username || getAuthUsername();
}

function getAuthUsername() {
  const user = state.session?.user;
  return user?.user_metadata?.username || user?.email?.split("@")[0] || "Account";
}

function getAvatarDataUrl() {
  return state.pendingAvatarDataUrl || state.profile?.avatarDataUrl || "";
}

function getAvatarInitial(name) {
  return String(name || "T").trim().charAt(0).toUpperCase() || "T";
}

function updateProfilePreview() {
  if (!els.profileSection) return;
  const displayName = getAccountDisplayName();
  const avatarDataUrl = getAvatarDataUrl();

  if (state.session) {
    els.profileUsername.value = displayName;
  }

  setAvatarElement(els.profileAvatarPreview, displayName, avatarDataUrl);
}

function setAvatarElement(element, displayName, avatarDataUrl) {
  if (!element) return;

  element.classList.toggle("has-image", Boolean(avatarDataUrl));
  if (avatarDataUrl) {
    element.textContent = "";
    element.style.backgroundImage = `url("${avatarDataUrl}")`;
  } else {
    element.textContent = getAvatarInitial(displayName);
    element.style.backgroundImage = "";
  }
}

function imageFileToAvatar(file) {
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowedTypes.has(file.type)) {
    return Promise.reject(new Error("Choose a PNG, JPEG or WebP image."));
  }

  if (file.size > MAX_AVATAR_FILE_SIZE) {
    return Promise.reject(new Error("Profile pictures can be at most 5 MB."));
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      image.onload = () => {
        if (image.width > MAX_AVATAR_DIMENSION || image.height > MAX_AVATAR_DIMENSION) {
          reject(new Error(`Profile pictures can be at most ${MAX_AVATAR_DIMENSION} x ${MAX_AVATAR_DIMENSION} pixels.`));
          return;
        }

        const size = 256;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const sourceSize = Math.min(image.width, image.height);
        const sourceX = Math.floor((image.width - sourceSize) / 2);
        const sourceY = Math.floor((image.height - sourceSize) / 2);

        canvas.width = size;
        canvas.height = size;
        context.fillStyle = "#101010";
        context.fillRect(0, 0, size, size);
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("This image could not be processed."));
            return;
          }
          if (blob.size > MAX_AVATAR_BLOB_SIZE) {
            reject(new Error("The processed profile picture is still too large."));
            return;
          }

          resolve({
            blob,
            previewDataUrl: canvas.toDataURL("image/jpeg", 0.78),
          });
        }, "image/jpeg", 0.78);
      };
      image.onerror = reject;
      image.src = String(reader.result);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadProfileAvatar(blob) {
  if (!state.supabase || !state.session) {
    throw new Error("Log in before uploading a profile picture.");
  }

  const path = `${state.session.user.id}/avatar.jpg`;
  const { error } = await state.supabase.storage
    .from("avatars")
    .upload(path, blob, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw error;

  const { data } = state.supabase.storage
    .from("avatars")
    .getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

function dataUrlToBlob(dataUrl) {
  const [metadata, encoded] = dataUrl.split(",");
  const mime = metadata.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function normalizeProfileUsername(value) {
  return String(value || "").trim().slice(0, MAX_USERNAME_LENGTH);
}

function render() {
  const day = getSelectedDay();
  if (!day) return;

  syncStageSelect(day);
  if (state.searchQuery) {
    renderSearchResults();
  } else {
    renderTimeline(day);
  }
  renderPersonalList();
  syncViewButtons();
}

function animateRender() {
  els.timeline.classList.add("is-changing");
  els.personalList.classList.add("is-changing");

  window.setTimeout(() => {
    render();
    requestAnimationFrame(() => {
      els.timeline.classList.remove("is-changing");
      els.personalList.classList.remove("is-changing");
      playContentEnterAnimation();
    });
  }, 150);
}

function playContentEnterAnimation() {
  if (!els.timeline || !els.personalList) return;

  requestAnimationFrame(() => {
    els.timeline.classList.add("is-entering");
    els.personalList.classList.add("is-entering");

    window.setTimeout(() => {
      els.timeline.classList.remove("is-entering");
      els.personalList.classList.remove("is-entering");
    }, 280);
  });
}

function syncStageSelect(day) {
  const current = state.selectedStage;
  const stages = getStagesInDisplayOrder(day.stages);
  const options = ['<option value="all">All stages</option>'].concat(
    stages.map((stage) => {
      const value = String(stage.stageIndex);
      const label = stage.host ? `${stage.stage} - ${stage.host}` : stage.stage;
      return `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`;
    })
  );
  els.stageSelect.innerHTML = options.join("");
  els.stageSelect.value = day.stages.some((stage) => String(stage.stageIndex) === current) ? current : "all";
  state.selectedStage = els.stageSelect.value;
}

function syncViewButtons() {
  els.viewModeButtons.forEach((button) => {
    const active = button.dataset.viewMode === state.viewMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderTimeline(day) {
  const stages = getVisibleStages(day);
  const events = stages.flatMap((stage) => stage.events);

  if (!stages.length || !events.length) {
    els.dayTitle.textContent = `${day.day} - 0 stages`;
    els.timeline.style.setProperty("--stage-count", "1");
    els.timeline.style.setProperty("--timeline-height", "480px");
    els.timeline.innerHTML = `<div class="empty-state"><strong>No sets found.</strong><span>Adjust your stage filter or personal timetable filter.</span></div>`;
    return;
  }

  const timedEvents = events.filter((event) => !event.isTimeTba);
  if (!timedEvents.length) {
    renderLineupTimeline(day, stages);
    return;
  }

  const minStart = Math.min(...timedEvents.map((event) => event.start));
  const maxEnd = Math.max(...timedEvents.map((event) => event.end));
  const startHour = Math.floor(minStart / 60) * 60;
  const endHour = Math.ceil(maxEnd / 60) * 60;
  const totalMinutes = Math.max(60, endHour - startHour);

  els.dayTitle.textContent = `${day.day} - ${stages.length} stages`;
  els.timeline.style.setProperty("--stage-count", String(Math.max(1, stages.length)));

  if (state.viewMode === "vertical") {
    renderVerticalTimeline(stages, startHour, endHour, totalMinutes);
  } else {
    renderHorizontalTimeline(stages, startHour, endHour, totalMinutes);
  }
}

function renderLineupTimeline(day, stages) {
  els.dayTitle.textContent = `${day.day} - ${stages.length} stages`;
  els.timeline.className = "timeline timeline--lineup";
  els.timeline.style.removeProperty("--timeline-height");
  els.timeline.style.removeProperty("--timeline-width");
  els.timeline.style.setProperty("--stage-count", String(Math.max(1, stages.length)));
  els.timeline.innerHTML = `
    <div class="lineup-grid">
      ${stages.map((stage) => {
        const visibleEvents = getVisibleEvents(stage);
        return `
          <section class="lineup-stage" style="--stage-color: ${stage.color}">
            <header class="lineup-stage__header">
              <strong>${escapeHtml(stage.stage)}</strong>
              ${stage.host ? `<span>${escapeHtml(stage.host)}</span>` : ""}
            </header>
            <div class="lineup-stage__sets">
              ${visibleEvents.map((event) => renderLineupEvent(event)).join("") || '<div class="empty-state"><strong>No selected sets.</strong></div>'}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderLineupEvent(event) {
  const selected = state.favorites.has(event.id);
  const important = state.important.has(event.id);

  return `
    <article class="set-card lineup-set-card ${selected ? "is-selected" : ""} ${important ? "is-important" : ""}" style="--stage-color: ${event.color}" data-event-id="${event.id}" data-toggle-selected="${event.id}" tabindex="0" role="button" aria-pressed="${selected}">
      ${renderImportantButton(event, important)}
      <div>
        <div class="set-time">TBA</div>
        <div class="set-artist">${escapeHtml(event.artist)}</div>
      </div>
      ${renderPartyAvatars(event.id)}
    </article>
  `;
}

function renderSearchResults() {
  const query = normalizeSearchText(state.searchQuery);
  const queryParts = query.split(/\s+/).filter(Boolean);
  const results = state.days.flatMap((day, dayIndex) => {
    return day.stages.flatMap((stage) => {
      return stage.events.map((event) => ({ event, dayIndex }));
    });
  }).filter(({ event }) => {
    const searchable = normalizeSearchText([
      event.artist,
      event.stage,
      event.host,
      event.day,
    ].join(" "));
    return queryParts.every((part) => searchable.includes(part));
  }).sort((a, b) => {
    return a.dayIndex - b.dayIndex
      || a.event.start - b.event.start
      || getStageRank(a.event.stage) - getStageRank(b.event.stage)
      || a.event.stageIndex - b.event.stageIndex;
  });

  els.dayTitle.textContent = `${results.length} search result${results.length === 1 ? "" : "s"}`;
  els.timeline.className = "timeline timeline--search";
  els.timeline.style.removeProperty("--timeline-height");
  els.timeline.style.removeProperty("--timeline-width");
  els.timeline.style.removeProperty("--stage-count");

  if (!results.length) {
    els.timeline.innerHTML = `
      <div class="empty-state search-empty">
        <strong>No sets found.</strong>
        <span>Try another act, stage or day.</span>
      </div>
    `;
    return;
  }

  els.timeline.innerHTML = `
    <div class="search-results">
      ${results.map(({ event }) => renderSearchResult(event)).join("")}
    </div>
  `;
}

function renderSearchResult(event) {
  const selected = state.favorites.has(event.id);
  const important = state.important.has(event.id);

  return `
    <article class="set-card search-result-card ${selected ? "is-selected" : ""} ${important ? "is-important" : ""}" style="--stage-color: ${event.color}" data-event-id="${event.id}" data-toggle-selected="${event.id}" tabindex="0" role="button" aria-pressed="${selected}">
      ${renderImportantButton(event, important)}
      <div class="search-result-card__content">
        <div class="set-time">${escapeHtml(event.day)} - ${escapeHtml(formatEventTimeRange(event))}</div>
        <div class="set-artist">${escapeHtml(event.artist)}</div>
        <div class="search-result-card__stage">${escapeHtml(event.stage)}${event.host ? ` - ${escapeHtml(event.host)}` : ""}</div>
      </div>
      ${renderPartyAvatars(event.id)}
    </article>
  `;
}

function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderVerticalTimeline(stages, startHour, endHour, totalMinutes) {
  const hourHeight = VERTICAL_HOUR_HEIGHT;
  const headerHeight = getVerticalHeaderHeight();
  const timelineHeight = Math.ceil((totalMinutes / 60) * hourHeight) + headerHeight;

  els.timeline.className = "timeline timeline--vertical";
  els.timeline.style.setProperty("--timeline-height", `${timelineHeight}px`);
  els.timeline.style.setProperty("--hour-height", `${hourHeight}px`);
  els.timeline.innerHTML = renderVerticalTimeRail(startHour, endHour) + stages.map((stage, index) => {
    const visibleEvents = getVisibleEvents(stage).filter((event) => !event.isTimeTba);
    const stageImage = getStageImagePath(state.selectedDay, stage.stage);
    const imageStyle = stageImage ? `; --stage-image: url('${escapeAttr(stageImage)}')` : "";
    const imageClass = stageImage ? " has-stage-image" : "";

    return `
      <div class="stage-lane" style="--stage-color: ${stage.color}; --lane-index: ${index}">
        <div class="stage-heading${imageClass}" style="${imageStyle}" aria-label="${escapeAttr(stage.stage)}${stage.host ? ` - ${escapeAttr(stage.host)}` : ""}">
          <strong>${escapeHtml(stage.stage)}</strong>
          <span>${escapeHtml(stage.host || currentFestival?.defaultHost || "Festival")}</span>
        </div>
        ${visibleEvents.map((event) => renderVerticalEvent(event, startHour)).join("")}
      </div>
    `;
  }).join("");
}

function renderHorizontalTimeline(stages, startHour, endHour, totalMinutes) {
  const hourWidth = HORIZONTAL_HOUR_WIDTH;
  const timelineWidth = Math.ceil((totalMinutes / 60) * hourWidth);

  els.timeline.className = "timeline timeline--horizontal";
  els.timeline.style.setProperty("--stage-count", String(Math.max(1, stages.length)));
  els.timeline.style.setProperty("--timeline-width", `${timelineWidth}px`);
  els.timeline.style.setProperty("--hour-width", `${hourWidth}px`);
  els.timeline.innerHTML = renderHorizontalTimeRail(startHour, endHour) + stages.map((stage, index) => {
    const visibleEvents = getVisibleEvents(stage).filter((event) => !event.isTimeTba);
    const stageImage = getStageImagePath(state.selectedDay, stage.stage);
    const imageStyle = stageImage ? `; --stage-image: url('${escapeAttr(stageImage)}')` : "";
    const imageClass = stageImage ? " has-stage-image" : "";

    return `
      <div class="horizontal-stage-label${imageClass}" style="--stage-color: ${stage.color}; --lane-index: ${index}${imageStyle}" aria-label="${escapeAttr(stage.stage)}${stage.host ? ` - ${escapeAttr(stage.host)}` : ""}">
        <strong>${escapeHtml(stage.stage)}</strong>
        <span>${escapeHtml(stage.host || currentFestival?.defaultHost || "Festival")}</span>
      </div>
      <div class="horizontal-stage-row" style="--stage-color: ${stage.color}; --lane-index: ${index}">
        ${visibleEvents.map((event) => renderHorizontalEvent(event, startHour)).join("")}
      </div>
    `;
  }).join("");
}

function getStageImagePath(dayName, stageName) {
  const normalizedDay = String(dayName).toLowerCase();
  const normalizedStage = normalizeStageName(stageName);

  if (normalizedDay === "sunday" && normalizedStage.startsWith("red")) {
    return CLOSING_RED_IMAGE_PATH;
  }

  if (normalizedStage.includes("blue night")) return STAGE_IMAGE_PATHS["blue night"];
  if (normalizedStage.includes("magenta night")) return STAGE_IMAGE_PATHS["magenta night"];
  if (normalizedStage.startsWith("uv")) return STAGE_IMAGE_PATHS.uv;

  const key = Object.keys(STAGE_IMAGE_PATHS).find((stageKey) => {
    return normalizedStage === stageKey || normalizedStage.startsWith(`${stageKey} `);
  });
  return key ? STAGE_IMAGE_PATHS[key] : "";
}

function getVisibleEvents(stage) {
  return state.favoritesOnly
    ? stage.events.filter((event) => state.favorites.has(event.id))
    : stage.events;
}

function renderVerticalTimeRail(startHour, endHour) {
  const headerHeight = getVerticalHeaderHeight();
  const labels = [];
  for (let minutes = startHour; minutes <= endHour; minutes += 60) {
    labels.push(`<span class="time-label" style="top: ${headerHeight + positionFor(minutes, startHour)}px">${formatMinutes(minutes)}</span>`);
  }
  return `<div class="time-rail">${labels.join("")}${renderCurrentTimeMarker("vertical", startHour, endHour)}</div>`;
}

function renderHorizontalTimeRail(startHour, endHour) {
  const labels = [];
  for (let minutes = startHour; minutes <= endHour; minutes += 60) {
    const first = minutes === startHour;
    labels.push(`<span class="horizontal-time-label ${first ? "is-first" : ""}" style="left: ${horizontalPositionFor(minutes, startHour)}px">${formatMinutes(minutes)}</span>`);
  }

  return `
    <div class="horizontal-corner">Stage</div>
    <div class="horizontal-time-rail">${labels.join("")}${renderCurrentTimeMarker("horizontal", startHour, endHour)}</div>
  `;
}

function renderCurrentTimeMarker(mode, startHour, endHour) {
  const now = getCurrentFestivalMinutes();
  if (now < startHour || now > endHour) return "";

  const label = formatMinutes(now);
  if (mode === "vertical") {
    const top = getVerticalHeaderHeight() + positionFor(now, startHour);
    return `
      <div class="current-time-marker current-time-marker--vertical" style="top: ${top}px">
        <span>${label}</span>
      </div>
    `;
  }

  const left = horizontalPositionFor(now, startHour);
  return `
    <div class="current-time-marker current-time-marker--horizontal" style="left: ${left}px">
      <span>${label}</span>
    </div>
  `;
}

function renderVerticalEvent(event, startHour) {
  const top = getVerticalHeaderHeight() + positionFor(event.start, startHour);
  const height = Math.max(42, ((event.end - event.start) / 60) * VERTICAL_HOUR_HEIGHT - 8);
  const selected = state.favorites.has(event.id);
  const important = state.important.has(event.id);

  return `
    <article class="set-card ${selected ? "is-selected" : ""} ${important ? "is-important" : ""}" style="top: ${top}px; height: ${height}px; --stage-color: ${event.color}" data-event-id="${event.id}" data-toggle-selected="${event.id}" tabindex="0" role="button" aria-pressed="${selected}">
      ${renderImportantButton(event, important)}
      <div>
        <div class="set-time">${escapeHtml(formatEventTimeRange(event))}</div>
        <div class="set-artist">${escapeHtml(event.artist)}</div>
      </div>
      ${renderPartyAvatars(event.id)}
    </article>
  `;
}

function renderHorizontalEvent(event, startHour) {
  const left = horizontalPositionFor(event.start, startHour);
  const width = Math.max(92, ((event.end - event.start) / 60) * HORIZONTAL_HOUR_WIDTH - 8);
  const selected = state.favorites.has(event.id);
  const important = state.important.has(event.id);

  return `
    <article class="set-card horizontal-set-card ${selected ? "is-selected" : ""} ${important ? "is-important" : ""}" style="left: ${left}px; width: ${width}px; --stage-color: ${event.color}" data-event-id="${event.id}" data-toggle-selected="${event.id}" tabindex="0" role="button" aria-pressed="${selected}">
      ${renderImportantButton(event, important)}
      <div>
        <div class="set-time">${escapeHtml(formatEventTimeRange(event))}</div>
        <div class="set-artist">${escapeHtml(event.artist)}</div>
      </div>
      ${renderPartyAvatars(event.id)}
    </article>
  `;
}

function renderImportantButton(event, important) {
  return `
    <button class="favorite-star ${important ? "is-active" : ""}" type="button" title="Do not miss" aria-label="Do not miss: ${escapeAttr(event.artist)}" aria-pressed="${important}" data-toggle-important="${event.id}">
      ★
    </button>
  `;
}

function renderPersonalList() {
  const day = getSelectedDay();
  const selected = (day?.stages || [])
    .flatMap((stage) => stage.events)
    .filter((event) => state.favorites.has(event.id))
    .sort((a, b) => {
      return a.start - b.start || getStageRank(a.stage) - getStageRank(b.stage) || a.stageIndex - b.stageIndex;
    });

  if (!selected.length) {
    els.personalList.innerHTML = `
      <div class="empty-state">
        <strong>No sets selected for ${escapeHtml(day?.day || "this day")}.</strong>
        <span>Tap a set on this day to add it.</span>
      </div>
    `;
    return;
  }

  const now = getCurrentFestivalMinutes();
  els.personalList.innerHTML = selected.map((event) => {
    const isLive = isEventLiveNow(event, now);
    return `
    <div class="personal-item ${state.important.has(event.id) ? "is-important" : ""} ${isLive ? "is-live" : ""}" style="--stage-color: ${event.color}">
      <span>${escapeHtml(event.day)} - ${escapeHtml(event.stage)}</span>
      <strong>${escapeHtml(event.artist)}</strong>
      <span>${escapeHtml(formatEventTimeRange(event))}</span>
      ${isLive ? '<span class="live-dot" aria-label="Live now"></span>' : ""}
    </div>
  `;
  }).join("");
}

function getSelectedDay() {
  return state.days.find((day) => day.day === state.selectedDay);
}

function formatEventTimeRange(event) {
  return event.isTimeTba ? "TBA" : `${event.time} - ${formatMinutes(event.end)}`;
}

function getVisibleStages(day) {
  return getStagesInDisplayOrder(day.stages)
    .filter((stage) => state.selectedStage === "all" || String(stage.stageIndex) === state.selectedStage)
    .filter((stage) => !state.favoritesOnly || stage.events.some((event) => state.favorites.has(event.id)));
}

function getStagesInDisplayOrder(stages) {
  return [...stages].sort((a, b) => {
    const rankA = getStageRank(a.stage);
    const rankB = getStageRank(b.stage);
    return rankA - rankB || a.stageIndex - b.stageIndex;
  });
}

function getStageRank(stageName) {
  const normalized = normalizeStageName(stageName);
  const exactRank = CUSTOM_STAGE_ORDER.indexOf(normalized);
  if (exactRank !== -1) return exactRank;

  const partialRank = CUSTOM_STAGE_ORDER.findIndex((stage) => {
    return normalized === stage || normalized.startsWith(`${stage} `);
  });

  return partialRank === -1 ? CUSTOM_STAGE_ORDER.length : partialRank;
}

function normalizeStageName(stageName) {
  return String(stageName)
    .toLowerCase()
    .replace(/\[[^\]]*]/g, "")
    .replace(/[—-].*$/g, "")
    .replace(/\bu\.?\s*v\.?\b/g, "uv")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toggleFavorite(id, trigger) {
  const wasFavorite = state.favorites.has(id);
  if (wasFavorite) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }

  persistFavorites();
  updateFavoriteDom(id, !wasFavorite, trigger);
  renderPersonalList();
}

function updateFavoriteDom(id, favorite, trigger) {
  const escapedId = window.CSS?.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
  const card = trigger?.closest(".set-card") || els.timeline.querySelector(`[data-event-id="${escapedId}"]`);
  if (!card) return;

  card.classList.toggle("is-selected", favorite);
  card.setAttribute("aria-pressed", String(favorite));
  card.classList.remove("is-clicked");
  void card.offsetWidth;
  card.classList.add("is-clicked");

  window.setTimeout(() => card.classList.remove("is-clicked"), 240);
}

function toggleImportant(id, trigger) {
  const wasImportant = state.important.has(id);
  if (wasImportant) {
    state.important.delete(id);
  } else {
    state.important.add(id);
  }

  persistImportant();
  updateImportantDom(id, !wasImportant, trigger);
  renderPersonalList();
}

function updateImportantDom(id, important, trigger) {
  const escapedId = window.CSS?.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
  const card = trigger?.closest(".set-card") || els.timeline.querySelector(`[data-event-id="${escapedId}"]`);
  if (!card) return;

  const star = card.querySelector("[data-toggle-important]");
  card.classList.toggle("is-important", important);

  if (star) {
    star.classList.toggle("is-active", important);
    star.setAttribute("aria-pressed", String(important));
    star.classList.remove("is-clicked");
    void star.offsetWidth;
    star.classList.add("is-clicked");
    window.setTimeout(() => star.classList.remove("is-clicked"), 240);
  }
}

function persistFavorites() {
  saveLocalPreferences();
  queueSupabaseSave();
}

function persistImportant() {
  saveLocalPreferences();
  queueSupabaseSave();
}

function saveLocalPreferences() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favorites]));
  localStorage.setItem(IMPORTANT_STORAGE_KEY, JSON.stringify([...state.important]));
}

function minutesFromTime(time) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return (hours < 6 ? hours + 24 : hours) * 60 + minutes;
}

function optionalMinutesFromTime(time) {
  if (!/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return minutesFromTime(time);
}

function getCurrentFestivalMinutes() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  return (hours < 6 ? hours + 24 : hours) * 60 + minutes;
}

function isEventLiveNow(event, now = getCurrentFestivalMinutes()) {
  return now >= event.start && now < event.end;
}

function formatMinutes(total) {
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function positionFor(minutes, startHour) {
  return ((minutes - startHour) / 60) * VERTICAL_HOUR_HEIGHT;
}

function getVerticalHeaderHeight() {
  return window.matchMedia("(max-width: 680px)").matches
    ? MOBILE_VERTICAL_HEADER_HEIGHT
    : VERTICAL_HEADER_HEIGHT;
}

function horizontalPositionFor(minutes, startHour) {
  return ((minutes - startHour) / 60) * HORIZONTAL_HOUR_WIDTH;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
