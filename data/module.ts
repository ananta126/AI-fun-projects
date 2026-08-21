import type { ModuleDefinition } from "@/types";

export const MODULE_ID = "missing-4-8-crore";

export const QUEST_MODULE: ModuleDefinition = {
  id: MODULE_ID,
  title: "The Missing ₹4.8 Crore",
  subtitle: "An investigation into a banking fraud dashboard that doesn't add up.",
  priceInr: 200,
  maxRewardInr: 150,
  stages: [
    {
      id: "stage-1",
      order: 1,
      title: "Something Doesn't Add Up",
      shortTitle: "Something Doesn't Add Up",
      rewardInr: 25,
      briefing: [
        {
          time: "09:12 AM",
          from: "Priya Nair · Head of Fraud Analytics",
          channel: "slack",
          body: "Something doesn't look right with this month's numbers. The fraud dashboard is celebrating a decline in suspicious activity. Transaction volumes haven't moved that much. Can you take a look before standup?",
        },
        {
          time: "09:18 AM",
          from: "Ops Bot",
          channel: "system",
          body: "Access granted: customers · transactions · fraud_alerts. Read-only warehouse snapshot for July close.",
        },
        {
          time: "09:21 AM",
          from: "Investigation notes",
          channel: "note",
          body: "Do not assume the dashboard is correct. Inspect the tables, columns, sample rows, and monthly shape of the data first.",
        },
      ],
      challenges: [
        {
          id: "s1-q1",
          stageId: "stage-1",
          title: "The monthly gap",
          description:
            "Which month shows the largest discrepancy between settled transaction volume and fraud alerts (lowest alerts per 1,000 transactions)?",
          type: "multiple_choice",
          datasetRef: "challenge_v1",
          options: ["April 2026", "May 2026", "June 2026", "July 2026"],
          expectedAnswer: "July 2026",
          evaluation: "exact",
        },
        {
          id: "s1-q2",
          stageId: "stage-1",
          title: "Channel heat",
          description:
            "Treat a transaction as suspicious if it should have raised a fraud alert under the bank's published rules (high value, high-risk wire, crypto, or large international). Which channel has the highest number of suspicious transactions across the full snapshot?",
          type: "multiple_choice",
          datasetRef: "challenge_v1",
          options: ["UPI", "CARD", "WIRE", "NEFT"],
          expectedAnswer: "UPI",
          evaluation: "exact",
        },
        {
          id: "s1-q3",
          stageId: "stage-1",
          title: "Unusual category",
          description:
            "Which transaction category looks unusual in July — activity is present, but corresponding fraud alerts almost disappear compared with earlier months?",
          type: "multiple_choice",
          datasetRef: "challenge_v1",
          options: ["SALARY", "CRYPTO", "RETAIL", "TRAVEL"],
          expectedAnswer: "CRYPTO",
          evaluation: "exact",
        },
      ],
    },
    {
      id: "stage-2",
      order: 2,
      title: "Find the Leak",
      shortTitle: "Find the Leak",
      rewardInr: 35,
      briefing: [
        {
          time: "10:03 AM",
          from: "Priya Nair · Head of Fraud Analytics",
          channel: "email",
          subject: "Re: July fraud decline",
          body: "You've identified a discrepancy. Now we need to understand where it came from. If the dashboard is under-counting alerts, I want the missing cases — not a theory.",
        },
        {
          time: "10:11 AM",
          from: "Rahul Mehta · Fraud Ops",
          channel: "slack",
          body: "Rules didn't change in July. Thresholds are the same. If something should have alerted and didn't, that's a pipeline leak, not a crime wave cooling off.",
        },
        {
          time: "10:16 AM",
          from: "Investigation notes",
          channel: "note",
          body: "Published alert rules: amount ≥ ₹2,50,000; OR WIRE with amount ≥ ₹75,000; OR CRYPTO with amount ≥ ₹50,000; OR international with amount ≥ ₹1,00,000. Find settled transactions that match a rule but do not appear in fraud_alerts.",
        },
      ],
      challenges: [
        {
          id: "s2-sql-1",
          stageId: "stage-2",
          title: "Transactions that never became alerts",
          description:
            "Write a SELECT that returns settled transactions which should have generated a fraud alert under the published rules, but do not appear in fraud_alerts. Include at least txn_id. Joins and filters are up to you — we score the result set, not the SQL text.",
          type: "sql",
          datasetRef: "challenge_v1",
          evaluation: "sql_resultset",
          reward: 35,
        },
      ],
    },
    {
      id: "stage-3",
      order: 3,
      title: "The Data Quality Problem",
      shortTitle: "Data Quality Problem",
      rewardInr: 30,
      briefing: [],
      challenges: [],
    },
    {
      id: "stage-4",
      order: 4,
      title: "Build the Evidence",
      shortTitle: "Build the Evidence",
      rewardInr: 30,
      briefing: [],
      challenges: [],
    },
    {
      id: "stage-5",
      order: 5,
      title: "Executive Review",
      shortTitle: "Executive Review",
      rewardInr: 30,
      briefing: [],
      challenges: [],
    },
  ],
};
