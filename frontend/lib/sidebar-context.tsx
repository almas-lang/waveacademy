'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';

interface SidebarContextType {
  openSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({
  onOpen,
  children,
}: {
  onOpen: () => void;
  children: ReactNode;
}) {
  const openSidebar = useCallback(() => onOpen(), [onOpen]);

  return (
    <SidebarContext.Provider value={{ openSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
