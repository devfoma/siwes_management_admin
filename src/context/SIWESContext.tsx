'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AIStatus,
  LogbookEntry,
  SessionStatus,
  StudentProfile,
  SupervisionSession,
  SupervisorProfile,
  SupervisorStatus,
  UserRole,
} from '../interfaces/types';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

export interface DynamicStudentProfile extends StudentProfile {
  fullName: string;
}

export interface DynamicSupervisorProfile extends SupervisorProfile {
  fullName: string;
}

export interface AdminSupervisor extends DynamicSupervisorProfile {
  supervisorType: 'ACADEMIC' | 'INDUSTRY';
}

interface ProfileRow {
  id: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

interface StudentProfileRow {
  user_id: string;
  matric_no: string | null;
  department: string | null;
  faculty: string | null;
  organization_name: string | null;
  organization_address: string | null;
  latitude: number | null;
  longitude: number | null;
  supervisor_id: string | null;
}

interface SupervisorProfileRow {
  user_id: string;
  staff_id: string | null;
  faculty: string | null;
  department: string | null;
  designation: string | null;
  supervisor_type: 'ACADEMIC' | 'INDUSTRY' | null;
}

interface LogbookEntryRow {
  id: string;
  student_id: string;
  entry_date: string;
  tasks_performed: string;
  skills_acquired: string;
  image_url: string | null;
  ai_status: AIStatus;
  ai_summary: string | null;
  ai_details: LogbookEntry['aiDetails'] | null;
  supervisor_status: SupervisorStatus;
  supervisor_feedback: string | null;
  submitted_at: string | null;
  created_at?: string | null;
}

interface SupervisionSessionRow {
  id: string;
  student_id: string;
  supervisor_id: string;
  scheduled_time: string;
  room_id: string;
  session_status: SessionStatus;
  notes: string | null;
}

interface SIWESContextType {
  userRole: UserRole;
  studentProfile: DynamicStudentProfile;
  supervisorProfile: DynamicSupervisorProfile;
  logbookEntries: LogbookEntry[];
  supervisionSessions: SupervisionSession[];
  supervisorsList: AdminSupervisor[];
  studentsList: DynamicStudentProfile[];
  loading: boolean;
  syncError: string | null;
  toggleUserRole: () => void;
  refreshWorkspace: () => Promise<void>;
  addLogbookEntry: (tasksPerformed: string, skillsAcquired: string, date: string, imageUrl?: string) => Promise<LogbookEntry>;
  updateLogbookStatus: (entryId: string, status: SupervisorStatus, feedback: string) => Promise<void>;
  scheduleSession: (dateTime: string) => Promise<void>;
  addSupervisor: (
    name: string,
    email: string,
    password: string,
    staffId: string,
    faculty: string,
    department: string,
    designation: string,
    type: 'ACADEMIC' | 'INDUSTRY'
  ) => Promise<AdminSupervisor>;
  assignSupervisorToStudent: (studentId: string, supervisorId: string) => Promise<void>;
}

interface CreateSupervisorResponse {
  supervisor?: AdminSupervisor & {
    email?: string;
  };
  error?: string;
}

function getSyncErrorMessage(error: unknown, fallback = 'Could not sync SIWES dashboard records.') {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>;
    const message = errorRecord.message;
    const details = errorRecord.details;
    const hint = errorRecord.hint;
    const code = errorRecord.code;

    const parts = [message, details, hint, code]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);

    if (parts.length > 0) return parts.join(' ');

    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') return serialized;
  }

  return fallback;
}

function throwIfSupabaseError(error: unknown, label: string) {
  if (!error) return;
  throw new Error(`${label}: ${getSyncErrorMessage(error)}`);
}

type RoleData = {
  matricNo?: string;
  staffId?: string;
  faculty?: string;
  department?: string;
  organizationName?: string;
  organizationAddress?: string;
  latitude?: number;
  longitude?: number;
  supervisorId?: string;
  designation?: string;
  supervisorType?: 'ACADEMIC' | 'INDUSTRY';
};

const emptyStudentProfile: DynamicStudentProfile = {
  id: '',
  userId: '',
  fullName: '',
  matricNo: '',
  department: '',
  faculty: undefined,
  organizationName: '',
  organizationAddress: '',
  latitude: 0,
  longitude: 0,
  supervisorId: null,
};

const emptySupervisorProfile: DynamicSupervisorProfile = {
  id: '',
  userId: '',
  fullName: '',
  staffId: '',
  faculty: undefined,
  department: '',
  designation: '',
};

