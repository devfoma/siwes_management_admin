import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_ADMIN_EMAIL = 'admin@siwesconnect.edu.ng';
const DEFAULT_ADMIN_PASSWORD = 'SIWESAdmin2025!';
const DEFAULT_ADMIN_NAME = 'SIWES Root Administrator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST() {
  if (!supabaseUrl) {
    return jsonError('Supabase URL is not configured.', 500);
  }

  if (!supabaseServiceRoleKey) {
    return jsonError(
      'SUPABASE_SERVICE_ROLE_KEY is required to seed the default admin. Add it to .env.local and restart the server.',
      500
    );
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Check if the default admin already exists
  const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    return jsonError(`Could not check existing users: ${listError.message}`, 500);
  }

  const existingAdmin = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()
  );

  if (existingAdmin) {
    // Admin already exists — ensure profile rows exist too
    await adminClient
      .from('profiles')
      .upsert(
        {
          id: existingAdmin.id,
          full_name: existingAdmin.user_metadata?.full_name || DEFAULT_ADMIN_NAME,
          role: 'ADMIN',
        },
        { onConflict: 'id' }
      );

    return NextResponse.json({
      message: 'Default admin account already exists.',
      admin: {
        email: DEFAULT_ADMIN_EMAIL,
        alreadyExisted: true,
      },
    });
  }

  // Create the default admin user
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: DEFAULT_ADMIN_NAME,
      role: 'ADMIN',
      role_data: {
        department: 'SIWES Directorate',
        designation: 'Root Administrator',
      },
    },
  });

  if (createError || !createdUser.user) {
    return jsonError(createError?.message || 'Could not create default admin user.', 400);
  }

  // Create the profile row
  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: createdUser.user.id,
        full_name: DEFAULT_ADMIN_NAME,
        role: 'ADMIN',
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    return jsonError(`Admin user created but profile sync failed: ${profileError.message}`, 500);
  }

  return NextResponse.json({
    message: 'Default admin account created successfully.',
    admin: {
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      alreadyExisted: false,
    },
  });
}
