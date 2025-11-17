// app.config.js — loads .env locally and injects values into Expo runtime config (expo Config.extra)
// Copy `.env` to contain SUPABASE_URL and SUPABASE_ANON_KEY locally (do NOT commit secrets).

require('dotenv').config();

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    },
  };
};
