'use client';

import { useState } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, Video, Edit, Trash2, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, List, Grid3X3, X, MapPin, Users } from 'lucide-react';
import { AdminHeader } from '@/components/admin';
import SessionModal from '@/components/admin/SessionModal';
import { Button, Badge, Table, PageLoading, Modal, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui';
import { useSessions, usePrograms, useDeleteSession } from '@/hooks';
import { Session, SessionFilters } from '@/types/admin';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addYears, subYears } from 'date-fns';

type ViewMode = 'calendar' | 'list';
type DeleteMode = 'single' | 'all';

export default function SessionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [previewSession, setPreviewSession] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('single');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Date filter state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filters, setFilters] = useState<SessionFilters>({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const { data: programs } = usePrograms();
  const { data: sessions, isLoading } = useSessions(filters);
  const deleteSession = useDeleteSession();

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'next'
      ? addMonths(currentMonth, 1)
      : subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    setFilters({
      ...filters,
      from: format(startOfMonth(newMonth), 'yyyy-MM-dd'),
      to: format(endOfMonth(newMonth), 'yyyy-MM-dd'),
    });
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    const newMonth = direction === 'next'
      ? addYears(currentMonth, 1)
      : subYears(currentMonth, 1);
    setCurrentMonth(newMonth);
    setFilters({
      ...filters,
      from: format(startOfMonth(newMonth), 'yyyy-MM-dd'),
      to: format(endOfMonth(newMonth), 'yyyy-MM-dd'),
    });
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newMonth = new Date(currentMonth.getFullYear(), monthIndex, 1);
    setCurrentMonth(newMonth);
    setFilters({
      ...filters,
      from: format(startOfMonth(newMonth), 'yyyy-MM-dd'),
      to: format(endOfMonth(newMonth), 'yyyy-MM-dd'),
    });
    setShowMonthPicker(false);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setFilters({
      ...filters,
      from: format(startOfMonth(today), 'yyyy-MM-dd'),
      to: format(endOfMonth(today), 'yyyy-MM-dd'),
    });
  };

  const handleProgramFilter = (programId: string) => {
    setFilters(prev => ({
      ...prev,
      programId: programId || undefined,
    }));
  };

  const handlePreview = (session: Session) => {
    setPreviewSession(session);
  };

  const handleEdit = (session: Session) => {
    setPreviewSession(null);
    setEditingSession(session);
    setShowModal(true);
  };

  const handleDeleteClick = (session: Session) => {
    setPreviewSession(null);
    setDeletingSession(session);
    setDeleteMode('single');
  };

  const handleDelete = async () => {
    if (!deletingSession) return;
    // Pass deleteMode to API for recurring sessions
    await deleteSession.mutateAsync(deletingSession.id);
    setDeletingSession(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSession(null);
  };

  // Get sessions for a specific day
  const getSessionsForDay = (date: Date) => {
    return sessions?.filter(session => {
      const sessionDate = new Date(session.startTime);
      return isSameDay(sessionDate, date);
    }) || [];
  };

  // Generate calendar days
  const calendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const columns = [
    {
      key: 'name',
      header: 'Session',
      render: (session: Session) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-primary-900">{session.name}</p>
            {session.isRecurring && (
              <Badge variant="info" size="sm">
                <RefreshCw className="w-3 h-3 mr-1" />
                Recurring
              </Badge>
            )}
          </div>
          {session.description && (
            <p className="text-sm text-slate-500 truncate max-w-xs mt-0.5">
              {session.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'datetime',
      header: 'Date & Time',
      render: (session: Session) => (
        <div className="text-sm">
          <div className="flex items-center gap-1.5 text-primary-900 font-medium">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            {format(new Date(session.startTime), 'EEE, MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 mt-1">
            <Clock className="w-4 h-4 text-slate-400" />
            {format(new Date(session.startTime), 'h:mm a')}
            {session.endTime && ` – ${format(new Date(session.endTime), 'h:mm a')}`}
          </div>
        </div>
      ),
    },
    {
      key: 'programs',
      header: 'Programs',
      render: (session: Session) => (
        <div className="flex flex-wrap gap-1.5">
          {session.programs.map((program, idx) => (
            <Badge key={idx} variant="neutral" size="sm">
              {program}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'meetLink',
      header: 'Meeting',
      render: (session: Session) => (
        session.meetLink ? (
          <a
            href={session.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-accent-600 transition-colors group"
          >
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-accent-50 transition-colors">
              <Video className="w-4 h-4 text-slate-600 group-hover:text-accent-600" />
            </div>
            <span className="text-sm font-medium">Join</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        ) : (
          <span className="text-slate-400 text-sm">No link</span>
        )
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-14 text-right',
      render: (session: Session) => (
        <DropdownMenu>
          <DropdownItem onClick={() => handleEdit(session)}>
            <Edit className="w-4 h-4 text-slate-400" />
            Edit
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem variant="danger" onClick={() => handleDeleteClick(session)}>
            <Trash2 className="w-4 h-4" />
            Delete
          </DropdownItem>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title="Sessions"
        subtitle="Schedule and manage live sessions for your learners"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-slate-500 text-sm">
              {sessions?.length || 0} sessions in {format(currentMonth, 'MMMM yyyy')}
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowModal(true)}
          >
            Create Session
          </Button>
        </div>

        {/* Filters & View Toggle */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setShowMonthPicker(!showMonthPicker)}
                  className="px-3 py-1.5 font-medium text-primary-900 text-sm hover:bg-white rounded-md transition-colors min-w-[140px] text-center"
                >
                  {format(currentMonth, 'MMMM yyyy')}
                </button>
                <button
                  onClick={() => handleMonthChange('next')}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>

            {/* Month/Year Picker Dropdown */}
            {showMonthPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                <div className="absolute z-50 mt-2 p-4 bg-white rounded-xl shadow-elevated border border-slate-200 w-72">
                  {/* Year Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => handleYearChange('prev')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-semibold text-primary-900">{currentMonth.getFullYear()}</span>
                    <button
                      onClick={() => handleYearChange('next')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Month Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => (
                      <button
                        key={month}
                        onClick={() => handleMonthSelect(index)}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                          currentMonth.getMonth() === index
                            ? 'bg-primary-900 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex-1" />

            {/* Program Filter */}
            <div className="relative">
              <select
                value={filters.programId || ''}
                onChange={(e) => handleProgramFilter(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 hover:border-slate-400 transition-all cursor-pointer min-w-[160px]"
              >
                <option value="">All Programs</option>
                {programs?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
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
        </div>

        {/* Sessions View */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
          {isLoading ? (
            <PageLoading />
          ) : viewMode === 'calendar' ? (
            /* Calendar View */
            <div className="p-4">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-px mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
                {calendarDays().map((day, index) => {
                  const daySessions = getSessionsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] p-2 bg-white ${
                        !isCurrentMonth ? 'bg-slate-50' : ''
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentDay
                          ? 'w-7 h-7 bg-accent-500 text-white rounded-full flex items-center justify-center'
                          : isCurrentMonth ? 'text-primary-900' : 'text-slate-400'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {daySessions.slice(0, 3).map((session) => (
                          <button
                            key={session.id}
                            onClick={() => handlePreview(session)}
                            className="w-full text-left px-2 py-1 text-xs bg-accent-50 text-accent-700 rounded truncate hover:bg-accent-100 transition-colors"
                          >
                            <span className="font-medium">{format(new Date(session.startTime), 'h:mm a')}</span>
                            <span className="ml-1 text-accent-600">{session.name}</span>
                          </button>
                        ))}
                        {daySessions.length > 3 && (
                          <p className="text-xs text-slate-500 px-2">+{daySessions.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List View */
            <Table
              columns={columns}
              data={sessions || []}
              rowKey={(session) => session.id}
              onRowClick={(session) => handlePreview(session)}
              emptyState={{
                title: 'No sessions scheduled',
                description: `No sessions found for ${format(currentMonth, 'MMMM yyyy')}`,
                action: {
                  label: 'Create Session',
                  onClick: () => setShowModal(true),
                },
              }}
            />
          )}

          {/* Empty state for calendar */}
          {viewMode === 'calendar' && (!sessions || sessions.length === 0) && (
            <div className="text-center py-8 border-t border-slate-100">
              <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600 font-medium">No sessions scheduled</p>
              <p className="text-sm text-slate-500 mt-1">No sessions found for {format(currentMonth, 'MMMM yyyy')}</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowModal(true)}
              >
                Create Session
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Session Preview Modal */}
      <Modal
        isOpen={!!previewSession}
        onClose={() => setPreviewSession(null)}
        title=""
        size="md"
      >
        {previewSession && (
          <div className="-mt-2">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold text-primary-900">{previewSession.name}</h2>
                  {previewSession.isRecurring && (
                    <Badge variant="info" size="sm">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Recurring
                    </Badge>
                  )}
                </div>
                {previewSession.description && (
                  <p className="text-slate-600 mt-1 whitespace-pre-wrap">
                    {previewSession.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                      /^https?:\/\//.test(part) ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent-500 hover:underline break-all">{part}</a>
                      ) : part
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4 bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <CalendarIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium text-primary-900">
                    {format(new Date(previewSession.startTime), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Clock className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Time</p>
                  <p className="font-medium text-primary-900">
                    {format(new Date(previewSession.startTime), 'h:mm a')}
                    {previewSession.endTime && ` – ${format(new Date(previewSession.endTime), 'h:mm a')}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Programs</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {previewSession.programs.map((program, idx) => (
                      <Badge key={idx} variant="neutral" size="sm">{program}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {previewSession.meetLink && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Video className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500">Meeting Link</p>
                    <a
                      href={previewSession.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-accent-600 hover:text-accent-700 truncate block"
                    >
                      {previewSession.meetLink}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => handleDeleteClick(previewSession)}
              >
                Delete
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPreviewSession(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Edit className="w-4 h-4" />}
                  onClick={() => handleEdit(previewSession)}
                >
                  Edit Session
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <SessionModal
        isOpen={showModal}
        onClose={closeModal}
        session={editingSession}
        onDelete={(session) => {
          closeModal();
          handleDeleteClick(session);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingSession}
        onClose={() => setDeletingSession(null)}
        title="Delete Session"
        size="sm"
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-600 mb-2">
            Are you sure you want to delete <strong className="text-primary-900">{deletingSession?.name}</strong>?
          </p>
          <p className="text-sm text-slate-500">
            Scheduled for {deletingSession && format(new Date(deletingSession.startTime), 'EEEE, MMMM d, yyyy at h:mm a')}
          </p>

          {/* Recurring Session Options */}
          {deletingSession?.isRecurring && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left">
              <p className="text-sm font-medium text-slate-700 mb-3">
                This is a recurring session. What would you like to delete?
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="single"
                    checked={deleteMode === 'single'}
                    onChange={() => setDeleteMode('single')}
                    className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                  />
                  <div>
                    <p className="font-medium text-primary-900">Only this session</p>
                    <p className="text-xs text-slate-500">Delete only the session on {deletingSession && format(new Date(deletingSession.startTime), 'MMM d, yyyy')}</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="radio"
                    name="deleteMode"
                    value="all"
                    checked={deleteMode === 'all'}
                    onChange={() => setDeleteMode('all')}
                    className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                  />
                  <div>
                    <p className="font-medium text-primary-900">All recurring sessions</p>
                    <p className="text-xs text-slate-500">Delete this and all future occurrences</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setDeletingSession(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteSession.isPending}
          >
            {deletingSession?.isRecurring && deleteMode === 'all' ? 'Delete All Sessions' : 'Delete Session'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
