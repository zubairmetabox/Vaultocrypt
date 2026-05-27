"use client";

import { createContext, useContext } from "react";

const ClientTitleContext = createContext<string | null>(null);

export function ClientTitleProvider({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <ClientTitleContext.Provider value={name}>
      {children}
    </ClientTitleContext.Provider>
  );
}

export function useClientTitle() {
  return useContext(ClientTitleContext);
}
