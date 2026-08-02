# Google Interview Path — Ananta Kumar Mohanta

Tailored to your resume: ~8 years in banking data analytics, migration, governance, SQL/Python automation, Power BI/Tableau, Azure/AWS/Databricks.

---

## 1. Honest Fit Assessment

### What works in your favor
- **Domain depth**: Banking, risk, fraud, regulatory, data quality — Google values analysts who can reason about messy real-world data.
- **SQL + Python automation**: Core hiring signal for Google Data Analyst / BI Engineer / Data Engineer tracks.
- **Migration & reconciliation**: Shows systems thinking, debugging, and ownership — strong “Googleyness” evidence.
- **Stakeholder translation**: Bridging business ↔ tech is exactly what Analytics roles need.
- **Scale exposure**: Parallel processing, large-scale validation, multi-hop STTM architectures.

### Gaps vs Google bar
| Gap | Why it matters | Fix |
|-----|----------------|-----|
| No branded “product / impact metrics” | Google resumes are metric-heavy | Quantify rows processed, defect reduction %, latency, coverage |
| Weak CS fundamentals story | Even analyst roles probe problem-solving | Add DSA practice + complexity talk |
| Limited distributed systems / pipeline design | Needed for Data Engineer | Study ETL patterns, BigQuery, Airflow, streaming |
| No public / open-source footprint | Helps credibility | Small GitHub projects (SQL + Python + dashboard) |
| India location + Google India competition | High bar, fewer seats | Target Google India + remote-friendly teams; consider contractors/vendors as entry |
| Title lean (Analyst/Consultant) | SWE/DE roles expect “Engineer” signal | Position as **Data Analyst / Analytics Engineer**; don’t apply SWE L4 cold |

### Realistic target roles (priority order)
1. **Data Analyst / Business Intelligence Engineer (BIE)** — best match
2. **Analytics Engineer / Data Engineer (entry–mid)** — stretch if you upskill pipelines
3. **Technical Solutions / Data Governance–adjacent** — niche, fewer openings
4. **Software Engineer** — not recommended as primary path without 6–12 months full DSA rebuild

Aim: **Google India (Hyderabad / Bangalore) — Data Analyst / BIE**, or similar at Alphabet (YouTube, Google Cloud, Ads, Finance).

---

## 2. Resume Repositioning (before you apply)

Rewrite bullets in this pattern:

> **Action + Scale + Tool + Business outcome**

### Before → After examples
- ❌ “Automated large-scale data validation using Python”
- ✅ “Built Python parallel validation covering **X tables / YM rows**, cutting migration defect turnaround from **N days → M hours**”

- ❌ “Built Power BI dashboards for data quality”
- ✅ “Designed DQ dashboards monitoring **accuracy/completeness/validity** across **N domains**, used by **stakeholders** to prioritize remediation”

### Add a top “Target” line
`Targeting: Data Analyst / BI Engineer roles | SQL · Python · Analytics · Data Quality`

### Quantify at least 8 bullets
Pick numbers you can defend in interview:
- Volume (rows, tables, feeds)
- Speed (runtime, parallel speedup)
- Quality (defect rate, reconciliation match %)
- Adoption (users, refresh cadence)
- Risk/compliance impact (reports delivered, issues caught)

### Trim / de-emphasize
- Vendor tool names that don’t transfer (Money Guide) — keep one mention max
- Generic BAU language — reframe as ownership of reliability SLAs

---

## 3. Google Interview Loop (Data Analyst / BIE)

Typical stages:

1. **Recruiter screen** (30 min) — role fit, timeline, level, motivation
2. **Technical phone / virtual** (45–60 min) — SQL + sometimes light Python
3. **Onsite / virtual loop** (4–5 interviews)
   - SQL (hard)
   - Product / analytics case
   - Data modeling / pipeline reasoning
   - Behavioral (“Googleyness”)
   - Sometimes Python scripting or dashboard critique
4. **Hiring committee + team matching**

