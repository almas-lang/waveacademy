import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance — cookies are sent automatically via withCredentials
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Track whether we've already triggered a 401 redirect to prevent multiple simultaneous redirects
let isRedirecting = false;
export function _resetRedirectFlag() { isRedirecting = false; }

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth') && !isRedirecting) {
        const errorCode = error.response?.data?.error?.code || '';
        const isAuthError = errorCode === 'UNAUTHORIZED' || errorCode === 'SESSION_EXPIRED';

        if (isAuthError) {
          isRedirecting = true;
          localStorage.removeItem('auth-storage');
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// AUTH API
// ==========================================

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  loginForce: async (email: string, password: string) => {
    const response = await api.post('/auth/login-force', { email, password });
    return response.data;
  },

  checkAdminExists: async () => {
    const response = await api.get('/auth/admin/check');
    return response.data;
  },

  setupAdmin: async (email: string, password: string, confirmPassword: string, name?: string) => {
    const response = await api.post('/auth/admin/setup', { email, password, confirmPassword, name });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword });
    return response.data;
  },

  setupPassword: async (token: string, password: string, confirmPassword: string) => {
    const response = await api.post('/auth/setup-password', { token, password, confirmPassword });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string, confirmPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, password, confirmPassword });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  register: async (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    programSlug?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
};

// ==========================================
// PUBLIC API (no auth)
// ==========================================

export const publicApi = {
  getProgram: async (slug: string) => {
    const response = await api.get(`/public/programs/${slug}`);
    return response.data;
  },
};

// ==========================================
// PAYMENT API
// ==========================================

export const paymentApi = {
  createOrder: async (programId: string) => {
    const response = await api.post('/payments/create-order', { programId });
    return response.data;
  },

  verify: async (orderId: string) => {
    const response = await api.post('/payments/verify', { orderId });
    return response.data;
  },
};

// ==========================================
// ADMIN API
// ==========================================

