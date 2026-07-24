import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type SupervisorType = 'ACADEMIC' | 'INDUSTRY';

interface CreateSupervisorPayload {
  email?: string;
  password?: string;
  fullName?: string;
  staffId?: string;
  faculty?: string;
  department?: string;
  designation?: string;
  supervisorType?: SupervisorType;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isSupervisorType(value: unknown): value is SupervisorType {
  return value === 'ACADEMIC' || value === 'INDUSTRY';
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
      'Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dashboard server before creating supervisor login credentials.',
      500
    );
  }

  const publicClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: requester, error: requesterError } = await publicClient.auth.getUser(token);

  if (requesterError || !requester.user) {
    return jsonError('Admin session could not be verified.', 401);
  }

  if (requester.user.user_metadata?.role !== 'ADMIN') {
    return jsonError('Only admin accounts can create supervisor credentials.', 403);
  }

  let payload: CreateSupervisorPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Invalid request payload.', 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const fullName = payload.fullName?.trim();
  const staffId = payload.staffId?.trim();
  const faculty = payload.faculty?.trim();
  const department = payload.department?.trim();
  const designation = payload.designation?.trim();
  const supervisorType = payload.supervisorType;

  if (!email || !password || !fullName || !staffId || !faculty || !department || !designation || !isSupervisorType(supervisorType)) {
    return jsonError('Email, password, name, staff ID, faculty, department, designation, and supervisor type are required.', 400);
  }

  if (password.length < 6) {
    return jsonError('Supervisor password must be at least 6 characters.', 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'SUPERVISOR',
      role_data: {
        staffId,
        faculty,
        department,
        designation,
        supervisorType,
      },
    },
  });

  if (createUserError || !createdUser.user) {
    return jsonError(createUserError?.message || 'Could not create supervisor auth user.', 400);
  }

  const { error: profileBaseError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: createdUser.user.id,
        full_name: fullName,
        role: 'SUPERVISOR',
      },
      { onConflict: 'id' }
    );

  if (profileBaseError) {
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return jsonError(profileBaseError.message || 'Could not create supervisor base profile.', 400);
  }

  const { data: profileRows, error: profileError } = await adminClient
    .from('supervisor_profiles')
    .insert([{
      user_id: createdUser.user.id,
      staff_id: staffId,
      faculty,
      department,
      designation,
      supervisor_type: supervisorType,
    }])
    .select()
    .limit(1);

  if (profileError || !profileRows?.[0]) {
    await adminClient.from('profiles').delete().eq('id', createdUser.user.id);
    await adminClient.auth.admin.deleteUser(createdUser.user.id);
    return jsonError(profileError?.message || 'Could not create supervisor profile.', 400);
  }

  const profile = profileRows[0];

  return NextResponse.json({
    supervisor: {
      id: profile.user_id || createdUser.user.id,
      userId: profile.user_id || createdUser.user.id,
      fullName,
      staffId: profile.staff_id || staffId,
      faculty: profile.faculty || faculty,
      department: profile.department || department,
      designation: profile.designation || designation,
      supervisorType: profile.supervisor_type || supervisorType,
      email,
    },
  });
}
