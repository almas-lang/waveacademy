'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Plus, BookOpen, Eye, Edit, Trash2, Globe, Lock } from 'lucide-react';
import { AdminHeader } from '@/components/admin';
import { useSidebar } from '@/lib/sidebar-context';
import ProgramModal from '@/components/admin/ProgramModal';
import { Button, Badge, Table, EmptyState, Modal, Pagination, DropdownMenu, DropdownItem, DropdownDivider, InlineLoading } from '@/components/ui';
import { useProgramsPaginated, useDeleteProgram, useTogglePublish } from '@/hooks';
import { Program } from '@/types/admin';
import { format } from 'date-fns';

export default function ProgramsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openSidebar } = useSidebar();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowModal(true);
      router.replace('/admin/programs', { scroll: false });
    }
  }, [searchParams, router]);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProgramsPaginated({ page, limit: 20 });
  const programs = data?.programs;
  const pagination = data?.pagination;
  const deleteProgram = useDeleteProgram();
  const togglePublish = useTogglePublish();

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deletingProgram) return;
    try {
      await deleteProgram.mutateAsync(deletingProgram.id);
    } catch {
      // Error handled by mutation onError
    } finally {
      setDeletingProgram(null);
    }
  };

  const handleTogglePublish = async (program: Program) => {
    try {
      await togglePublish.mutateAsync({
        id: program.id,
        isPublished: !program.isPublished,
      });
    } catch {
      // Error handled by mutation onError
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProgram(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Program',
      render: (program: Program) => (
        <div className="flex items-center gap-3.5">
          {program.thumbnailUrl ? (
            <Image
              src={program.thumbnailUrl}
              alt={program.name}
              width={44}
              height={44}
              className="w-11 h-11 rounded-lg object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="w-11 h-11 bg-slate-100 rounded-lg flex items-center justify-center ring-1 ring-slate-200">
              <BookOpen className="w-5 h-5 text-slate-500" />
            </div>
          )}
          <div>
            <p className="font-medium text-slate-900">{program.name}</p>
            {program.description && (
              <p className="text-sm text-slate-500 truncate max-w-xs">
                {program.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'learnerCount',
      header: 'Learners',
      render: (program: Program) => (
        <span className="text-slate-600 font-medium">{program.learnerCount}</span>
      ),
    },
    {
      key: 'lessonCount',
      header: 'Lessons',
      render: (program: Program) => (
        <span className="text-slate-600 font-medium">{program.lessonCount}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (program: Program) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={program.isPublic ? 'info' : 'neutral'} size="sm">
            {program.isPublic ? 'Public' : 'Private'}
          </Badge>
          <Badge variant={program.price && Number(program.price) > 0 ? 'warning' : 'success'} size="sm">
            {program.price && Number(program.price) > 0 ? `₹${program.price}` : 'Free'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'isPublished',
      header: 'Status',
      render: (program: Program) => (
        <Badge variant={program.isPublished ? 'success' : 'neutral'} dot>
          {program.isPublished ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (program: Program) => (
        <span className="text-slate-500 text-sm">
          {format(new Date(program.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-14 text-right',
      render: (program: Program) => (
        <DropdownMenu>
          <DropdownItem href={`/admin/programs/${program.id}`}>
            <Eye className="w-4 h-4 text-slate-400" />
            View Details
          </DropdownItem>
          <DropdownItem onClick={() => handleEdit(program)}>
            <Edit className="w-4 h-4 text-slate-400" />
            Edit
          </DropdownItem>
          <DropdownItem onClick={() => handleTogglePublish(program)}>
            {program.isPublished ? (
              <>
                <Lock className="w-4 h-4 text-slate-400" />
                Unpublish
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-slate-400" />
                Publish
              </>
            )}
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem variant="danger" onClick={() => setDeletingProgram(program)}>
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
        title="Programs"
        subtitle="Manage your programs and learning content"
        onMenuClick={openSidebar}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-slate-500 text-sm">
              {pagination?.total || programs?.length || 0} programs total
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowModal(true)}
          >
            Create Program
          </Button>
        </div>

        {/* Programs Tables */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="flex items-center justify-center py-16">
              <InlineLoading text="Loading programs..." />
            </div>
          </div>
        ) : (programs || []).length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
            <Table
              columns={columns}
              data={[]}
              rowKey={(program) => program.id}
              emptyState={{
                title: 'No programs yet',
                description: 'Create your first program to get started',
                action: {
                  label: 'Create Program',
                  onClick: () => setShowModal(true),
                },
              }}
            />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft overflow-hidden">
              <Table
                columns={columns}
                data={programs || []}
                rowKey={(program) => program.id}
                onRowClick={(program) => {
                  router.push(`/admin/programs/${program.id}`);
                }}
              />
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 mt-4 bg-white rounded-xl border border-slate-200/80 shadow-soft">
                <p className="text-sm text-slate-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} programs
                </p>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <ProgramModal
        isOpen={showModal}
        onClose={closeModal}
        program={editingProgram}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingProgram}
        onClose={() => setDeletingProgram(null)}
        title="Delete Program"
        size="sm"
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-600 mb-2">
            Are you sure you want to delete <strong className="text-slate-900">{deletingProgram?.name}</strong>?
          </p>
          <p className="text-sm text-slate-500 mb-2">
            This will also delete all topics, lessons, and enrollments associated with this program.
          </p>
          <p className="text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setDeletingProgram(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteProgram.isPending}
          >
            Delete Program
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
