const state = {
  user: null,
  profile: null,
  opportunities: [],
  recentSearches: [],
  view: "dashboard",
  authMode: "login",
  statusFilter: "all",
  aiAvailable: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  authView: $("#authView"),
  appView: $("#appView"),
  authForm: $("#authForm"),
  authName: $("#authName"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  authSubmit: $("#authSubmit"),
  authError: $("#authError"),
  nameField: $("#nameField"),
  logoutBtn: $("#logoutBtn"),
  identityName: $("#identityName"),
  identityEmail: $("#identityEmail"),
  avatar: $("#avatar"),
  aiState: $("#aiState"),
  sectionTitle: $("#sectionTitle"),
  sectionEyebrow: $("#sectionEyebrow"),
  dashboard: $("#view-dashboard"),
  discoverResults: $("#discoverResults"),
  searchForm: $("#searchForm"),
  searchQuery: $("#searchQuery"),
  searchBtn: $("#searchBtn"),
  searchState: $("#searchState"),
  applicationList: $("#applicationList"),
  profileForm: $("#profileForm"),
  profileSaved: $("#profileSaved"),
  cvFile: $("#cvFile"),
  uploadCvBtn: $("#uploadCvBtn"),
  cvStatus: $("#cvStatus"),
  dialog: $("#opportunityDialog"),
  dialogBody: $("#dialogBody"),
  dialogClose: $("#dialogClose"),
  toast: $("#toast"),
};

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const response = await fetch(path, { ...options, headers, body, credentials: "same-origin" });
  if (response.status === 401) {
    showAuth();
    throw new Error("Your session expired. Sign in again.");
  }
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    throw new Error(data?.detail || `Request failed (${response.status})`);
  }
  return data;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { els.toast.hidden = true; }, 2600);
}

