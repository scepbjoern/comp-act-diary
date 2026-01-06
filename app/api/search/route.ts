/**
 * API Route for global full-text search.
 * Searches across all entity types with optional filtering.
 * 
 * GET /api/search?q={query}&types[]={type}&limit={limit}
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { searchQuerySchema } from '@/lib/validators/search';
import { getSearchService } from '@/lib/services/searchService';
import type { SearchError } from '@/types/search';

// Get user ID from cookie (same pattern as other routes)
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('userId')?.value || null;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const userId = await getUserId();
    if (!userId) {
      const error: SearchError = {
        error: 'Nicht authentifiziert',
        code: 'UNAUTHORIZED',
      };
      return NextResponse.json(error, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawQuery = {
      q: searchParams.get('q') || '',
      types: searchParams.getAll('types'),
      limit: searchParams.get('limit') || '20',
    };

    // Handle types[] format (common in form submissions)
    if (rawQuery.types.length === 0) {
      const typesArray = searchParams.getAll('types[]');
      if (typesArray.length > 0) {
        rawQuery.types = typesArray;
      }
    }

    // 3. Validate with Zod
    const validationResult = searchQuerySchema.safeParse(rawQuery);
    
    if (!validationResult.success) {
      const error: SearchError = {
        error: validationResult.error.errors[0]?.message || 'Ungültige Suchanfrage',
        code: 'INVALID_QUERY',
      };
      return NextResponse.json(error, { status: 400 });
    }

    const { q, types, limit } = validationResult.data;

    // 4. Execute search
    const searchService = getSearchService();
    const results = await searchService.search({
      query: q,
      types,
      limit,
      userId,
    });

    // 5. Return results
    return NextResponse.json(results);

  } catch (error) {
    console.error('Search API error:', error);
    
    const errorResponse: SearchError = {
      error: 'Ein Fehler ist bei der Suche aufgetreten',
      code: 'SERVER_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
