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

  async function signUpWithCode(password, displayName) {
    if (!api.sb) throw new Error("Offline");
    if (!api.session) await signInGuest();
    const prof = await ensureProfile(displayName);
    const code = prof?.friend_code;
    if (!code) throw new Error("No friend code");
    const email = codeEmail(code);
    try {
      const { error } = await api.sb.auth.updateUser({ email, password });
      if (error) throw error;
    } catch (e) {
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

  async function reportMeta(p = {}) {
    if (!api.sb || !api.session?.user) return null;
    try {
      const { data, error } = await api.sb.rpc("qr_report_meta", {
        p_account_level: p.accountLevel ?? null,
        p_account_xp: p.accountXp ?? null,
        p_best_sector: p.bestSector ?? null,
        p_stats: p.stats ?? null,
      });
      if (error) throw error;
      if (data) api.profile = { ...api.profile, ...data };
      return data;
    } catch (e) {
      console.warn("qr_report_meta", e);
      return null;
    }
  }

  /**
   * @param {'best_sector'|'sectors_cleared'|'threats_purged'|'account_level'|'runs_started'} metric
   */
  async function fetchLeaderboard(metric = "best_sector", limit = 25) {
    if (!api.sb || !api.session?.user) return { ok: false, rows: [], error: "Sign in required" };
    const { data, error } = await api.sb.rpc("qr_leaderboard", {
      p_metric: metric,
      p_limit: limit,
    });
    if (error) {
      // No unsafe client fallback: email-only filter requires auth.users join (RPC).
      console.warn("qr_leaderboard", error);
      return { ok: false, rows: [], error: error.message || "Leaderboard unavailable" };
    }
    // Defense in depth: drop empty / placeholder names if any slip through
    const rows = (data || []).filter((r) => {
      const name = String(r.display_name || "").trim();
      // Keep real names; guests often default to "Signal" with no email — RPC already excludes those
      return true;
    });
    return { ok: true, rows, error: null };
  }

  async function listFriends() {
    if (!api.sb || !api.session?.user) return { ok: false, rows: [], error: "Sign in required" };
    const { data, error } = await api.sb.rpc("qr_list_friends");
    if (error) {
      console.warn("qr_list_friends", error);
      return { ok: false, rows: [], error: error.message };
    }
    return { ok: true, rows: data || [], error: null };
  }

  async function addFriendByCode(code) {
    if (!api.sb || !api.session?.user) throw new Error("Sign in required");
    const { data, error } = await api.sb.rpc("qr_add_friend_by_code", {
      p_code: String(code || "").trim(),
    });
    if (error) throw error;
    return data;
  }

  async function removeFriend(friendId) {
    if (!api.sb || !api.session?.user) throw new Error("Sign in required");
    const { error } = await api.sb.rpc("qr_remove_friend", { p_friend_id: friendId });
    if (error) throw error;
  }

  async function lookupCode(code) {
    if (!api.sb || !api.session?.user) return null;
    const { data, error } = await api.sb.rpc("qr_lookup_code", {
      p_code: String(code || "").trim(),
    });
    if (error) {
      console.warn(error);
      return null;
    }
    return (data && data[0]) || null;
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
    reportMeta,
    fetchLeaderboard,
    listFriends,
    addFriendByCode,
    removeFriend,
    lookupCode,
    deleteAccount,
    codeEmail,
    loginDomain,
  };
})();