### What “passing” looks like
- Write correct, efficient SQL under time pressure (joins, window functions, CTEs, edge cases)
- Structure ambiguous product questions (clarify → metrics → experiment → tradeoffs)
- Explain past work with **impact**, not task lists
- Show intellectual humility + clear communication

---

## 4. Skills Roadmap by Priority

### Tier 0 — Must crack (weeks 1–6)
**SQL (Google-hard)**
- Joins (self, anti, multi), CTEs, window functions (`ROW_NUMBER`, `RANK`, `LAG/LEAD`, running totals)
- Aggregation + filtering traps (`WHERE` vs `HAVING`)
- Deduping, gaps-and-islands, sessionization patterns
- Date/time logic, null handling, data quality checks in SQL
- Query reasoning: “why is this slow?” at a conceptual level

**Practice sources**
- Mode SQL tutorials → LeetCode SQL (Medium/Hard) → StrataScratch / DataLemur (Google-tagged)
- Write every solution with edge cases stated out loud

**Python for analysts**
- Pandas: groupby, merge, reshape, missing data
- Scripts for validation/reconciliation (you already have this — polish storytelling)
- Basic complexity awareness (`O(n)` vs nested loops on large frames)

### Tier 1 — Role closers (weeks 4–10)
**Product sense & metrics**
- North-star vs guardrail metrics
- Funnel, retention, engagement, A/B test basics (significance, novelty, SRM)
- Case framework: goal → users → metrics → diagnosis → experiment → rollout

**Data modeling**
- Star vs snowflake, fact/dimension, SCD Type 1/2
- Event tables vs snapshot tables
- Your STTM experience maps well — practice explaining multi-hop architectures on a whiteboard

**Visualization judgment**
- Chart choice, misleading axes, dashboard hierarchy
- Critique a bad dashboard in 5 minutes

### Tier 2 — Stretch for Data Engineer (parallel track if aiming DE)
- BigQuery fundamentals, partitioning/clustering concepts
- Airflow / orchestration mental model
- Batch vs streaming; idempotency; late data
- System design lite: “design a pipeline for X”

### Tier 3 — Behavioral (ongoing)
Use **STAR + metric** for every story. Prepare 8 stories mapped to Google attributes:
1. Leadership / ownership
2. Navigating ambiguity
3. Conflict with stakeholder or engineer
4. Debugging a hard data defect
5. Delivering under regulatory/time pressure
6. Improving a process (your Python parallel validation)
7. Failure / learning
8. Cross-team influence without authority

---

## 5. 12-Week Execution Plan

### Weeks 1–2 — Foundation reset
- Rebuild resume (1 page, metrics, Google keywords)
- LinkedIn headline: Data Analyst | SQL · Python · Banking Analytics → Google-ready
- Daily: 2 SQL problems + 1 story rewrite
- Catalog your EY/NAB/Citi/ICICI projects into interview stories

### Weeks 3–4 — SQL intensity
- 10–12 SQL problems/week (mix Medium/Hard)
- Timed drills: 25 minutes per problem, no IDE autocomplete
- Start DataLemur “Google” set
- 2 mock product cases/week (e.g., “How would you measure Search quality?”)

### Weeks 5–6 — Analytics + modeling
- Metrics design drills (Ads, YouTube, Maps, Play — pick Google products)
- Dimensional modeling exercises from your migration experience
- Python: 3 end-to-end mini projects
  1. Reconciliation script (source vs target)
  2. Funnel metrics notebook
  3. DQ anomaly detector + summary report

### Weeks 7–8 — Mocks + applications
- 4+ timed SQL mocks
- 2 full behavioral mocks
- Apply: Google Careers + employee referrals (highest leverage)
- Target related firms for warm-up interviews: Meta (Analyst), Amazon (BA/BI), Microsoft, Uber, Flipkart, CRED analytics roles

### Weeks 9–10 — Polish weak spots
- Review every missed SQL pattern; build a personal “mistake log”
- Pipeline design lite if applying DE
- Recruiter outreach: 5–10 Google Data Analysts/BIEs on LinkedIn (short, specific notes)

