"use client";

import { createContext, useContext } from "react";

// Renamed internals to "project" — file kept at same path for backwards compat
const ProjectTitleContext = createContext<string | null>(null);

export function ClientTitleProvider({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <ProjectTitleContext.Provider value={name}>
      {children}
    </ProjectTitleContext.Provider>
  );
}

export function useClientTitle() {
  return useContext(ProjectTitleContext);
}
