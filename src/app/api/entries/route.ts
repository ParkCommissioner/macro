import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/middleware';
import { parseFoodWithLLM } from '@/lib/llm';
import { aggregateItems } from '@/lib/aggregation';
import {
  CreateEntryRequest,
  CreateEntryResponse,
  GetEntriesResponse,
  APIErrorResponse,
  DBEntry,
  DBEntryItem,
  dbEntryItemToEntryItem,
  LLMParsedItem,
} from '@/lib/types';

// POST /api/entries - Create a new entry
async function createEntry(
  req: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<CreateEntryResponse | APIErrorResponse>> {
  try {
    const body: CreateEntryRequest = await req.json();
    const { raw_text, timestamp } = body;

    // Validate raw_text
    if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'raw_text is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Parse timestamp or use current time
    const entryTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    // Call Claude Haiku to parse the food
    let parsedFood;
    try {
      parsedFood = await parseFoodWithLLM(raw_text.trim());
    } catch (error) {
      console.error('LLM parsing error:', error);
      return NextResponse.json(
        { error: 'llm_error', message: 'Failed to parse food description' },
        { status: 502 }
      );
    }

    const supabase = getSupabaseClient();

    // Insert entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .insert({
        user_id: user.id,
        raw_text: raw_text.trim(),
        timestamp: entryTimestamp,
      })
      .select('id, user_id, raw_text, timestamp, created_at')
      .single<DBEntry>();

    if (entryError || !entry) {
      console.error('Failed to create entry:', entryError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to create entry' },
        { status: 500 }
      );
    }

    // Insert items
    const itemsToInsert = parsedFood.items.map((item: LLMParsedItem) => ({
      entry_id: entry.id,
      name: item.name,
      calories_min: item.calories.min,
      calories_mid: item.calories.mid,
      calories_max: item.calories.max,
      protein_min: item.protein.min,
      protein_mid: item.protein.mid,
      protein_max: item.protein.max,
      carbs_min: item.carbs.min,
      carbs_mid: item.carbs.mid,
      carbs_max: item.carbs.max,
      fat_min: item.fat.min,
      fat_mid: item.fat.mid,
      fat_max: item.fat.max,
      fiber_min: item.fiber.min,
      fiber_mid: item.fiber.mid,
      fiber_max: item.fiber.max,
      confidence: item.confidence,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('entry_items')
      .insert(itemsToInsert)
      .select<'*', DBEntryItem>('*');

    if (itemsError || !insertedItems) {
      console.error('Failed to create entry items:', itemsError);
      // Rollback the entry
      await supabase.from('entries').delete().eq('id', entry.id);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to create entry items' },
        { status: 500 }
      );
    }

    // Convert DB items to API format
    const items = insertedItems.map(dbEntryItemToEntryItem);

    // Calculate totals
    const totals = aggregateItems(items);

    return NextResponse.json(
      {
        entry: {
          id: entry.id,
          user_id: entry.user_id,
          raw_text: entry.raw_text,
          timestamp: entry.timestamp,
          created_at: entry.created_at,
        },
        items,
        totals,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create entry error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET /api/entries - List entries with optional date filtering
async function getEntries(
  req: NextRequest,
  user: AuthenticatedUser
): Promise<NextResponse<GetEntriesResponse | APIErrorResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = getSupabaseClient();

    // Build query
    let query = supabase
      .from('entries')
      .select('id, user_id, raw_text, timestamp, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false });

    if (from) {
      query = query.gte('timestamp', new Date(from).toISOString());
    }
    if (to) {
      query = query.lte('timestamp', new Date(to).toISOString());
    }

    query = query.range(offset, offset + limit - 1);

    const { data: entries, error: entriesError, count } = await query;

    if (entriesError) {
      console.error('Failed to fetch entries:', entriesError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch entries' },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({
        entries: [],
        total: 0,
        has_more: false,
      });
    }

    // Fetch items for all entries
    const entryIds = entries.map((e) => e.id);
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

    // Build response
    const entriesWithItems = entries.map((entry) => ({
      ...entry,
      items: (itemsByEntryId[entry.id] || []).map(dbEntryItemToEntryItem),
    }));

    const total = count || 0;
    const has_more = offset + entries.length < total;

    return NextResponse.json({
      entries: entriesWithItems,
      total,
      has_more,
    });
  } catch (error) {
    console.error('Get entries error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createEntry);
export const GET = withAuth(getEntries);