function setBusy(button, busy, label = "Working…") {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function truncate(value = "", max = 180) {
  const clean = String(value || "").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function splitCSV(value) {
  return String(value || "").split(",").map(v => v.trim()).filter(Boolean);
}

function showAuth() {
  state.user = null;
  els.appView.hidden = true;
  els.authView.hidden = false;
}

function showApp() {
  els.authView.hidden = true;
  els.appView.hidden = false;
}

async function bootstrap() {
  try {
    const me = await api("/api/me");
    state.user = me.user;
    state.profile = me.profile;
    showApp();
    hydrateIdentity();
    await refreshDashboard();
    fillProfileForm();
    await checkAI();
    route(location.hash.replace("#", "") || "dashboard");
  } catch {
    showAuth();
    await checkAI(false);
  }
}

function hydrateIdentity() {
  const name = state.profile?.full_name || state.user?.display_name || "Student";
  els.identityName.textContent = name;
  els.identityEmail.textContent = state.user?.email || "";
  els.avatar.textContent = name.trim().charAt(0).toUpperCase() || "U";
}

async function checkAI(render = true) {
  try {
    const health = await fetch("/api/health").then(r => r.json());
    state.aiAvailable = Boolean(health.ai_available);
  } catch {
    state.aiAvailable = false;
  }
  if (!render || !els.aiState) return;
  els.aiState.classList.toggle("ready", state.aiAvailable);
  els.aiState.classList.toggle("warn", !state.aiAvailable);
  $("small", els.aiState).textContent = state.aiAvailable ? "Local model online" : "Fallback mode";
}

function route(view) {
  const allowed = ["dashboard", "discover", "applications", "profile"];
  state.view = allowed.includes(view) ? view : "dashboard";
  location.hash = state.view;

  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${state.view}`));
  $$(".nav-item[data-view]").forEach(b => {
    const active = b.dataset.view === state.view;
    b.classList.toggle("active", active);
    active ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
  });

  const titles = {
    dashboard: ["Dashboard", "Your scholarship workspace"],
    discover: ["Discover", "Research new opportunities"],
    applications: ["Applications", "Track every step"],
    profile: ["Profile & CV", "Your reusable application context"],
  };
  els.sectionTitle.textContent = titles[state.view][0];
  els.sectionEyebrow.textContent = titles[state.view][1];

  if (state.view === "dashboard") renderDashboard();
  if (state.view === "applications") renderApplications();
  if (state.view === "profile") fillProfileForm();
}

function renderDashboard() {
  const items = state.opportunities || [];
  const stats = {
    opportunities: items.length,
    saved: items.filter(x => x.tracking?.saved).length,
    preparing: items.filter(x => ["preparing", "applying"].includes(x.tracking?.status)).length,
    applied: items.filter(x => x.tracking?.status === "applied").length,
  };
  const top = items.slice(0, 4);
  const profile = state.profile || {};
  const completeness = [
    profile.full_name, profile.nationality, profile.degree, profile.university,
    profile.cgpa, (profile.fields || []).length, profile.has_cv,
  ].filter(Boolean).length;
  const profilePct = Math.round((completeness / 7) * 100);

  els.dashboard.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${stats.opportunities}</b><span>Opportunities researched</span></div>
      <div class="stat"><b>${stats.saved}</b><span>Saved targets</span></div>
      <div class="stat"><b>${stats.preparing}</b><span>Preparing / applying</span></div>
      <div class="stat"><b>${stats.applied}</b><span>Submitted applications</span></div>
    </div>

    <div class="section-row">
      <div><h2>Best current matches</h2><p>Ranked by your stored fit analysis, not admission probability.</p></div>
      <button class="btn secondary" type="button" data-go="discover">Research scholarships</button>
    </div>
    <div class="opportunity-grid">
      ${top.length ? top.map(renderCard).join("") : `
        <div class="empty">No researched scholarships yet. Complete your profile, upload your CV, then start with MEXT or a broad fully funded master's search.</div>
      `}
    </div>

    <div class="section-row">
      <div><h2>Profile readiness</h2><p>Your profile is reused for every discovery and fit analysis.</p></div>
      <b style="font-size:13px">${profilePct}% complete</b>
    </div>
    <div class="panel">
      <div style="height:8px;background:var(--surface-2);border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${profilePct}%;background:var(--ink);border-radius:inherit"></div>
      </div>
      <div class="section-row compact" style="margin-top:14px;margin-bottom:0">
        <p>${profile.has_cv ? `CV loaded: ${escapeHTML(profile.cv_filename || "uploaded CV")}` : "Upload your CV to improve automatic profile extraction and fit analysis."}</p>
        <button class="btn secondary" type="button" data-go="profile">${profile.has_cv ? "Review profile" : "Add CV"}</button>
      </div>
    </div>

    <div class="section-row">
      <div><h2>Recent research</h2><p>Your previous scholarship searches are stored with your account.</p></div>
    </div>
    <div class="panel recent-searches">
      ${state.recentSearches?.length ? state.recentSearches.map(s => `
        <button type="button" class="recent-search" data-repeat-query="${escapeHTML(s.query)}" style="border-left:0;border-right:0;border-top:0;background:transparent;width:100%;text-align:left;cursor:pointer">
          <b>${escapeHTML(s.query)}</b><span>${s.result_count} results</span>
        </button>`).join("") : '<div class="empty">No research history yet.</div>'}
    </div>
  `;
}

function renderCard(item) {
  const tracking = item.tracking || {};
  const fit = Math.round(Number(tracking.fit_score || 0));
  const status = tracking.status || "discovered";
  return `
    <article class="op-card">
      <div class="op-top">
        <div>
          <div class="op-title">${escapeHTML(item.title)}</div>
          <div class="op-provider">${escapeHTML(item.provider || item.source_domain || "Public web source")}</div>
        </div>
        <div class="fit"><b>${fit}</b><small>fit / 100</small></div>
      </div>
      <div class="tags">
        ${item.country ? `<span class="tag">${escapeHTML(item.country)}</span>` : ""}
        ${item.degree_level ? `<span class="tag">${escapeHTML(item.degree_level)}</span>` : ""}
        ${item.deadline ? `<span class="tag">Deadline: ${escapeHTML(truncate(item.deadline, 60))}</span>` : ""}
      </div>
      <div class="op-desc">${escapeHTML(tracking.fit_summary || item.description || "Open the opportunity to review the source and eligibility details.")}</div>
      <div class="op-meta">
        <div class="meta-box"><small>Funding</small><b>${escapeHTML(truncate(item.funding || "Verify source", 80))}</b></div>
        <div class="meta-box"><small>Status</small><b>${escapeHTML(status)}</b></div>
      </div>
      <div class="op-actions">
        <button class="btn secondary" type="button" data-open-op="${item.id}">Details</button>
        <button class="btn secondary" type="button" data-save-op="${item.id}">${tracking.saved ? "Unsave" : "Save"}</button>
        <select class="status-select" data-status-op="${item.id}" aria-label="Application status for ${escapeHTML(item.title)}">
          ${["discovered","saved","preparing","applying","applied","interview","awarded","rejected","archived"].map(x => `<option value="${x}" ${x === status ? "selected" : ""}>${x[0].toUpperCase()+x.slice(1)}</option>`).join("")}
        </select>
      </div>
    </article>
  `;
}

function renderApplications() {
  let items = [...(state.opportunities || [])];
  if (state.statusFilter === "saved") items = items.filter(x => x.tracking?.saved);
  else if (state.statusFilter !== "all") items = items.filter(x => x.tracking?.status === state.statusFilter);
  els.applicationList.innerHTML = items.length ? items.map(renderCard).join("") : '<div class="empty">No scholarships match this pipeline filter.</div>';
}

async function refreshDashboard() {
  const data = await api("/api/dashboard");
  state.profile = data.profile;
  state.opportunities = data.opportunities || [];
  state.recentSearches = data.recent_searches || [];
  state.aiAvailable = Boolean(data.ai_available);
  hydrateIdentity();
  renderDashboard();
  renderApplications();
}

function fillProfileForm() {
  if (!state.profile || !els.profileForm) return;
  const p = state.profile;
  const mapping = {
    full_name: p.full_name,
    nationality: p.nationality,
    residence_country: p.residence_country,
    degree: p.degree,
    university: p.university,
    cgpa: p.cgpa,
    graduation_year: p.graduation_year,
    fields: (p.fields || []).join(", "),
    skills: (p.skills || []).join(", "),
    target_countries: (p.target_countries || []).join(", "),
    english_test: p.english_test,
    notes: p.notes,
  };
  Object.entries(mapping).forEach(([name, value]) => {
    const input = els.profileForm.elements.namedItem(name);
    if (input) input.value = value || "";
  });
  els.cvStatus.textContent = p.has_cv ? `Current CV: ${p.cv_filename}` : "No CV uploaded yet.";
}

async function saveProfile(event) {
  event.preventDefault();
  const form = new FormData(els.profileForm);
  const payload = Object.fromEntries(form.entries());
  payload.fields = splitCSV(payload.fields);
  payload.skills = splitCSV(payload.skills);
  payload.target_countries = splitCSV(payload.target_countries);
  try {
    const button = $('button[type="submit"]', els.profileForm);
    setBusy(button, true, "Saving…");
    state.profile = await api("/api/profile", { method: "PUT", body: payload });
    hydrateIdentity();
    els.profileSaved.textContent = "Saved";
    els.profileSaved.style.color = "var(--success)";
    showToast("Profile saved");
  } catch (error) {
    els.profileSaved.textContent = "Save failed";
    els.profileSaved.style.color = "var(--danger)";
    showToast(error.message);
  } finally {
    setBusy($('button[type="submit"]', els.profileForm), false);
  }
}

async function uploadCV() {
  const file = els.cvFile.files?.[0];
  if (!file) {
    els.cvStatus.textContent = "Choose a CV first.";
    return;
  }
  const body = new FormData();
  body.append("file", file);
  try {
    setBusy(els.uploadCvBtn, true, "Analyzing…");
    els.cvStatus.textContent = "Extracting CV text and analyzing your profile…";
    const data = await api("/api/profile/cv", { method: "POST", body });
    state.profile = data.profile;
    fillProfileForm();
    hydrateIdentity();
    els.cvStatus.textContent = `Analyzed ${data.text_chars.toLocaleString()} characters. ${data.ai_available ? "Local AI extraction completed." : "AI was offline; heuristic extraction was used."}`;
    showToast("CV analyzed and profile updated");
    await refreshDashboard();
  } catch (error) {
    els.cvStatus.textContent = error.message;
  } finally {
    setBusy(els.uploadCvBtn, false);
  }
}

async function runSearch(query) {
  if (!query || query.trim().length < 2) return;
  state.view = "discover";
  route("discover");
  els.searchQuery.value = query;
  els.searchState.innerHTML = '<div class="search-status"><span class="spinner"></span><span>Researching public scholarship sources, extracting details and analyzing fit…</span></div>';
  els.discoverResults.innerHTML = "";
  setBusy(els.searchBtn, true, "Researching…");
  try {
    const data = await api("/api/discovery/search", {
      method: "POST",
      body: { query: query.trim(), max_fit_analysis: 8 },
    });
    state.aiAvailable = Boolean(data.ai_available);
    els.searchState.innerHTML = `<div class="search-status"><span>Found ${data.count} opportunities. Verify final eligibility, funding and deadlines on each official source.</span></div>`;
    els.discoverResults.innerHTML = data.results.length ? data.results.map(renderCard).join("") : '<div class="empty">No usable public results were found. Try a more specific scholarship name, country, field or year.</div>';
    await refreshDashboard();
    await checkAI();
  } catch (error) {
    els.searchState.innerHTML = `<div class="form-error">${escapeHTML(error.message)}</div>`;
  } finally {
    setBusy(els.searchBtn, false);
  }
}

function findOpportunity(id) {
  return state.opportunities.find(x => Number(x.id) === Number(id));
}

async function patchOpportunity(id, patch) {
  const updated = await api(`/api/scholarships/${id}`, { method: "PATCH", body: patch });
  const index = state.opportunities.findIndex(x => Number(x.id) === Number(id));
  if (index >= 0) state.opportunities[index] = updated;
  else state.opportunities.unshift(updated);
  renderDashboard();
  renderApplications();
  return updated;
}

function openOpportunity(id) {
  const item = findOpportunity(id);
  if (!item) return;
  const t = item.tracking || {};
  const checklist = t.checklist || [];
  els.dialogBody.innerHTML = `
    <div class="dialog-body">
      <p class="eyebrow">${escapeHTML(item.country || item.source_domain || "Scholarship opportunity")}</p>
      <h2>${escapeHTML(item.title)}</h2>
      <p class="dialog-copy">${escapeHTML(item.provider || "")}</p>
      <div class="dialog-grid">
        <div class="meta-box"><small>Profile fit</small><b>${Math.round(Number(t.fit_score || 0))}/100</b></div>
        <div class="meta-box"><small>Deadline</small><b>${escapeHTML(item.deadline || "Verify source")}</b></div>
        <div class="meta-box"><small>Funding</small><b>${escapeHTML(item.funding || "Verify source")}</b></div>
        <div class="meta-box"><small>Degree</small><b>${escapeHTML(item.degree_level || "Not extracted")}</b></div>
      </div>
      <h3>Fit analysis</h3>
      <p class="dialog-copy">${escapeHTML(t.fit_summary || "Run analysis to generate a profile-specific assessment.")}</p>
      ${(t.strengths || []).length ? `<h3>Strengths</h3><ul class="list">${t.strengths.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>` : ""}
      ${(t.gaps || []).length ? `<h3>Eligibility / evidence gaps</h3><ul class="list">${t.gaps.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>` : ""}
      <h3>Application checklist</h3>
      <div class="checklist">
        ${checklist.length ? checklist.map((x, i) => `<label class="check-item"><input type="checkbox" data-check-index="${i}" ${x.done ? "checked" : ""}><span>${escapeHTML(x.label || String(x))}</span></label>`).join("") : '<div class="empty">No checklist generated yet.</div>'}
      </div>
      <h3>Source evidence</h3>
      <p class="dialog-copy">${escapeHTML(item.eligibility || item.description || "Review the linked source for complete requirements.")}</p>
      <div class="op-actions">
        <a class="btn primary" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>
        <button class="btn secondary" type="button" data-reanalyze="${item.id}">Re-analyze fit</button>
      </div>
    </div>
  `;
  els.dialog.dataset.id = String(id);
  els.dialog.showModal();
}

async function updateChecklist(input) {
  const id = Number(els.dialog.dataset.id);
  const item = findOpportunity(id);
  if (!item) return;
  const checklist = structuredClone(item.tracking?.checklist || []);
  const index = Number(input.dataset.checkIndex);
  if (!checklist[index]) return;
  checklist[index].done = input.checked;
  const updated = await patchOpportunity(id, { checklist });
  openOpportunity(updated.id);
}

async function reanalyze(id, button) {
  try {
    setBusy(button, true, "Analyzing…");
    const updated = await api(`/api/scholarships/${id}/analyze`, { method: "POST" });
    const index = state.opportunities.findIndex(x => Number(x.id) === Number(id));
    if (index >= 0) state.opportunities[index] = updated;
    openOpportunity(id);
    renderDashboard();
    renderApplications();
    showToast("Fit analysis refreshed");
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
}

$$("[data-auth-mode]").forEach(button => button.addEventListener("click", () => {
  state.authMode = button.dataset.authMode;
  $$("[data-auth-mode]").forEach(x => x.classList.toggle("active", x === button));
  els.nameField.hidden = state.authMode !== "register";
  els.authPassword.autocomplete = state.authMode === "register" ? "new-password" : "current-password";
  els.authSubmit.textContent = state.authMode === "register" ? "Create account" : "Sign in";
  els.authError.hidden = true;
}));

els.authForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.authError.hidden = true;
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || password.length < 10) {
    els.authError.textContent = "Enter a valid email and a password of at least 10 characters.";
    els.authError.hidden = false;
    return;
  }
  try {
    setBusy(els.authSubmit, true, state.authMode === "register" ? "Creating…" : "Signing in…");
    const endpoint = state.authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const body = { email, password };
    if (state.authMode === "register") body.display_name = els.authName.value.trim();
    await api(endpoint, { method: "POST", body });
    const me = await api("/api/me");
    state.user = me.user;
    state.profile = me.profile;
    showApp();
    hydrateIdentity();
    fillProfileForm();
    await refreshDashboard();
    await checkAI();
    route("dashboard");
  } catch (error) {
    els.authError.textContent = error.message;
    els.authError.hidden = false;
  } finally {
    setBusy(els.authSubmit, false);
  }
});

els.logoutBtn.addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } catch {}
  showAuth();
});

