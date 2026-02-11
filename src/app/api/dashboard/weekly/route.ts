import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/middleware';
import { computeWeeklyAverage, emptyTotals } from '@/lib/aggregation';
import {
  WeeklySummaryResponse,
  APIErrorResponse,
  DailySummary,
} from '@/lib/types';

// Helper to get Monday of the current week
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Helper to get Sunday of the current week
function getWeekEnd(date: Date): Date {
  const monday = getWeekStart(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return sunday;
}

// GET /api/dashboard/weekly - Get weekly summary with averages
async function getWeeklySummary(
  req: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<WeeklySummaryResponse | APIErrorResponse>> {
  try {
    const supabase = getSupabaseClient();

    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(today);

    // Set time for proper range query
    weekStart.setHours(0, 0, 0, 0);
    const weekEndQuery = new Date(weekEnd);
    weekEndQuery.setHours(23, 59, 59, 999);

    // Fetch entries for the week
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('id, timestamp')
      .eq('user_id', user.id)
      .gte('timestamp', weekStart.toISOString())
      .lte('timestamp', weekEndQuery.toISOString());

    if (entriesError) {
      console.error('Failed to fetch entries:', entriesError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch weekly summary' },
        { status: 500 }
      );
    }

    const emptyResponse: WeeklySummaryResponse = {
      week: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      },
      averages: emptyTotals(),
      daily_ranges: {
        calories: { min: 0, max: 0 },
        protein: { min: 0, max: 0 },
        carbs: { min: 0, max: 0 },
        fat: { min: 0, max: 0 },
        fiber: { min: 0, max: 0 },
      },
      days_logged: 0,
      consistency_score: 0,
    };

    if (!entries || entries.length === 0) {
      return NextResponse.json(emptyResponse);
    }

    // Fetch items for all entries
    const entryIds = entries.map((e) => e.id);
    const { data: items, error: itemsError } = await supabase
      .from('entry_items')
      .select('entry_id, calories_min, calories_mid, calories_max, protein_min, protein_mid, protein_max, carbs_min, carbs_mid, carbs_max, fat_min, fat_mid, fat_max, fiber_min, fiber_mid, fiber_max')
      .in('entry_id', entryIds);

    if (itemsError) {
      console.error('Failed to fetch items:', itemsError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch weekly summary' },
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
    const dailySummaries: DailySummary[] = Object.entries(entriesByDate).map(([date, entryIds]) => {
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
    });

    // Compute weekly averages
    const { averages, daily_ranges } = computeWeeklyAverage(dailySummaries);

    // Count unique days logged
    const days_logged = dailySummaries.length;

    // Consistency score: percentage of days with entries (out of 7)
    const consistency_score = Math.round((days_logged / 7) * 100);

    return NextResponse.json({
      week: {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      },
      averages,
      daily_ranges,
      days_logged,
      consistency_score,
    });
  } catch (error) {
    console.error('Get weekly summary error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getWeeklySummary);
