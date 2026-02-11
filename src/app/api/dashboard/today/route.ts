import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/middleware';
import { aggregateItems } from '@/lib/aggregation';
import {
  TodayDashboardResponse,
  APIErrorResponse,
  DBEntry,
  DBEntryItem,
  dbEntryItemToEntryItem,
} from '@/lib/types';

// GET /api/dashboard/today - Get aggregated nutritional totals for today
async function getTodayDashboard(
  req: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<TodayDashboardResponse | APIErrorResponse>> {
  try {
    const supabase = getSupabaseClient();

    // Get today's date in UTC
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Fetch today's entries
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('id, user_id, raw_text, timestamp, created_at')
      .eq('user_id', user.id)
      .gte('timestamp', startOfDay.toISOString())
      .lt('timestamp', endOfDay.toISOString())
      .order('timestamp', { ascending: false });

    if (entriesError) {
      console.error('Failed to fetch entries:', entriesError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch entries' },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        date: startOfDay.toISOString().split('T')[0],
        totals: {
          calories: { min: 0, mid: 0, max: 0 },
          protein: { min: 0, mid: 0, max: 0 },
          carbs: { min: 0, mid: 0, max: 0 },
          fat: { min: 0, mid: 0, max: 0 },
          fiber: { min: 0, mid: 0, max: 0 },
        },
        entries: [],
        entry_count: 0,
      });
    }

    // Fetch all items for today's entries
    const entryIds = entries.map((e: DBEntry) => e.id);
    const { data: allItems, error: itemsError } = await supabase
      .from('entry_items')
      .select<'*', DBEntryItem>('*')
      .in('entry_id', entryIds);

    if (itemsError) {
      console.error('Failed to fetch entry items:', itemsError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch entry items' },
        { status: 500 }
      );
    }

    // Group items by entry_id
    const itemsByEntryId: Record<string, DBEntryItem[]> = {};
    for (const item of allItems || []) {
      if (!itemsByEntryId[item.entry_id]) {
        itemsByEntryId[item.entry_id] = [];
      }
      itemsByEntryId[item.entry_id].push(item);
    }

    // Convert to API items
    const allApiItems = (allItems || []).map(dbEntryItemToEntryItem);

    // Calculate day totals
    const dayTotals = aggregateItems(allApiItems);

    // Build entry summaries
    const entrySummaries = entries.map((entry: DBEntry) => {
      const entryItems = (itemsByEntryId[entry.id] || []).map(dbEntryItemToEntryItem);
      const entryTotals = aggregateItems(entryItems);

      return {
        id: entry.id,
        raw_text: entry.raw_text,
        timestamp: entry.timestamp,
        totals: entryTotals,
        item_count: entryItems.length,
      };
    });

    return NextResponse.json({
      date: startOfDay.toISOString().split('T')[0],
      totals: dayTotals,
      entries: entrySummaries,
      entry_count: entries.length,
    });
  } catch (error) {
    console.error('Get today dashboard error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getTodayDashboard);
