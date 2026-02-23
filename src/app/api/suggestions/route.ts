import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/middleware';
import {
  SuggestionsResponse,
  APIErrorResponse,
} from '@/lib/types';

interface SuggestionRow {
  raw_text: string;
  last_used: string;
  use_count: number;
}

// GET /api/suggestions - Get recent entries for quick re-logging
async function getSuggestions(
  req: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<SuggestionsResponse | APIErrorResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 20);
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    const supabase = getSupabaseClient();

    // Query for unique raw_text values with usage counts
    // Supabase doesn't support raw SQL easily, so we'll use a workaround
    // First, get all entries for this user, then aggregate in JS
    const { data: entries, error } = await supabase
      .from('entries')
      .select('raw_text, timestamp')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to fetch suggestions:', error);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch suggestions' },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Aggregate: group by raw_text, get max timestamp and count
    const suggestionMap: Map<string, { last_used: string; use_count: number }> = new Map();

    for (const entry of entries) {
      const existing = suggestionMap.get(entry.raw_text);
      if (!existing) {
        suggestionMap.set(entry.raw_text, {
          last_used: entry.timestamp,
          use_count: 1,
        });
      } else {
        existing.use_count++;
        if (entry.timestamp > existing.last_used) {
          existing.last_used = entry.timestamp;
        }
      }
    }

    // Filter by query if provided, sort by use_count descending (most popular first)
    const suggestions: SuggestionRow[] = Array.from(suggestionMap.entries())
      .map(([raw_text, data]) => ({
        raw_text,
        last_used: data.last_used,
        use_count: data.use_count,
      }))
      .filter((s) => !query || s.raw_text.toLowerCase().includes(query))
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, limit);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSuggestions);
