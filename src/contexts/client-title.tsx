"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type TitleCtx = {
  title: string | null;
  setTitle: (t: string | null) => void;
};

const ClientTitleContext = createContext<TitleCtx>({
  title: null,
  setTitle: () => {},
});

export function ClientTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string | null>(null);
  const setTitle = useCallback((t: string | null) => setTitleState(t), []);
  return (
    <ClientTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </ClientTitleContext.Provider>
  );
}

export function useClientTitle() {
  return useContext(ClientTitleContext);
}
