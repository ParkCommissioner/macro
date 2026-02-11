import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/middleware';
import { parseFoodWithLLM } from '@/lib/llm';
import { aggregateItems } from '@/lib/aggregation';
import {
  GetEntryResponse,
  UpdateEntryRequest,
  CreateEntryResponse,
  APIErrorResponse,
  DBEntry,
  DBEntryItem,
  dbEntryItemToEntryItem,
  LLMParsedItem,
} from '@/lib/types';

interface RouteParams {
  id: string;
}

// GET /api/entries/:id - Get a single entry with its items
async function getEntry(
  req: NextRequest,
  user: AuthenticatedUser,
  params?: RouteParams
): Promise<NextResponse<GetEntryResponse | APIErrorResponse>> {
  try {
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch entry
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id, user_id, raw_text, timestamp, created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single<DBEntry>();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'not_found', message: 'Entry not found' },
        { status: 404 }
      );
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('entry_items')
      .select<'*', DBEntryItem>('*')
      .eq('entry_id', id);

    if (itemsError) {
      console.error('Failed to fetch entry items:', itemsError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to fetch entry items' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entry: {
        ...entry,
        items: (items || []).map(dbEntryItemToEntryItem),
      },
    });
  } catch (error) {
    console.error('Get entry error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/entries/:id - Update an entry's raw text and re-parse with LLM
async function updateEntry(
  req: NextRequest,
  user: AuthenticatedUser,
  params?: RouteParams
): Promise<NextResponse<CreateEntryResponse | APIErrorResponse>> {
  try {
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const body: UpdateEntryRequest = await req.json();
    const { raw_text, timestamp } = body;

    if (!raw_text || typeof raw_text !== 'string' || raw_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'raw_text is required and cannot be empty' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verify ownership
    const { data: existingEntry, error: existingError } = await supabase
      .from('entries')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (existingError || !existingEntry) {
      return NextResponse.json(
        { error: 'not_found', message: 'Entry not found' },
        { status: 404 }
      );
    }

    // Delete existing items
    const { error: deleteError } = await supabase
      .from('entry_items')
      .delete()
      .eq('entry_id', id);

    if (deleteError) {
      console.error('Failed to delete existing items:', deleteError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to update entry' },
        { status: 500 }
      );
    }

    // Parse new text with LLM
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

    // Update entry
    const updateData: Record<string, string> = { raw_text: raw_text.trim() };
    if (timestamp) {
      updateData.timestamp = new Date(timestamp).toISOString();
    }

    const { data: entry, error: updateError } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', id)
      .select('id, user_id, raw_text, timestamp, created_at')
      .single<DBEntry>();

    if (updateError || !entry) {
      console.error('Failed to update entry:', updateError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to update entry' },
        { status: 500 }
      );
    }

    // Insert new items
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
      console.error('Failed to insert new items:', itemsError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to update entry items' },
        { status: 500 }
      );
    }

    // Convert DB items to API format
    const items = insertedItems.map(dbEntryItemToEntryItem);

    // Calculate totals
    const totals = aggregateItems(items);

    return NextResponse.json({
      entry: {
        id: entry.id,
        user_id: entry.user_id,
        raw_text: entry.raw_text,
        timestamp: entry.timestamp,
        created_at: entry.created_at,
      },
      items,
      totals,
    });
  } catch (error) {
    console.error('Update entry error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/entries/:id - Delete an entry and its items
async function deleteEntry(
  req: NextRequest,
  user: AuthenticatedUser,
  params?: RouteParams
): Promise<NextResponse<null | APIErrorResponse>> {
  try {
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verify ownership before deleting
    const { data: existingEntry, error: existingError } = await supabase
      .from('entries')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (existingError || !existingEntry) {
      return NextResponse.json(
        { error: 'not_found', message: 'Entry not found' },
        { status: 404 }
      );
    }

    // Delete entry (cascade will delete items due to foreign key)
    const { error: deleteError } = await supabase
      .from('entries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete entry:', deleteError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to delete entry' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete entry error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const GET = withAuth<RouteParams>(getEntry);
export const PUT = withAuth<RouteParams>(updateEntry);
export const DELETE = withAuth<RouteParams>(deleteEntry);
