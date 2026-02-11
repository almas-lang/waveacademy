'use client';

import { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, Video, ExternalLink, Radio, ChevronLeft, ChevronRight, List, Grid3X3, ChevronDown } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { Button, Badge, PageLoading, Modal } from '@/components/ui';
import { useLearnerSessionsCalendar } from '@/hooks/useLearnerData';
import { UpcomingSession } from '@/types/learner';
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';

type ViewMode = 'calendar' | 'list';

const VIEW_STORAGE_KEY = 'sessions-view';

function getStoredView(): ViewMode {
  if (typeof window === 'undefined') return 'calendar';
  const stored = localStorage.getItem(VIEW_STORAGE_KEY);
  return stored === 'calendar' || stored === 'list' ? stored : 'calendar';
}

export default function LearnerSessionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<UpcomingSession | null>(null);

  // Load persisted view preference
  useEffect(() => {
    setViewMode(getStoredView());
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  };

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const { data: sessions, isLoading } = useLearnerSessionsCalendar(month, year);

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group sessions by date for calendar
  const sessionsByDate = useMemo(() => {
    if (!sessions) return {};
    return sessions.reduce((acc: Record<string, UpcomingSession[]>, session) => {
      const dateKey = format(new Date(session.startTime), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(session);
      return acc;
    }, {});
  }, [sessions]);

  // Sessions sorted for list view
  const monthSessions = useMemo(() => {
    if (!sessions) return [];
    return [...sessions].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions]);

  // Split into past and upcoming for separator
  const { pastSessions, upcomingSessions } = useMemo(() => {
    const now = new Date();
    const past: UpcomingSession[] = [];
    const upcoming: UpcomingSession[] = [];
    for (const s of monthSessions) {
      const end = s.endTime ? new Date(s.endTime) : new Date(new Date(s.startTime).getTime() + 60 * 60 * 1000);
      if (end < now) {
        past.push(s);
      } else {
        upcoming.push(s);
      }
    }
    return { pastSessions: past, upcomingSessions: upcoming };
  }, [monthSessions]);

  if (isLoading) {
    return (
      <>
        <LearnerHeader title="Sessions" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  const isSessionLive = (startTime: string, endTime?: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    return now >= start && now <= end;
  };

  const groupSessionsByDate = (list: UpcomingSession[]) => {
    return list.reduce((groups: Record<string, UpcomingSession[]>, session) => {
      const dateKey = format(new Date(session.startTime), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
      return groups;
    }, {});
  };

  const totalSessions = sessions?.length || 0;
  const liveSessions = sessions?.filter(s => isSessionLive(s.startTime, s.endTime)).length || 0;

  const goToToday = () => setCurrentDate(new Date());
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Sessions for the selected day (for modal)
  const selectedDaySessions = selectedDay
    ? sessionsByDate[format(selectedDay, 'yyyy-MM-dd')] || []
    : [];

  const renderSessionCard = (session: UpcomingSession, clickable = true, fullDescription = false) => {
    const isLive = isSessionLive(session.startTime, session.endTime);
    const sessionPassed = isPast(new Date(session.endTime || session.startTime));

    return (
      <div
        key={session.id}
        onClick={clickable ? () => setSelectedSession(session) : undefined}
        className={`bg-white rounded-xl border shadow-soft p-4 transition-all ${
          clickable ? 'cursor-pointer' : ''
        } ${
          isLive
            ? 'border-emerald-300 bg-emerald-50/50 shadow-emerald-100'
            : sessionPassed
            ? 'border-slate-200/80 opacity-60'
            : 'border-slate-200/80 hover:shadow-elevated'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {isLive && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-lg shrink-0">
                  <Radio className="w-3 h-3 text-white animate-pulse" />
                  <span className="text-xs font-semibold text-white">LIVE</span>
                </div>
              )}
              <h3 className="font-semibold text-slate-800 truncate">{session.name}</h3>
              {sessionPassed && !isLive && (
                <Badge variant="neutral" size="sm">Ended</Badge>
              )}
            </div>

            {session.description && (
              <p className={`text-slate-600 text-sm mb-2 whitespace-pre-wrap ${fullDescription ? '' : 'line-clamp-2'}`}>
                {session.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  /^https?:\/\//.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-accent-500 hover:underline break-all">{part}</a>
                  ) : part
                )}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                {format(new Date(session.startTime), 'h:mm a')}
                {session.endTime && ` – ${format(new Date(session.endTime), 'h:mm a')}`}
              </span>
              {session.programName && (
                <Badge variant="neutral" size="sm">
                  {session.programName}
                </Badge>
              )}
            </div>
          </div>

          {session.meetLink && !sessionPassed && (
            <a
              href={session.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant={isLive ? 'primary' : 'secondary'}
                leftIcon={<Video className="w-4 h-4" />}
                rightIcon={<ExternalLink className="w-3 h-3" />}
              >
                {isLive ? 'Join Now' : 'Join Meeting'}
              </Button>
            </a>
          )}
        </div>
      </div>
    );
  };

  const renderDateGroup = (dateKey: string, daySessions: UpcomingSession[]) => {
    const date = new Date(dateKey + 'T00:00:00');

    return (
      <div key={dateKey}>
        {/* Date Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-slate-800">{getDateLabel(date)}</span>
            {!isToday(date) && !isTomorrow(date) && (
              <p className="text-xs text-slate-500">{format(date, 'MMMM yyyy')}</p>
            )}
          </div>
          {isToday(date) && (
            <Badge variant="info" size="sm">Today</Badge>
          )}
        </div>

        {/* Sessions for this date */}
        <div className="space-y-3 ml-[52px]">
          {daySessions.map((session) => renderSessionCard(session))}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    if (monthSessions.length === 0) {
      return renderEmptyMonth();
    }

    const pastGrouped = groupSessionsByDate(pastSessions);
    const upcomingGrouped = groupSessionsByDate(upcomingSessions);
    const pastDates = Object.keys(pastGrouped).sort();
    const upcomingDates = Object.keys(upcomingGrouped).sort();

    return (
      <div className="space-y-6">
        {/* Past sessions */}
        {pastDates.map(dateKey => renderDateGroup(dateKey, pastGrouped[dateKey]))}

        {/* Separator between past and upcoming */}
        {pastDates.length > 0 && upcomingDates.length > 0 && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 border-t border-primary-200" />
            <span className="text-sm font-medium text-primary-600 px-2">Upcoming</span>
            <div className="flex-1 border-t border-primary-200" />
          </div>
        )}

        {/* Upcoming sessions */}
        {upcomingDates.map(dateKey => renderDateGroup(dateKey, upcomingGrouped[dateKey]))}
      </div>
    );
  };

  const renderEmptyMonth = () => {
    const isCurrentMonth = isSameMonth(currentDate, new Date());
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-800 mb-1">
          No sessions in {format(currentDate, 'MMMM yyyy')}
        </h3>
        <p className="text-sm text-slate-500 mb-4">Try other months for scheduled sessions</p>
        {!isCurrentMonth && (
          <button
            onClick={goToToday}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Go to current month
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <LearnerHeader
        title="Sessions"
        subtitle={`${totalSessions} session${totalSessions !== 1 ? 's' : ''} this month${liveSessions > 0 ? ` · ${liveSessions} live now` : ''}`}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Calendar Controls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-soft mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-100">
            {/* Month/Year Picker */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMonthPicker(!showMonthPicker)}
                  className="flex items-center gap-2 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {format(currentDate, 'MMMM yyyy')}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showMonthPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-elevated z-50 p-4 w-64">
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {months.map((m, index) => (
                          <button
                            key={m}
                            onClick={() => {
                              setCurrentDate(new Date(currentDate.getFullYear(), index, 1));
                              setShowMonthPicker(false);
                            }}
                            className={`px-2 py-1.5 text-sm rounded-lg transition-colors ${
                              currentDate.getMonth() === index
                                ? 'bg-primary-500 text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-slate-100">
                        {years.map(y => (
                          <button
                            key={y}
                            onClick={() => {
                              setCurrentDate(new Date(y, currentDate.getMonth(), 1));
                              setShowMonthPicker(false);
                            }}
                            className={`flex-1 px-2 py-1.5 text-sm rounded-lg transition-colors ${
                              currentDate.getFullYear() === y
                                ? 'bg-primary-500 text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>

              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>

            {/* View Toggle — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => handleViewChange('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-primary-700'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Calendar
              </button>
              <button
                onClick={() => handleViewChange('list')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-primary-700'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>
          </div>

          {/* Calendar View — desktop only */}
          {viewMode === 'calendar' && (
            <div className="hidden sm:block p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const daySessions = sessionsByDate[dateKey] || [];
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);
                  const hasSessions = daySessions.length > 0;
                  const hasLiveSession = daySessions.some(s => isSessionLive(s.startTime, s.endTime));

                  return (
                    <div
                      key={index}
                      onClick={hasSessions ? () => setSelectedDay(day) : undefined}
                      className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                        hasSessions ? 'cursor-pointer' : ''
                      } ${
                        isCurrentDay
                          ? 'bg-primary-50 border-primary-400'
                          : isCurrentMonth
                          ? 'bg-white border-slate-100 hover:border-slate-200'
                          : 'bg-slate-50/50 border-transparent'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentDay
                          ? 'text-primary-700'
                          : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}>
                        {format(day, 'd')}
                      </div>

                      {/* Session indicators */}
                      <div className="space-y-1">
                        {daySessions.slice(0, 3).map(session => {
                          const isLive = isSessionLive(session.startTime, session.endTime);
                          const sessionPassed = isPast(new Date(session.endTime || session.startTime));
                          return (
                            <div
                              key={session.id}
                              className={`text-xs px-1.5 py-1 rounded truncate ${
                                isLive
                                  ? 'bg-emerald-500 text-white'
                                  : sessionPassed
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-primary-100 text-primary-700'
                              }`}
                              title={`${session.name} - ${format(new Date(session.startTime), 'h:mm a')}`}
                            >
                              {isLive && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse" />}
                              {format(new Date(session.startTime), 'h:mm')} {session.name}
                            </div>
                          );
                        })}
                        {daySessions.length > 3 && (
                          <div className="text-xs px-1.5 py-0.5 text-primary-600 font-medium">
                            +{daySessions.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalSessions === 0 && renderEmptyMonth()}
            </div>
          )}

          {/* List View — shown when selected, or as mobile fallback for calendar mode */}
          {viewMode === 'list' && (
            <div className="p-4">
              {renderListView()}
            </div>
          )}
          {viewMode === 'calendar' && (
            <div className="sm:hidden p-4">
              {renderListView()}
            </div>
          )}
        </div>
      </div>

      {/* Day Detail Modal (from calendar click) */}
      <Modal
        isOpen={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(selectedDay, 'EEEE, MMMM d, yyyy') : ''}
        size="lg"
      >
        <div className="space-y-3">
          {selectedDaySessions.length > 0 ? (
            selectedDaySessions.map(session => renderSessionCard(session, true, true))
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">No sessions on this day</p>
          )}
        </div>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Session Details"
        size="md"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{selectedSession.name}</h3>
              {selectedSession.programName && (
                <Badge variant="neutral" size="sm" className="mt-1">
                  {selectedSession.programName}
                </Badge>
              )}
            </div>

            {selectedSession.description && (
              <p className="text-slate-600 whitespace-pre-wrap">
                {selectedSession.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                  /^https?:\/\//.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent-500 hover:underline break-all">{part}</a>
                  ) : part
                )}
              </p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                {format(new Date(selectedSession.startTime), 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                {format(new Date(selectedSession.startTime), 'h:mm a')}
                {selectedSession.endTime && ` – ${format(new Date(selectedSession.endTime), 'h:mm a')}`}
              </div>
            </div>

            {(() => {
              const isLive = isSessionLive(selectedSession.startTime, selectedSession.endTime);
              const sessionPassed = isPast(new Date(selectedSession.endTime || selectedSession.startTime));

              if (isLive) {
                return (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700">This session is live now</span>
                  </div>
                );
              }
              if (sessionPassed) {
                return (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-sm text-slate-500">This session has ended</span>
                  </div>
                );
              }
              return null;
            })()}

            {selectedSession.meetLink && !isPast(new Date(selectedSession.endTime || selectedSession.startTime)) && (
              <a
                href={selectedSession.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant={isSessionLive(selectedSession.startTime, selectedSession.endTime) ? 'primary' : 'secondary'}
                  leftIcon={<Video className="w-4 h-4" />}
                  rightIcon={<ExternalLink className="w-3 h-3" />}
                  className="w-full justify-center"
                >
                  {isSessionLive(selectedSession.startTime, selectedSession.endTime) ? 'Join Now' : 'Join Meeting'}
                </Button>
              </a>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
