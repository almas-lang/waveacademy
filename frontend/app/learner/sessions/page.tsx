'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock, Video, ExternalLink, Radio, ChevronLeft, ChevronRight, List, Grid3X3, ChevronDown } from 'lucide-react';
import { LearnerHeader } from '@/components/learner';
import { Button, Badge, PageLoading } from '@/components/ui';
import { useLearnerSessions } from '@/hooks/useLearnerData';
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
  getDay,
  startOfWeek,
  endOfWeek
} from 'date-fns';

type ViewMode = 'calendar' | 'list';

export default function LearnerSessionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const { data: sessions, isLoading } = useLearnerSessions();

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group sessions by date for calendar
  const sessionsByDate = useMemo(() => {
    if (!sessions) return {};
    return sessions.reduce((acc: Record<string, typeof sessions>, session) => {
      const dateKey = format(new Date(session.startTime), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(session);
      return acc;
    }, {});
  }, [sessions]);

  // Sessions for current month (for list view)
  const monthSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return isSameMonth(sessionDate, currentDate);
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [sessions, currentDate]);

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

  const groupSessionsByDate = () => {
    if (!monthSessions) return {};
    return monthSessions.reduce((groups: Record<string, typeof monthSessions>, session) => {
      const dateKey = format(new Date(session.startTime), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
      return groups;
    }, {});
  };

  const groupedSessions = groupSessionsByDate();
  const sortedDates = Object.keys(groupedSessions).sort();
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

  return (
    <>
      <LearnerHeader
        title="Sessions"
        subtitle={`${totalSessions} upcoming sessions${liveSessions > 0 ? ` • ${liveSessions} live now` : ''}`}
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
                  className="flex items-center gap-2 px-4 py-2 font-semibold text-primary-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {format(currentDate, 'MMMM yyyy')}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showMonthPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-elevated z-50 p-4 w-64">
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {months.map((month, index) => (
                          <button
                            key={month}
                            onClick={() => {
                              setCurrentDate(new Date(currentDate.getFullYear(), index, 1));
                              setShowMonthPicker(false);
                            }}
                            className={`px-2 py-1.5 text-sm rounded-lg transition-colors ${
                              currentDate.getMonth() === index
                                ? 'bg-primary-900 text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {month.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-slate-100">
                        {years.map(year => (
                          <button
                            key={year}
                            onClick={() => {
                              setCurrentDate(new Date(year, currentDate.getMonth(), 1));
                              setShowMonthPicker(false);
                            }}
                            className={`flex-1 px-2 py-1.5 text-sm rounded-lg transition-colors ${
                              currentDate.getFullYear() === year
                                ? 'bg-primary-900 text-white'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {year}
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
                className="ml-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-primary-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:text-primary-900'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:text-primary-900'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="p-4">
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
                  const hasLiveSession = daySessions.some(s => isSessionLive(s.startTime, s.endTime));

                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                        isCurrentDay
                          ? 'bg-primary-900 border-primary-900'
                          : isCurrentMonth
                          ? 'bg-white border-slate-100 hover:border-slate-200'
                          : 'bg-slate-50/50 border-transparent'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentDay
                          ? 'text-white'
                          : isCurrentMonth
                          ? 'text-primary-900'
                          : 'text-slate-400'
                      }`}>
                        {format(day, 'd')}
                      </div>

                      {/* Session indicators */}
                      <div className="space-y-1">
                        {daySessions.slice(0, 3).map(session => {
                          const isLive = isSessionLive(session.startTime, session.endTime);
                          return (
                            <div
                              key={session.id}
                              className={`text-xs px-1.5 py-1 rounded truncate ${
                                isLive
                                  ? 'bg-emerald-500 text-white'
                                  : isCurrentDay
                                  ? 'bg-slate-700 text-slate-200'
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                              title={`${session.name} - ${format(new Date(session.startTime), 'h:mm a')}`}
                            >
                              {isLive && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse" />}
                              {format(new Date(session.startTime), 'h:mm')} {session.name}
                            </div>
                          );
                        })}
                        {daySessions.length > 3 && (
                          <div className={`text-xs px-1.5 py-0.5 ${
                            isCurrentDay ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            +{daySessions.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="p-4">
              {monthSessions && monthSessions.length > 0 ? (
                <div className="space-y-6">
                  {sortedDates.map((dateKey) => {
                    const date = new Date(dateKey);
                    const daySessions = groupedSessions[dateKey];

                    return (
                      <div key={dateKey}>
                        {/* Date Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-primary-900 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="font-semibold text-primary-900">{getDateLabel(date)}</span>
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
                          {daySessions.map((session) => {
                            const isLive = isSessionLive(session.startTime, session.endTime);
                            const sessionPassed = isPast(new Date(session.endTime || session.startTime));

                            return (
                              <div
                                key={session.id}
                                className={`bg-white rounded-xl border shadow-soft p-4 transition-all ${
                                  isLive
                                    ? 'border-emerald-300 bg-emerald-50/50 shadow-emerald-100'
                                    : sessionPassed
                                    ? 'border-slate-200/80 opacity-60'
                                    : 'border-slate-200/80 hover:shadow-elevated'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      {isLive && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-lg">
                                          <Radio className="w-3 h-3 text-white animate-pulse" />
                                          <span className="text-xs font-semibold text-white">LIVE</span>
                                        </div>
                                      )}
                                      <h3 className="font-semibold text-primary-900">{session.name}</h3>
                                      {sessionPassed && !isLive && (
                                        <Badge variant="neutral" size="sm">Ended</Badge>
                                      )}
                                    </div>

                                    {session.description && (
                                      <p className="text-slate-600 text-sm mb-2">{session.description}</p>
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
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-primary-900 mb-1">No sessions this month</h3>
                  <p className="text-sm text-slate-500">Check other months for scheduled sessions</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
