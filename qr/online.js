/**
 * QR online layer — separate from Push Thru (jp_*).
 * Tables/RPCs: qr_* only. Offline if config.enabled is false or network fails.
 */
(() => {
  const api = {
    sb: null,
    session: null,
    profile: null,
    online: false,
    ready: false,
  };

  function cfg() {
    return window.QR_CONFIG || {};
  }

  function loginDomain() {
    return String(cfg().loginEmailDomain || "login.qr.pushthrugames.com").replace(/^@/, "");
  }

  function codeEmail(code) {
    return `${String(code).toLowerCase()}@${loginDomain()}`;
  }

  async function init() {
    api.ready = false;
    api.online = false;
    api.sb = null;
    api.session = null;
    api.profile = null;

    const c = cfg();
    if (!c.enabled || !c.supabaseUrl || !c.supabaseAnonKey) {
      api.ready = true;
      return api;
    }
    if (!window.supabase?.createClient) {
      console.warn("QR online: supabase-js missing");
      api.ready = true;
      return api;
    }

    api.sb = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "qr-purpose-auth",
      },
    });

    const { data } = await api.sb.auth.getSession();
    api.session = data.session || null;

    api.sb.auth.onAuthStateChange((_ev, session) => {
      api.session = session;
      if (session?.user) {
        ensureProfile().catch((e) => console.warn(e));
      } else {
        api.profile = null;
        api.online = false;
      }
      window.dispatchEvent(new CustomEvent("qr-auth", { detail: { session, profile: api.profile } }));
    });

    if (api.session?.user) {
      try {
        await ensureProfile();
        api.online = true;
      } catch (e) {
        console.warn("QR ensure profile", e);
      }
    } else if (c.enableAnonymousAuth !== false) {
      try {
        await signInGuest();
      } catch (e) {
        console.warn("QR guest", e);
      }
    }

    api.ready = true;
    window.dispatchEvent(new CustomEvent("qr-auth", { detail: { session: api.session, profile: api.profile } }));
    return api;
  }

  async function signInGuest() {
    if (!api.sb) throw new Error("Offline");
    const { data, error } = await api.sb.auth.signInAnonymously();
    if (error) throw error;
    api.session = data.session;
    await ensureProfile();
    api.online = true;
    return api.profile;
  }

  async function ensureProfile(displayName) {
    if (!api.sb || !api.session?.user) return null;
    const { data, error } = await api.sb.rpc("qr_ensure_my_profile", {
      p_display_name: displayName || null,
    });
    if (error) throw error;
    api.profile = data;
    api.online = true;
    return data;
  }

  async function signInWithEmail(email, password) {
    if (!api.sb) throw new Error("Offline");
    const { data, error } = await api.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    api.session = data.session;
    await ensureProfile();
    return api.profile;
  }

  async function signUpWithEmail(email, password, displayName) {
    if (!api.sb) throw new Error("Offline");
    const { data, error } = await api.sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName || "Signal" } },
    });
    if (error) throw error;
    api.session = data.session;
    if (data.session) await ensureProfile(displayName);
    return data;
  }

  /** Code+password style (synthetic email), same idea as Push Thru */
  async function signUpWithCode(password, displayName) {
    if (!api.sb) throw new Error("Offline");
    // Create anonymous first so we get a user, then ensure profile for code
    if (!api.session) await signInGuest();
    const prof = await ensureProfile(displayName);
    const code = prof?.friend_code;
    if (!code) throw new Error("No friend code");
    const email = codeEmail(code);
    // Link credentials if available; else sign-up path for non-anon
    try {
      const { error } = await api.sb.auth.updateUser({ email, password });
      if (error) throw error;
    } catch (e) {
      // Fallback: password accounts via signUp with synthetic email (fresh)
      console.warn("updateUser link failed, try password set later", e);
    }
    return prof;
  }

  async function signInWithCode(code, password) {
    return signInWithEmail(codeEmail(code), password);
  }

  async function signOut() {
    if (!api.sb) return;
    await api.sb.auth.signOut();
    api.session = null;
    api.profile = null;
    api.online = false;
  }

  /**
   * Sync progress (monotonic). Safe to call often.
   * @param {{ bestSector?: number, sectorsClearedDelta?: number, threatsDelta?: number, runStarted?: boolean }} p
   */
  async function reportProgress(p = {}) {
    if (!api.sb || !api.session?.user) return null;
    const { data, error } = await api.sb.rpc("qr_report_progress", {
      p_best_sector: p.bestSector ?? null,
      p_sectors_cleared_delta: p.sectorsClearedDelta ?? 0,
      p_threats_purged_delta: p.threatsDelta ?? 0,
      p_run_started: !!p.runStarted,
    });
    if (error) {
      console.warn("qr_report_progress", error);
      return null;
    }
    api.profile = data;
    return data;
  }

  async function fetchLeaderboard(limit = 20) {
    if (!api.sb || !api.session?.user) return [];
    const { data, error } = await api.sb
      .from("qr_profiles")
      .select("display_name, friend_code, best_sector, sectors_cleared, threats_purged")
      .order("best_sector", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn(error);
      return [];
    }
    return data || [];
  }

  async function deleteAccount() {
    if (!api.sb) throw new Error("Offline");
    const { error } = await api.sb.rpc("qr_delete_my_account");
    if (error) throw error;
    await signOut();
  }

  window.QROnline = {
    api,
    init,
    cfg,
    signInGuest,
    ensureProfile,
    signInWithEmail,
    signUpWithEmail,
    signUpWithCode,
    signInWithCode,
    signOut,
    reportProgress,
    fetchLeaderboard,
    deleteAccount,
    codeEmail,
    loginDomain,
  };
})();
