// Learner Home types
export interface ContinueLearning {
  lessonId: string;
  lessonTitle: string;
  programName: string;
  watchPosition: number;
  totalDuration: number | null;
}

export interface LearningStats {
  lessonsCompleted: number;
  hoursLearned: number;
  minutesWatched: number;
  activeDaysThisWeek: number;
  currentStreak: number;
}

export interface LearnerHome {
  user: {
    name: string;
  };
  enrolledPrograms: EnrolledProgram[];
  continueLearning: ContinueLearning | null;
  learningStats: LearningStats;
  canJoinSessions: boolean;
  upcomingSessions: UpcomingSession[];
  recentProgress: RecentLessonProgress[];
  suggestedCourses?: DiscoverProgram[];
}

export interface EnrolledProgram {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  lastAccessedAt?: string;
  nextLessonId?: string | null;
  nextLessonTitle?: string | null;
  enrollmentType?: 'FREE' | 'PAID' | 'ADMIN';
  isPublic?: boolean;
  price?: string | number | null;
  currency?: string;
  freeLessons?: number;
}

export interface UpcomingSession {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime?: string;
  meetLink?: string;
  programName?: string;
}

export interface RecentLessonProgress {
  lessonId: string;
  lessonTitle: string;
  programName: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  lastAccessedAt: string;
}

// Learner Program types
export interface LearnerProgram {
  program: {
    id: string;
    name: string;
    description?: string;
    thumbnailUrl?: string;
    price?: string | number | null;
    currency?: string;
  };
  enrollmentType: 'FREE' | 'PAID' | 'ADMIN';
  content: LearnerContentItem[];
  progress: LessonProgressMap;
}

export interface LearnerContentItem {
  id: string;
  type: 'topic' | 'subtopic' | 'lesson';
  name?: string;
  title?: string;
  lessonType?: 'VIDEO' | 'PDF' | 'TEXT';
  durationSeconds?: number;
  orderIndex: number;
  isFree?: boolean;
  isLocked?: boolean;
  children?: LearnerContentItem[];
}

export interface LessonProgressMap {
  [lessonId: string]: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    watchPositionSeconds?: number;
    completedAt?: string;
  };
}

// Lesson types
export interface LearnerLesson {
  lesson: {
    id: string;
    title: string;
    type: 'VIDEO' | 'PDF' | 'TEXT';
    contentUrl?: string;
    contentText?: string;
    durationSeconds?: number;
    attachments: LessonAttachment[];
  };
  program: {
    id: string;
    name: string;
    price?: string | number | null;
    currency?: string;
  };
  isLocked?: boolean;
  enrollmentType?: 'FREE' | 'PAID' | 'ADMIN';
  lockedLessonCount?: number;
  progress: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    watchPositionSeconds: number;
    completedAt?: string;
  } | null;
  navigation: {
    previousLesson?: { id: string; title: string };
    nextLesson?: { id: string; title: string; isLocked?: boolean };
    currentIndex?: number;
    totalLessons?: number;
  };
}

export interface LessonAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
}

// Discover types
export interface DiscoverProgram {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  slug?: string;
  price?: string | number | null;
  currency?: string;
  lessonCount: number;
}

// Profile types
export interface LearnerProfile {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  registrationNumber?: string;
  enrolledPrograms: string[];
  enrolledProgramsCount: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  completedProgramsCount: number;
  createdAt: string;
}