export const adminApi = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/admin/programs');
    return response.data;
  },

  getDashboardAnalytics: async () => {
    const response = await api.get('/admin/dashboard/analytics');
    return response.data;
  },

  // Programs
  getPrograms: async (params?: { page?: number; limit?: number; all?: boolean }) => {
    const response = await api.get('/admin/programs', { params });
    return response.data;
  },

  getProgram: async (id: string) => {
    const response = await api.get(`/admin/programs/${id}`);
    return response.data;
  },

  createProgram: async (data: { name: string; description?: string; thumbnailUrl?: string | null }) => {
    const response = await api.post('/admin/programs', data);
    return response.data;
  },

  updateProgram: async (id: string, data: { name?: string; description?: string; thumbnailUrl?: string | null }) => {
    const response = await api.put(`/admin/programs/${id}`, data);
    return response.data;
  },

  deleteProgram: async (id: string) => {
    const response = await api.delete(`/admin/programs/${id}`);
    return response.data;
  },

  togglePublish: async (id: string, isPublished: boolean) => {
    const response = await api.post(`/admin/programs/${id}/publish`, { isPublished });
    return response.data;
  },

  // Topics
  createTopic: async (data: { programId: string; name: string; orderIndex?: number }) => {
    const response = await api.post('/admin/programs/topics', data);
    return response.data;
  },

  updateTopic: async (id: string, data: { name?: string; orderIndex?: number }) => {
    const response = await api.put(`/admin/programs/topics/${id}`, data);
    return response.data;
  },

  deleteTopic: async (id: string) => {
    const response = await api.delete(`/admin/programs/topics/${id}`);
    return response.data;
  },

  // Subtopics
  createSubtopic: async (data: { topicId: string; name: string; orderIndex?: number }) => {
    const response = await api.post('/admin/programs/subtopics', data);
    return response.data;
  },

  // Lessons
  createLesson: async (data: {
    programId: string;
    topicId?: string;
    subtopicId?: string;
    title: string;
    type: 'VIDEO' | 'PDF' | 'TEXT';
    contentUrl?: string;
    contentText?: string;
    thumbnailUrl?: string;
    instructorNotes?: string;
    durationSeconds?: number;
    orderIndex?: number;
  }) => {
    const response = await api.post('/admin/programs/lessons', data);
    return response.data;
  },

  updateLesson: async (id: string, data: Partial<{
    title: string;
    type: 'VIDEO' | 'PDF' | 'TEXT';
    contentUrl: string;
    contentText: string;
    thumbnailUrl: string;
    instructorNotes: string;
    durationSeconds: number;
    orderIndex: number;
    isFree: boolean;
    topicId: string | null;
    subtopicId: string | null;
  }>) => {
    const response = await api.put(`/admin/programs/lessons/${id}`, data);
    return response.data;
  },

  deleteLesson: async (id: string) => {
    const response = await api.delete(`/admin/programs/lessons/${id}`);
    return response.data;
  },

  // Reorder content
  reorderContent: async (programId: string, data: {
    items: Array<{
      id: string;
      type: 'topic' | 'subtopic' | 'lesson';
      orderIndex: number;
      parentId?: string | null;
      parentType?: 'program' | 'topic' | 'subtopic' | null;
    }>;
  }) => {
    const response = await api.put(`/admin/programs/${programId}/reorder`, data);
    return response.data;
  },

  // Update subtopic
  updateSubtopic: async (id: string, data: { name?: string; orderIndex?: number; topicId?: string }) => {
    const response = await api.put(`/admin/programs/subtopics/${id}`, data);
    return response.data;
  },

  deleteSubtopic: async (id: string) => {
    const response = await api.delete(`/admin/programs/subtopics/${id}`);
    return response.data;
  },

  // Learners
  getLearners: async (params?: { status?: string; programId?: string; search?: string; page?: number }) => {
    const response = await api.get('/admin/learners', { params });
    return response.data;
  },

  getLearner: async (id: string) => {
    const response = await api.get(`/admin/learners/${id}`);
    return response.data;
  },

  createLearner: async (data: {
    email: string;
    name: string;
    mobile?: string;
    registrationNumber?: string;
    programIds?: string[];
  }) => {
    const response = await api.post('/admin/learners', data);
    return response.data;
  },

  updateLearnerStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE') => {
    const response = await api.put(`/admin/learners/${id}/status`, { status });
    return response.data;
  },

  resetLearnerPassword: async (id: string) => {
    const response = await api.post(`/admin/learners/${id}/reset-password`);
    return response.data;
  },

  updateLearner: async (id: string, data: { name?: string; mobile?: string; registrationNumber?: string }) => {
    const response = await api.put(`/admin/learners/${id}`, data);
    return response.data;
  },

  enrollLearner: async (learnerId: string, programId: string) => {
    const response = await api.post(`/admin/learners/${learnerId}/enroll`, { programId });
    return response.data;
  },

  unenrollLearner: async (learnerId: string, programId: string) => {
    const response = await api.post(`/admin/learners/${learnerId}/unenroll`, { programId });
    return response.data;
  },

  deleteLearner: async (id: string) => {
    const response = await api.delete(`/admin/learners/${id}`);
    return response.data;
  },

  // User Sessions (login sessions)
  getLearnerSessions: async (learnerId: string) => {
    const response = await api.get(`/admin/learners/${learnerId}/sessions`);
    return response.data;
  },

  logoutLearnerAllDevices: async (learnerId: string) => {
    const response = await api.post(`/admin/learners/${learnerId}/logout-all`);
    return response.data;
  },

  getProgramLearners: async (programId: string) => {
    const response = await api.get(`/admin/programs/${programId}/learners`);
    return response.data;
  },

  // Sessions
  getSessions: async (params?: { from?: string; to?: string; programId?: string }) => {
    const response = await api.get('/admin/sessions', { params });
    return response.data;
  },

  getSession: async (id: string) => {
    const response = await api.get(`/admin/sessions/${id}`);
    return response.data;
  },

  getTodaySessions: async () => {
    const response = await api.get('/admin/sessions/dashboard/today');
    return response.data;
  },

  createSession: async (data: {
    name: string;
    description?: string;
    startTime: string;
    endTime?: string;
    meetLink?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    programIds?: string[];
  }) => {
    const response = await api.post('/admin/sessions', data);
    return response.data;
  },

  updateSession: async (id: string, data: Partial<{
    name: string;
    description: string;
    startTime: string;
    endTime: string;
    meetLink: string;
    isRecurring: boolean;
    recurrenceRule: string;
    programIds: string[];
  }>) => {
    const response = await api.put(`/admin/sessions/${id}`, data);
    return response.data;
  },

  deleteSession: async (id: string, opts?: { deleteMode?: string; occurrenceDate?: string }) => {
    const params = new URLSearchParams();
    if (opts?.deleteMode) params.set('deleteMode', opts.deleteMode);
    if (opts?.occurrenceDate) params.set('occurrenceDate', opts.occurrenceDate);
    const qs = params.toString();
    const response = await api.delete(`/admin/sessions/${id}${qs ? `?${qs}` : ''}`);
    return response.data;
  },

  // Upload
  uploadThumbnail: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/admin/upload/thumbnail`, formData, {
      withCredentials: true,
    });
    return response.data;
  },

  uploadPdf: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL}/admin/upload/pdf`, formData, {
      withCredentials: true,
    });
    return response.data;
  },

  getVideoUploadUrl: async (title: string) => {
    const response = await api.get('/admin/upload/video-url', { params: { title } });
    return response.data;
  },
};

// ==========================================
// LEARNER API
// ==========================================

export const learnerApi = {
  getHome: async () => {
    const response = await api.get('/learner/home');
    return response.data;
  },

  getProgram: async (id: string) => {
    const response = await api.get(`/learner/programs/${id}`);
    return response.data;
  },

  getLesson: async (id: string) => {
    const response = await api.get(`/learner/lessons/${id}`);
    return response.data;
  },

  updateProgress: async (lessonId: string, watchPositionSeconds: number) => {
    const response = await api.post(`/learner/lessons/${lessonId}/progress`, { watchPositionSeconds });
    return response.data;
  },

  completeLesson: async (lessonId: string) => {
    const response = await api.post(`/learner/lessons/${lessonId}/complete`);
    return response.data;
  },

  getSessions: async () => {
    const response = await api.get('/learner/sessions');
    return response.data;
  },

  getSessionsCalendar: async (month: number, year: number) => {
    const response = await api.get('/learner/sessions/calendar', { params: { month, year } });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/learner/profile');
    return response.data;
  },

  getDiscover: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/learner/discover', { params });
    return response.data;
  },

  selfEnroll: async (programId: string) => {
    const response = await api.post(`/learner/enroll/${programId}`);
    return response.data;
  },
};