const SIWES_REALTIME_TABLES = [
  'profiles',
  'student_profiles',
  'supervisor_profiles',
  'logbook_entries',
  'supervision_sessions',
  'call_messages',
] as const;

const SIWESContext = createContext<SIWESContextType | undefined>(undefined);

export const SIWESProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [supervisionSessions, setSupervisionSessions] = useState<SupervisionSession[]>([]);
  const [supervisorsList, setSupervisorsList] = useState<AdminSupervisor[]>([]);
  const [studentsList, setStudentsList] = useState<DynamicStudentProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.role) {
      queueMicrotask(() => setUserRole(user.user_metadata.role as UserRole));
    }
  }, [user]);

  const ensureCurrentUserProfile = useCallback(async () => {
    if (!user) return;

    const metadata = user.user_metadata || {};
    const role = (metadata.role || 'ADMIN') as UserRole;
    const roleData = (metadata.role_data || {}) as RoleData;
    const fullName = metadata.full_name || user.email || 'SIWES User';

    const nextProfile = {
      id: user.id,
      full_name: fullName,
      role,
    };

    const { data: existingProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id,full_name,role')
      .eq('id', user.id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const profileNeedsWrite =
      !existingProfile ||
      existingProfile.full_name !== nextProfile.full_name ||
      existingProfile.role !== nextProfile.role;

    if (profileNeedsWrite) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(nextProfile, { onConflict: 'id' });

      throwIfSupabaseError(profileError, 'Could not save the current admin profile');
    }

    if (role === 'STUDENT') {
      const nextStudentProfile = {
        user_id: user.id,
        matric_no: roleData.matricNo || null,
        department: roleData.department || null,
        faculty: roleData.faculty || null,
        organization_name: roleData.organizationName || null,
        organization_address: roleData.organizationAddress || null,
        latitude: roleData.latitude || null,
        longitude: roleData.longitude || null,
        supervisor_id: roleData.supervisorId || null,
      };

      const { data: existingStudentProfile, error: studentLookupError } = await supabase
        .from('student_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (studentLookupError) throw studentLookupError;
      if (existingStudentProfile) return;

      const { error: studentError } = await supabase
        .from('student_profiles')
        .upsert(nextStudentProfile, { onConflict: 'user_id' });

      throwIfSupabaseError(studentError, 'Could not save the current student profile');
    }
  }, [user]);

  const refreshWorkspace = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setStudentsList([]);
      setSupervisorsList([]);
      setLogbookEntries([]);
      setSupervisionSessions([]);
      setSyncError(!isSupabaseConfigured ? 'Supabase is not configured for the admin dashboard.' : null);
      return;
    }

    setLoading(true);
    setSyncError(null);

    try {
      await ensureCurrentUserProfile();

      const [
        { data: profileRows, error: profilesError },
        { data: studentRows, error: studentsError },
        { data: supervisorRows, error: supervisorsError },
        { data: logRows, error: logsError },
        { data: sessionRows, error: sessionsError },
      ] = await Promise.all([
        supabase.from('profiles').select('id,full_name,role,created_at'),
        supabase.from('student_profiles').select('*').order('faculty', { ascending: true }).order('department', { ascending: true }),
        supabase.from('supervisor_profiles').select('*').order('faculty', { ascending: true }).order('department', { ascending: true }),
        supabase.from('logbook_entries').select('*').order('submitted_at', { ascending: false }),
        supabase.from('supervision_sessions').select('*').order('scheduled_time', { ascending: true }),
      ]);

      throwIfSupabaseError(profilesError, 'Could not load user profiles');
      throwIfSupabaseError(studentsError, 'Could not load student profiles');
      throwIfSupabaseError(supervisorsError, 'Could not load supervisor profiles');
      throwIfSupabaseError(logsError, 'Could not load logbook entries');
      throwIfSupabaseError(sessionsError, 'Could not load supervision sessions');

      const profilesById = new Map(
        ((profileRows || []) as ProfileRow[]).map((profile) => [profile.id, profile])
      );

      setStudentsList(((studentRows || []) as StudentProfileRow[]).map((student) => (
        mapStudentProfile(student, profilesById.get(student.user_id))
      )));

      setSupervisorsList(((supervisorRows || []) as SupervisorProfileRow[]).map((supervisor) => (
        mapSupervisorProfile(supervisor, profilesById.get(supervisor.user_id))
      )));

      setLogbookEntries(((logRows || []) as LogbookEntryRow[]).map(mapLogbookEntry));
      setSupervisionSessions(((sessionRows || []) as SupervisionSessionRow[]).map(mapSupervisionSession));
    } catch (error) {
      setSyncError(getSyncErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [ensureCurrentUserProfile, user]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshWorkspace();
    });
  }, [refreshWorkspace]);

  const requestRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) {
      clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      void refreshWorkspace();
    }, 250);
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const channel = SIWES_REALTIME_TABLES.reduce(
      (realtimeChannel, table) =>
        realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table }, requestRealtimeRefresh),
      supabase.channel('siwes-admin-dashboard-sync')
    ).subscribe();

    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      void channel.unsubscribe();
    };
  }, [requestRealtimeRefresh, user]);

  const roleData = useMemo(
    () => (user?.user_metadata?.role_data || {}) as RoleData,
    [user?.user_metadata?.role_data]
  );

  const studentProfile = useMemo<DynamicStudentProfile>(() => {
    const liveProfile = studentsList.find((student) => student.userId === user?.id);
    if (liveProfile) return liveProfile;

    if (!user) return emptyStudentProfile;

    return {
      id: user.id,
      userId: user.id,
      fullName: user.user_metadata?.full_name || user.email || 'SIWES Student',
      matricNo: roleData.matricNo || '',
      department: roleData.department || '',
      faculty: roleData.faculty || undefined,
      organizationName: roleData.organizationName || '',
      organizationAddress: roleData.organizationAddress || '',
      latitude: roleData.latitude || 0,
      longitude: roleData.longitude || 0,
      supervisorId: roleData.supervisorId || null,
    };
  }, [roleData, studentsList, user]);

  const supervisorProfile = useMemo<DynamicSupervisorProfile>(() => {
    const liveProfile = supervisorsList.find((supervisor) => supervisor.userId === user?.id);
    if (liveProfile) return liveProfile;

    if (!user) return emptySupervisorProfile;

    return {
      id: user.id,
      userId: user.id,
      fullName: user.user_metadata?.full_name || user.email || 'SIWES Supervisor',
      staffId: roleData.staffId || '',
      faculty: roleData.faculty || undefined,
      department: roleData.department || '',
      designation: roleData.designation || '',
    };
  }, [roleData, supervisorsList, user]);

  const toggleUserRole = () => {
    setUserRole((previousRole) => {
      if (previousRole === 'STUDENT') return 'SUPERVISOR';
      if (previousRole === 'SUPERVISOR') return 'ADMIN';
      return 'STUDENT';
    });
  };

  const addLogbookEntry = async (
    tasksPerformed: string,
    skillsAcquired: string,
    date: string,
    imageUrl?: string
  ): Promise<LogbookEntry> => {
    const studentId = studentProfile.id || user?.id;
    if (!studentId) throw new Error('A student profile is required before adding a logbook entry.');

    const { data, error } = await supabase
      .from('logbook_entries')
      .insert({
        student_id: studentId,
        entry_date: date,
        tasks_performed: tasksPerformed,
        skills_acquired: skillsAcquired,
        image_url: imageUrl || null,
        ai_status: 'PENDING' satisfies AIStatus,
        supervisor_status: 'PENDING' satisfies SupervisorStatus,
      })
      .select('*')
      .single();

    if (error) throw error;

    const newEntry = mapLogbookEntry(data as LogbookEntryRow);
    setLogbookEntries((previousEntries) => [newEntry, ...previousEntries]);
    await refreshWorkspace();
    return newEntry;
  };

  const updateLogbookStatus = async (entryId: string, status: SupervisorStatus, feedback: string) => {
    const { error } = await supabase
      .from('logbook_entries')
      .update({ supervisor_status: status, supervisor_feedback: feedback })
      .eq('id', entryId);

    if (error) throw error;

    setLogbookEntries((previousEntries) =>
      previousEntries.map((entry) =>
        entry.id === entryId ? { ...entry, supervisorStatus: status, supervisorFeedback: feedback } : entry
      )
    );
    await refreshWorkspace();
  };

  const scheduleSession = async (dateTime: string) => {
    const studentId = studentProfile.id;
    const supervisorId = supervisorProfile.id;
    if (!studentId || !supervisorId) {
      throw new Error('A student and supervisor profile are required before scheduling a session.');
    }

    const { data, error } = await supabase
      .from('supervision_sessions')
      .insert({
        student_id: studentId,
        supervisor_id: supervisorId,
        scheduled_time: dateTime,
        room_id: `ROOM-${Date.now().toString(36).toUpperCase()}`,
        session_status: 'SCHEDULED' satisfies SessionStatus,
        notes: 'Scheduled evaluation session',
      })
      .select('*')
      .single();

    if (error) throw error;

    const newSession = mapSupervisionSession(data as SupervisionSessionRow);
    setSupervisionSessions((previousSessions) => [newSession, ...previousSessions]);
    await refreshWorkspace();
  };

  const addSupervisor = async (
    name: string,
    email: string,
    password: string,
    staffId: string,
    faculty: string,
    department: string,
    designation: string,
    type: 'ACADEMIC' | 'INDUSTRY'
  ) => {
    if (!session?.access_token) {
      throw new Error('You must be signed in as an admin to create supervisor credentials.');
    }

    const response = await fetch('/api/admin/supervisors', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        fullName: name,
        staffId,
        faculty,
        department,
        designation,
        supervisorType: type,
      }),
    });

    const result = (await response.json()) as CreateSupervisorResponse;

    if (!response.ok || !result.supervisor) {
      throw new Error(result.error || 'Could not create supervisor credentials.');
    }

    const newSupervisor = result.supervisor;
    setSupervisorsList((previousSupervisors) => [
      ...previousSupervisors.filter((supervisor) => supervisor.id !== newSupervisor.id),
      newSupervisor,
    ]);
    await refreshWorkspace();
    return newSupervisor;
  };

  const assignSupervisorToStudent = async (studentId: string, supervisorId: string) => {
    const { error } = await supabase
      .from('student_profiles')
      .update({ supervisor_id: supervisorId || null })
      .eq('user_id', studentId);

    if (error) throw error;

    setStudentsList((previousStudents) =>
      previousStudents.map((student) =>
        student.id === studentId ? { ...student, supervisorId: supervisorId || null } : student
      )
    );
    await refreshWorkspace();
  };

  return (
    <SIWESContext.Provider
      value={{
        userRole,
        studentProfile,
        supervisorProfile,
        logbookEntries,
        supervisionSessions,
        supervisorsList,
        studentsList,
        loading,
        syncError,
        toggleUserRole,
        refreshWorkspace,
        addLogbookEntry,
        updateLogbookStatus,
        scheduleSession,
        addSupervisor,
        assignSupervisorToStudent,
      }}
    >
      {children}
    </SIWESContext.Provider>
  );
};

