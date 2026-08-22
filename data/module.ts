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
      briefing: [
        {
          time: "11:04 AM",
          from: "Priya Nair · Head of Fraud Analytics",
          channel: "slack",
          body: "The missing-alert list is real. Engineering says the source files are clean. I don't buy it. They just dropped an extract they call 'raw landing'. It looks… chewed.",
        },
        {
          time: "11:12 AM",
          from: "Neha Kulkarni · Data Platform",
          channel: "email",
          subject: "RE: July extract integrity",
          body: "Landing zone files are as received from the core. If your warehouse snapshot is missing alerts, that's a consumption bug, not ours. Query customers_raw, transactions_raw, fraud_alerts_raw if you must.",
        },
        {
          time: "11:19 AM",
          from: "Investigation notes",
          channel: "note",
          body: "Treat the raw tables as hostile. Look for duplicate transaction IDs, NULL or impossible customer IDs, duplicated alerts, and timestamps that cannot be right.",
        },
      ],
      challenges: [
        {
          id: "s3-sql-dup-txn",
          stageId: "stage-3",
          title: "Duplicate tickets",
          description:
            "In transactions_raw, find transaction IDs that appear more than once. Return a column named txn_id. Distinct IDs are enough.",
          type: "sql",
          datasetRef: "challenge_raw_v1",
          evaluation: "sql_resultset",
        },
        {
          id: "s3-sql-bad-cust",
          stageId: "stage-3",
          title: "Orphaned money movement",
          description:
            "Identify transactions_raw rows with no valid customer ID — customer_id is NULL, or it does not exist in customers_raw. Return txn_id.",
          type: "sql",
          datasetRef: "challenge_raw_v1",
          evaluation: "sql_resultset",
        },
        {
          id: "s3-sql-dup-alert",
          stageId: "stage-3",
          title: "Alerts that cloned themselves",
          description:
            "Find customers whose fraud alerts are duplicated: more than one fraud_alerts_raw row for the same txn_id. Return customer_id.",
          type: "sql",
          datasetRef: "challenge_raw_v1",
          evaluation: "sql_resultset",
        },
      ],
    },
    {
      id: "stage-4",
      order: 4,
      title: "Build the Evidence",
      shortTitle: "Build the Evidence",
      rewardInr: 30,
      briefing: [
        {
          time: "12:40 PM",
          from: "Priya Nair · Head of Fraud Analytics",
          channel: "email",
          subject: "Need numbers, not a novel",
          body: "I have a 4:00 with the CRO. Put the discrepancy into a one-page evidence pack: volumes, suspicious activity, observed fraud rate, missing alerts, and the duplicate-alert noise from the raw file.",
        },
        {
          time: "12:48 PM",
          from: "Investigation notes",
          channel: "note",
          body: "Use the clean warehouse tables for operational metrics. Use transactions_raw / fraud_alerts_raw only for the duplicate-ID count. Then write the cause in plain language.",
        },
      ],
      challenges: [
        {
          id: "s4-metrics",
          stageId: "stage-4",
          title: "Evidence pack",
          description: "Submit the five figures the CRO will ask for.",
          type: "numerical",
          datasetRef: "challenge_v1",
          evaluation: "numeric_tolerance",
        },
        {
          id: "s4-explain",
          stageId: "stage-4",
          title: "What caused the dashboard discrepancy?",
          description:
            "In a short paragraph: what broke, what the numbers prove, and how data quality made the picture worse.",
          type: "text",
          datasetRef: "challenge_v1",
          evaluation: "rubric",
        },
      ],
    },
    {
      id: "stage-5",
      order: 5,
      title: "Executive Review",
      shortTitle: "Executive Review",
      rewardInr: 30,
      briefing: [
        {
          time: "3:55 PM",
          from: "Priya Nair · Head of Fraud Analytics",
          channel: "slack",
          body: "The Head of Fraud Analytics has five minutes before an executive meeting. I need you to speak for the desk. What went wrong, what evidence we have, and what the bank should do next.",
        },
        {
          time: "3:57 PM",
          from: "Ops Bot",
          channel: "system",
          body: "Mini viva will follow the memo. Answers are scored with a simple rubric — no proctoring, no AI-detection. Be specific.",
        },
      ],
      challenges: [
        {
          id: "s5-memo",
          stageId: "stage-5",
          title: "Five-minute memo",
          description:
            "Cover all three: (1) What went wrong? (2) What evidence supports the conclusion? (3) What should the bank do next?",
          type: "text",
          datasetRef: "challenge_v1",
          evaluation: "rubric",
        },
        {
          id: "s5-viva-1",
          stageId: "stage-5",
          title: "Viva · duplicates",
          description:
            "You identified duplicate transaction IDs. Why do you believe these explain part of the discrepancy?",
          type: "text",
          datasetRef: "challenge_v1",
          evaluation: "rubric",
        },
        {
          id: "s5-viva-2",
          stageId: "stage-5",
          title: "Viva · join logic",
          description:
            "You used (or should have used) a LEFT JOIN in Stage 2. Why was that appropriate for finding alerts that never materialised?",
          type: "text",
          datasetRef: "challenge_v1",
          evaluation: "rubric",
        },
        {
          id: "s5-viva-3",
          stageId: "stage-5",
          title: "Viva · monitoring",
          description:
            "If the fraud-alert pipeline is fixed, what metric would you monitor to ensure the issue doesn't return?",
          type: "text",
          datasetRef: "challenge_v1",
          evaluation: "rubric",
        },
      ],
    },
  ],
};
