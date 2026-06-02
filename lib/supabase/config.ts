export type SupabaseConfig = {
  publishableKey: string;
  url: string;
};

export type SupabaseAdminConfig = {
  secretKey: string;
  url: string;
};

function readEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    publishableKey: readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  };
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  return {
    secretKey: readEnv("SUPABASE_SECRET_KEY"),
    url: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  };
}
