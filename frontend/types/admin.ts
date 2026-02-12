// User/Learner types
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_SETUP';
export type UserRole = 'ADMIN' | 'LEARNER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Learner {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  status: UserStatus;
  registrationNumber?: string;
  enrolledPrograms: string[];
  createdAt: string;
}

export interface LearnerDetail {
  learner: Learner;
  programProgress: ProgramProgress[];
  recentProgress: RecentProgress[];
}

export interface ProgramProgress {
  programId: string;
  programName: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
}

export interface RecentProgress {
  lessonId: string;
  lessonTitle: string;
  status: string;
  lastAccessed: string;
}

// Program types
export interface Program {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  learnerCount: number;
  lessonCount: number;
  totalDurationHours: number;
  createdAt: string;
}

export interface ProgramDetail {
  program: {
    id: string;
    name: string;
    description?: string;
    thumbnailUrl?: string;
    isPublished: boolean;
  };
  content: ContentItem[];
}

// Content tree types
export type LessonType = 'VIDEO' | 'PDF' | 'TEXT';
export type ContentItemType = 'topic' | 'subtopic' | 'lesson';

export interface ContentItem {
  id: string;
  type: ContentItemType;
  name?: string;
  title?: string;
  lessonType?: LessonType;
  contentUrl?: string;
  contentText?: string;
  thumbnailUrl?: string;
  instructorNotes?: string;
  durationSeconds?: number;
  orderIndex: number;
  children?: ContentItem[];
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
}

// Session types
export interface Session {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime?: string;
  meetLink?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  programs: string[];
}

// Pagination
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// Form types
export interface CreateProgramData {
  name: string;
  description?: string;
  thumbnailUrl?: string | null;
}

export interface CreateLearnerData {
  email: string;
  name: string;
  mobile?: string;
  registrationNumber?: string;
  programIds?: string[];
}

export interface CreateSessionData {
  name: string;
  description?: string;
  startTime: string;
  endTime?: string;
  meetLink?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  programIds?: string[];
}

export interface CreateTopicData {
  programId: string;
  name: string;
  orderIndex?: number;
}

export interface CreateSubtopicData {
  topicId: string;
  name: string;
  orderIndex?: number;
}

export interface CreateLessonData {
  programId: string;
  topicId?: string;
  subtopicId?: string;
  title: string;
  type: LessonType;
  contentUrl?: string;
  contentText?: string;
  thumbnailUrl?: string;
  instructorNotes?: string;
  durationSeconds?: number;
  orderIndex?: number;
}

// Dashboard Analytics types
export interface DashboardTrend {
  value: number;
  isPositive: boolean;
}

export interface DashboardStats {
  totalPrograms: number;
  totalLearners: number;
  activeLearners: number;
  todaySessions: number;
  overallCompletionRate: number;
}

export interface DashboardTrends {
  programs: DashboardTrend;
  learners: DashboardTrend;
  activeLearners: DashboardTrend;
  todaySessions: DashboardTrend;
}

export interface EnrollmentChartPoint {
  month: string;
  enrollments: number;
}

export interface ProgramPerformanceItem {
  id: string;
  name: string;
  enrollmentCount: number;
  completionRate: number;
}

export interface ActivityItem {
  type: 'enrollment' | 'completion';
  message: string;
  timestamp: string;
}

export interface DashboardAnalytics {
  stats: DashboardStats;
  trends: DashboardTrends;
  enrollmentChart: EnrollmentChartPoint[];
  programPerformance: ProgramPerformanceItem[];
  recentActivity: ActivityItem[];
}

// Filter types
export interface LearnerFilters {
  status?: UserStatus;
  programId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SessionFilters {
  from?: string;
  to?: string;
  programId?: string;
}
