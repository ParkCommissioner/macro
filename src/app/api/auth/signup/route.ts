import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { hashPassword, generateToken, isValidEmail, isValidPassword } from '@/lib/auth';
import { SignupRequest, SignupResponse, APIErrorResponse } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse<SignupResponse | APIErrorResponse>> {
  try {
    const body: SignupRequest = await req.json();
    const { email, password } = body;

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (!password || !isValidPassword(password)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'conflict', message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Insert user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ email: email.toLowerCase(), password_hash })
      .select('id, email, created_at')
      .single();

    if (insertError || !newUser) {
      console.error('Failed to create user:', insertError);
      return NextResponse.json(
        { error: 'internal_error', message: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate JWT
    const token = generateToken({ id: newUser.id, email: newUser.email });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          created_at: newUser.created_at,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
