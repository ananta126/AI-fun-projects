"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useState } from "react";
import type { ImpactPayload } from "@/lib/evaluate-evidence";

export function ImpactForm({
  disabled,
  onSubmit,
}: {
  disabled?: boolean;
  onSubmit: (payload: ImpactPayload) => Promise<{ passed: boolean; feedback: string }>;
}) {
  const [form, setForm] = useState({
    affectedTxnCount: "",
    missingAlerts: "",
    fraudRatePct: "",
    percentageImpact: "",
    affectedChannel: "",
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
      const payload: ImpactPayload = {
        affectedTxnCount: Number(form.affectedTxnCount),
        missingAlerts: Number(form.missingAlerts),
        fraudRatePct: Number(form.fraudRatePct),
        percentageImpact: Number(form.percentageImpact),
        affectedChannel: form.affectedChannel,
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
      <Badge tone="teal">Business impact</Badge>
      <h3 className="mt-3 font-serif text-2xl">Quantify what you found</h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Affected transactions, missing alerts, warehouse fraud rate (alerts ÷ settled, one decimal),
        the percentage decline the dashboard is celebrating, and the channel that is not random.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Affected transaction count" value={form.affectedTxnCount} onChange={(v) => setField("affectedTxnCount", v)} />
        <Field label="Missing alerts" value={form.missingAlerts} onChange={(v) => setField("missingAlerts", v)} />
        <Field label="Fraud rate (%)" value={form.fraudRatePct} onChange={(v) => setField("fraudRatePct", v)} />
        <Field label="Dashboard decline (%)" value={form.percentageImpact} onChange={(v) => setField("percentageImpact", v)} />
        <Field label="Affected channel" value={form.affectedChannel} onChange={(v) => setField("affectedChannel", v)} />
      </div>
      <Button className="mt-5" disabled={busy || disabled} onClick={submit}>
        Submit impact
      </Button>
      {feedback ? <p className={`mt-3 text-sm ${ok ? "text-ok" : "text-danger"}`}>{feedback}</p> : null}
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-bg-elevated px-3 py-2 font-mono text-sm text-text outline-none focus:border-teal"
      />
    </label>
  );
}
