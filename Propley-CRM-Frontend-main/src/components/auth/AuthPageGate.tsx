"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthOverlay from "@/components/auth/AuthOverlay";
import AuthLoading from "@/components/auth/AuthLoading";
import { checkSession } from "@/lib/api/auth";
import { isRequestCanceled } from "@/lib/api/http-client";
import { setAuthSession } from "@/lib/auth-session";

export default function AuthPageGate() {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "login">("checking");

  useEffect(() => {
    let active = true;

    checkSession()
      .then((res) => {
        if (!active) return;
        setAuthSession("", res.user);
        router.replace("/");
      })
      .catch((err) => {
        if (!active || isRequestCanceled(err)) return;
        setPhase("login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (phase === "checking") {
    return <AuthLoading label="Checking your session…" />;
  }

  return (
    <div className="min-h-screen bg-stone">
      <AuthOverlay />
    </div>
  );
}
