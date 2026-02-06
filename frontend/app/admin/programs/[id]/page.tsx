'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Edit,
  Globe,
  Lock,
  BookOpen,
  Users,
  Trash2,
  Folder,
  FileText,
  UserPlus,
  UserMinus,
  Search,
  Mail,
  X,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin';
import ProgramModal from '@/components/admin/ProgramModal';
import ContentTree from '@/components/admin/ContentTree';
import { Button, Badge, PageLoading, Modal } from '@/components/ui';
import { useProgram, useTogglePublish, useDeleteProgram, useProgramLearners, useLearners, useEnrollLearner, useUnenrollLearner } from '@/hooks';
import { ContentItem, Learner } from '@/types/admin';

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddLearnerModal, setShowAddLearnerModal] = useState(false);
  const [learnerSearchQuery, setLearnerSearchQuery] = useState('');
  const [learnerToRemove, setLearnerToRemove] = useState<Learner | null>(null);

  const { data, isLoading, refetch } = useProgram(programId);
  const { data: programLearners, isLoading: learnersLoading, refetch: refetchLearners } = useProgramLearners(programId);
  const { data: allLearnersData } = useLearners({ search: learnerSearchQuery });
  const enrollLearner = useEnrollLearner();
  const unenrollLearner = useUnenrollLearner();
  const togglePublish = useTogglePublish();
  const deleteProgram = useDeleteProgram();

  // Filter available learners (not already enrolled)
  const availableLearners = useMemo(() => {
    if (!allLearnersData?.learners || !programLearners) return [];
    const enrolledIds = new Set(programLearners.map((l: Learner) => l.id));
    return allLearnersData.learners.filter((l: Learner) => !enrolledIds.has(l.id));
  }, [allLearnersData?.learners, programLearners]);

  const handleEnrollLearner = async (learnerId: string) => {
    await enrollLearner.mutateAsync({ learnerId, programId });
    refetchLearners();
  };

  const handleUnenrollLearner = async () => {
    if (!learnerToRemove) return;
    await unenrollLearner.mutateAsync({ learnerId: learnerToRemove.id, programId });
    setLearnerToRemove(null);
    refetchLearners();
  };

  if (isLoading) {
    return (
      <>
        <AdminHeader title="Program Details" onMenuClick={() => setSidebarOpen(true)} />
        <PageLoading />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AdminHeader title="Program Details" onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex-1 p-6 lg:p-8">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft">
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Program not found</h3>
              <p className="text-slate-500 mb-6">This program doesn't exist or has been deleted</p>
              <Link href="/admin/programs">
                <Button variant="primary">Back to Programs</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { program, content } = data;

  const handleTogglePublish = async () => {
    await togglePublish.mutateAsync({
      id: program.id,
      isPublished: !program.isPublished,
    });
    refetch();
  };

  const handleDelete = async () => {
    await deleteProgram.mutateAsync(program.id);
    router.push('/admin/programs');
  };

  // Calculate stats from content tree
  const countItems = (items: ContentItem[]): { topics: number; subtopics: number; lessons: number } => {
    return items.reduce(
      (acc, item) => {
        if (item.type === 'topic') acc.topics++;
        else if (item.type === 'subtopic') acc.subtopics++;
        else if (item.type === 'lesson') acc.lessons++;
        if (item.children) {
          const childCounts = countItems(item.children);
          acc.topics += childCounts.topics;
          acc.subtopics += childCounts.subtopics;
          acc.lessons += childCounts.lessons;
        }
        return acc;
      },
      { topics: 0, subtopics: 0, lessons: 0 }
    );
  };

  const stats = countItems(content);

  return (
    <>
      <AdminHeader
        title={program.name}
        subtitle="Program details and content management"
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="flex-1 p-6 lg:p-8">
        {/* Back Button */}
        <Link
          href="/admin/programs"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Programs
        </Link>

        {/* Program Header Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Thumbnail */}
            {program.thumbnailUrl ? (
              <Image
                src={program.thumbnailUrl}
                alt={program.name}
                width={224}
                height={144}
                className="w-full lg:w-56 h-36 object-cover rounded-xl ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-full lg:w-56 h-36 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center ring-1 ring-slate-200">
                <BookOpen className="w-12 h-12 text-slate-400" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-slate-900">{program.name}</h1>
                    <Badge variant={program.isPublished ? 'success' : 'neutral'} dot>
                      {program.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  {program.description && (
                    <p className="text-slate-600 max-w-2xl">{program.description}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mb-5">
                {stats.topics > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                    <Folder className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">{stats.topics} topics</span>
                  </div>
                )}
                {stats.subtopics > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg">
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-700">{stats.subtopics} subtopics</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{stats.lessons} lessons</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit className="w-4 h-4" />}
                  onClick={() => setShowEditModal(true)}
                >
                  Edit Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={program.isPublished ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  onClick={handleTogglePublish}
                  isLoading={togglePublish.isPending}
                >
                  {program.isPublished ? 'Unpublish' : 'Publish'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Program Content</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Organize your lessons into topics and subtopics, or add them directly
              </p>
            </div>
          </div>
          <ContentTree
            programId={programId}
            content={content}
            onRefresh={() => refetch()}
          />
        </div>

        {/* Enrolled Learners Section */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-soft p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Enrolled Learners</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {programLearners?.length || 0} learner{programLearners?.length !== 1 ? 's' : ''} enrolled in this program
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setShowAddLearnerModal(true)}
            >
              Add Learner
            </Button>
          </div>

          {learnersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : programLearners?.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-medium mb-1">No learners enrolled</h3>
              <p className="text-slate-500 text-sm mb-4">
                Add learners to give them access to this program
              </p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setShowAddLearnerModal(true)}
              >
                Add First Learner
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {programLearners?.map((learner: Learner) => (
                <div key={learner.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center ring-1 ring-slate-200">
                      <span className="text-sm font-semibold text-slate-600">
                        {learner.name?.charAt(0)?.toUpperCase() || learner.email?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{learner.name || 'Unnamed'}</p>
                      <p className="text-sm text-slate-500">{learner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={learner.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                      {learner.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLearnerToRemove(learner)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <ProgramModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); refetch(); }}
        program={{
          id: program.id,
          name: program.name,
          description: program.description,
          thumbnailUrl: program.thumbnailUrl,
          isPublished: program.isPublished,
          learnerCount: 0,
          lessonCount: stats.lessons,
          totalDurationHours: 0,
          createdAt: '',
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Program"
        size="sm"
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-600 mb-2">
            Are you sure you want to delete <strong className="text-slate-900">{program.name}</strong>?
          </p>
          <p className="text-sm text-slate-500 mb-2">
            This will also delete all topics, lessons, and enrollments associated with this program.
          </p>
          <p className="text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
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

      {/* Add Learner Modal */}
      <Modal
        isOpen={showAddLearnerModal}
        onClose={() => {
          setShowAddLearnerModal(false);
          setLearnerSearchQuery('');
        }}
        title="Add Learner to Program"
        size="md"
      >
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={learnerSearchQuery}
              onChange={(e) => setLearnerSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            {learnerSearchQuery && (
              <button
                onClick={() => setLearnerSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {availableLearners.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-600 text-sm">
                {learnerSearchQuery
                  ? 'No learners found matching your search'
                  : 'All learners are already enrolled in this program'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {availableLearners.map((learner: Learner) => (
                <div key={learner.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center ring-1 ring-slate-200">
                      <span className="text-sm font-semibold text-slate-600">
                        {learner.name?.charAt(0)?.toUpperCase() || learner.email?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{learner.name || 'Unnamed'}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {learner.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnrollLearner(learner.id)}
                    isLoading={enrollLearner.isPending}
                    leftIcon={<UserPlus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal.Footer>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddLearnerModal(false);
              setLearnerSearchQuery('');
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remove Learner Confirmation Modal */}
      <Modal
        isOpen={!!learnerToRemove}
        onClose={() => setLearnerToRemove(null)}
        title="Remove Learner"
        size="sm"
      >
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserMinus className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-slate-600 mb-2">
            Remove <strong className="text-slate-900">{learnerToRemove?.name || learnerToRemove?.email}</strong> from this program?
          </p>
          <p className="text-sm text-slate-500">
            They will lose access to all program content. Their progress will be preserved if they are re-enrolled later.
          </p>
        </div>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setLearnerToRemove(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleUnenrollLearner}
            isLoading={unenrollLearner.isPending}
          >
            Remove Learner
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
