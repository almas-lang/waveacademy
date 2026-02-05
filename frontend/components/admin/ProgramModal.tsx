'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Image, Info } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { useCreateProgram, useUpdateProgram } from '@/hooks';
import { Program, CreateProgramData } from '@/types/admin';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface ProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program?: Program | null;
}

export default function ProgramModal({ isOpen, onClose, program }: ProgramModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();

  const isEditing = !!program;

  useEffect(() => {
    if (program) {
      setName(program.name);
      setDescription(program.description || '');
      setThumbnailUrl(program.thumbnailUrl || '');
    } else {
      setName('');
      setDescription('');
      setThumbnailUrl('');
    }
    setErrors({});
  }, [program, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Program name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const response = await adminApi.uploadThumbnail(file);
      // Handle different response structures
      const url = response?.data?.url || response?.url || response;
      if (typeof url === 'string') {
        setThumbnailUrl(url);
        toast.success('Thumbnail uploaded');
      } else {
        console.error('Unexpected response:', response);
        toast.error('Failed to get upload URL');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.response?.data?.message || 'Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data: CreateProgramData = {
      name: name.trim(),
      description: description.trim() || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
    };

    try {
      if (isEditing) {
        await updateProgram.mutateAsync({ id: program.id, data });
        onClose();
      } else {
        const response = await createProgram.mutateAsync(data);
        onClose();
        // Redirect to the newly created program's detail page
        // Handle different response structures from backend
        const programId = response?.data?.program?.id || response?.data?.id || response?.program?.id || response?.id;
        if (programId) {
          router.push(`/admin/programs/${programId}`);
        }
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = createProgram.isPending || updateProgram.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Program' : 'Create Program'}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Program Thumbnail
            </label>
            <div className="flex items-start gap-4">
              {thumbnailUrl ? (
                <div className="relative group">
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail"
                    className="w-32 h-20 object-cover rounded-lg ring-1 ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl('')}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploading ? 'border-slate-300 bg-slate-50' : 'border-slate-300 hover:border-accent-500 hover:bg-accent-50/50'}`}>
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mb-1" />
                      <span className="text-xs text-slate-500">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Image className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs text-slate-500 font-medium">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
              <div className="flex-1">
                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-500 space-y-1">
                    <p><strong>Format:</strong> JPG, PNG, or WebP</p>
                    <p><strong>Size:</strong> Max 5MB</p>
                    <p><strong>Recommended:</strong> 1280×720px (16:9 ratio)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Name */}
          <Input
            label="Program Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Mindfulness Fundamentals"
            error={errors.name}
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what learners will gain from this program..."
              rows={3}
              className="input resize-none"
            />
          </div>
        </div>

        <Modal.Footer>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Program'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
