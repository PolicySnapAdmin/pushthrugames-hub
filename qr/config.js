/**
 * QR — public config (safe in the browser).
 * Never put the service role key here.
 *
 * Use a DEDICATED Supabase project for QR (not Push Thru's jp_* project).
 * See docs/BACKEND.md
 */
window.QR_CONFIG = {
  /** false = offline-only (localStorage). true after you paste URL + anon key. */
  enabled: true,

  supabaseUrl: "https://iqeshszhcumphrnjvsoq.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZXNoc3poY3VtcGhybmp2c29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTYwNjMsImV4cCI6MjEwMDgzMjA2M30.uAxpoCADkbiZMB7Ew6XNV3SMlkM4wRuXXS-9NS3p2wk",

  /**
   * Public play URL (hub path on pushthrugames.com).
   */
  publicBaseUrl: "https://www.pushthrugames.com/qr/",

  /** Synthetic code accounts: {CODE}@loginEmailDomain */
  loginEmailDomain: "login.qr.pushthrugames.com",

  enableEmailAuth: true,
  /** Guest anonymous auth (recommended ON in Supabase dashboard too) */
  enableAnonymousAuth: true,

  minAge: 13,
};
