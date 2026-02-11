import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

// Extract user from authorization header
export function getUserFromRequest(req: NextRequest): AuthenticatedUser | null {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    return {
      id: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

// Higher-order function to wrap protected API routes
export function withAuth<T extends object>(
  handler: (req: NextRequest, user: AuthenticatedUser, params?: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: { params: Promise<T> }): Promise<NextResponse> => {
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const params = context?.params ? await context.params : undefined;
    return handler(req, user, params);
  };
}