function mapStudentProfile(row: StudentProfileRow, profile?: ProfileRow): DynamicStudentProfile {
  return {
    id: row.user_id,
    userId: row.user_id,
    fullName: profile?.full_name || 'Unlisted Student',
    matricNo: row.matric_no || '',
    department: row.department || '',
    faculty: row.faculty || undefined,
    organizationName: row.organization_name || '',
    organizationAddress: row.organization_address || '',
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    supervisorId: row.supervisor_id,
  };
}

function mapSupervisorProfile(row: SupervisorProfileRow, profile?: ProfileRow): AdminSupervisor {
  return {
    id: row.user_id,
    userId: row.user_id,
    fullName: profile?.full_name || 'Unlisted Supervisor',
    staffId: row.staff_id || '',
    faculty: row.faculty || undefined,
    department: row.department || '',
    designation: row.designation || '',
    supervisorType: row.supervisor_type || 'ACADEMIC',
  };
}

function mapLogbookEntry(row: LogbookEntryRow): LogbookEntry {
  return {
    id: row.id,
    studentId: row.student_id,
    entryDate: row.entry_date,
    tasksPerformed: row.tasks_performed,
    skillsAcquired: row.skills_acquired,
    imageUrl: row.image_url || undefined,
    aiStatus: row.ai_status,
    aiSummary: row.ai_summary || undefined,
    aiDetails: row.ai_details || undefined,
    supervisorStatus: row.supervisor_status,
    supervisorFeedback: row.supervisor_feedback || undefined,
    submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
  };
}

function mapSupervisionSession(row: SupervisionSessionRow): SupervisionSession {
  return {
    id: row.id,
    studentId: row.student_id,
    supervisorId: row.supervisor_id,
    scheduledTime: row.scheduled_time,
    roomId: row.room_id,
    sessionStatus: row.session_status,
    notes: row.notes || undefined,
  };
}

export const useSIWES = () => {
  const context = useContext(SIWESContext);
  if (!context) {
    throw new Error('useSIWES must be used within a SIWESProvider');
  }
  return context;
};
