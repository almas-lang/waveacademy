// Learner Home types
export interface LearnerHome {
  user: {
    id: string;
    name: string;
    email: string;
  };
  enrolledPrograms: EnrolledProgram[];
  upcomingSessions: UpcomingSession[];
  recentProgress: RecentLessonProgress[];
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
  };
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
  };
  progress: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    watchPositionSeconds: number;
    completedAt?: string;
  };
  navigation: {
    previousLesson?: { id: string; title: string };
    nextLesson?: { id: string; title: string };
  };
}

export interface LessonAttachment {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
}

// Profile types
export interface LearnerProfile {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  registrationNumber?: string;
  enrolledProgramsCount: number;
  completedLessonsCount: number;
  createdAt: string;
}
