const STORAGE_KEY = "pathfind-google-progress-v1";

const ROADMAP = [
  {
    id: "resume",
    group: "foundation",
    title: "Resume repositioning",
    summary: "Metric-dense bullets before you apply",
    tasks: [
      { id: "resume-target", title: "Add target line for Data Analyst / BI Engineer", note: "SQL · Python · Analytics · Data Quality" },
      { id: "resume-pattern", title: "Rewrite bullets as Action + Scale + Tool + Outcome", note: "Defend every number in interview" },
      { id: "resume-8metrics", title: "Quantify at least 8 bullets", note: "Volume, speed, quality %, adoption, risk impact" },
      { id: "resume-trim", title: "De-emphasize non-transferable vendor tools", note: "Keep Money Guide to one mention max" },
      { id: "resume-linkedin", title: "Update LinkedIn headline for Analyst / BI signal", note: "Google-ready keywords" },
    ],
  },
  {
    id: "week-1-2",
    group: "weeks",
    title: "Weeks 1–2 · Foundation reset",
    summary: "Resume v2 + story bank + daily SQL",
    tasks: [
      { id: "w12-resume", title: "Ship resume v2 (1 page, metrics, keywords)" },
      { id: "w12-sql-daily", title: "Daily habit: 2 SQL problems + 1 story rewrite" },
      { id: "w12-stories", title: "Catalog EY / NAB / Citi / ICICI into interview stories" },
      { id: "w12-pitch", title: "Draft 30-second pitch for Analyst / BIE roles" },
    ],
  },
  {
    id: "week-3-4",
    group: "weeks",
    title: "Weeks 3–4 · SQL intensity",
    summary: "Timed Medium/Hard drills + early product cases",
    tasks: [
      { id: "w34-sql-volume", title: "Complete 10–12 SQL problems per week", note: "Joins, windows, CTEs, null traps" },
      { id: "w34-timed", title: "Run timed drills: 25 minutes, no autocomplete" },
      { id: "w34-datalemur", title: "Start DataLemur Google-tagged set" },
      { id: "w34-cases", title: "Practice 2 product / metrics cases per week", note: "Clarify → metrics → experiment → tradeoffs" },
    ],
  },
  {
    id: "week-5-6",
    group: "weeks",
    title: "Weeks 5–6 · Analytics + modeling",
    summary: "Metrics design, dimensional models, proof projects",
    tasks: [
      { id: "w56-metrics", title: "Metrics drills on Google products", note: "Ads, YouTube, Maps, Play" },
      { id: "w56-model", title: "Practice star/snowflake + SCD using your STTM experience" },
      { id: "w56-proj-recon", title: "Project: reconciliation / DQ toolkit (Python + SQL)" },
      { id: "w56-proj-funnel", title: "Project: funnel + retention notebook on public data" },
      { id: "w56-proj-anomaly", title: "Project: DQ anomaly detector + summary report" },
    ],
  },
  {
    id: "week-7-8",
    group: "weeks",
    title: "Weeks 7–8 · Mocks + applications",
    summary: "Timed mocks, referrals, warm-up interviews",
    tasks: [
      { id: "w78-sql-mocks", title: "Complete 4+ timed SQL mocks" },
      { id: "w78-beh-mocks", title: "Complete 2 full behavioral mocks" },
      { id: "w78-apply", title: "Apply on Google Careers + request referrals" },
      { id: "w78-warmup", title: "Book warm-up interviews at peer companies", note: "Amazon BI, Meta Analyst, Microsoft, etc." },
    ],
  },
  {
    id: "week-9-10",
    group: "weeks",
    title: "Weeks 9–10 · Polish weak spots",
    summary: "Mistake log, outreach, optional DE stretch",
    tasks: [
      { id: "w910-mistake-log", title: "Build personal SQL mistake log from misses" },
      { id: "w910-pipeline", title: "Optional: pipeline design lite for DE stretch", note: "Batch vs stream, idempotency, late data" },
      { id: "w910-outreach", title: "Message 5–10 Google Analysts / BIEs on LinkedIn" },
      { id: "w910-github", title: "Publish 2 GitHub projects with clean READMEs" },
    ],
  },
  {
    id: "week-11-12",
    group: "weeks",
    title: "Weeks 11–12 · Interview mode",
    summary: "Daily cadence until the loop",
    tasks: [
      { id: "w1112-daily", title: "Daily: timed SQL + 1 case + 1 STAR story" },
      { id: "w1112-why", title: "Lock “Why Google” answer to product impact + DQ craft" },
      { id: "w1112-questions", title: "Prepare questions for interviewers", note: "Stack, decision cadence, success metrics" },
      { id: "w1112-schedule", title: "Protect sleep and interview schedule discipline" },
    ],
  },
  {
    id: "skills-sql",
    group: "skills",
    title: "Tier 0 · SQL (must crack)",
    summary: "Google-hard SQL under time pressure",
    tasks: [
      { id: "sql-windows", title: "Window functions: ROW_NUMBER, RANK, LAG/LEAD, running totals" },
      { id: "sql-joins", title: "Self joins, anti-joins, multi-hop join reasoning" },
      { id: "sql-cte", title: "CTEs, deduping, gaps-and-islands, sessionization" },
      { id: "sql-nulls", title: "Null handling, WHERE vs HAVING, date/time edge cases" },
      { id: "sql-perf", title: "Explain why a query is slow at a conceptual level" },
    ],
  },
  {
    id: "skills-python",
    group: "skills",
    title: "Tier 0 · Python for analysts",
    summary: "Pandas fluency + automation storytelling",
    tasks: [
      { id: "py-pandas", title: "Pandas groupby / merge / reshape / missing data" },
      { id: "py-recon-story", title: "Polish reconciliation automation story with metrics" },
      { id: "py-complexity", title: "Talk O(n) vs nested loops on large frames" },
    ],
  },
  {
    id: "skills-product",
    group: "skills",
    title: "Tier 1 · Product sense & metrics",
    summary: "Ambiguous cases with clear structure",
    tasks: [
      { id: "prod-northstar", title: "North-star vs guardrail metrics" },
      { id: "prod-funnel", title: "Funnel, retention, engagement frameworks" },
      { id: "prod-ab", title: "A/B basics: significance, novelty, SRM" },
      { id: "prod-case-framework", title: "Case framework memorized and practiced out loud" },
    ],
  },
  {
    id: "skills-model",
    group: "skills",
    title: "Tier 1 · Data modeling",
    summary: "Whiteboard your migration experience",
    tasks: [
      { id: "model-star", title: "Star vs snowflake, facts & dimensions" },
      { id: "model-scd", title: "SCD Type 1 vs Type 2 tradeoffs" },
      { id: "model-events", title: "Event tables vs snapshot tables" },
      { id: "model-sttm", title: "Explain multi-hop STTM architecture clearly" },
    ],
  },
  {
    id: "skills-behavioral",
    group: "skills",
    title: "Tier 3 · Behavioral stories",
    summary: "STAR + metric for Googleyness",
    tasks: [
      { id: "beh-ownership", title: "Story: ownership / leadership without authority" },
      { id: "beh-ambiguity", title: "Story: navigating ambiguity" },
      { id: "beh-conflict", title: "Story: stakeholder or engineer conflict" },
      { id: "beh-defect", title: "Story: hard data defect debugging" },
      { id: "beh-pressure", title: "Story: regulatory / time pressure delivery" },
      { id: "beh-process", title: "Story: process improvement (parallel validation)" },
      { id: "beh-failure", title: "Story: failure and learning" },
      { id: "beh-influence", title: "Story: cross-team influence" },
    ],
  },
  {
    id: "checklist-90",
    group: "checklist",
    title: "90-day success checklist",
    summary: "Ship these before you call the cycle done",
    tasks: [
      { id: "c-resume", title: "Resume v2 with ≥8 quantified bullets" },
      { id: "c-sql80", title: "80+ SQL problems logged with mistake patterns" },
      { id: "c-cases15", title: "15+ product / metric cases practiced out loud" },
      { id: "c-star8", title: "8 STAR stories memorized with metrics" },
      { id: "c-github2", title: "2 GitHub projects live" },
      { id: "c-referrals5", title: "≥5 referrals requested" },
      { id: "c-apps10", title: "≥10 relevant roles applied (Google + peers)" },
      { id: "c-mocks6", title: "≥6 timed mocks completed" },
      { id: "c-pitch", title: "Clear pitch + Why Google answer ready" },
    ],
  },
];

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: {}, updatedAt: null };
    const parsed = JSON.parse(raw);
    return {
      completed: parsed.completed || {},
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { completed: {}, updatedAt: null };
  }
}

