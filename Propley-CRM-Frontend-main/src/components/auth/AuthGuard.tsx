"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkSession } from "@/lib/api/auth";
import { isRequestCanceled } from "@/lib/api/http-client";
import { setAuthSession } from "@/lib/auth-session";
import AuthLoading from "@/components/auth/AuthLoading";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser } from "@/store/slices/authSlice";

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    checkSession()
      .then((res) => {
        if (!active) return;
        setAuthSession("", res.user);
        dispatch(setAuthUser(res.user));
        setReady(true);
      })
      .catch((err) => {
        if (!active || isRequestCanceled(err)) return;
        router.replace("/auth");
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}
