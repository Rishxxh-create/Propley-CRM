'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { TEAM_MEMBERS, type TeamMember } from '@/lib/mock-data';

interface AdminContextValue {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(TEAM_MEMBERS);

  return (
    <AdminContext.Provider value={{ teamMembers, setTeamMembers }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
