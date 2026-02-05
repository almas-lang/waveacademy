'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Select } from '@/components/ui';
import { useCreateLearner, usePrograms } from '@/hooks';
import { CreateLearnerData } from '@/types/admin';

interface LearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LearnerModal({ isOpen, onClose }: LearnerModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: programs } = usePrograms();
  const createLearner = useCreateLearner();

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setName('');
      setMobile('');
      setRegistrationNumber('');
      setSelectedPrograms([]);
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data: CreateLearnerData = {
      email: email.trim(),
      name: name.trim(),
      mobile: mobile.trim() || undefined,
      registrationNumber: registrationNumber.trim() || undefined,
      programIds: selectedPrograms.length > 0 ? selectedPrograms : undefined,
    };

    try {
      await createLearner.mutateAsync(data);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleProgram = (programId: string) => {
    setSelectedPrograms(prev =>
      prev.includes(programId)
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Learner"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="learner@example.com"
            error={errors.email}
            required
          />

          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            error={errors.name}
            required
          />

          <Input
            label="Mobile Number"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+91 9876543210"
            helperText="Optional"
          />

          <Input
            label="Registration Number"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            placeholder="REG-001"
            helperText="Optional - for internal tracking"
          />

          {/* Program Enrollment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enroll in Programs
            </label>
            {programs && programs.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {programs.filter(p => p.isPublished).map((program) => (
                  <label
                    key={program.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPrograms.includes(program.id)}
                      onChange={() => toggleProgram(program.id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{program.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No published programs available</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              The learner will receive a setup email with access to selected programs
            </p>
          </div>
        </div>

        <Modal.Footer>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={createLearner.isPending}>
            Add Learner
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
