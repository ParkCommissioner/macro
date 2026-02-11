import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { verifyPassword, generateToken } from '@/lib/auth';
import { LoginRequest, LoginResponse, APIErrorResponse, DBUser } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse<LoginResponse | APIErrorResponse>> {
  try {
    const body: LoginRequest = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, password_hash, created_at')
      .eq('email', email.toLowerCase())
      .single<DBUser>();

    if (findError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = generateToken({ id: user.id, email: user.email });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
