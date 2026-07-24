import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CreateAdminPayload {
  email?: string;
  password?: string;
  fullName?: string;
  department?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError('Supabase public environment variables are not configured.', 500);
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return jsonError('Admin session is required.', 401);
  }

  if (!supabaseServiceRoleKey) {
    return jsonError(
      'SUPABASE_SERVICE_ROLE_KEY is required. Add it to .env.local and restart the server.',
      500
    );
  }

  // Verify the requester is an admin
  const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: requester, error: requesterError } = await publicClient.auth.getUser(token);

  if (requesterError || !requester.user) {
    return jsonError('Admin session could not be verified.', 401);
  }

  if (requester.user.user_metadata?.role !== 'ADMIN') {
    return jsonError('Only admin accounts can create other admin accounts.', 403);
  }

  let payload: CreateAdminPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Invalid request payload.', 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const fullName = payload.fullName?.trim();
  const department = payload.department?.trim() || 'SIWES Unit';

  if (!email || !password || !fullName) {
    return jsonError('Email, password, and full name are required.', 400);
  }

  if (password.length < 6) {
    return jsonError('Password must be at least 6 characters.', 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Create the new admin user
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'ADMIN',
      role_data: {
        department,
        designation: 'SIWES Administrator',
      },
    },
  });

  if (createError || !createdUser.user) {
    return jsonError(createError?.message || 'Could not create admin user.', 400);
  }

  // Create the profile row
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: createdUser.user.id,
        full_name: fullName,
        role: 'ADMIN',
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return jsonError(profileError.message || 'Could not create admin profile.', 400);
  }

  return NextResponse.json({
    admin: {
      id: createdUser.user.id,
      fullName,
      email,
      department,
      role: 'ADMIN' as const,
      createdAt: createdUser.user.created_at,
    },
  });
}

// GET: List all admin users
export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError('Supabase public environment variables are not configured.', 500);
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return jsonError('Admin session is required.', 401);
  }

  const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: requester, error: requesterError } = await publicClient.auth.getUser(token);

  if (requesterError || !requester.user) {
    return jsonError('Admin session could not be verified.', 401);
  }

  if (requester.user.user_metadata?.role !== 'ADMIN') {
    return jsonError('Only admin accounts can list admins.', 403);
  }

  // Fetch admin profiles from the profiles table
  const { data: adminProfiles, error: profilesError } = await publicClient
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('role', 'ADMIN')
    .order('created_at', { ascending: true });

  if (profilesError) {
    return jsonError(profilesError.message || 'Could not fetch admin list.', 500);
  }

  return NextResponse.json({
    admins: (adminProfiles || []).map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
      createdAt: profile.created_at,
    })),
  });
}
