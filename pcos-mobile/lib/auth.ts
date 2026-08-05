import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

export type SignUpInput = {
  email: string;
  username: string;
  password: string;
};

export type SignUpResult = {
  // Non-null only if the Supabase project has "confirm email" disabled —
  // otherwise the account exists but has no session until the user
  // confirms via the email they were sent.
  session: Session | null;
};

export async function signUp({ email, username, password }: SignUpInput): Promise<SignUpResult> {
  // The profiles row is created server-side by a database trigger (see
  // supabase/migrations/0003_handle_new_user_trigger.sql), reading the
  // username back out of this metadata — not inserted here client-side,
  // since there's no authenticated session yet if email confirmation is
  // required, which would fail the "auth.uid() = id" RLS check.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("That username is already taken.");
    }
    throw new Error(error.message);
  }
  if (!data.user) throw new Error("Sign up failed — no user was created.");

  return { session: data.session };
}

export type SignInInput = {
  username: string;
  password: string;
};

export async function signInWithUsername({ username, password }: SignInInput): Promise<Session> {
  const { data: email, error: lookupError } = await supabase.rpc("email_for_username", {
    p_username: username,
  });
  if (lookupError) throw new Error(lookupError.message);

  // Deliberately generic — don't reveal whether the username or the
  // password was the wrong part.
  if (!email) throw new Error("Invalid username or password.");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Invalid username or password.");
  if (!data.session) throw new Error("Login failed — no session was returned.");

  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// For attaching `Authorization: Bearer <token>` to Flask requests — see
// lib/skin_tracking_api.ts.
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

// For inserts into Supabase tables that need `user_id` set explicitly so
// the RLS `with check (auth.uid() = user_id)` policy passes — see e.g.
// lib/cycles_api.ts.
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

// Sends a password-reset email containing a link back into the app (via the
// "pcosmobile" scheme registered in app.json). See App.tsx for the deep-link
// handler that turns the incoming link into a session.
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "pcosmobile://reset-password",
  });
  if (error) throw new Error(error.message);
}

// Called once the deep link from requestPasswordReset() has been turned
// into a live session (see App.tsx) — updates that session's password.
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
