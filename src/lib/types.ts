// User type (never expose password_hash to client)
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// Nutritional range type
export interface NutritionalRange {
  min: number;
  mid: number;
  max: number;
}

// Confidence levels
export type Confidence = 'low' | 'medium' | 'high';

// Entry item (parsed food item)
export interface EntryItem {
  id: string;
  entry_id: string;
  name: string;
  calories: NutritionalRange;
  protein: NutritionalRange;
  carbs: NutritionalRange;
  fat: NutritionalRange;
  fiber: NutritionalRange;
  confidence: Confidence;
  created_at: string;
}

// Entry (user's food log entry)
export interface Entry {
  id: string;
  user_id: string;
  raw_text: string;
  timestamp: string; // ISO 8601
  created_at: string;
  items?: EntryItem[]; // Included when fetching with items
}

// LLM response shape (raw from Claude)
export interface LLMParsedItem {
  name: string;
  calories: NutritionalRange;
  protein: NutritionalRange;
  carbs: NutritionalRange;
  fat: NutritionalRange;
  fiber: NutritionalRange;
  confidence: Confidence;
}

export interface LLMParsedFood {
  items: LLMParsedItem[];
}

// Aggregated totals (for dashboard)
export interface NutritionalTotals {
  calories: NutritionalRange;
  protein: NutritionalRange;
  carbs: NutritionalRange;
  fat: NutritionalRange;
  fiber: NutritionalRange;
}

// Daily summary
export interface DailySummary {
  date: string; // YYYY-MM-DD
  totals: NutritionalTotals;
  entry_count: number;
}

// JWT Payload
export interface JWTPayload {
  sub: string;      // User ID (UUID)
  email: string;    // User email
  iat: number;      // Issued at (Unix timestamp)
  exp: number;      // Expiration (Unix timestamp)
}

// API Request/Response Types
export interface SignupRequest {
  email: string;
  password: string;
}

export interface SignupResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CreateEntryRequest {
  raw_text: string;
  timestamp?: string;
}

export interface CreateEntryResponse {
  entry: Entry;
  items: EntryItem[];
  totals: NutritionalTotals;
}

export interface GetEntriesResponse {
  entries: (Entry & { items: EntryItem[] })[];
  total: number;
  has_more: boolean;
}

export interface GetEntryResponse {
  entry: Entry & { items: EntryItem[] };
}

export interface UpdateEntryRequest {
  raw_text: string;
  timestamp?: string;
}

export interface TodayDashboardResponse {
  date: string;
  totals: NutritionalTotals;
  entries: Array<{
    id: string;
    raw_text: string;
    timestamp: string;
    totals: NutritionalTotals;
    item_count: number;
  }>;
  entry_count: number;
}

export interface HistoryDashboardResponse {
  days: DailySummary[];
  period: {
    from: string;
    to: string;
  };
}

export interface WeeklySummaryResponse {
  week: {
    start: string;
    end: string;
  };
  averages: NutritionalTotals;
  daily_ranges: {
    calories: { min: number; max: number };
    protein: { min: number; max: number };
    carbs: { min: number; max: number };
    fat: { min: number; max: number };
    fiber: { min: number; max: number };
  };
  days_logged: number;
  consistency_score: number;
}

export interface SuggestionsResponse {
  suggestions: Array<{
    raw_text: string;
    last_used: string;
    use_count: number;
  }>;
}

// API Error Response
export interface APIErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

// Database row types (from Supabase)
export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface DBEntry {
  id: string;
  user_id: string;
  raw_text: string;
  timestamp: string;
  created_at: string;
}

export interface DBEntryItem {
  id: string;
  entry_id: string;
  name: string;
  calories_min: number;
  calories_mid: number;
  calories_max: number;
  protein_min: number;
  protein_mid: number;
  protein_max: number;
  carbs_min: number;
  carbs_mid: number;
  carbs_max: number;
  fat_min: number;
  fat_mid: number;
  fat_max: number;
  fiber_min: number;
  fiber_mid: number;
  fiber_max: number;
  confidence: Confidence;
  created_at: string;
}

// Helper to convert DB row to API format
export function dbEntryItemToEntryItem(row: DBEntryItem): EntryItem {
  return {
    id: row.id,
    entry_id: row.entry_id,
    name: row.name,
    calories: { min: row.calories_min, mid: row.calories_mid, max: row.calories_max },
    protein: { min: row.protein_min, mid: row.protein_mid, max: row.protein_max },
    carbs: { min: row.carbs_min, mid: row.carbs_mid, max: row.carbs_max },
    fat: { min: row.fat_min, mid: row.fat_mid, max: row.fat_max },
    fiber: { min: row.fiber_min, mid: row.fiber_mid, max: row.fiber_max },
    confidence: row.confidence,
    created_at: row.created_at,
  };
}
