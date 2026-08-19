"use client";

import Link from "next/link";
import { StyleDNA } from "@/components/fashion/StyleDNA";
import { ProfileForm } from "@/components/fashion/ProfileForm";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/components/providers/AppProvider";
import { userService } from "@/services/user-service";

export default function ProfilePage() {
  const { user } = useApp();
  const isComplete = userService.isProfileComplete(user);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Personal
        </p>
        <h1 className="font-serif text-3xl md:text-4xl">Your Profile</h1>
      </div>

      {isComplete ? (
        <>
          <StyleDNA
            styleLabel={userService.getStyleLabel(user)}
            styleDistribution={userService.getStyleDistribution(user)}
            colorPreferences={userService.getColorPreferences(user)}
            silhouettes={["Relaxed", "Straight", "Oversized"]}
            occasions={user?.favoriteOccasions ?? ["Everyday", "Office", "Travel"]}
          />
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-6">
              Edit Profile
            </h2>
            <ProfileForm showPhotoUpload={false} />
          </div>
        </>
      ) : (
        <div>
          <div className="text-center mb-10 py-8 border border-border">
            <p className="font-serif text-2xl mb-2">
              Tell us a little about your style.
            </p>
            <p className="text-muted-foreground text-sm">
              Build your profile to unlock personalized recommendations.
            </p>
          </div>
          <ProfileForm />
        </div>
      )}

      <div className="mt-10 flex gap-4">
        <Link href="/see-it-on-me">
          <Button variant="outline">See It On Me Setup</Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost">Explore Looks</Button>
        </Link>
      </div>
    </div>
  );
}
