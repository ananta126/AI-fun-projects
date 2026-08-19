"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/components/providers/AppProvider";
import { STYLES } from "@/lib/constants";
import type { BodyPreference, StylePreference } from "@/types";

interface ProfileFormProps {
  onComplete?: () => void;
  showPhotoUpload?: boolean;
}

export function ProfileForm({ onComplete, showPhotoUpload = true }: ProfileFormProps) {
  const { user, updateUser } = useApp();
  const [photoName, setPhotoName] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onComplete?.();
  }

  function toggleStyle(style: (typeof STYLES)[number]) {
    const current = user?.favoriteStyles ?? [];
    const next = current.includes(style)
      ? current.filter((s) => s !== style)
      : [...current, style];
    updateUser({ favoriteStyles: next });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-xs tracking-wide uppercase text-muted-foreground mb-2">
            Name
          </label>
          <Input
            id="name"
            value={user?.name ?? ""}
            onChange={(e) => updateUser({ name: e.target.value })}
            placeholder="Your name"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs tracking-wide uppercase text-muted-foreground mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={user?.email ?? ""}
            onChange={(e) => updateUser({ email: e.target.value })}
            placeholder="you@email.com"
          />
        </div>
        <div>
          <label htmlFor="height" className="block text-xs tracking-wide uppercase text-muted-foreground mb-2">
            Height (cm)
          </label>
          <Input
            id="height"
            type="number"
            value={user?.height ?? ""}
            onChange={(e) => updateUser({ height: Number(e.target.value) })}
            placeholder="175"
            required
          />
        </div>
        <div>
          <label htmlFor="size" className="block text-xs tracking-wide uppercase text-muted-foreground mb-2">
            Usual clothing size
          </label>
          <Input
            id="size"
            value={user?.usualSize ?? ""}
            onChange={(e) => updateUser({ usualSize: e.target.value })}
            placeholder="M / 32 / L"
            required
          />
        </div>
        <div>
          <label htmlFor="chest" className="block text-xs tracking-wide uppercase text-muted-foreground mb-2">
            Chest (cm) — optional
          </label>
          <Input
            id="chest"
            type="number"
            value={user?.chest ?? ""}
            onChange={(e) => updateUser({ chest: Number(e.target.value) || undefined })}
            placeholder="96"
          />
        </div>
        <div>
          <label htmlFor="waist" className="block text-xs tracking-wide uppercase text-muted-foreground mb-2">
            Waist (cm) — optional
          </label>
          <Input
            id="waist"
            type="number"
            value={user?.waist ?? ""}
            onChange={(e) => updateUser({ waist: Number(e.target.value) || undefined })}
            placeholder="82"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-xs tracking-wide uppercase text-muted-foreground mb-3">
          Body preference
        </legend>
        <div className="flex flex-wrap gap-2">
          {(["slim", "regular", "relaxed"] as BodyPreference[]).map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() => updateUser({ bodyPreference: pref })}
              className={`px-4 py-2 text-sm border capitalize transition-colors ${
                user?.bodyPreference === pref
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {pref}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs tracking-wide uppercase text-muted-foreground mb-3">
          Style preference
        </legend>
        <div className="flex flex-wrap gap-2">
          {(["fitted", "balanced", "oversized"] as StylePreference[]).map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() => updateUser({ stylePreference: pref })}
              className={`px-4 py-2 text-sm border capitalize transition-colors ${
                user?.stylePreference === pref
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {pref}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs tracking-wide uppercase text-muted-foreground mb-3">
          Favorite styles
        </legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => toggleStyle(style)}
              className={`px-3 py-1.5 text-xs border transition-colors ${
                user?.favoriteStyles?.includes(style)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </fieldset>

      {showPhotoUpload && (
        <div>
          <label className="block text-xs tracking-wide uppercase text-muted-foreground mb-2">
            Full-body photo (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size <= 5 * 1024 * 1024) {
                setPhotoName(file.name);
                updateUser({ photoUrl: URL.createObjectURL(file) });
              }
            }}
            className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:border file:border-border file:text-sm file:bg-transparent file:text-foreground"
          />
          {photoName && (
            <p className="text-xs text-muted-foreground mt-2">
              {photoName} — stored locally for future fit analysis
            </p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full md:w-auto">
        Save Profile
      </Button>
    </form>
  );
}
