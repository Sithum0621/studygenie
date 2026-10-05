"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { hydrateFromCloud, startCloudSync, stopCloudSync } from "./cloud-sync";
import { parseStudyMedium } from "./content-language";
import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { localStore, clearStudentLocal } from "./local-store";
import type { Profile } from "./types";
import { sanitizeText, validateCredentials } from "./validate";

type AuthContextValue = {
  user: Profile | null;
  loading: boolean;
  supabaseReady: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function withMedium(profile: Omit<Profile, "medium"> & { medium?: Profile["medium"] }): Profile {
  const extras = localStore.getProfileExtras()[profile.id];
  return {
    ...profile,
    medium: parseStudyMedium(extras?.medium ?? profile.medium),
  };
}

function publicAuthError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("confirm")) {
    return "Email confirm කරන්න. Inbox එක බලන්න, හෝ Supabase Auth eke Confirm email off කරන්න.";
  }
  if (text.includes("already") || text.includes("registered")) {
    return "Me email eken account ekak already thiyenawa. Login wenna.";
  }
  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "Email or password eka wrong. Aye try karanna.";
  }
  if (text.includes("rate") || text.includes("too many")) {
    return "Try karana eka wadi una. Tikak wait karala aye try karanna.";
  }
  return "Account eka fail una. Aye try karanna.";
}

