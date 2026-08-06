'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSIWES, type AdminSupervisor, type DynamicStudentProfile, type AdminUser } from '../context/SIWESContext';
import type { LogbookEntry, SupervisionSession } from '../interfaces/types';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  LogOut,
  Plus, 
  Settings, 
  X, 
  Building, 
  ChevronDown,
  ChevronRight,
  Info,
  ShieldAlert,
  Loader2,
  MapPin,
  CheckCircle,
  Shield,
  UserPlus,
  Zap,
  BookOpen,
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react';

type AdminTab = 'STUDENTS' | 'SUPERVISORS' | 'LOGBOOK' | 'SESSIONS' | 'SETTINGS';

export default function Home() {
  const { session, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { 
    supervisorsList, 
    studentsList, 
    adminsList,
    logbookEntries,
    supervisionSessions,
    updateLogbookStatus,
    addSupervisor, 
    addAdmin,
    assignSupervisorToStudent, 
    loading: siwesLoading,
    syncError
  } = useSIWES();

  // Auth form state
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authFullName, setAuthFullName] = useState<string>('');
  const authRole = 'ADMIN' as const;
  const [authDept, setAuthDept] = useState<string>('SIWES Unit');
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');
  const [submittingAuth, setSubmittingAuth] = useState<boolean>(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<AdminTab>('STUDENTS');
  const [collapsedFacultyFolders, setCollapsedFacultyFolders] = useState<Set<string>>(new Set());

  // Modals state
  const [showAddSupervisorModal, setShowAddSupervisorModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<DynamicStudentProfile | null>(null);

  // Review Modal state
  const [reviewEntryId, setReviewEntryId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string>('');
  const [reviewSuccess, setReviewSuccess] = useState<string>('');

  // Add Supervisor Form state
  const [supName, setSupName] = useState<string>('');
  const [supEmail, setSupEmail] = useState<string>('');
  const [supPassword, setSupPassword] = useState<string>('');
  const [supStaffId, setSupStaffId] = useState<string>('');
  const [supFaculty, setSupFaculty] = useState<string>('');
  const [supDepartment, setSupDepartment] = useState<string>('');
  const [supDesignation, setSupDesignation] = useState<string>('');
  const [supType, setSupType] = useState<'ACADEMIC' | 'INDUSTRY'>('ACADEMIC');
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [submittingSupervisor, setSubmittingSupervisor] = useState<boolean>(false);

  // Add Admin Modal state
  const [showAddAdminModal, setShowAddAdminModal] = useState<boolean>(false);
  const [adminName, setAdminName] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminDepartment, setAdminDepartment] = useState<string>('SIWES Unit');
  const [adminFormError, setAdminFormError] = useState<string>('');
  const [adminFormSuccess, setAdminFormSuccess] = useState<string>('');
  const [submittingAdmin, setSubmittingAdmin] = useState<boolean>(false);

  // Seed admin state
  const [seedingAdmin, setSeedingAdmin] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<string>('');

  // Metrics
  const totalStudents = studentsList.length;
  const totalSupervisors = supervisorsList.length;
  const assignedStudents = studentsList.filter(s => Boolean(s.supervisorId)).length;
  const assignmentRate = totalStudents > 0 ? Math.round((assignedStudents / totalStudents) * 100) : 0;
  const totalLogbookEntries = logbookEntries?.length || 0;

  // Handle Login / Sign Up Submit
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Email and password are required.');
      return;
    }
    setAuthError('');
    setAuthSuccess('');
    setSubmittingAuth(true);

    try {
      if (isSignUpMode) {
        if (!authFullName.trim() || !authDept.trim()) {
          setAuthError('Name and Department fields are required.');
          setSubmittingAuth(false);
          return;
        }

        const roleData = {
          department: authDept,
          designation: 'SIWES Administrator',
        };

        const { error } = await signUp(authEmail, authPassword, authFullName, authRole, roleData);
        if (error) {
          setAuthError(error.message || 'Registration failed.');
        } else {
          setAuthSuccess('Registration successful! You can now log in.');
          setIsSignUpMode(false);
          setAuthPassword('');
        }
      } else {
        const { error } = await signIn(authEmail, authPassword);
        if (error) {
          setAuthError(error.message || 'Incorrect credentials.');
        }
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmittingAuth(false);
    }
  };

  // Register Supervisor Submit
  const handleRegisterSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supEmail.trim() || !supPassword.trim() || !supStaffId.trim() || !supFaculty.trim() || !supDepartment.trim() || !supDesignation.trim()) {
      setFormError('All fields are required.');
      return;
    }
    if (supPassword.trim().length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setFormError('');
    setFormSuccess('');
    setSubmittingSupervisor(true);
    
    try {
      const createdEmail = supEmail.trim();
      const createdPassword = supPassword.trim();
      await addSupervisor(supName, createdEmail, createdPassword, supStaffId, supFaculty, supDepartment, supDesignation, supType);
      setFormSuccess(`Supervisor credentials created in Faculty of ${supFaculty.trim()}. Email: ${createdEmail} | Password: ${createdPassword}`);
      
      // Reset Form
      setSupName('');
      setSupEmail('');
      setSupPassword('');
      setSupStaffId('');
      setSupFaculty('');
      setSupDepartment('');
      setSupDesignation('');
      setSupType('ACADEMIC');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Could not create supervisor credentials.');
    } finally {
      setSubmittingSupervisor(false);
    }
  };

  const closeAddSupervisorModal = () => {
    setShowAddSupervisorModal(false);
    setFormError('');
    setFormSuccess('');
  };

  // Group Students by Faculty and then Department
  const getGroupedStudents = () => {
    const grouped: { [faculty: string]: { [department: string]: DynamicStudentProfile[] } } = {};
    
    studentsList.forEach(student => {
      const faculty = student.faculty || 'Uncategorized Faculty';
      const dept = student.department || 'Uncategorized Department';
      
      if (!grouped[faculty]) {
        grouped[faculty] = {};
      }
      if (!grouped[faculty][dept]) {
        grouped[faculty][dept] = [];
      }
      grouped[faculty][dept].push(student);
    });
    
    return grouped;
  };

  const groupedStudents = getGroupedStudents();

  const getGroupedSupervisors = () => {
    const grouped: { [faculty: string]: AdminSupervisor[] } = {};

    supervisorsList.forEach(supervisor => {
      const faculty = supervisor.faculty || 'Uncategorized Faculty';

      if (!grouped[faculty]) {
        grouped[faculty] = [];
      }
      grouped[faculty].push(supervisor);
    });

    return grouped;
  };

  const groupedSupervisors = getGroupedSupervisors();

  const getFacultyFolderKey = (tab: AdminTab, faculty: string) => `${tab}:${faculty}`;

  const isFacultyFolderCollapsed = (tab: AdminTab, faculty: string) => {
    return collapsedFacultyFolders.has(getFacultyFolderKey(tab, faculty));
  };

  const toggleFacultyFolder = (tab: AdminTab, faculty: string) => {
    const folderKey = getFacultyFolderKey(tab, faculty);
    setCollapsedFacultyFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderKey)) {
        next.delete(folderKey);
      } else {
        next.add(folderKey);
      }
      return next;
    });
  };

  const openAssignModal = (student: DynamicStudentProfile) => {
    setSelectedStudent(student);
    setShowAssignModal(true);
  };

  const handleAssign = async (supervisorId: string) => {
    if (selectedStudent) {
      await assignSupervisorToStudent(selectedStudent.id, supervisorId);
    }
    setShowAssignModal(false);
    setSelectedStudent(null);
  };

  const handleReviewSubmit = async (status: 'APPROVED' | 'REJECTED') => {
    if (!reviewEntryId) return;
    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      await updateLogbookStatus(reviewEntryId, status, reviewFeedback);
      setReviewSuccess('Logbook status updated successfully.');
      setTimeout(() => {
        setReviewEntryId(null);
        setReviewFeedback('');
        setReviewSuccess('');
      }, 1500);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to update review status.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openReviewModal = (entry: LogbookEntry) => {
    setReviewEntryId(entry.id);
    setReviewFeedback(entry.supervisorFeedback || '');
    setReviewError('');
    setReviewSuccess('');
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col bg-[#0f1511] min-h-screen animate-pulse">
        {/* Header Skeleton */}
        <header className="bg-[#1b211d] border-b border-[#0f5132] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-950/50 border border-[#0f5132]/50" />
            <div>
              <div className="h-4 w-40 bg-emerald-950/50 rounded" />
              <div className="h-3 w-28 bg-emerald-950/30 rounded mt-1.5" />
            </div>
          </div>
          <div className="h-8 w-24 bg-red-950/20 border border-red-900/20 rounded-lg" />
        </header>

        {/* Main Grid Layout Skeleton */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
          {/* Navigation Tabs Skeleton */}
          <div className="flex bg-[#1b211d] border border-[#0f5132]/50 p-1 rounded-lg self-start">
            <div className="h-8 w-24 bg-emerald-950/30 rounded-md mx-1" />
            <div className="h-8 w-24 bg-emerald-950/20 rounded-md mx-1" />
            <div className="h-8 w-24 bg-emerald-950/20 rounded-md mx-1" />
          </div>

          {/* Metrics Bar Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1b211d] border border-[#0f5132]/50 rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-emerald-950/30 rounded" />
                  <div className="h-6 w-12 bg-emerald-950/50 rounded" />
                </div>
                <div className="w-8 h-8 rounded bg-emerald-950/30" />
              </div>
            ))}
          </div>

          {/* Dynamic Content Frame Skeleton */}
          <div className="flex-1 space-y-6">
            <div className="h-4 w-56 bg-emerald-950/40 rounded" />
            
            {/* Faculty Folder Block Skeleton */}
            <div className="bg-[#131915] border border-gray-900/50 rounded-xl p-4 space-y-4">
              <div className="h-5 w-48 bg-[#1b211d] rounded border border-gray-800" />
              
              {/* Department Block Skeleton */}
              <div className="pl-2 space-y-3">
                <div className="h-3.5 w-36 bg-emerald-950/25 rounded" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="bg-[#1b211d] border border-[#0f5132]/30 rounded-xl p-4 flex justify-between items-start gap-4">
                      <div className="space-y-2.5 flex-1">
                        <div className="h-4 w-3/4 bg-emerald-950/40 rounded" />
                        <div className="h-3 w-1/2 bg-emerald-950/25 rounded" />
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-3.5 h-3.5 rounded bg-emerald-950/30" />
                          <div className="h-3 w-2/3 bg-emerald-950/25 rounded" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className="h-5 w-24 bg-emerald-950/30 rounded-lg" />
                        <div className="h-7 w-20 bg-emerald-950/20 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Handle Add Admin Submit
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setAdminFormError('All fields are required.');
      return;
    }
    if (adminPassword.trim().length < 6) {
      setAdminFormError('Password must be at least 6 characters.');
      return;
    }
    setAdminFormError('');
    setAdminFormSuccess('');
    setSubmittingAdmin(true);

    try {
      const createdEmail = adminEmail.trim();
      const createdPassword = adminPassword.trim();
      await addAdmin(adminName.trim(), createdEmail, createdPassword, adminDepartment.trim());
      setAdminFormSuccess(`Admin created. Email: ${createdEmail} | Password: ${createdPassword}`);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminDepartment('SIWES Unit');
    } catch (err: unknown) {
      setAdminFormError(err instanceof Error ? err.message : 'Could not create admin account.');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const closeAddAdminModal = () => {
    setShowAddAdminModal(false);
    setAdminFormError('');
    setAdminFormSuccess('');
  };

  // Handle Seed Default Admin
  const handleSeedDefaultAdmin = async () => {
    setSeedingAdmin(true);
    setSeedResult('');
    setAuthError('');
    try {
      const response = await fetch('/api/admin/seed', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        setAuthError(result.error || 'Could not seed admin.');
      } else if (result.admin?.alreadyExisted) {
        setSeedResult('Default admin already exists. Log in with: admin@siwesconnect.edu.ng / SIWESAdmin2025!');
      } else {
        setSeedResult(`Default admin created! Email: ${result.admin?.email} | Password: ${result.admin?.password}`);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Seed failed.');
    } finally {
      setSeedingAdmin(false);
    }
  };

  // Unauthenticated Form
  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-[#0f1511] min-h-screen">
        <div className="w-full max-w-md flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-[#0f5132] flex items-center justify-center shadow-lg shrink-0">
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white tracking-wide">SIWES Connect Admin</h1>
          <p className="text-sm text-[#95d4ac] font-semibold text-center mt-1">
            AI-Enhanced Industrial Work Management System
          </p>
        </div>

        <div className="w-full max-w-md card-tactile p-6">
          <h2 className="text-center text-sm font-bold text-white mb-6 uppercase tracking-wider">Administrator Login</h2>

          {authError && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-900 rounded-lg text-sm text-red-300 font-semibold text-center flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900 rounded-lg text-sm text-emerald-300 font-semibold text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {seedResult && (
            <div className="mb-4 p-3 bg-amber-950/40 border border-amber-800 rounded-lg text-xs text-amber-200 font-semibold text-center leading-relaxed">
              <Zap className="w-4 h-4 inline-block mr-1.5 text-amber-400" />
              {seedResult}
            </div>
          )}

          <form onSubmit={handleAuthAction} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#c0c9c0] uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="recessed-input-wrapper px-3 py-2 flex items-center">
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@siwesconnect.edu.ng"
                  className="w-full bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#c0c9c0] uppercase tracking-wider mb-1.5">Password</label>
              <div className="recessed-input-wrapper px-3 py-2 flex items-center">
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-white placeholder-gray-600 text-sm focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingAuth}
              className="w-full py-3 btn-primary text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {submittingAuth ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Authenticate Credentials</span>
              )}
            </button>
          </form>


        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0f1511] min-h-screen">
      {/* Header */}
      <header className="bg-[#1b211d] border-b border-[#0f5132] px-4 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#0f5132] shrink-0 bg-white">
              <img src="/Logo.png" alt="SIWES Connect Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide">SIWES Connect Admin</h1>
          </div>
          <p className="text-xs text-[#77da9f] font-medium mt-0.5">University SIWES Coordinator Dashboard</p>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-5 md:gap-6">
        
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory bg-[#1b211d] border border-[#0f5132] p-1 rounded-lg sm:w-auto sm:self-start gap-1">
            <button
              onClick={() => setActiveTab('STUDENTS')}
              className={`shrink-0 snap-start justify-center px-3 py-2 rounded-md text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'STUDENTS' ? 'bg-[#198754] text-white' : 'text-[#77da9f] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Students</span>
            </button>
            <button
              onClick={() => setActiveTab('SUPERVISORS')}
              className={`shrink-0 snap-start justify-center px-3 py-2 rounded-md text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'SUPERVISORS' ? 'bg-[#198754] text-white' : 'text-[#77da9f] hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Supervisors</span>
            </button>
            <button
              onClick={() => setActiveTab('LOGBOOK')}
              className={`shrink-0 snap-start justify-center px-3 py-2 rounded-md text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'LOGBOOK' ? 'bg-[#198754] text-white' : 'text-[#77da9f] hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">Logbook</span>
            </button>
            <button
              onClick={() => setActiveTab('SESSIONS')}
              className={`shrink-0 snap-start justify-center px-3 py-2 rounded-md text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'SESSIONS' ? 'bg-[#198754] text-white' : 'text-[#77da9f] hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">Sessions</span>
            </button>
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`shrink-0 snap-start justify-center px-3 py-2 rounded-md text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'SETTINGS' ? 'bg-[#198754] text-white' : 'text-[#77da9f] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="truncate">Settings</span>
            </button>
          </div>

          {activeTab === 'SUPERVISORS' && (
            <button
              onClick={() => setShowAddSupervisorModal(true)}
              className="flex w-full items-center justify-center gap-2 px-4 py-2 btn-primary text-xs cursor-pointer shadow-md sm:w-auto sm:self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supervisor</span>
            </button>
          )}
        </div>

        {siwesLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-[#0f5132] bg-[#1b211d] px-4 py-3 text-xs font-semibold text-[#95d4ac]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Syncing SIWES records with the shared dashboard database...</span>
          </div>
        )}

        {syncError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-xs font-semibold text-red-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {/* Metrics Bar (only visible when not on settings) */}
        {activeTab !== 'SETTINGS' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-tactile p-4 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-[#muted] uppercase tracking-wider">Total Students</span>
                <span className="block text-2xl font-bold text-[#77da9f] mt-1">{totalStudents}</span>
              </div>
              <Users className="w-8 h-8 text-[#77da9f] opacity-80" />
            </div>

            <div className="card-tactile p-4 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-[#muted] uppercase tracking-wider">Registered Supervisors</span>
                <span className="block text-2xl font-bold text-[#warning] mt-1">{totalSupervisors}</span>
              </div>
              <UserCheck className="w-8 h-8 text-[#warning] opacity-80" />
            </div>

            <div className="card-tactile p-4 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-[#muted] uppercase tracking-wider">Mapping Rate</span>
                <span className="block text-2xl font-bold text-emerald-400 mt-1">{assignmentRate}%</span>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400 opacity-80" />
            </div>

            <div className="card-tactile p-4 flex items-center justify-between">
              <div>
                <span className="block text-[10px] font-bold text-[#muted] uppercase tracking-wider">Logbook Entries</span>
                <span className="block text-2xl font-bold text-[#95d4ac] mt-1">{totalLogbookEntries}</span>
              </div>
              <BookOpen className="w-8 h-8 text-[#95d4ac] opacity-80" />
            </div>
          </div>
        )}

        {/* Dynamic Content Frame */}
        <div className="flex-1">
          {activeTab === 'STUDENTS' && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-white tracking-wide">Student-Supervisor Mapping Directory</h2>
              
              {Object.keys(groupedStudents).length === 0 ? (
                <p className="text-[#muted] text-sm italic">No students registered.</p>
              ) : (
                Object.keys(groupedStudents).map(faculty => (
                  <div key={faculty} className="bg-[#131915] border border-gray-900 rounded-xl p-4 space-y-4">
                    <button
                      type="button"
                      onClick={() => toggleFacultyFolder('STUDENTS', faculty)}
                      className="w-full text-xs font-bold text-[#warning] flex items-center justify-between gap-3 pb-2 border-b border-gray-800 cursor-pointer"
                      aria-expanded={!isFacultyFolderCollapsed('STUDENTS', faculty)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Building className="w-4 h-4 shrink-0" />
                        <span className="truncate">Faculty of {faculty}</span>
                      </span>
                      {isFacultyFolderCollapsed('STUDENTS', faculty) ? (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      )}
                    </button>

                    {!isFacultyFolderCollapsed('STUDENTS', faculty) && (
                      Object.keys(groupedStudents[faculty]).map(dept => (
                        <div key={dept} className="pl-2 space-y-3">
                          <h4 className="text-[11px] font-bold text-[#95d4ac]">Department of {dept}</h4>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {groupedStudents[faculty][dept].map(student => {
                              const supervisor = supervisorsList.find(s => s.id === student.supervisorId);
                              return (
                                <div key={student.id} className="card-tactile p-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                  <div className="min-w-0 space-y-1">
                                    <h5 className="text-sm font-bold text-white">{student.fullName}</h5>
                                    <p className="text-xs text-[#muted]">Matric: {student.matricNo}</p>
                                    <div className="flex items-center gap-1.5 text-xs text-[#muted] mt-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span className="truncate">{student.organizationName}</span>
                                    </div>
                                  </div>

                                  <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end sm:shrink-0">
                                    {supervisor ? (
                                      <div className="flex max-w-full items-center gap-2 bg-[#198754]/10 border border-[#198754]/20 px-2.5 py-1 rounded-lg">
                                        <span className="led-indicator led-green" />
                                        <span className="min-w-0 truncate text-[10px] font-bold text-[#77da9f]">
                                          Assigned: {supervisor.fullName}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex max-w-full items-center gap-2 bg-yellow-900/10 border border-yellow-800/20 px-2.5 py-1 rounded-lg">
                                        <span className="led-indicator led-yellow" />
                                        <span className="text-[10px] font-bold text-[#warning]">
                                          Unassigned
                                        </span>
                                      </div>
                                    )}

                                    <button
                                      onClick={() => openAssignModal(student)}
                                      className="w-full px-3 py-2 bg-[#232d26] border border-[#0f5132] hover:border-[#77da9f] rounded-lg text-[10px] font-bold text-white transition-all cursor-pointer sm:w-auto sm:py-1.5"
                                    >
                                      {supervisor ? 'Reassign' : 'Assign Advisor'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'SUPERVISORS' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white tracking-wide">Registered SIWES Supervisors</h2>
              
              {Object.keys(groupedSupervisors).length === 0 ? (
                <p className="text-[#muted] text-sm italic">No supervisors registered.</p>
              ) : (
                Object.keys(groupedSupervisors).map(faculty => (
                  <div key={faculty} className="bg-[#131915] border border-gray-900 rounded-xl p-4 space-y-4">
                    <button
                      type="button"
                      onClick={() => toggleFacultyFolder('SUPERVISORS', faculty)}
                      className="w-full text-xs font-bold text-[#warning] flex items-center justify-between gap-3 pb-2 border-b border-gray-800 cursor-pointer"
                      aria-expanded={!isFacultyFolderCollapsed('SUPERVISORS', faculty)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Building className="w-4 h-4 shrink-0" />
                        <span className="truncate">Faculty of {faculty}</span>
                      </span>
                      {isFacultyFolderCollapsed('SUPERVISORS', faculty) ? (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      )}
                    </button>

                    {!isFacultyFolderCollapsed('SUPERVISORS', faculty) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupedSupervisors[faculty].map(sup => (
                          <div key={sup.id} className="card-tactile p-4 flex flex-col justify-between gap-4">
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white">{sup.fullName}</h4>
                                <p className="text-xs text-[#muted] mt-0.5">Staff ID: {sup.staffId}</p>
                              </div>
                              <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase border ${
                                sup.supervisorType === 'ACADEMIC' 
                                  ? 'bg-[#77da9f]/10 text-[#77da9f] border-[#77da9f]/20' 
                                  : 'bg-[#warning]/10 text-[#warning] border-[#warning]/20'
                              }`}>
                                {sup.supervisorType}
                              </span>
                            </div>

                            <div className="border-t border-gray-800/50 pt-3 text-xs text-[#muted] space-y-1">
                              <p><span className="font-bold text-white">Department:</span> {sup.department}</p>
                              <p><span className="font-bold text-white">Designation:</span> {sup.designation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'LOGBOOK' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white tracking-wide">Student Logbook Submissions</h2>
              {(!logbookEntries || logbookEntries.length === 0) ? (
                <p className="text-[#muted] text-sm italic">No logbook entries submitted yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {logbookEntries.map(entry => {
                    const student = studentsList.find(s => s.id === entry.studentId);
                    return (
                      <div key={entry.id} className="card-tactile p-4 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-gray-800 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-white">{student?.fullName || 'Unknown Student'}</h4>
                            <p className="text-xs text-[#muted] mt-0.5">Submitted: {new Date(entry.entryDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* AI Status Badge */}
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                              entry.aiStatus === 'COMPLIANT' ? 'bg-[#198754]/10 text-[#198754] border-[#198754]/20' :
                              entry.aiStatus === 'WARNING' ? 'bg-amber-900/20 text-amber-500 border-amber-700/30' :
                              entry.aiStatus === 'CRITICAL' ? 'bg-red-900/20 text-red-500 border-red-700/30' :
                              'bg-gray-800/50 text-gray-400 border-gray-700'
                            }`}>
                              AI: {entry.aiStatus}
                            </span>
                            {/* Supervisor Status Badge */}
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                              entry.supervisorStatus === 'APPROVED' ? 'bg-[#198754]/10 text-[#198754] border-[#198754]/20' :
                              entry.supervisorStatus === 'REJECTED' ? 'bg-red-900/20 text-red-500 border-red-700/30' :
                              'bg-gray-800/50 text-gray-400 border-gray-700'
                            }`}>
                              {entry.supervisorStatus}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#c0c9c0]">
                          <div>
                            <span className="block font-bold text-white mb-1">Tasks Performed:</span>
                            <p className="line-clamp-3">{entry.tasksPerformed}</p>
                          </div>
                          <div>
                            <span className="block font-bold text-white mb-1">Skills Acquired:</span>
                            <p className="line-clamp-3">{entry.skillsAcquired}</p>
                          </div>
                        </div>

                        {entry.aiDetails && (
                          <div className="bg-[#0a100c] p-3 rounded-lg border border-gray-800 mt-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4 text-[#77da9f]" />
                              <span className="text-xs font-bold text-[#77da9f]">AI Analysis</span>
                            </div>
                            <div className="text-xs space-y-1.5 text-[#muted]">
                              <p><strong className="text-white">Quality:</strong> {entry.aiDetails.qualityRating}</p>
                              {entry.aiDetails.technicalSkills?.length > 0 && (
                                <p><strong className="text-white">Skills Detected:</strong> {entry.aiDetails.technicalSkills.join(', ')}</p>
                              )}
                              {entry.aiDetails.flags?.length > 0 && (
                                <p><strong className="text-red-400">Flags:</strong> {entry.aiDetails.flags.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => openReviewModal(entry)}
                            className="px-4 py-2 bg-[#1b211d] border border-[#0f5132] hover:border-[#77da9f] rounded-lg text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Review Entry
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'SESSIONS' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white tracking-wide">Supervision Sessions</h2>
              {(!supervisionSessions || supervisionSessions.length === 0) ? (
                <p className="text-[#muted] text-sm italic">No sessions scheduled.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supervisionSessions.map(session => {
                    const student = studentsList.find(s => s.id === session.studentId);
                    const supervisor = supervisorsList.find(s => s.id === session.supervisorId);
                    return (
                      <div key={session.id} className="card-tactile p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-white">{student?.fullName || 'Unknown Student'}</h4>
                            <p className="text-[10px] text-[#muted] mt-0.5">with {supervisor?.fullName || 'Unknown Supervisor'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                            session.sessionStatus === 'SCHEDULED' ? 'bg-blue-900/20 text-blue-400 border-blue-800/30' :
                            session.sessionStatus === 'COMPLETED' ? 'bg-[#198754]/10 text-[#198754] border-[#198754]/20' :
                            'bg-red-900/20 text-red-500 border-red-700/30'
                          }`}>
                            {session.sessionStatus}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-gray-800/50 text-xs space-y-1.5">
                          <p className="flex items-center gap-2 text-[#c0c9c0]">
                            <Calendar className="w-3.5 h-3.5 text-[#77da9f]" />
                            {new Date(session.scheduledTime).toLocaleString()}
                          </p>
                          <p className="flex items-center gap-2 text-[#c0c9c0]">
                            <MapPin className="w-3.5 h-3.5 text-[#77da9f]" />
                            Room: {session.roomId}
                          </p>
                          {session.notes && (
                            <p className="text-[#muted] mt-2 italic break-words line-clamp-2">&quot;{session.notes}&quot;</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="max-w-2xl space-y-6">
              {/* Current Admin Profile */}
              <div className="card-tactile p-4 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-[#c0c9c0] uppercase tracking-wider pb-2 border-b border-gray-800">
                    Your Administrator Profile
                  </h3>

                  <div className="flex items-center gap-4 mt-4">
                    <div className="w-12 h-12 rounded-full bg-[#0a100c] border border-[#0f5132] flex items-center justify-center">
                      <Shield className="w-5 h-5 text-[#95d4ac]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{session?.user?.user_metadata?.full_name || 'SIWES Administrator'}</h4>
                      <p className="text-xs text-[#77da9f]">Role: Administrator</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-800/40 text-xs">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <span className="font-bold text-[#c0c9c0]">Admin Email:</span>
                    <span className="break-all text-white">{session?.user?.email || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <span className="font-bold text-[#c0c9c0]">Access Scope:</span>
                    <span className="text-white">University-Wide Portal</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <span className="font-bold text-[#c0c9c0]">Total Admins:</span>
                    <span className="text-white">{adminsList.length}</span>
                  </div>
                </div>

                <button
                  onClick={signOut}
                  className="w-full py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/60 text-red-100 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Admin Accounts Management */}
              <div className="card-tactile p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <h3 className="text-xs font-bold text-[#c0c9c0] uppercase tracking-wider">
                    Admin Accounts ({adminsList.length})
                  </h3>
                  <button
                    onClick={() => setShowAddAdminModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 btn-primary text-[10px] cursor-pointer shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Admin</span>
                  </button>
                </div>

                {adminsList.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-4 text-center">No admin accounts found. Use the button above to add one.</p>
                ) : (
                  <div className="space-y-2">
                    {adminsList.map((admin: AdminUser) => (
                      <div
                        key={admin.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[#0f1511] border border-gray-800/50 hover:border-[#0f5132]/40 transition-all"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#0a100c] border border-[#0f5132]/50 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-[#77da9f]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{admin.fullName}</h4>
                          <p className="text-[10px] text-gray-500 truncate">
                            {admin.email || 'Email not available'}
                            {admin.department ? ` · ${admin.department}` : ''}
                          </p>
                        </div>
                        {session?.user?.id === admin.id && (
                          <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wide bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-700/30">You</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sync Info */}
              <div className="card-tactile p-4 sm:p-6">
                <h3 className="text-xs font-bold text-[#c0c9c0] uppercase tracking-wider pb-2 border-b border-gray-800 mb-3">
                  Data Sync Status
                </h3>
                <div className="p-3 bg-emerald-950/20 border border-[#0f5132]/30 rounded-lg flex gap-3">
                  <Info className="w-5 h-5 text-[#95d4ac] shrink-0" />
                  <p className="text-xs text-[#95d4ac] leading-relaxed">
                    This dashboard is connected to your Supabase backend with <strong>realtime sync</strong>. Any students, supervisors, or logbook entries added from the mobile Expo app will appear here automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Supervisor Modal */}
      {showAddSupervisorModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4 bg-black/85 backdrop-blur-sm">
          <div className="my-auto w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto bg-[#1b211d] border border-[#0f5132] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-850">
              <h3 className="text-sm font-bold text-white">Register New Supervisor</h3>
              <button 
                onClick={closeAddSupervisorModal}
                className="text-[#c0c9c0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs font-bold text-red-300">{formError}</p>
            )}

            {formSuccess && (
              <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-300">{formSuccess}</p>
            )}

            <form onSubmit={handleRegisterSupervisor} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Full Name</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="e.g. Dr. Ada Nwosu"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Login Email</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="email"
                    required
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="e.g. supervisor@university.edu.ng"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Temporary Password</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={supPassword}
                    onChange={(e) => setSupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Staff ID / Code</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    value={supStaffId}
                    onChange={(e) => setSupStaffId(e.target.value)}
                    placeholder="e.g. COOU/CS/2018/042"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Faculty</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    value={supFaculty}
                    onChange={(e) => setSupFaculty(e.target.value)}
                    placeholder="e.g. Physical Sciences"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Department</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    value={supDepartment}
                    onChange={(e) => setSupDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Designation / Role Title</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    value={supDesignation}
                    onChange={(e) => setSupDesignation(e.target.value)}
                    placeholder="e.g. Senior Lecturer / Coordinator"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-2.5">Supervisor Classification</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSupType('ACADEMIC')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      supType === 'ACADEMIC' 
                        ? 'bg-[#77da9f]/10 text-[#77da9f] border-[#77da9f]' 
                        : 'bg-[#0f1511] text-[#c0c9c0] border-transparent hover:border-gray-800'
                    }`}
                  >
                    Academic Advisor
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupType('INDUSTRY')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      supType === 'INDUSTRY' 
                        ? 'bg-[#77da9f]/10 text-[#77da9f] border-[#77da9f]' 
                        : 'bg-[#0f1511] text-[#c0c9c0] border-transparent hover:border-gray-800'
                    }`}
                  >
                    Industry Partner
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingSupervisor}
                className="w-full py-2.5 btn-primary text-xs tracking-wider uppercase cursor-pointer shadow-md mt-2 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingSupervisor && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submittingSupervisor ? 'Creating Credentials...' : 'Create Supervisor Credentials'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Advisor Modal */}
      {showAssignModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4 bg-black/85 backdrop-blur-sm">
          <div className="my-auto w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto bg-[#1b211d] border border-[#0f5132] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-850">
              <div>
                <h3 className="text-sm font-bold text-white">Assign Academic Advisor</h3>
                <p className="text-xs text-[#77da9f] mt-0.5">{selectedStudent.fullName}</p>
              </div>
              <button 
                onClick={() => { setShowAssignModal(false); setSelectedStudent(null); }}
                className="text-[#c0c9c0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {supervisorsList.length === 0 ? (
                <p className="text-xs text-[#muted] italic">No supervisors available.</p>
              ) : (
                supervisorsList.map(sup => (
                  <button
                    key={sup.id}
                    onClick={() => handleAssign(sup.id)}
                    className={`w-full text-left p-3 rounded-xl bg-[#0f1511] border hover:border-[#77da9f]/50 transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedStudent.supervisorId === sup.id 
                        ? 'border-[#77da9f] bg-[#77da9f]/5' 
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">{sup.fullName}</span>
                      <span className="text-[8px] font-bold text-[#77da9f] uppercase tracking-wide">
                        {sup.supervisorType}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#muted]">
                      {sup.faculty || 'Uncategorized Faculty'} - {sup.department} - {sup.designation}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4 bg-black/85 backdrop-blur-sm">
          <div className="my-auto w-full max-w-md max-h-[calc(100vh-1.5rem)] overflow-y-auto bg-[#1b211d] border border-[#0f5132] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-850">
              <h3 className="text-sm font-bold text-white">Create New Admin Account</h3>
              <button 
                onClick={closeAddAdminModal}
                className="text-[#c0c9c0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adminFormError && (
              <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs font-bold text-red-300">{adminFormError}</p>
            )}

            {adminFormSuccess && (
              <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-300">{adminFormSuccess}</p>
            )}

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Full Name</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Chinedu Okafor"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Login Email</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. admin2@university.edu.ng"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Password</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#c0c9c0] uppercase tracking-wider mb-1">Department</label>
                <div className="recessed-input-wrapper px-3 py-2">
                  <input
                    type="text"
                    required
                    value={adminDepartment}
                    onChange={(e) => setAdminDepartment(e.target.value)}
                    placeholder="e.g. SIWES Directorate"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-[#0f5132]/30 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-[#95d4ac] shrink-0" />
                <p className="text-xs text-[#95d4ac] leading-relaxed">
                  The new admin will be able to log into this dashboard and manage students, supervisors, and other admins.
                </p>
              </div>

              <button
                type="submit"
                disabled={submittingAdmin}
                className="w-full py-2.5 btn-primary text-xs tracking-wider uppercase cursor-pointer shadow-md mt-2 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingAdmin && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submittingAdmin ? 'Creating Account...' : 'Create Admin Account'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Logbook Review Modal */}
      {reviewEntryId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4 bg-black/85 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg max-h-[calc(100vh-1.5rem)] overflow-y-auto bg-[#1b211d] border border-[#0f5132] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-850">
              <h3 className="text-sm font-bold text-white">Review Logbook Entry</h3>
              <button 
                onClick={() => { setReviewEntryId(null); setReviewFeedback(''); }}
                className="text-[#c0c9c0] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewError && (
              <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs font-bold text-red-300">{reviewError}</p>
            )}

            {reviewSuccess && (
              <p className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-300">{reviewSuccess}</p>
            )}

            {(() => {
              const entry = logbookEntries?.find(e => e.id === reviewEntryId);
              if (!entry) return null;
              const student = studentsList.find(s => s.id === entry.studentId);
              return (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#77da9f] uppercase mb-1">Student</h4>
                    <p className="text-sm text-white">{student?.fullName || 'Unknown Student'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-[#77da9f] uppercase mb-1">Tasks Performed</h4>
                      <div className="bg-[#0a100c] p-3 rounded-lg border border-gray-800 text-xs text-white max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {entry.tasksPerformed}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#77da9f] uppercase mb-1">Skills Acquired</h4>
                      <div className="bg-[#0a100c] p-3 rounded-lg border border-gray-800 text-xs text-white max-h-40 overflow-y-auto whitespace-pre-wrap">
                        {entry.skillsAcquired}
                      </div>
                    </div>
                  </div>

                  {entry.aiDetails && (
                    <div>
                      <h4 className="text-xs font-bold text-amber-500 uppercase mb-1 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> AI Feedback Suggestions
                      </h4>
                      <div className="bg-amber-900/10 p-3 rounded-lg border border-amber-900/30 text-xs text-amber-200">
                        <p>{entry.aiDetails.suggestedComment}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#c0c9c0] uppercase tracking-wider mb-2">Your Feedback</label>
                    <textarea
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      placeholder="Enter feedback for the student..."
                      className="w-full bg-[#0a100c] border border-gray-800 rounded-lg p-3 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-[#77da9f] min-h-[100px]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleReviewSubmit('REJECTED')}
                      disabled={submittingReview}
                      className="flex-1 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-100 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      Reject Entry
                    </button>
                    <button
                      onClick={() => handleReviewSubmit('APPROVED')}
                      disabled={submittingReview}
                      className="flex-1 py-2 btn-primary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      Approve Entry
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
