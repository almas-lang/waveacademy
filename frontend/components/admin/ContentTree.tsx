'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  File,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Video,
  FileType,
  Type,
  Image,
  Link as LinkIcon,
  Upload,
  X,
  MoveRight,
  CornerDownRight,
} from 'lucide-react';
import { Button, Badge, Modal, Input } from '@/components/ui';
import {
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
  useCreateSubtopic,
  useUpdateSubtopic,
  useDeleteSubtopic,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useReorderContent,
} from '@/hooks';
import { ContentItem, LessonType } from '@/types/admin';
import { adminApi } from '@/lib/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface ContentTreeProps {
  programId: string;
  content: ContentItem[];
  onRefresh?: () => void;
}

type AddLessonContext = {
  parentType: 'program' | 'topic' | 'subtopic';
  parentId: string;
  parentName?: string;
} | null;

// Flatten the tree for drag and drop
interface FlattenedItem {
  id: string;
  type: 'topic' | 'subtopic' | 'lesson';
  name?: string;
  title?: string;
  lessonType?: LessonType;
  durationSeconds?: number;
  contentUrl?: string;
  contentText?: string;
  instructorNotes?: string;
  thumbnailUrl?: string;
  isFree?: boolean;
  depth: number;
  parentId: string | null;
  parentType: 'program' | 'topic' | 'subtopic' | null;
  hasChildren: boolean;
  isExpanded: boolean;
  orderIndex: number;
}

function flattenTree(
  items: ContentItem[],
  expandedItems: Set<string>,
  parentId: string | null = null,
  parentType: 'program' | 'topic' | 'subtopic' | null = null,
  depth: number = 0
): FlattenedItem[] {
  return items.reduce<FlattenedItem[]>((acc, item, index) => {
    const hasChildren = !!(item.children && item.children.length > 0);
    const isExpanded = expandedItems.has(item.id);

    acc.push({
      id: item.id,
      type: item.type as 'topic' | 'subtopic' | 'lesson',
      name: item.name,
      title: item.title,
      lessonType: item.lessonType,
      durationSeconds: item.durationSeconds,
      contentUrl: item.contentUrl,
      contentText: item.contentText,
      instructorNotes: item.instructorNotes,
      thumbnailUrl: item.thumbnailUrl,
      isFree: item.isFree,
      depth,
      parentId,
      parentType,
      hasChildren,
      isExpanded,
      orderIndex: item.orderIndex || index,
    });

    if (hasChildren && isExpanded && item.children) {
      acc.push(
        ...flattenTree(
          item.children,
          expandedItems,
          item.id,
          item.type as 'topic' | 'subtopic',
          depth + 1
        )
      );
    }

    return acc;
  }, []);
}