$$(".nav-item[data-view]").forEach(button => button.addEventListener("click", () => route(button.dataset.view)));
els.profileForm.addEventListener("submit", saveProfile);
els.uploadCvBtn.addEventListener("click", uploadCV);

els.cvFile.addEventListener("change", () => {
  const file = els.cvFile.files?.[0];
  els.cvStatus.textContent = file ? `Selected: ${file.name}` : "No CV selected.";
});

els.searchForm.addEventListener("submit", event => {
  event.preventDefault();
  runSearch(els.searchQuery.value);
});

$$("[data-query]").forEach(button => button.addEventListener("click", () => runSearch(button.dataset.query)));

$("#applicationFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-status-filter]");
  if (!button) return;
  state.statusFilter = button.dataset.statusFilter;
  $$("#applicationFilters .filter").forEach(x => x.classList.toggle("active", x === button));
  renderApplications();
});

document.addEventListener("click", async event => {
  const go = event.target.closest("[data-go]");
  if (go) { route(go.dataset.go); return; }

  const repeat = event.target.closest("[data-repeat-query]");
  if (repeat) { runSearch(repeat.dataset.repeatQuery); return; }

  const open = event.target.closest("[data-open-op]");
  if (open) { openOpportunity(open.dataset.openOp); return; }

  const save = event.target.closest("[data-save-op]");
  if (save) {
    const item = findOpportunity(save.dataset.saveOp);
    if (!item) return;
    try {
      const next = !item.tracking?.saved;
      await patchOpportunity(item.id, { saved: next, status: next && item.tracking?.status === "discovered" ? "saved" : item.tracking?.status });
      showToast(next ? "Scholarship saved" : "Scholarship unsaved");
    } catch (error) { showToast(error.message); }
    return;
  }

  const analyze = event.target.closest("[data-reanalyze]");
  if (analyze) { reanalyze(analyze.dataset.reanalyze, analyze); }
});

document.addEventListener("change", async event => {
  const select = event.target.closest("[data-status-op]");
  if (select) {
    try { await patchOpportunity(select.dataset.statusOp, { status: select.value, saved: select.value === "saved" ? true : undefined }); showToast("Application status saved"); }
    catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.matches("[data-check-index]")) {
    try { await updateChecklist(event.target); showToast("Checklist saved"); }
    catch (error) { showToast(error.message); }
  }
});

els.dialogClose.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", event => { if (event.target === els.dialog) els.dialog.close(); });
window.addEventListener("hashchange", () => { if (state.user) route(location.hash.replace("#", "")); });

bootstrap();
