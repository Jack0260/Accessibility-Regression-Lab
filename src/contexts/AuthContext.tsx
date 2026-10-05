import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TeamMember, UserRole } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  member: TeamMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AVATAR_COLORS = ['#2563eb', '#059669', '#dc2626', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = async (userId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching member:', error);
      return null;
    }
    return data as TeamMember | null;
  };

  const refreshMember = async () => {
    if (session?.user?.id) {
      const m = await fetchMember(session.user.id);
      setMember(m);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchMember(data.session.user.id).then((m) => {
          setMember(m);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        (async () => {
          const m = await fetchMember(newSession.user.id);
          setMember(m);
          setLoading(false);
        })();
      } else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Sign-up failed: no user returned.' };

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const { error: profileError } = await supabase.from('team_members').insert({
      user_id: data.user.id,
      email,
      full_name: fullName,
      role,
      avatar_color: color,
    });

    if (profileError) {
      return { error: profileError.message };
    }

    const m = await fetchMember(data.user.id);
    setMember(m);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMember(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, member, loading, signIn, signUp, signOut, refreshMember }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