### Weeks 11–12 — Interview mode
- Daily timed SQL + 1 case + 1 STAR story
- Sleep/schedule discipline
- Prepare questions for interviewers (team’s data stack, decision cadence, success metrics for the role)

**Ongoing after week 12:** keep applying + weekly mocks until offer. Google hiring is probabilistic; volume + referrals matter.

---

## 6. Weekly Time Budget (sustainable)

Assuming ~15–18 focused hours/week while working:

| Block | Hours | Focus |
|-------|-------|-------|
| SQL drills | 6–7 | Timed problems + review |
| Cases / metrics | 3 | Product sense |
| Story / resume | 2 | Behavioral + quantification |
| Projects | 2–3 | GitHub proof |
| Mocks / apply | 2–3 | Interviews + outreach |

Weekend: one full 90-minute mock loop simulation.

---

## 7. Project Portfolio (build 2–3, keep small)

Publish on GitHub with clean READMEs:

1. **Banking DQ / Reconciliation Toolkit**  
   Python + SQL: profile → rules → reconcile → exception report. Maps directly to your EY work.

2. **Product Analytics Case Study**  
   Public dataset (e.g., e-commerce events): funnel, retention cohorts, dashboard (Looker Studio / Tableau / Power BI).

3. **Optional DE stretch**  
   Ingest CSV → transform → BigQuery-style modeled tables (even locally with DuckDB) + documented data model.

These turn “consultant experience” into visible engineering signal.

---

## 8. Application Strategy

### Leveling expectation
With ~8 years analytics (not SWE), expect conversation around **L3–L4 Analyst / BIE** equivalent depending on team. Don’t over-index on title; focus on scope.

### Referral > cold apply
- Ask former EY / Citi / NAB colleagues in FAANG
- LinkedIn: short note + 1 quantified achievement + role link

### Interview narrative (30-second pitch)
> “I’m a data professional with 8 years in banking analytics and large-scale migration quality. I specialize in SQL-heavy analysis, Python automation for validation at scale, and translating regulatory/business needs into trusted datasets and dashboards. I’m targeting Data Analyst / BI roles where rigorous data quality and product metrics meet.”

### Companies for practice interviews (parallel)
Amazon BI, Microsoft ATA/BA, Meta Data Analyst, Uber/Lyft Analyst, Indian product companies with strong analytics bars — use them to sharpen before Google onsites.

---

## 9. Resources (high signal only)

**SQL**
- DataLemur (Google questions)
- LeetCode SQL
- StrataScratch
- *SQL for Data Analysis* patterns / Mode Analytics SQL tutorial

**Product / analytics**
- Exponent (Data Analyst interview)
- “Ace the Data Science Interview” (SQL + product chapters)
- Lenny’s Newsletter case studies (metrics thinking)

**Behavioral**
- Google’s own leadership attributes language
- Your STAR bank reviewed weekly

**Systems / DE stretch**
- BigQuery docs (partitioning, clustering)
- Designing Data-Intensive Applications — selected chapters (batch/stream, storage)

**Mock platforms**
- Pramp / Interviewing.io / peer mocks with other analysts

---

## 10. 90-Day Success Checklist

- [ ] Resume v2 with ≥8 quantified bullets
- [ ] 80+ SQL problems logged (with mistake patterns)
- [ ] 15+ product/metric cases practiced out loud
- [ ] 8 STAR stories memorized with metrics
- [ ] 2 GitHub projects live
- [ ] ≥5 referrals requested
- [ ] ≥10 relevant roles applied (Google + peers)
- [ ] ≥6 timed mocks completed
- [ ] Clear pitch + “Why Google” answer tied to product impact + data quality craft

---

## Bottom line

You are **not** starting from zero — you already operate in Google Analyst–relevant work (SQL, Python automation, DQ, stakeholder-driven analytics). The gap is **interview sport**: Google-hard SQL under time pressure, product-metric storytelling, and a metric-dense resume with referrals.

Primary path: **Data Analyst / BI Engineer at Google**, with a disciplined 12-week SQL + cases + behavioral program, while building 2 proof projects and warming up with peer-company interviews.
