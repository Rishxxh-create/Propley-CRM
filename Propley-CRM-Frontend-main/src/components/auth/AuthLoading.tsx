"use client";

import { PropleyLogo } from "@/components/PropleyLogo";

type AuthLoadingProps = {
  label?: string;
};

export default function AuthLoading({ label = "Verifying session…" }: AuthLoadingProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone px-6">
      <div className="absolute left-0 top-0 h-[6px] w-full bg-gold" />
      <PropleyLogo size="md" className="mb-10 opacity-90" />
      <div
        className="mb-6 h-8 w-8 animate-spin  rounded-full border-2 border-stone-alt border-t-gold"
        role="status"
        aria-label="Loading"
      />
      <p className="text-xs font-medium tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}
