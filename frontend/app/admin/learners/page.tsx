'use client';

import { useState } from 'react';
import { Plus, Search, Eye, Mail, UserCheck, UserX } from 'lucide-react';
import { AdminHeader } from '@/components/admin';
import LearnerModal from '@/components/admin/LearnerModal';
import { Button, Badge, Table, PageLoading, Pagination, getStatusVariant, formatStatus, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui';
import { useLearners, usePrograms, useUpdateLearnerStatus, useResetLearnerPassword } from '@/hooks';
import { Learner, LearnerFilters, UserStatus } from '@/types/admin';
import { format } from 'date-fns';

export default function LearnersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState<LearnerFilters>({
    page: 1,
    limit: 20,
  });
  const [searchInput, setSearchInput] = useState('');

  const { data: programs } = usePrograms();
  const { data, isLoading } = useLearners(filters);
  const updateStatus = useUpdateLearnerStatus();
  const resetPassword = useResetLearnerPassword();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: (status as UserStatus) || undefined,
      page: 1,
    }));
  };

  const handleProgramFilter = (programId: string) => {
    setFilters(prev => ({
      ...prev,
      programId: programId || undefined,
      page: 1,
    }));
  };

  const handleStatusChange = async (learner: Learner, newStatus: 'ACTIVE' | 'INACTIVE') => {
    await updateStatus.mutateAsync({ id: learner.id, status: newStatus });
  };

  const handleResetPassword = async (learner: Learner) => {
    await resetPassword.mutateAsync(learner.id);
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20 });
    setSearchInput('');
  };

  const columns = [
    {
      key: 'name',
      header: 'Learner',
      render: (learner: Learner) => (
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {learner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-900">{learner.name}</p>
            <p className="text-sm text-slate-500">{learner.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      render: (learner: Learner) => (
        <span className="text-slate-600">{learner.mobile || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (learner: Learner) => (
        <Badge variant={getStatusVariant(learner.status)} dot>
          {formatStatus(learner.status)}
        </Badge>
      ),
    },
    {
      key: 'programs',
      header: 'Programs',
      render: (learner: Learner) => (
        <div className="max-w-xs">
          {learner.enrolledPrograms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {learner.enrolledPrograms.slice(0, 2).map((program, idx) => (
                <Badge key={idx} variant="neutral" size="sm">
                  {program}
                </Badge>
              ))}
              {learner.enrolledPrograms.length > 2 && (
                <Badge variant="neutral" size="sm">
                  +{learner.enrolledPrograms.length - 2}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm">No programs</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (learner: Learner) => (
        <span className="text-slate-500 text-sm">
          {format(new Date(learner.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-14 text-right',
      render: (learner: Learner) => (
        <DropdownMenu>
          <DropdownItem href={`/admin/learners/${learner.id}`}>
            <Eye className="w-4 h-4 text-slate-400" />
            View Details
          </DropdownItem>
          <DropdownItem onClick={() => handleResetPassword(learner)}>
            <Mail className="w-4 h-4 text-slate-400" />
            Reset Password
          </DropdownItem>
          <DropdownDivider />
          {learner.status === 'ACTIVE' ? (
            <DropdownItem variant="danger" onClick={() => handleStatusChange(learner, 'INACTIVE')}>
              <UserX className="w-4 h-4" />
              Deactivate
            </DropdownItem>
          ) : (
            <DropdownItem onClick={() => handleStatusChange(learner, 'ACTIVE')} className="text-emerald-600 hover:bg-emerald-50">
              <UserCheck className="w-4 h-4" />
              Activate
            </DropdownItem>
          )}
        </DropdownMenu>
      ),
    },
  ];

  const hasFilters = filters.search || filters.status || filters.programId;

  return (
    <>
      <AdminHeader
        title="Learners"
        subtitle="Manage your learners and their enrollments"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-slate-500 text-sm">
              {data?.pagination.total || 0} learners total
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowModal(true)}
          >
            Add Learner
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 hover:border-slate-400 transition-all"
                />
              </div>
            </form>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <select
                value={filters.status || ''}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="px-3 pr-8 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 hover:border-slate-400 transition-all cursor-pointer min-w-[140px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_0.75rem_center] bg-no-repeat"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PENDING_SETUP">Pending Setup</option>
              </select>

              {/* Program Filter */}
              <select
                value={filters.programId || ''}
                onChange={(e) => handleProgramFilter(e.target.value)}
                className="px-3 pr-8 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:border-slate-500 hover:border-slate-400 transition-all cursor-pointer min-w-[160px] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_0.75rem_center] bg-no-repeat"
              >
                <option value="">All Programs</option>
                {programs?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Clear Filters */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Learners Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
          {isLoading ? (
            <PageLoading />
          ) : (
            <>
              <Table
                columns={columns}
                data={data?.learners || []}
                rowKey={(learner) => learner.id}
                onRowClick={(learner) => {
                  window.location.href = `/admin/learners/${learner.id}`;
                }}
                emptyState={{
                  title: 'No learners found',
                  description: hasFilters
                    ? 'Try adjusting your filters'
                    : 'Add your first learner to get started',
                  action: hasFilters
                    ? { label: 'Clear Filters', onClick: clearFilters }
                    : { label: 'Add Learner', onClick: () => setShowModal(true) },
                }}
              />

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                    {data.pagination.total} learners
                  </p>
                  <Pagination
                    currentPage={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Learner Modal */}
      <LearnerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
