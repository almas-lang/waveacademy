/* eslint-disable @typescript-eslint/no-explicit-any */

// jest.mock is hoisted before all variable declarations, so all mocks must
// be created inside the factory. After import, we access them via the `api` object.
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        response: { use: jest.fn() },
        request: { use: jest.fn() },
      },
    })),
    post: jest.fn(),
  },
}));

import axios from 'axios';
import { api, authApi, adminApi, learnerApi } from '@/lib/api';

// The imported `api` IS the mock instance returned by axios.create()
const mockApi = api as any;

// Capture data from module initialization BEFORE clearAllMocks wipes it.
// axios.create and interceptors.response.use are called when api.ts loads.
const createCallArgs = (axios.create as jest.Mock).mock.calls[0]?.[0];
const interceptorCalls = mockApi.interceptors.response.use.mock.calls[0];
const interceptorSuccessHandler = interceptorCalls?.[0];
const interceptorErrorHandler = interceptorCalls?.[1];

describe('api.ts', () => {
  // ── Instance config ──

  describe('axios instance', () => {
    it('creates instance with correct baseURL', () => {
      expect(createCallArgs).toEqual(
        expect.objectContaining({
          baseURL: expect.any(String),
        })
      );
    });

    it('creates instance with withCredentials: true', () => {
      expect(createCallArgs).toEqual(
        expect.objectContaining({
          withCredentials: true,
        })
      );
    });

    it('creates instance with Content-Type: application/json', () => {
      expect(createCallArgs).toEqual(
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('registers a response interceptor', () => {
      expect(interceptorSuccessHandler).toEqual(expect.any(Function));
      expect(interceptorErrorHandler).toEqual(expect.any(Function));
    });
  });

  // ── 401 interceptor ──

  describe('401 interceptor', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { href: '', pathname: '/dashboard' },
      });
      Storage.prototype.removeItem = jest.fn();
    });

    it('redirects on UNAUTHORIZED error code', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: { code: 'UNAUTHORIZED' } },
        },
      };

      await expect(interceptorErrorHandler(error)).rejects.toBe(error);
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth-storage');
      expect(window.location.href).toBe('/auth/login');
    });

    it('redirects on SESSION_EXPIRED error code', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: { code: 'SESSION_EXPIRED' } },
        },
      };

      await expect(interceptorErrorHandler(error)).rejects.toBe(error);
      expect(window.location.href).toBe('/auth/login');
    });

    it('does not redirect when on /auth/* paths', async () => {
      window.location.pathname = '/auth/login';
      const error = {
        response: {
          status: 401,
          data: { error: { code: 'UNAUTHORIZED' } },
        },
      };

      await expect(interceptorErrorHandler(error)).rejects.toBe(error);
      expect(window.location.href).not.toBe('/auth/login');
    });

    it('does not redirect for non-auth 401 errors', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: { code: 'INVALID_TOKEN' } },
        },
      };

      await expect(interceptorErrorHandler(error)).rejects.toBe(error);
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    it('rejects the promise on 401', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: { code: 'UNAUTHORIZED' } },
        },
      };

      await expect(interceptorErrorHandler(error)).rejects.toBe(error);
    });

    it('rejects for non-401 errors without redirect', async () => {
      const error = { response: { status: 500 } };

      await expect(interceptorErrorHandler(error)).rejects.toBe(error);
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  // ── authApi ──

  describe('authApi', () => {
    it('login calls POST /auth/login', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { token: 'abc' } });
      await authApi.login('a@b.com', 'pw');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pw' });
    });

    it('loginForce calls POST /auth/login-force', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await authApi.loginForce('a@b.com', 'pw');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login-force', { email: 'a@b.com', password: 'pw' });
    });

    it('logout calls POST /auth/logout', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await authApi.logout();
      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('checkAdminExists calls GET /auth/admin/check', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { exists: true } });
      await authApi.checkAdminExists();
      expect(mockApi.get).toHaveBeenCalledWith('/auth/admin/check');
    });

    it('setupAdmin calls POST /auth/admin/setup', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await authApi.setupAdmin('a@b.com', 'pw', 'pw', 'Admin');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/admin/setup', {
        email: 'a@b.com', password: 'pw', confirmPassword: 'pw', name: 'Admin',
      });
    });

    it('changePassword calls POST /auth/change-password', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await authApi.changePassword('old', 'new', 'new');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'old', newPassword: 'new', confirmPassword: 'new',
      });
    });

    it('setupPassword calls POST /auth/setup-password', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await authApi.setupPassword('tok', 'pw', 'pw');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/setup-password', {
        token: 'tok', password: 'pw', confirmPassword: 'pw',
      });
    });

    it('forgotPassword calls POST /auth/forgot-password', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await authApi.forgotPassword('a@b.com');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' });
    });

    it('resetPassword calls POST /auth/reset-password', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await authApi.resetPassword('tok', 'pw', 'pw');
      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'tok', password: 'pw', confirmPassword: 'pw',
      });
    });
  });

  // ── adminApi (spot checks) ──

  describe('adminApi', () => {
    it('getPrograms calls GET /admin/programs with params', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { programs: [] } });
      await adminApi.getPrograms({ page: 1, limit: 10 });
      expect(mockApi.get).toHaveBeenCalledWith('/admin/programs', { params: { page: 1, limit: 10 } });
    });

    it('createLearner calls POST /admin/learners', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      const data = { email: 'l@test.com', name: 'Learner' };
      await adminApi.createLearner(data);
      expect(mockApi.post).toHaveBeenCalledWith('/admin/learners', data);
    });

    it('enrollLearner calls POST /admin/learners/:id/enroll', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await adminApi.enrollLearner('l1', 'p1');
      expect(mockApi.post).toHaveBeenCalledWith('/admin/learners/l1/enroll', { programId: 'p1' });
    });

    it('deleteSession builds query string from opts', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: {} });
      await adminApi.deleteSession('s1', { deleteMode: 'single', occurrenceDate: '2025-01-01' });
      expect(mockApi.delete).toHaveBeenCalledWith(
        '/admin/sessions/s1?deleteMode=single&occurrenceDate=2025-01-01'
      );
    });

    it('deleteSession works without opts', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: {} });
      await adminApi.deleteSession('s1');
      expect(mockApi.delete).toHaveBeenCalledWith('/admin/sessions/s1');
    });
  });

  // ── learnerApi (spot checks) ──

  describe('learnerApi', () => {
    it('getHome calls GET /learner/home', async () => {
      mockApi.get.mockResolvedValueOnce({ data: {} });
      await learnerApi.getHome();
      expect(mockApi.get).toHaveBeenCalledWith('/learner/home');
    });

    it('getLesson calls GET /learner/lessons/:id', async () => {
      mockApi.get.mockResolvedValueOnce({ data: {} });
      await learnerApi.getLesson('les1');
      expect(mockApi.get).toHaveBeenCalledWith('/learner/lessons/les1');
    });

    it('updateProgress calls POST with watchPositionSeconds', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await learnerApi.updateProgress('les1', 120);
      expect(mockApi.post).toHaveBeenCalledWith('/learner/lessons/les1/progress', { watchPositionSeconds: 120 });
    });

    it('completeLesson calls POST /learner/lessons/:id/complete', async () => {
      mockApi.post.mockResolvedValueOnce({ data: {} });
      await learnerApi.completeLesson('les1');
      expect(mockApi.post).toHaveBeenCalledWith('/learner/lessons/les1/complete');
    });
  });

  // ── Upload methods ──

  describe('upload methods', () => {
    it('uploadThumbnail uses axios.post directly with FormData', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: { url: 'https://cdn/img.jpg' } });
      const file = new File(['data'], 'pic.jpg', { type: 'image/jpeg' });
      await adminApi.uploadThumbnail(file);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/admin/upload/thumbnail'),
        expect.any(FormData),
        expect.objectContaining({ withCredentials: true })
      );
    });

    it('uploadPdf uses axios.post directly with FormData', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: { url: 'https://cdn/doc.pdf' } });
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      await adminApi.uploadPdf(file);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/admin/upload/pdf'),
        expect.any(FormData),
        expect.objectContaining({ withCredentials: true })
      );
    });
  });
});
