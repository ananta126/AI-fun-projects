"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  BUDGET_OPTIONS,
  COLORS,
  GENDERS,
  OCCASIONS,
  SEASONS,
  STYLES,
} from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { OutfitFilters } from "@/types";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: OutfitFilters;
  onChange: (filters: OutfitFilters) => void;
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs border transition-colors capitalize",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function toggleArray<T>(arr: T[] | undefined, value: T): T[] {
  const current = arr ?? [];
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
}: FilterDrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function update(partial: Partial<OutfitFilters>) {
    const next = { ...filters, ...partial };
    onChange(next);
    trackEvent("filter_used", { filters: JSON.stringify(partial) });
  }

  function clearAll() {
    onChange({ query: filters.query });
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed z-50 bg-background border-border overflow-y-auto transition-transform duration-300",
          "inset-x-0 bottom-0 max-h-[85vh] rounded-t-xl border-t p-6 md:inset-y-0 md:right-0 md:left-auto md:w-80 md:max-h-none md:rounded-none md:border-l md:border-t-0",
          open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"
        )}
        role="dialog"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-sm"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <FilterSection title="Category">
          {GENDERS.map((g) => (
            <FilterChip
              key={g}
              label={g}
              active={filters.gender?.includes(g) ?? false}
              onClick={() =>
                update({ gender: toggleArray(filters.gender, g) })
              }
            />
          ))}
        </FilterSection>

        <FilterSection title="Style">
          {STYLES.map((s) => (
            <FilterChip
              key={s}
              label={s}
              active={filters.styles?.includes(s) ?? false}
              onClick={() =>
                update({ styles: toggleArray(filters.styles, s) })
              }
            />
          ))}
        </FilterSection>

        <FilterSection title="Occasion">
          {OCCASIONS.map((o) => (
            <FilterChip
              key={o}
              label={o}
              active={filters.occasions?.includes(o) ?? false}
              onClick={() =>
                update({ occasions: toggleArray(filters.occasions, o) })
              }
            />
          ))}
        </FilterSection>

        <FilterSection title="Season">
          {SEASONS.map((s) => (
            <FilterChip
              key={s}
              label={s}
              active={filters.seasons?.includes(s) ?? false}
              onClick={() =>
                update({ seasons: toggleArray(filters.seasons, s) })
              }
            />
          ))}
        </FilterSection>

        <FilterSection title="Color">
          {COLORS.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={filters.colors?.includes(c) ?? false}
              onClick={() =>
                update({ colors: toggleArray(filters.colors, c) })
              }
            />
          ))}
        </FilterSection>

        <FilterSection title="Budget">
          {BUDGET_OPTIONS.map((b) => (
            <FilterChip
              key={b.value}
              label={b.label}
              active={filters.budget?.includes(b.value) ?? false}
              onClick={() =>
                update({ budget: toggleArray(filters.budget, b.value) })
              }
            />
          ))}
        </FilterSection>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={clearAll}>
            Clear
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Apply
          </Button>
        </div>
      </aside>
    </>
  );
}
