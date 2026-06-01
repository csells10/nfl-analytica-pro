import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type ClaimHealthGrain = "week" | "day" | "season_phase";
export const CLAIM_HEALTH_GRAINS: ClaimHealthGrain[] = ["week", "day", "season_phase"];
export function isClaimHealthGrain(v: unknown): v is ClaimHealthGrain {
  return typeof v === "string" && (CLAIM_HEALTH_GRAINS as string[]).includes(v);
}
import { getAuthToken, firebaseAuth } from "@/lib/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import { ApiError, API_BASE } from "@/lib/nfl-api";

// ---------- Types ----------

export interface ClaimHealthCoverage {
  expected_games?: number;
  games_with_claims?: number;
  games_without_claims?: number;
  claim_row_count?: number;
  neutral_or_mixed_rate?: number;
  context_note?: string;
}

export interface ClaimHealthBaseline {
  validation_rate?: number;
  claim_row_count?: number;
  eligible_claim_row_count?: number;
  game_count?: number;
  validated_count?: number;
  not_validated_count?: number;
  neutral_or_mixed_count?: number;
  unavailable_count?: number;
  neutral_or_mixed_rate?: number;
}

export interface MatrixRow {
  core_area?: string;
  category?: string;
  feature?: string;
  label?: string;
  bucket?: string;
  strength?: string;
  claim_type?: string;
  claim_layer?: string;
  validation_rate?: number | null;
  claim_row_count?: number;
  game_count?: number;
  neutral_or_mixed_rate?: number | null;
}

export interface ConfidenceMatrixRow {
  core_area?: string;
  high?: { validation_rate?: number | null; claim_row_count?: number };
  medium?: { validation_rate?: number | null; claim_row_count?: number };
  low?: { validation_rate?: number | null; claim_row_count?: number };
  // Tolerate flat shapes too
  [k: string]: unknown;
}

// ---- New section row types (all optional; defensive rendering) ----

export interface CalibrationOverTimeRow {
  period_label?: string;
  period_start?: string;
  period_end?: string;
  grain?: string;
  season_phase?: string;
  claim_rows?: number;
  eligible_claim_rows?: number;
  validated_claims?: number;
  not_validated_claims?: number;
  neutral_mixed_claims?: number;
  unavailable_claims?: number;
  claim_validation_rate?: number | null;
  games_total?: number;
  games_with_claims?: number;
  games_with_pick?: number;
  correct_picks?: number;
  incorrect_picks?: number;
  no_pick_games?: number;
  game_pick_correct_rate?: number | null;
  selected_segment_label?: string;
  selected_segment_claim_rows?: number;
  selected_segment_validation_rate?: number | null;
  selected_segment_lift_vs_claim_baseline?: number | null;
}

export interface GameLevelCalibrationRow {
  profile_strength_label?: string;
  outcome_confidence_label?: string;
  game_count?: number;
  correct_count?: number;
  incorrect_count?: number;
  no_pick_count?: number;
  correct_rate?: number | null;
  incorrect_rate?: number | null;
  no_pick_rate?: number | null;
  avg_final_margin_abs?: number | null;
  close_miss_count?: number;
  severe_miss_count?: number;
}

export interface CoreAreaAlignmentRow {
  profile_type?: string;
  outcome_confidence_label?: string;
  game_count?: number;
  correct_rate?: number | null;
  avg_core_gap?: number | null;
  avg_signal_gap?: number | null;
  avg_final_margin_abs?: number | null;
}

export interface PillarHealthRow {
  core_area?: string;
  category?: string;
  claim_rows?: number;
  eligible_claim_rows?: number;
  validated_claims?: number;
  validation_rate?: number | null;
  neutral_mixed_rate?: number | null;
  not_validated_rate?: number | null;
  lift_vs_claim_baseline?: number | null;
  games_represented?: number;
}

export interface PillarWeeklyHealthRow {
  game_week?: string | number;
  games_total?: number;
  games_with_claims?: number;
  claim_rows?: number;
  claim_validation_rate?: number | null;
  game_pick_correct_rate?: number | null;
  no_pick_rate?: number | null;
  avg_confidence?: number | null;
  top_core_area?: string;
  weakest_core_area?: string;
}

export interface FeatureHealthRow {
  feature_group?: string;
  feature_family?: string;
  bucket_or_group?: string;
  claim_rows?: number;
  eligible_claim_rows?: number;
  games_represented?: number;
  validation_rate?: number | null;
  lift_vs_claim_baseline?: number | null;
  neutral_mixed_rate?: number | null;
  not_validated_rate?: number | null;
  sample_warning?: string;
}

