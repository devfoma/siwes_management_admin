'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import type { UserRole } from '../interfaces/types';

type AuthActionError = AuthError | Error | null;

interface RoleData {
  matricNo?: string;
  staffId?: string;
  faculty?: string;
  department: string;
  organizationName?: string;
  organizationAddress?: string;
  designation?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthActionError }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    roleData?: RoleData
  ) => Promise<{ error: AuthActionError }>;
  signOut: () => Promise<{ error: AuthActionError }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function ensureAuthProfile(user: SupabaseUser, fallbackRole: UserRole, fallbackRoleData?: RoleData) {
  const metadata = user.user_metadata || {};
  const role = (metadata.role || fallbackRole) as UserRole;

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        full_name: metadata.full_name || user.email || 'SIWES User',
        role,
      },
      { onConflict: 'id' }
    );

  if (error) throw error;

  if (role === 'STUDENT') {
    const roleData = (metadata.role_data || fallbackRoleData || {}) as RoleData;
    const { error: studentError } = await supabase
      .from('student_profiles')
      .upsert(
        {
          user_id: user.id,
          matric_no: roleData.matricNo || null,
          department: roleData.department || null,
          faculty: roleData.faculty || null,
          organization_name: roleData.organizationName || null,
          organization_address: roleData.organizationAddress || null,
        },
        { onConflict: 'user_id' }
      );

    if (studentError) throw studentError;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the admin dashboard environment.') };
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (e: unknown) {
      setLoading(false);
      return { error: e instanceof Error ? e : new Error('Authentication failed.') };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    roleData?: RoleData
  ) => {
    if (role === 'SUPERVISOR') {
      return { 
        error: new Error('Supervisor registration is restricted. Accounts must be provisioned via the administration backend.') 
      };
    }

    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the admin dashboard environment.') };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            role_data: roleData,
          },
        },
      });
      
      if (error) throw error;

      if (data.user && data.session) {
        await ensureAuthProfile(data.user, role, roleData);
      }
      
      return { error: null };
    } catch (e: unknown) {
      setLoading(false);
      return { error: e instanceof Error ? e : new Error('Registration failed.') };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase is not configured.') };
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (e: unknown) {
      setLoading(false);
      return { error: e instanceof Error ? e : new Error('Sign out failed.') };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