function profileFromLocal(id: string): Profile | null {
  const found = localStore.getUsers().find((u) => u.id === id);
  if (!found) return null;
  return withMedium({
    id: found.id,
    name: found.name,
    email: found.email,
    grade: found.grade,
    subjects: found.subjects,
    languageMix: found.languageMix,
    medium: found.medium,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    const boot = async () => {
      try {
        if (supabaseReady) {
          const supabase = createClient();
          if (!supabase) {
            setLoading(false);
            return;
          }
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            const { data: row } = await supabase
              .from("profiles")
              .select("name, grade, subjects, medium, language_mix")
              .eq("id", data.user.id)
              .maybeSingle();
            setUser(
              withMedium({
                id: data.user.id,
                email: data.user.email || "",
                name: row?.name || data.user.email?.split("@")[0] || "Student",
                grade: row?.grade || "",
                subjects: row?.subjects || [],
                languageMix: row?.language_mix === "english" ? "english" : "singlish",
                medium: parseStudyMedium(row?.medium),
              }),
            );
            startCloudSync();
            await hydrateFromCloud().catch(() => undefined);
          }
          return;
        }

        const sessionId = localStore.getSessionId();
        setUser(sessionId ? profileFromLocal(sessionId) : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void boot();
    return () => stopCloudSync();
  }, [supabaseReady]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      supabaseReady,
      async signIn(email, password) {
        const checked = validateCredentials({ email, password });
        if (!checked.ok) return "Email or password eka wrong. Aye try karanna.";
        try {
          if (supabaseReady) {
            const supabase = createClient();
            if (!supabase) return "Supabase client eka load una naha.";
            const { data, error } = await supabase.auth.signInWithPassword({
              email: checked.email,
              password: checked.password,
            });
            if (error) return publicAuthError(error.message);
            if (data.user) {
              const { data: row } = await supabase
                .from("profiles")
                .select("name, grade, subjects, medium, language_mix")
                .eq("id", data.user.id)
                .maybeSingle();
              setUser(
                withMedium({
                  id: data.user.id,
                  email: data.user.email || "",
                  name: row?.name || data.user.email?.split("@")[0] || "Student",
                  grade: row?.grade || "",
                  subjects: row?.subjects || [],
                  languageMix: row?.language_mix === "english" ? "english" : "singlish",
                  medium: parseStudyMedium(row?.medium),
                }),
              );
              clearStudentLocal();
              startCloudSync();
              await hydrateFromCloud({ pushIfEmpty: false }).catch(() => undefined);
            }
            return null;
          }

          const found = localStore
            .getUsers()
            .find(
              (u) =>
                u.email.toLowerCase() === checked.email &&
                u.password === checked.password,
            );
          if (!found) return "Email or password eka wrong. Aye try karanna.";
          localStore.setSessionId(found.id);
          setUser(profileFromLocal(found.id));
          return null;
        } catch {
          return "Account eka fail una. Aye try karanna.";
        }
      },
      async signUp(name, email, password) {
        const checked = validateCredentials({ name, email, password });
        if (!checked.ok) {
          if (checked.reason === "password") {
            return "Password eka characters 6k wadiya wenna ona.";
          }
          return "Details tika hariyata fill karanna.";
        }
        const safeName = checked.name || "Student";

        try {
          if (supabaseReady) {
            const supabase = createClient();
            if (!supabase) return "Supabase client eka load una naha.";
            const { data, error } = await supabase.auth.signUp({
              email: checked.email,
              password: checked.password,
              options: { data: { name: safeName } },
            });
            if (error) return publicAuthError(error.message);
            if (!data.session) {
              return "Email confirm කරන්න. Inbox එක බලන්න, හෝ Supabase Auth eke Confirm email off කරන්න.";
            }
            if (data.user) {
              await supabase.from("profiles").upsert({
                id: data.user.id,
                name: safeName,
                grade: "",
                subjects: [],
                medium: "sinhala",
                language_mix: "singlish",
              });
              setUser(
                withMedium({
                  id: data.user.id,
                  email: data.user.email || checked.email,
                  name: safeName,
                  grade: "",
                  subjects: [],
                  languageMix: "singlish",
                  medium: "sinhala",
                }),
              );
              clearStudentLocal();
              startCloudSync();
              await hydrateFromCloud({ pushIfEmpty: false }).catch(() => undefined);
            }
            return null;
          }

          const users = localStore.getUsers();
          if (
            users.some((u) => u.email.toLowerCase() === checked.email)
          ) {
            return "Me email eken account ekak already thiyenawa. Login wenna.";
          }
          const profile: Profile & { password: string } = {
            id: crypto.randomUUID(),
            name: safeName,
            email: checked.email,
            password: checked.password,
            grade: "",
            subjects: [],
            languageMix: "singlish",
            medium: "sinhala",
          };
          localStore.saveUsers([...users, profile]);
          localStore.setSessionId(profile.id);
          clearStudentLocal();
          setUser(profileFromLocal(profile.id));
          return null;
        } catch {
          return "Account eka fail una. Aye try karanna.";
        }
      },
      async signOut() {
        if (supabaseReady) {
          const supabase = createClient();
          await supabase?.auth.signOut();
        }
        stopCloudSync();
        localStore.setSessionId(null);
        clearStudentLocal();
        setUser(null);
      },
      async updateProfile(patch) {
        if (!user) return;
        try {
          const next = withMedium({
            ...user,
            ...patch,
            name: sanitizeText(patch.name ?? user.name, 80),
            grade: sanitizeText(patch.grade ?? user.grade, 40),
            subjects: (patch.subjects ?? user.subjects)
              .map((item) => sanitizeText(item, 40))
              .filter(Boolean)
              .slice(0, 20),
          });
          setUser(next);
          localStore.saveProfileExtra(user.id, { medium: next.medium });

          if (supabaseReady) {
            const supabase = createClient();
            if (!supabase) return;
            const { error } = await supabase.from("profiles").upsert({
              id: user.id,
              name: next.name,
              grade: next.grade,
              subjects: next.subjects,
              medium: next.medium,
              language_mix: next.languageMix,
            });
            if (error) {
              await supabase.from("profiles").upsert({
                id: user.id,
                name: next.name,
                grade: next.grade,
                subjects: next.subjects,
              });
            }
            return;
          }

          const users = localStore.getUsers().map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  name: next.name,
                  grade: next.grade,
                  subjects: next.subjects,
                  languageMix: next.languageMix,
                  medium: next.medium,
                }
              : u,
          );
          localStore.saveUsers(users);
        } catch {
          return;
        }
      },
    }),
    [loading, supabaseReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