function saveProgress(state) {
  const payload = {
    completed: state.completed,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  state.updatedAt = payload.updatedAt;
  updateSavedLabel(state.updatedAt);
}

function updateSavedLabel(updatedAt) {
  const el = document.getElementById("last-saved");
  if (!el) return;
  if (!updatedAt) {
    el.textContent = "Progress saves in this browser";
    return;
  }
  const d = new Date(updatedAt);
  el.textContent = `Last saved ${d.toLocaleString()}`;
}

function allTasks() {
  return ROADMAP.flatMap((phase) => phase.tasks.map((task) => ({ ...task, phaseId: phase.id })));
}

function phaseProgress(phase, completed) {
  const done = phase.tasks.filter((t) => completed[t.id]).length;
  return { done, total: phase.tasks.length };
}

function findCurrentPhaseId(completed) {
  for (const phase of ROADMAP) {
    const { done, total } = phaseProgress(phase, completed);
    if (done < total) return phase.id;
  }
  return ROADMAP[ROADMAP.length - 1].id;
}

function setRing(percent) {
  const ring = document.getElementById("progress-ring");
  if (!ring) return;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (percent / 100) * circumference;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${offset}`;
}

function renderProgress(state) {
  const tasks = allTasks();
  const done = tasks.filter((t) => state.completed[t.id]).length;
  const total = tasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("progress-percent").textContent = String(percent);
  document.getElementById("progress-done").textContent = String(done);
  document.getElementById("progress-total").textContent = String(total);
  setRing(percent);
}

function chevronSvg() {
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 5.5L8 10l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderRoadmap(state, filter = "all") {
  const root = document.getElementById("roadmap");
  const currentId = findCurrentPhaseId(state.completed);

  root.innerHTML = ROADMAP.map((phase, index) => {
    const { done, total } = phaseProgress(phase, state.completed);
    const isCurrent = phase.id === currentId;
    const isOpen = state.open[phase.id] ?? isCurrent;
    const hidden = filter !== "all" && phase.group !== filter;

    const tasks = phase.tasks
      .map((task) => {
        const checked = Boolean(state.completed[task.id]);
        return `
          <label class="task ${checked ? "is-done" : ""}" data-task-id="${task.id}">
            <input type="checkbox" ${checked ? "checked" : ""} data-task="${task.id}" />
            <span>
              <p class="task-title">${task.title}</p>
              ${task.note ? `<p class="task-note">${task.note}</p>` : ""}
            </span>
          </label>
        `;
      })
      .join("");

    return `
      <article
        class="phase ${isOpen ? "is-open" : ""} ${isCurrent ? "is-current" : ""} ${hidden ? "is-hidden" : ""}"
        data-phase="${phase.id}"
        data-group="${phase.group}"
        style="animation-delay: ${index * 40}ms"
      >
        <button type="button" class="phase-head" data-toggle="${phase.id}" aria-expanded="${isOpen}">
          <div class="phase-titles">
            <h2>${phase.title}</h2>
            <p>${phase.summary}</p>
          </div>
          <div class="phase-stats">
            <span class="phase-count">${done}/${total}</span>
            <span class="chevron">${chevronSvg()}</span>
          </div>
        </button>
        <div class="phase-body">${tasks}</div>
      </article>
    `;
  }).join("");
}

function bindEvents(state) {
  const root = document.getElementById("roadmap");

  root.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle]");
    if (!toggle) return;
    const id = toggle.getAttribute("data-toggle");
    state.open[id] = !state.open[id];
    const phase = root.querySelector(`[data-phase="${id}"]`);
    if (!phase) return;
    phase.classList.toggle("is-open", state.open[id]);
    toggle.setAttribute("aria-expanded", String(state.open[id]));
  });

  root.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches("[data-task]")) return;
    const id = input.getAttribute("data-task");
    if (input.checked) state.completed[id] = true;
    else delete state.completed[id];
    saveProgress(state);
    renderProgress(state);

    const label = input.closest(".task");
    if (label) label.classList.toggle("is-done", input.checked);

    updatePhaseCounts(state);
  });

  document.querySelectorAll(".filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      const filter = btn.getAttribute("data-filter") || "all";
      document.querySelectorAll(".phase").forEach((phase) => {
        const group = phase.getAttribute("data-group");
        const hide = filter !== "all" && group !== filter;
        phase.classList.toggle("is-hidden", hide);
      });
    });
  });

  document.getElementById("reset-progress")?.addEventListener("click", () => {
    const ok = window.confirm("Reset all Pathfind progress on this device?");
    if (!ok) return;
    state.completed = {};
    saveProgress(state);
    const filter = document.querySelector(".filter.is-active")?.getAttribute("data-filter") || "all";
    renderRoadmap(state, filter);
    renderProgress(state);
  });

  document.getElementById("export-progress")?.addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify({ completed: state.completed, updatedAt: state.updatedAt, exportedAt: new Date().toISOString() }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pathfind-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("jump-current")?.addEventListener("click", (event) => {
    event.preventDefault();
    const currentId = findCurrentPhaseId(state.completed);
    state.open[currentId] = true;
    const el = document.querySelector(`[data-phase="${currentId}"]`);
    if (el) {
      el.classList.add("is-open");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function updatePhaseCounts(state) {
  ROADMAP.forEach((phase) => {
    const { done, total } = phaseProgress(phase, state.completed);
    const el = document.querySelector(`[data-phase="${phase.id}"] .phase-count`);
    if (el) el.textContent = `${done}/${total}`;
    const article = document.querySelector(`[data-phase="${phase.id}"]`);
    if (!article) return;
    const currentId = findCurrentPhaseId(state.completed);
    article.classList.toggle("is-current", phase.id === currentId);
  });
}

function init() {
  const saved = loadProgress();
  const currentId = findCurrentPhaseId(saved.completed);
  const state = {
    completed: saved.completed,
    updatedAt: saved.updatedAt,
    open: Object.fromEntries(ROADMAP.map((p) => [p.id, p.id === currentId])),
  };

  updateSavedLabel(state.updatedAt);
  renderRoadmap(state, "all");
  renderProgress(state);
  bindEvents(state);
}

init();
