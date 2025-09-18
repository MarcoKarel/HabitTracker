// Configuration for the web app
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  app: {
    name: 'Habit Tracker',
    version: '1.0.0',
    description: 'Track your habits and build better routines',
  },
  auth: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
  ui: {
    defaultTheme: 'system' as 'light' | 'dark' | 'system',
    animationDuration: 300,
    confettiDuration: 3000,
  },
} as const;

// Validate required environment variables
if (!config.supabase.url || !config.supabase.anonKey) {
  console.error('Missing required environment variables. Please check your .env file.');
}