export interface TabSpec {
  id: string;
  label?: string;
  description?: string;
  sections?: string[];
}

export interface SectionMeta {
  title?: string;
  description?: string;
  chart_type?: string;
  primary_metric?: string;
  tab_id?: string;
  supported_grains?: string[];
  grain_default?: string;
  compatibility?: string;
  section_role?: string;
}

export interface FormulaNote {
  meaning?: string;
  formula?: string;
  note?: string;
}

export interface SeasonPhaseGroup {
  label?: string;
  weeks?: Array<string | number>;
  description?: string;
}

export interface ClaimHealthResponse {
  run_id?: string;
  season?: number | string;
  generated_at?: string;
  available?: boolean;
  status?: string;
  scope?: string;
  default_tab?: string;
  tabs?: TabSpec[];
  formula_notes?: Record<string, FormulaNote>;
  season_phase_groups?: Record<string, SeasonPhaseGroup>;
  coverage?: ClaimHealthCoverage;
  baseline?: ClaimHealthBaseline;
  section_metadata?: Record<string, SectionMeta>;
  sections?: {
    // New
    calibration_over_time?: CalibrationOverTimeRow[];
    game_level_calibration?: GameLevelCalibrationRow[];
    core_area_alignment_matrix?: CoreAreaAlignmentRow[];
    pillar_health_matrix?: PillarHealthRow[];
    pillar_weekly_health?: PillarWeeklyHealthRow[];
    feature_health_matrix?: FeatureHealthRow[];
    // Legacy (preserved)
    core_area_matrix?: MatrixRow[];
    category_matrix?: MatrixRow[];
    confidence_core_area_matrix?: ConfidenceMatrixRow[];
    feature_scorecard?: MatrixRow[];
    surface_matrix?: MatrixRow[];
  };
}

// ---------- Fetch ----------

async function fetchClaimHealth(
  runId: string,
  season: string,
  grain?: ClaimHealthGrain,
): Promise<ClaimHealthResponse> {
  const token = await getAuthToken();
  if (!token) throw new ApiError("unauthenticated", "Not signed in", 401);

  const params = new URLSearchParams({ run_id: runId, season });
  if (grain) params.set("grain", grain);
  const url = `${API_BASE}/admin/gamelens/claim-health?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    console.error("[admin-api] network error:", err);
    throw new ApiError("network", "Network error");
  }

  if (res.status === 401) {
    firebaseSignOut(firebaseAuth).catch(() => {});
    throw new ApiError("unauthenticated", "Session expired", 401);
  }
  if (res.status === 403) {
    throw new ApiError("forbidden", "Admin access required", 403);
  }
  if (!res.ok) {
    throw new ApiError(res.status >= 500 ? "server" : "unknown", `Request failed (${res.status})`, res.status);
  }

  try {
    return (await res.json()) as ClaimHealthResponse;
  } catch {
    throw new ApiError("server", "Invalid response", res.status);
  }
}

export function useClaimHealth(runId: string, season: string, grain?: ClaimHealthGrain) {
  return useQuery({
    queryKey: ["admin-claim-health", runId, season, grain ?? "default"],
    queryFn: () => fetchClaimHealth(runId, season, grain),
    placeholderData: keepPreviousData,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.kind === "forbidden" || err.kind === "unauthenticated")) return false;
      return count < 1;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- /me (authenticated user context) ----------

export interface MeResponse {
  email?: string;
  role?: string;
  active?: boolean;
  is_admin?: boolean;
}

async function fetchMe(): Promise<MeResponse> {
  const token = await getAuthToken();
  if (!token) throw new ApiError("unauthenticated", "Not signed in", 401);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError("network", "Network error");
  }

  if (res.status === 401) throw new ApiError("unauthenticated", "Not signed in", 401);
  if (res.status === 403) throw new ApiError("forbidden", "Forbidden", 403);
  if (!res.ok) throw new ApiError(res.status >= 500 ? "server" : "unknown", `Request failed (${res.status})`, res.status);

  try {
    return (await res.json()) as MeResponse;
  } catch {
    throw new ApiError("server", "Invalid response", res.status);
  }
}

/**
 * Authenticated user context (email/role/isAdmin). Used only for UX
 * affordances like the Admin nav tab. The backend remains the source of
 * truth for actual admin-route authorization via require_admin_auth.
 */
export function useMe(enabled: boolean = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.kind === "forbidden" || err.kind === "unauthenticated")) return false;
      return count < 1;
    },
    staleTime: 5 * 60 * 1000,
  });
}

