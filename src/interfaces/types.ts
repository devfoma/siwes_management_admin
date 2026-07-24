export type UserRole = 'STUDENT' | 'SUPERVISOR' | 'ADMIN';
export type AIStatus = 'PENDING' | 'CRITICAL' | 'COMPLIANT' | 'WARNING';
export type SupervisorStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  matricNo: string;
  department: string;
  faculty?: string;
  organizationName: string;
  organizationAddress: string;
  latitude: number;
  longitude: number;
  supervisorId: string | null;
}

export interface SupervisorProfile {
  id: string;
  userId: string;
  staffId: string;
  faculty?: string;
  department: string;
  designation: string;
}

export interface LogbookEntry {
  id: string;
  studentId: string;
  entryDate: string;
  tasksPerformed: string;
  skillsAcquired: string;
  imageUrl?: string;
  aiStatus: AIStatus;
  aiSummary?: string;
  aiDetails?: {
    qualityRating: 'Poor' | 'Medium' | 'Good';
    technicalSkills: string[];
    flags: string[];
    suggestedComment: string;
  };
  supervisorStatus: SupervisorStatus;
  supervisorFeedback?: string;
  submittedAt: string;
}

export interface SupervisionSession {
  id: string;
  studentId: string;
  supervisorId: string;
  scheduledTime: string;
  roomId: string;
  sessionStatus: SessionStatus;
  notes?: string;
}
