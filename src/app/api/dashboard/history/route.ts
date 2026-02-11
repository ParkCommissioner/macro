import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/middleware';
import {
  HistoryDashboardResponse,
  APIErrorResponse,
  DailySummary,
} from '@/lib/types';

interface DailyAggregateRow {
  date: string;
  entry_count: number;
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
}

// GET /api/dashboard/history - Get daily aggregated totals for charting
async function getHistoryDashboard(
  req: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<HistoryDashboardResponse | APIErrorResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 365);

    const supabase = getSupabaseClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Use raw SQL for efficient aggregation
    const { data, error } = await supabase.rpc('get_daily_aggregates', {
      p_user_id: user.id,
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    // If the RPC doesn't exist, fall back to manual query
    if (error && error.message.includes('function')) {
      // Fallback: fetch entries and aggregate in JS
      const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('id, timestamp')
        .eq('user_id', user.id)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (entriesError || !entries) {
        console.error('Failed to fetch entries:', entriesError);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to fetch history' },
          { status: 500 }
        );
      }

      if (entries.length === 0) {
        return NextResponse.json({
          days: [],
          period: {
            from: startDate.toISOString().split('T')[0],
            to: endDate.toISOString().split('T')[0],
          },
        });
      }

      const entryIds = entries.map((e) => e.id);
      const { data: items, error: itemsError } = await supabase
        .from('entry_items')
        .select('entry_id, calories_min, calories_mid, calories_max, protein_min, protein_mid, protein_max, carbs_min, carbs_mid, carbs_max, fat_min, fat_mid, fat_max, fiber_min, fiber_mid, fiber_max')
        .in('entry_id', entryIds);

      if (itemsError) {
        console.error('Failed to fetch items:', itemsError);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to fetch history' },
          { status: 500 }
        );
      }

      // Group entries by date
      const entriesByDate: Record<string, string[]> = {};
      for (const entry of entries) {
        const date = new Date(entry.timestamp).toISOString().split('T')[0];
        if (!entriesByDate[date]) {
          entriesByDate[date] = [];
        }
        entriesByDate[date].push(entry.id);
      }

      // Group items by entry_id
      const itemsByEntryId: Record<string, typeof items> = {};
      for (const item of items || []) {
        if (!itemsByEntryId[item.entry_id]) {
          itemsByEntryId[item.entry_id] = [];
        }
        itemsByEntryId[item.entry_id].push(item);
      }

      // Aggregate by date
      const dailySummaries: DailySummary[] = Object.entries(entriesByDate)
        .map(([date, entryIds]) => {
          const dayItems = entryIds.flatMap((id) => itemsByEntryId[id] || []);

          return {
            date,
            totals: {
              calories: {
                min: dayItems.reduce((s, i) => s + Number(i.calories_min), 0),
                mid: dayItems.reduce((s, i) => s + Number(i.calories_mid), 0),
                max: dayItems.reduce((s, i) => s + Number(i.calories_max), 0),
              },
              protein: {
                min: dayItems.reduce((s, i) => s + Number(i.protein_min), 0),
                mid: dayItems.reduce((s, i) => s + Number(i.protein_mid), 0),
                max: dayItems.reduce((s, i) => s + Number(i.protein_max), 0),
              },
              carbs: {
                min: dayItems.reduce((s, i) => s + Number(i.carbs_min), 0),
                mid: dayItems.reduce((s, i) => s + Number(i.carbs_mid), 0),
                max: dayItems.reduce((s, i) => s + Number(i.carbs_max), 0),
              },
              fat: {
                min: dayItems.reduce((s, i) => s + Number(i.fat_min), 0),
                mid: dayItems.reduce((s, i) => s + Number(i.fat_mid), 0),
                max: dayItems.reduce((s, i) => s + Number(i.fat_max), 0),
              },
              fiber: {
                min: dayItems.reduce((s, i) => s + Number(i.fiber_min), 0),
                mid: dayItems.reduce((s, i) => s + Number(i.fiber_mid), 0),
                max: dayItems.reduce((s, i) => s + Number(i.fiber_max), 0),
              },
            },
            entry_count: entryIds.length,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      return NextResponse.json({
        days: dailySummaries,
        period: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
      });
    }

    // If RPC worked, use its data
    if (error) {
      console.error('Failed to get daily aggregates:', error);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    const dailySummaries: DailySummary[] = (data as DailyAggregateRow[] || []).map((row) => ({
      date: row.date,
      totals: {
        calories: { min: row.calories_min, mid: row.calories_mid, max: row.calories_max },
        protein: { min: row.protein_min, mid: row.protein_mid, max: row.protein_max },
        carbs: { min: row.carbs_min, mid: row.carbs_mid, max: row.carbs_max },
        fat: { min: row.fat_min, mid: row.fat_mid, max: row.fat_max },
        fiber: { min: row.fiber_min, mid: row.fiber_mid, max: row.fiber_max },
      },
      entry_count: row.entry_count,
    }));

    return NextResponse.json({
      days: dailySummaries,
      period: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Get history dashboard error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getHistoryDashboard);
