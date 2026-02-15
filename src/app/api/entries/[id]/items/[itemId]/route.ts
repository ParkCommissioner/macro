import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { withAuth, AuthenticatedUser } from '@/lib/middleware';
import { APIErrorResponse } from '@/lib/types';

interface RouteParams {
  id: string;
  itemId: string;
}

// DELETE /api/entries/:id/items/:itemId - Remove a single item from an entry
async function deleteItem(
  req: NextRequest,
  user: AuthenticatedUser,
  params?: RouteParams
): Promise<NextResponse<null | APIErrorResponse>> {
  try {
    const entryId = params?.id;
    const itemId = params?.itemId;

    if (!entryId || !itemId) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Entry ID and Item ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verify entry ownership
    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: 'not_found', message: 'Entry not found' },
        { status: 404 }
      );
    }

    // Verify item belongs to this entry
    const { data: item, error: itemError } = await supabase
      .from('entry_items')
      .select('id')
      .eq('id', itemId)
      .eq('entry_id', entryId)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'not_found', message: 'Item not found' },
        { status: 404 }
      );
    }

    // Check how many items remain — if this is the last one, delete the whole entry
    const { count } = await supabase
      .from('entry_items')
      .select('id', { count: 'exact', head: true })
      .eq('entry_id', entryId);

    if (count !== null && count <= 1) {
      // Last item — delete the entire entry
      const { error: deleteEntryError } = await supabase
        .from('entries')
        .delete()
        .eq('id', entryId);

      if (deleteEntryError) {
        console.error('Failed to delete entry:', deleteEntryError);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to delete entry' },
          { status: 500 }
        );
      }
    } else {
      // Delete just the item
      const { error: deleteError } = await supabase
        .from('entry_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        console.error('Failed to delete item:', deleteError);
        return NextResponse.json(
          { error: 'internal_error', message: 'Failed to delete item' },
          { status: 500 }
        );
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth<RouteParams>(deleteItem);
