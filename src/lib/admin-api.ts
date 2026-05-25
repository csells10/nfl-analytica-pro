import { useQuery } from "@tanstack/react-query";
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
  game_count?: number;
  neutral_or_mixed_rate?: number;
}

export interface MatrixRow {
  core_area?: string;
  category?: string;
  feature?: string;
  label?: string;
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

export interface ClaimHealthResponse {
  run_id?: string;
  season?: number | string;
  generated_at?: string;
  available?: boolean;
  status?: string;
  coverage?: ClaimHealthCoverage;
  baseline?: ClaimHealthBaseline;
  section_metadata?: Record<string, unknown>;
  sections?: {
    core_area_matrix?: MatrixRow[];
    category_matrix?: MatrixRow[];
    confidence_core_area_matrix?: ConfidenceMatrixRow[];
    feature_scorecard?: MatrixRow[];
    surface_matrix?: MatrixRow[];
  };
}

// ---------- Fetch ----------

async function fetchClaimHealth(runId: string, season: string): Promise<ClaimHealthResponse> {
  const token = await getAuthToken();
  if (!token) throw new ApiError("unauthenticated", "Not signed in", 401);

  const url = `${API_BASE}/admin/gamelens/claim-health?run_id=${encodeURIComponent(runId)}&season=${encodeURIComponent(season)}`;

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

export function useClaimHealth(runId: string, season: string) {
  return useQuery({
    queryKey: ["admin-claim-health", runId, season],
    queryFn: () => fetchClaimHealth(runId, season),
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

