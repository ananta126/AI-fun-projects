"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useState } from "react";

export type EvidencePayload = {
  totalTransactions: number;
  suspiciousTransactions: number;
  fraudRatePct: number;
  missingAlerts: number;
  duplicateTxnIds: number;
};

export function EvidenceForm({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (payload: EvidencePayload) => Promise<{ passed: boolean; feedback: string }>;
}) {
  const [form, setForm] = useState({
    totalTransactions: "",
    suspiciousTransactions: "",
    fraudRatePct: "",
    missingAlerts: "",
    duplicateTxnIds: "",
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setBusy(true);
    setFeedback(null);
    try {
      const payload: EvidencePayload = {
        totalTransactions: Number(form.totalTransactions),
        suspiciousTransactions: Number(form.suspiciousTransactions),
        fraudRatePct: Number(form.fraudRatePct),
        missingAlerts: Number(form.missingAlerts),
        duplicateTxnIds: Number(form.duplicateTxnIds),
      };
      const result = await onSubmit(payload);
      setOk(result.passed);
      setFeedback(result.feedback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <Badge tone="teal">Evidence pack</Badge>
      <h3 className="mt-3 font-serif text-2xl">Put numbers on the discrepancy</h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Clean warehouse: <span className="font-mono text-text/80">transactions</span>,{" "}
        <span className="font-mono text-text/80">fraud_alerts</span>. Duplicate IDs come from{" "}
        <span className="font-mono text-text/80">transactions_raw</span>. Fraud rate = 100 ×
        (fraud_alerts rows ÷ settled transactions), one decimal place.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field
          label="Total transactions"
          value={form.totalTransactions}
          onChange={(v) => setField("totalTransactions", v)}
        />
        <Field
          label="Suspicious (rule-matching) transactions"
          value={form.suspiciousTransactions}
          onChange={(v) => setField("suspiciousTransactions", v)}
        />
        <Field
          label="Fraud rate (%)"
          value={form.fraudRatePct}
          onChange={(v) => setField("fraudRatePct", v)}
        />
        <Field
          label="Missing fraud alerts"
          value={form.missingAlerts}
          onChange={(v) => setField("missingAlerts", v)}
        />
        <Field
          label="Duplicate txn_id values in raw"
          value={form.duplicateTxnIds}
          onChange={(v) => setField("duplicateTxnIds", v)}
        />
      </div>
      <Button className="mt-5" disabled={busy || disabled} onClick={submit}>
        Submit evidence pack
      </Button>
      {feedback ? (
        <p className={`mt-3 text-sm ${ok ? "text-ok" : "text-danger"}`}>{feedback}</p>
      ) : null}
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-bg-elevated px-3 py-2 font-mono text-sm text-text outline-none focus:border-teal"
      />
    </label>
  );
}
