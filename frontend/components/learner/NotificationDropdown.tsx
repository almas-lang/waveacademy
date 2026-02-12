'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BookOpen, Calendar, UserPlus, Info, CheckCheck } from 'lucide-react';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, Notification } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: unreadData, error: unreadError } = useUnreadCount();
  const { data: notificationsData, isLoading, error: notificationsError, refetch } = useNotifications({ limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.unreadCount || 0;
  const notifications = notificationsData?.notifications || [];

  // Log errors for debugging
  if (unreadError) console.error('Unread count error:', unreadError);
  if (notificationsError) console.error('Notifications error:', notificationsError);

  // Refetch notifications list when dropdown opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'NEW_LESSON':
        return <BookOpen className="w-4 h-4" />;
      case 'NEW_SESSION':
        return <Calendar className="w-4 h-4" />;
      case 'ENROLLMENT':
        return <UserPlus className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'NEW_LESSON':
        return 'bg-accent-50 text-accent-600';
      case 'NEW_SESSION':
        return 'bg-purple-50 text-purple-600';
      case 'ENROLLMENT':
        return 'bg-emerald-50 text-emerald-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on type
    if (notification.type === 'NEW_LESSON' && notification.data?.lessonId) {
      // Navigate directly to the lesson
      router.push(`/learner/lessons/${notification.data.lessonId}`);
    } else if (notification.data?.programId) {
      router.push(`/learner/programs/${notification.data.programId}`);
    } else if (notification.type === 'NEW_SESSION') {
      router.push('/learner/sessions');
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-accent-500 rounded-full ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-elevated z-50 overflow-hidden animate-scale-in origin-top-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-accent-50 text-accent-600 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-accent-500 rounded-full" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-1">You'll be notified when new content is available</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                        !notification.isRead ? 'bg-accent-50/30' : ''
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getIconBg(notification.type)}`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? 'font-medium text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-accent-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
