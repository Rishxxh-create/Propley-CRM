"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, setActiveStore, type AppStore } from "@/store";

type ReduxProviderProps = {
  children: React.ReactNode;
};

export default function ReduxProvider({ children }: ReduxProviderProps) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore();
    setActiveStore(storeRef.current);
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