// Sortable Item Component
function SortableItem({
  item,
  onToggleExpand,
  onAddSubtopic,
  onAddLesson,
  onEdit,
  onDelete,
}: {
  item: FlattenedItem;
  onToggleExpand: (id: string) => void;
  onAddSubtopic: (topicId: string, topicName: string) => void;
  onAddLesson: (parentType: 'topic' | 'subtopic', parentId: string, parentName?: string) => void;
  onEdit: (item: FlattenedItem) => void;
  onDelete: (item: FlattenedItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: item.depth * 24,
  };

  const getLessonIcon = (type?: LessonType) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'PDF':
        return <FileType className="w-4 h-4 text-red-500" />;
      case 'TEXT':
        return <Type className="w-4 h-4 text-slate-500" />;
      default:
        return <File className="w-4 h-4 text-slate-500" />;
    }
  };

  if (item.type === 'lesson') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'flex items-center justify-between py-2.5 px-3 rounded-lg group border transition-all',
          isDragging
            ? 'bg-blue-50 border-blue-300 shadow-lg opacity-90'
            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
        )}
      >
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="p-1.5 bg-slate-100 rounded-md">
            {getLessonIcon(item.lessonType)}
          </div>
          <div>
            <span className="text-slate-700 font-medium">{item.title}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="neutral" size="sm">{item.lessonType}</Badge>
              {item.isFree && (
                <Badge variant="success" size="sm">Free</Badge>
              )}
              {item.lessonType === 'VIDEO' && !item.contentUrl && (
                <Badge variant="warning" size="sm">No video</Badge>
              )}
              {item.lessonType === 'PDF' && !item.contentUrl && (
                <Badge variant="warning" size="sm">No PDF</Badge>
              )}
              {item.lessonType === 'TEXT' && !item.contentText && (
                <Badge variant="warning" size="sm">No content</Badge>
              )}
              {item.durationSeconds && (
                <span className="text-xs text-slate-400">
                  {item.lessonType === 'VIDEO' ? (
                    // Format as HH:MM:SS for videos
                    (() => {
                      const h = Math.floor(item.durationSeconds / 3600);
                      const m = Math.floor((item.durationSeconds % 3600) / 60);
                      const s = item.durationSeconds % 60;
                      if (h > 0) {
                        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                      }
                      return `${m}:${s.toString().padStart(2, '0')}`;
                    })()
                  ) : (
                    // Show as "X min read" for PDF and TEXT
                    `${Math.round(item.durationSeconds / 60)} min read`
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Edit lesson"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Delete lesson"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const isSubtopic = item.type === 'subtopic';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex items-center justify-between py-2.5 px-3 rounded-lg group border transition-all',
        isDragging
          ? 'bg-blue-50 border-blue-300 shadow-lg opacity-90'
          : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          onClick={() => onToggleExpand(item.id)}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
        >
          {item.hasChildren ? (
            item.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>
        <div className={clsx(
          'p-1.5 rounded-md transition-colors',
          isSubtopic ? 'bg-amber-100' : 'bg-blue-100'
        )}>
          {item.isExpanded ? (
            <FolderOpen className={clsx('w-4 h-4', isSubtopic ? 'text-amber-600' : 'text-blue-600')} />
          ) : (
            <Folder className={clsx('w-4 h-4', isSubtopic ? 'text-amber-600' : 'text-blue-600')} />
          )}
        </div>
        <span className="font-medium text-slate-800">{item.name}</span>
        <Badge variant={isSubtopic ? 'warning' : 'info'} size="sm">{item.type}</Badge>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.type === 'topic' && (
          <>
            <button
              onClick={() => onAddSubtopic(item.id, item.name || '')}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
            >
              <Folder className="w-3.5 h-3.5" />
              Subtopic
            </button>
            <button
              onClick={() => onAddLesson('topic', item.id, item.name)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Lesson
            </button>
          </>
        )}
        {item.type === 'subtopic' && (
          <button
            onClick={() => onAddLesson('subtopic', item.id, item.name)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Lesson
          </button>
        )}
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(item)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Drag Overlay Item
function DragOverlayItem({ item }: { item: FlattenedItem }) {
  const getLessonIcon = (type?: LessonType) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'PDF':
        return <FileType className="w-4 h-4 text-red-500" />;
      case 'TEXT':
        return <Type className="w-4 h-4 text-slate-500" />;
      default:
        return <File className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-white rounded-lg border-2 border-blue-400 shadow-xl">
      <GripVertical className="w-4 h-4 text-slate-400" />
      {item.type === 'lesson' ? (
        <>
          <div className="p-1.5 bg-slate-100 rounded-md">
            {getLessonIcon(item.lessonType)}
          </div>
          <span className="font-medium text-slate-700">{item.title}</span>
        </>
      ) : (
        <>
          <div className={clsx(
            'p-1.5 rounded-md',
            item.type === 'subtopic' ? 'bg-amber-100' : 'bg-blue-100'
          )}>
            <Folder className={clsx('w-4 h-4', item.type === 'subtopic' ? 'text-amber-600' : 'text-blue-600')} />
          </div>
          <span className="font-medium text-slate-800">{item.name}</span>
        </>
      )}
    </div>
  );
}

export default function ContentTree({ programId, content, onRefresh }: ContentTreeProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddSubtopic, setShowAddSubtopic] = useState<{ topicId: string; topicName: string } | null>(null);
  const [showAddLesson, setShowAddLesson] = useState<AddLessonContext>(null);
  const [editingTopic, setEditingTopic] = useState<{ id: string; name: string; type: 'topic' | 'subtopic' } | null>(null);
  const [editingLesson, setEditingLesson] = useState<FlattenedItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Form states
  const [newTopicName, setNewTopicName] = useState('');
  const [newSubtopicName, setNewSubtopicName] = useState('');

  // Lesson form states
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('VIDEO');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonPdfUrl, setLessonPdfUrl] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [lessonThumbnail, setLessonThumbnail] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonIsFree, setLessonIsFree] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Mutations
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const createSubtopic = useCreateSubtopic();
  const updateSubtopic = useUpdateSubtopic();
  const deleteSubtopic = useDeleteSubtopic();
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const reorderContent = useReorderContent();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Flatten the tree
  const flattenedItems = useMemo(
    () => flattenTree(content, expandedItems, null, 'program'),
    [content, expandedItems]
  );

  const activeItem = activeId ? flattenedItems.find(item => item.id === activeId) : null;

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (items: ContentItem[]) => {
      items.forEach(item => {
        if (item.type !== 'lesson') {
          allIds.add(item.id);
        }
        if (item.children) collectIds(item.children);
      });
    };
    collectIds(content);
    setExpandedItems(allIds);
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  // Auto-expand tree on initial load
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (content.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      expandAll();
    }
  }, [content]);

  const resetLessonForm = () => {
    setLessonTitle('');
    setLessonType('VIDEO');
    setLessonVideoUrl('');
    setLessonPdfUrl('');
    setLessonText('');
    setLessonThumbnail('');
    setLessonNotes('');
    setLessonDuration('');
    setLessonIsFree(false);
  };

  // Format duration for edit (convert seconds to HH:MM:SS for video)
  const formatDurationForEdit = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Parse duration string to seconds
  const parseDuration = (duration: string, type: LessonType): number => {
    if (!duration) return 0;
    if (type === 'VIDEO') {
      const parts = duration.split(':').map(p => parseInt(p) || 0);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return parseInt(duration) * 60;
    }
    return parseInt(duration) * 60;
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setIsReordering(true);

    const activeIndex = flattenedItems.findIndex(item => item.id === active.id);
    const overIndex = flattenedItems.findIndex(item => item.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    const activeItem = flattenedItems[activeIndex];
    const overItem = flattenedItems[overIndex];

    console.log('Drag end:', { activeItem, overItem });

    try {
      // Determine if same parent and same type
      const sameParent = activeItem.parentId === overItem.parentId &&
                         activeItem.parentType === overItem.parentType;
      const sameType = activeItem.type === overItem.type;

      if (sameParent && sameType) {
        // Simple reorder within same parent and same type
        const siblingItems = flattenedItems.filter(
          item => item.parentId === activeItem.parentId &&
                  item.parentType === activeItem.parentType &&
                  item.type === activeItem.type
        );

        const reorderedItems = siblingItems.map((item) => ({
          id: item.id,
          type: item.type,
          orderIndex: item.orderIndex,
          parentId: item.parentId,
          parentType: item.parentType,
        }));

        // Find indices within siblings
        const activeIdx = reorderedItems.findIndex(i => i.id === active.id);
        const overIdx = reorderedItems.findIndex(i => i.id === over.id);

        if (activeIdx !== -1 && overIdx !== -1) {
          const [removed] = reorderedItems.splice(activeIdx, 1);
          reorderedItems.splice(overIdx, 0, removed);

          // Update order indices
          reorderedItems.forEach((item, index) => {
            item.orderIndex = index;
          });

          console.log('Reordering items:', reorderedItems);

          await reorderContent.mutateAsync({
            programId,
            items: reorderedItems,
          });

          toast.success('Content reordered');
          onRefresh?.();
        }
      } else {
        // Moving to a different location
        if (activeItem.type === 'topic') {
          // Topics can only be reordered at program level
          if (!sameParent) {
            toast.error('Topics can only be reordered, not moved to other containers');
            return;
          }
        }

        // Determine new parent based on where we're dropping
        let newParentId: string | null = null;
        let newParentType: 'program' | 'topic' | 'subtopic' | null = 'program';

        if (overItem.type === 'topic') {
          // Dropping on a topic
          if (activeItem.type === 'lesson') {
            // Put lesson inside the topic
            newParentId = overItem.id;
            newParentType = 'topic';
          } else if (activeItem.type === 'subtopic') {
            // Put subtopic inside a different topic
            newParentId = overItem.id;
            newParentType = 'topic';
          } else {
            // Topic to topic - reorder at program level
            newParentId = null;
            newParentType = 'program';
          }
        } else if (overItem.type === 'subtopic') {
          // Dropping on a subtopic
          if (activeItem.type === 'lesson') {
            // Put lesson inside the subtopic
            newParentId = overItem.id;
            newParentType = 'subtopic';
          } else if (activeItem.type === 'subtopic') {
            // Subtopic to subtopic - put in same parent topic
            newParentId = overItem.parentId;
            newParentType = 'topic';
          }
        } else if (overItem.type === 'lesson') {
          // Dropping on a lesson - put in the same parent as that lesson
          newParentId = overItem.parentId;
          newParentType = overItem.parentType;
        }

        // Calculate new order index based on position
        const newSiblings = flattenedItems.filter(
          item => item.parentId === newParentId &&
                  item.parentType === newParentType &&
                  item.type === activeItem.type &&
                  item.id !== activeItem.id
        );

        // Find where the overItem is among new siblings
        const overPosition = newSiblings.findIndex(s => s.id === overItem.id);
        const newOrderIndex = overPosition >= 0 ? overPosition : newSiblings.length;

        const updateItem = {
          id: activeItem.id,
          type: activeItem.type,
          orderIndex: newOrderIndex,
          parentId: newParentId,
          parentType: newParentType,
        };

        console.log('Moving item:', updateItem);

        await reorderContent.mutateAsync({
          programId,
          items: [updateItem],
        });

        toast.success('Content moved');
        onRefresh?.();
      }
    } catch (error: any) {
      console.error('Reorder failed:', error);
      toast.error(error?.response?.data?.error?.message || error?.message || 'Failed to reorder content');
    } finally {
      setIsReordering(false);
    }
  };

  // Content handlers
  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return;
    try {
      await createTopic.mutateAsync({ programId, name: newTopicName.trim() });
    } catch {
      // Error handled by mutation onError
    } finally {
      setNewTopicName('');
      setShowAddTopic(false);
    }
  };

  const handleAddSubtopic = async () => {
    if (!newSubtopicName.trim() || !showAddSubtopic) return;
    try {
      await createSubtopic.mutateAsync({
        data: { topicId: showAddSubtopic.topicId, name: newSubtopicName.trim() },
        programId,
      });
    } catch {
      // Error handled by mutation onError
    } finally {
      setNewSubtopicName('');
      setShowAddSubtopic(null);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonTitle.trim() || !showAddLesson) return;

    const data: any = {
      programId,
      title: lessonTitle.trim(),
      type: lessonType,
    };

    if (showAddLesson.parentType === 'topic') {
      data.topicId = showAddLesson.parentId;
    } else if (showAddLesson.parentType === 'subtopic') {
      data.subtopicId = showAddLesson.parentId;
    }

    if (lessonType === 'VIDEO' && lessonVideoUrl) {
      data.contentUrl = lessonVideoUrl;
    } else if (lessonType === 'PDF' && lessonPdfUrl) {
      data.contentUrl = lessonPdfUrl;
    } else if (lessonType === 'TEXT' && lessonText) {
      data.contentText = lessonText;
    }

    if (lessonThumbnail) data.thumbnailUrl = lessonThumbnail;
    if (lessonNotes) data.instructorNotes = lessonNotes;
    if (lessonDuration) data.durationSeconds = parseDuration(lessonDuration, lessonType);
    data.isFree = lessonIsFree;

    try {
      await createLesson.mutateAsync(data);
    } catch {
      // Error handled by mutation onError
    } finally {
      resetLessonForm();
      setShowAddLesson(null);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson || !lessonTitle.trim()) return;

    const data: any = {
      title: lessonTitle.trim(),
      type: lessonType,
    };

    if (lessonType === 'VIDEO' && lessonVideoUrl) {
      data.contentUrl = lessonVideoUrl;
    } else if (lessonType === 'PDF' && lessonPdfUrl) {
      data.contentUrl = lessonPdfUrl;
    } else if (lessonType === 'TEXT' && lessonText) {
      data.contentText = lessonText;
    }

    if (lessonThumbnail) data.thumbnailUrl = lessonThumbnail;
    if (lessonNotes) data.instructorNotes = lessonNotes;
    if (lessonDuration) data.durationSeconds = parseDuration(lessonDuration, lessonType);
    data.isFree = lessonIsFree;

    try {
      await updateLesson.mutateAsync({ id: editingLesson.id, data, programId });
    } catch {
      // Error handled by mutation onError
    } finally {
      resetLessonForm();
      setEditingLesson(null);
      onRefresh?.();
    }
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic || !editingTopic.name.trim()) return;
    try {
      if (editingTopic.type === 'subtopic') {
        await updateSubtopic.mutateAsync({
          id: editingTopic.id,
          data: { name: editingTopic.name.trim() },
          programId,
        });
      } else {
        await updateTopic.mutateAsync({
          id: editingTopic.id,
          data: { name: editingTopic.name.trim() },
          programId,
        });
      }
    } catch {
      // Error handled by mutation onError
    } finally {
      setEditingTopic(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      if (deletingItem.type === 'topic') {
        await deleteTopic.mutateAsync({ id: deletingItem.id, programId });
      } else if (deletingItem.type === 'subtopic') {
        await deleteSubtopic.mutateAsync({ id: deletingItem.id, programId });
      } else if (deletingItem.type === 'lesson') {
        await deleteLesson.mutateAsync({ id: deletingItem.id, programId });
      }
    } catch {
      // Error handled by mutation onError
    } finally {
      setDeletingItem(null);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingThumbnail(true);
    try {
      const response = await adminApi.uploadThumbnail(file);
      const url = response?.data?.url || response?.url || response;
      if (typeof url === 'string') {
        setLessonThumbnail(url);
        toast.success('Thumbnail uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploadingPdf(true);
    try {
      const response = await adminApi.uploadPdf(file);
      const url = response?.data?.url || response?.url || response;
      if (typeof url === 'string') {
        setLessonPdfUrl(url);
        toast.success('PDF uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  // Count items
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

  const counts = countItems(content);

  return (
    <div>
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddLesson({ parentType: 'program', parentId: programId, parentName: 'Program' })}
          >
            Add Lesson
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Folder className="w-4 h-4" />}
            onClick={() => setShowAddTopic(true)}
          >
            Add Topic
          </Button>
        </div>
        {content.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              {counts.topics > 0 && `${counts.topics} topics`}
              {counts.subtopics > 0 && ` • ${counts.subtopics} subtopics`}
              {counts.lessons > 0 && ` • ${counts.lessons} lessons`}
            </span>
            <button
              onClick={expandAll}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 hover:bg-slate-100 rounded transition-colors"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 hover:bg-slate-100 rounded transition-colors"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Content Tree with DnD */}
      {content.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="border border-slate-200 rounded-xl bg-white relative">
            {/* Loading overlay for reordering */}
            {isReordering && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-lg border border-slate-200">
                  <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-slate-700">Reordering...</span>
                </div>
              </div>
            )}
            <div className="p-2 space-y-1">
              <SortableContext
                items={flattenedItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {flattenedItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onToggleExpand={toggleExpand}
                    onAddSubtopic={(topicId, topicName) => setShowAddSubtopic({ topicId, topicName })}
                    onAddLesson={(parentType, parentId, parentName) => setShowAddLesson({ parentType, parentId, parentName })}
                    onEdit={(item) => {
                      if (item.type === 'lesson') {
                        setEditingLesson(item);
                        // Load all lesson data into form
                        setLessonTitle(item.title || '');
                        setLessonType(item.lessonType || 'VIDEO');
                        setLessonDuration(item.durationSeconds ?
                          item.lessonType === 'VIDEO'
                            ? formatDurationForEdit(item.durationSeconds)
                            : String(Math.round(item.durationSeconds / 60))
                          : '');
                        // Load content based on type
                        if (item.lessonType === 'VIDEO') {
                          setLessonVideoUrl(item.contentUrl || '');
                          setLessonPdfUrl('');
                          setLessonText('');
                        } else if (item.lessonType === 'PDF') {
                          setLessonPdfUrl(item.contentUrl || '');
                          setLessonVideoUrl('');
                          setLessonText('');
                        } else {
                          setLessonText(item.contentText || '');
                          setLessonVideoUrl('');
                          setLessonPdfUrl('');
                        }
                        setLessonNotes(item.instructorNotes || '');
                        setLessonThumbnail(item.thumbnailUrl || '');
                        setLessonIsFree(item.isFree || false);
                      } else {
                        setEditingTopic({ id: item.id, name: item.name || '', type: item.type as 'topic' | 'subtopic' });
                      }
                    }}
                    onDelete={(item) => setDeletingItem({ type: item.type, id: item.id, name: item.name || item.title || '' })}
                  />
                ))}
              </SortableContext>
            </div>
          </div>
          <DragOverlay>
            {activeItem ? <DragOverlayItem item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No content yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Start building your program by adding lessons directly, or organize them into topics and subtopics.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddLesson({ parentType: 'program', parentId: programId, parentName: 'Program' })}
            >
              Add Lesson
            </Button>
            <Button
              variant="outline"
              leftIcon={<Folder className="w-4 h-4" />}
              onClick={() => setShowAddTopic(true)}
            >
              Add Topic
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Add Topic Modal */}
      <Modal isOpen={showAddTopic} onClose={() => setShowAddTopic(false)} title="Add Topic" size="sm">
        <p className="text-sm text-slate-500 mb-4">
          Topics help organize your program content into logical sections.
        </p>
        <Input
          label="Topic Name"
          value={newTopicName}
          onChange={(e) => setNewTopicName(e.target.value)}
          placeholder="e.g., Getting Started"
          autoFocus
        />
        <Modal.Footer>
          <Button variant="outline" onClick={() => setShowAddTopic(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddTopic} isLoading={createTopic.isPending}>
            Add Topic
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Subtopic Modal */}
      <Modal isOpen={!!showAddSubtopic} onClose={() => setShowAddSubtopic(null)} title="Add Subtopic" size="sm">
        <p className="text-sm text-slate-500 mb-4">
          Adding subtopic under <strong>{showAddSubtopic?.topicName}</strong>
        </p>
        <Input
          label="Subtopic Name"
          value={newSubtopicName}
          onChange={(e) => setNewSubtopicName(e.target.value)}
          placeholder="e.g., Core Concepts"
          autoFocus
        />
        <Modal.Footer>
          <Button variant="outline" onClick={() => setShowAddSubtopic(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddSubtopic} isLoading={createSubtopic.isPending}>
            Add Subtopic
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal
        isOpen={!!showAddLesson}
        onClose={() => { setShowAddLesson(null); resetLessonForm(); }}
        title="Add Lesson"
        size="lg"
      >
        <div className="space-y-5">
          {showAddLesson?.parentType !== 'program' && (
            <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm text-slate-500">Adding to: </span>
              <span className="text-sm font-medium text-slate-700">{showAddLesson?.parentName}</span>
            </div>
          )}

          <Input
            label="Lesson Title"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="e.g., Introduction to Mindfulness"
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Lesson Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'VIDEO' as LessonType, icon: Video, label: 'Video', desc: 'Bunny.net video' },
                { type: 'PDF' as LessonType, icon: FileType, label: 'PDF', desc: 'Document' },
                { type: 'TEXT' as LessonType, icon: Type, label: 'Text', desc: 'Rich text' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setLessonType(type); setLessonDuration(''); }}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
                    lessonType === type
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-slate-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {lessonType === 'VIDEO' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Video URL <span className="text-slate-400 font-normal">(Bunny.net embed URL)</span>
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  placeholder="https://iframe.mediadelivery.net/embed/..."
                  className="input pl-10"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Paste the embed URL from your Bunny.net video library
              </p>
            </div>
          )}

          {lessonType === 'PDF' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">PDF Document</label>
              {lessonPdfUrl ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <FileType className="w-8 h-8 text-red-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">PDF uploaded</p>
                    <p className="text-xs text-slate-500 truncate">{lessonPdfUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLessonPdfUrl('')}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <label className={clsx(
                    'flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                    uploadingPdf ? 'border-slate-300 bg-slate-50' : 'border-slate-300 hover:border-accent-500'
                  )}>
                    {uploadingPdf ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-500">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-sm text-slate-500">Upload PDF</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      disabled={uploadingPdf}
                    />
                  </label>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Or paste URL</label>
                    <input
                      type="url"
                      value={lessonPdfUrl}
                      onChange={(e) => setLessonPdfUrl(e.target.value)}
                      placeholder="https://..."
                      className="input text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {lessonType === 'TEXT' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
              <textarea
                value={lessonText}
                onChange={(e) => setLessonText(e.target.value)}
                placeholder="Enter your lesson content here..."
                rows={6}
                className="input resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">HTML is supported for basic formatting</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              {lessonType === 'VIDEO' ? (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration <span className="text-slate-400 font-normal">(HH:MM:SS)</span>
                  </label>
                  <input
                    type="text"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="e.g., 01:30:00 or 15:30"
                    className="input"
                  />
                  <p className="text-xs text-slate-500 mt-1">Format: hours:minutes:seconds</p>
                </>
              ) : lessonType === 'PDF' ? (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Est. Reading Time <span className="text-slate-400 font-normal">(minutes)</span>
                  </label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="e.g., 10"
                    className="input"
                    min="1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Estimated time to read the document</p>
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Est. Reading Time <span className="text-slate-400 font-normal">(minutes)</span>
                  </label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="e.g., 5"
                    className="input"
                    min="1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Estimated time to read the content</p>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Thumbnail <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              {lessonThumbnail ? (
                <div className="relative inline-block">
                  <img src={lessonThumbnail} alt="Thumbnail" className="h-10 w-16 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => setLessonThumbnail('')}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className={clsx(
                  'inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors',
                  uploadingThumbnail && 'opacity-50 cursor-not-allowed'
                )}>
                  {uploadingThumbnail ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Image className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-600">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    disabled={uploadingThumbnail}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instructor Notes <span className="text-slate-400 font-normal">(visible to learners)</span>
            </label>
            <textarea
              value={lessonNotes}
              onChange={(e) => setLessonNotes(e.target.value)}
              placeholder="Any additional notes or instructions for learners..."
              rows={2}
              className="input resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors">
            <input
              type="checkbox"
              checked={lessonIsFree}
              onChange={(e) => setLessonIsFree(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Free Preview</span>
              <p className="text-xs text-slate-500">Free enrollment users can access this lesson without paying</p>
            </div>
          </label>
        </div>

        <Modal.Footer>
          <Button variant="outline" onClick={() => { setShowAddLesson(null); resetLessonForm(); }}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleAddLesson}
            isLoading={createLesson.isPending}
            disabled={!lessonTitle.trim()}
          >
            Add Lesson
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Topic/Subtopic Modal */}
      <Modal isOpen={!!editingTopic} onClose={() => setEditingTopic(null)} title={`Edit ${editingTopic?.type === 'subtopic' ? 'Subtopic' : 'Topic'}`} size="sm">
        <Input
          label={`${editingTopic?.type === 'subtopic' ? 'Subtopic' : 'Topic'} Name`}
          value={editingTopic?.name || ''}
          onChange={(e) => setEditingTopic(prev => prev ? { ...prev, name: e.target.value } : null)}
          autoFocus
        />
        <Modal.Footer>
          <Button variant="outline" onClick={() => setEditingTopic(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdateTopic} isLoading={updateTopic.isPending || updateSubtopic.isPending}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal
        isOpen={!!editingLesson}
        onClose={() => { setEditingLesson(null); resetLessonForm(); }}
        title="Edit Lesson"
        size="lg"
      >
        <div className="space-y-5">
          {editingLesson?.parentId && (() => {
            const parent = flattenedItems.find(item => item.id === editingLesson.parentId);
            return parent ? (
              <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm text-slate-500">Editing lesson in: </span>
                <span className="text-sm font-medium text-slate-700">{parent.name}</span>
              </div>
            ) : null;
          })()}

          <Input
            label="Lesson Title"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Lesson Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'VIDEO' as LessonType, icon: Video, label: 'Video', desc: 'Bunny.net video' },
                { type: 'PDF' as LessonType, icon: FileType, label: 'PDF', desc: 'Document' },
                { type: 'TEXT' as LessonType, icon: Type, label: 'Text', desc: 'Rich text' },
              ].map(({ type, icon: Icon, label, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setLessonType(type); setLessonDuration(''); }}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
                    lessonType === type
                      ? 'border-accent-500 bg-accent-50 text-accent-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-slate-400">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {lessonType === 'VIDEO' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Video URL <span className="text-slate-400 font-normal">(Bunny.net embed URL)</span>
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  placeholder="https://iframe.mediadelivery.net/embed/..."
                  className="input pl-10"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Paste the embed URL from your Bunny.net video library
              </p>
            </div>
          )}

          {lessonType === 'PDF' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">PDF Document</label>
              {lessonPdfUrl ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <FileType className="w-8 h-8 text-red-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">PDF uploaded</p>
                    <p className="text-xs text-slate-500 truncate">{lessonPdfUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLessonPdfUrl('')}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <label className={clsx(
                    'flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                    uploadingPdf ? 'border-slate-300 bg-slate-50' : 'border-slate-300 hover:border-accent-500'
                  )}>
                    {uploadingPdf ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-500">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-sm text-slate-500">Upload PDF</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                      disabled={uploadingPdf}
                    />
                  </label>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Or paste URL</label>
                    <input
                      type="url"
                      value={lessonPdfUrl}
                      onChange={(e) => setLessonPdfUrl(e.target.value)}
                      placeholder="https://..."
                      className="input text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {lessonType === 'TEXT' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
              <textarea
                value={lessonText}
                onChange={(e) => setLessonText(e.target.value)}
                placeholder="Enter your lesson content here..."
                rows={6}
                className="input resize-none"
              />
              <p className="text-xs text-slate-500 mt-1">HTML is supported for basic formatting</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              {lessonType === 'VIDEO' ? (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration <span className="text-slate-400 font-normal">(HH:MM:SS)</span>
                  </label>
                  <input
                    type="text"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="e.g., 01:30:00 or 15:30"
                    className="input"
                  />
                  <p className="text-xs text-slate-500 mt-1">Format: hours:minutes:seconds</p>
                </>
              ) : lessonType === 'PDF' ? (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Est. Reading Time <span className="text-slate-400 font-normal">(minutes)</span>
                  </label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="e.g., 10"
                    className="input"
                    min="1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Estimated time to read the document</p>
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Est. Reading Time <span className="text-slate-400 font-normal">(minutes)</span>
                  </label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    placeholder="e.g., 5"
                    className="input"
                    min="1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Estimated time to read the content</p>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Thumbnail <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              {lessonThumbnail ? (
                <div className="relative inline-block">
                  <img src={lessonThumbnail} alt="Thumbnail" className="h-10 w-16 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => setLessonThumbnail('')}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className={clsx(
                  'inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors',
                  uploadingThumbnail && 'opacity-50 cursor-not-allowed'
                )}>
                  {uploadingThumbnail ? (
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Image className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-600">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    disabled={uploadingThumbnail}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instructor Notes <span className="text-slate-400 font-normal">(visible to learners)</span>
            </label>
            <textarea
              value={lessonNotes}
              onChange={(e) => setLessonNotes(e.target.value)}
              placeholder="Any additional notes or instructions for learners..."
              rows={2}
              className="input resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors">
            <input
              type="checkbox"
              checked={lessonIsFree}
              onChange={(e) => setLessonIsFree(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Free Preview</span>
              <p className="text-xs text-slate-500">Free enrollment users can access this lesson without paying</p>
            </div>
          </label>
        </div>

        <Modal.Footer>
          <Button variant="outline" onClick={() => { setEditingLesson(null); resetLessonForm(); }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateLesson}
            isLoading={updateLesson.isPending}
            disabled={!lessonTitle.trim()}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} title="Delete Item" size="sm">
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-slate-600 mb-2">
            Are you sure you want to delete <strong className="text-slate-900">{deletingItem?.name}</strong>?
          </p>
          {(deletingItem?.type === 'topic' || deletingItem?.type === 'subtopic') && (
            <p className="text-sm text-red-600">
              This will also delete all content inside it.
            </p>
          )}
        </div>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setDeletingItem(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteTopic.isPending || deleteSubtopic.isPending || deleteLesson.isPending}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
