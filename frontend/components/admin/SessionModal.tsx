'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { useCreateSession, useUpdateSession, usePrograms } from '@/hooks';
import { Session, CreateSessionData } from '@/types/admin';
import { format, addMinutes, setHours, setMinutes, getDay } from 'date-fns';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: Session | null;
  onDelete?: (session: Session) => void;
}

const DAYS_OF_WEEK = [
  { value: 'SU', label: 'Sun', fullLabel: 'Sunday' },
  { value: 'MO', label: 'Mon', fullLabel: 'Monday' },
  { value: 'TU', label: 'Tue', fullLabel: 'Tuesday' },
  { value: 'WE', label: 'Wed', fullLabel: 'Wednesday' },
  { value: 'TH', label: 'Thu', fullLabel: 'Thursday' },
  { value: 'FR', label: 'Fri', fullLabel: 'Friday' },
  { value: 'SA', label: 'Sat', fullLabel: 'Saturday' },
];

const RECURRENCE_PRESETS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekly', label: 'Once a week' },
  { value: 'custom', label: 'Custom days' },
];

export default function SessionModal({ isOpen, onClose, session, onDelete }: SessionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePreset, setRecurrencePreset] = useState('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [repeatUntil, setRepeatUntil] = useState('');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [allPrograms, setAllPrograms] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: programs } = usePrograms();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const isEditing = !!session;

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const getCurrentDayCode = () => {
    const dayIndex = getDay(new Date());
    return DAYS_OF_WEEK[dayIndex].value;
  };

  useEffect(() => {
    if (isOpen) {
      if (session) {
        // Editing existing session
        const startDateTime = new Date(session.startTime);
        setName(session.name);
        setDescription(session.description || '');
        setStartDate(format(startDateTime, 'yyyy-MM-dd'));
        setStartTime(format(startDateTime, 'HH:mm'));
        setEndTime(session.endTime ? format(new Date(session.endTime), 'HH:mm') : '');
        setMeetLink(session.meetLink || '');
        setIsRecurring(session.isRecurring);

        // Parse recurrence rule
        if (session.recurrenceRule) {
          parseRecurrenceRule(session.recurrenceRule);
        }

        if (session.programs.includes('All Programs')) {
          setAllPrograms(true);
          setSelectedPrograms([]);
        } else {
          setAllPrograms(false);
          const programIds = programs?.filter(p => session.programs.includes(p.name)).map(p => p.id) || [];
          setSelectedPrograms(programIds);
        }
      } else {
        // New session - set defaults
        const now = new Date();
        const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
        const startDateTime = setMinutes(setHours(now, now.getHours()), roundedMinutes);
        const endDateTime = addMinutes(startDateTime, 45);

        setName('');
        setDescription('');
        setStartDate(format(now, 'yyyy-MM-dd'));
        setStartTime(format(startDateTime, 'HH:mm'));
        setEndTime(format(endDateTime, 'HH:mm'));
        setMeetLink('');
        setIsRecurring(false);
        setRecurrencePreset('weekly');
        setSelectedDays([getCurrentDayCode()]);
        setRepeatUntil('');
        setSelectedPrograms([]);
        setAllPrograms(true);
      }
      setErrors({});
    }
  }, [session, isOpen, programs]);

  const parseRecurrenceRule = (rule: string) => {
    if (rule.includes('FREQ=DAILY')) {
      setRecurrencePreset('daily');
      setSelectedDays([]);
    } else if (rule.includes('BYDAY=MO,TU,WE,TH,FR')) {
      setRecurrencePreset('weekdays');
      setSelectedDays(['MO', 'TU', 'WE', 'TH', 'FR']);
    } else if (rule.includes('BYDAY=')) {
      setRecurrencePreset('custom');
      const daysMatch = rule.match(/BYDAY=([A-Z,]+)/);
      if (daysMatch) {
        setSelectedDays(daysMatch[1].split(','));
      }
    } else if (rule.includes('FREQ=WEEKLY')) {
      setRecurrencePreset('weekly');
      setSelectedDays([getCurrentDayCode()]);
    }

    // Parse UNTIL
    const untilMatch = rule.match(/UNTIL=(\d{8})/);
    if (untilMatch) {
      const year = untilMatch[1].substring(0, 4);
      const month = untilMatch[1].substring(4, 6);
      const day = untilMatch[1].substring(6, 8);
      setRepeatUntil(`${year}-${month}-${day}`);
    }
  };

  const buildRecurrenceRule = () => {
    let rule = '';

    switch (recurrencePreset) {
      case 'daily':
        rule = 'FREQ=DAILY';
        break;
      case 'weekdays':
        rule = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
        break;
      case 'weekly':
        rule = `FREQ=WEEKLY;BYDAY=${selectedDays.length > 0 ? selectedDays[0] : getCurrentDayCode()}`;
        break;
      case 'custom':
        if (selectedDays.length > 0) {
          rule = `FREQ=WEEKLY;BYDAY=${selectedDays.join(',')}`;
        } else {
          rule = 'FREQ=WEEKLY';
        }
        break;
    }

    if (repeatUntil) {
      const untilDate = repeatUntil.replace(/-/g, '');
      rule += `;UNTIL=${untilDate}`;
    }

    return rule;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Session name is required';
    }

    if (!startDate) {
      newErrors.startDate = 'Date is required';
    }

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (endTime && startTime && endTime <= startTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (meetLink && !isValidUrl(meetLink)) {
      newErrors.meetLink = 'Invalid URL format';
    }

    if (isRecurring && recurrencePreset === 'custom' && selectedDays.length === 0) {
      newErrors.selectedDays = 'Select at least one day';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = endTime ? new Date(`${startDate}T${endTime}`) : undefined;

    const data: CreateSessionData = {
      name: name.trim(),
      description: description.trim() || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime?.toISOString(),
      meetLink: meetLink.trim() || undefined,
      isRecurring,
      recurrenceRule: isRecurring ? buildRecurrenceRule() : undefined,
      programIds: allPrograms ? [] : selectedPrograms,
    };

    try {
      if (isEditing) {
        await updateSession.mutateAsync({ id: session.id, data });
      } else {
        await createSession.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleDay = (dayCode: string) => {
    setSelectedDays(prev =>
      prev.includes(dayCode)
        ? prev.filter(d => d !== dayCode)
        : [...prev, dayCode]
    );
  };

  const toggleProgram = (programId: string) => {
    setSelectedPrograms(prev =>
      prev.includes(programId)
        ? prev.filter(id => id !== programId)
        : [...prev, programId]
    );
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    // Auto-update end time to 45 mins later if it wasn't manually set
    if (newTime) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const startDateTime = setMinutes(setHours(new Date(), hours), minutes);
      const endDateTime = addMinutes(startDateTime, 45);
      setEndTime(format(endDateTime, 'HH:mm'));
    }
  };

  const isSubmitting = createSession.isPending || updateSession.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Session' : 'Create Session'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {/* Name */}
          <Input
            label="Session Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Weekly Q&A Session"
            error={errors.name}
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Session details..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 hover:border-slate-400 transition-all"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Date <span className="text-accent-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 hover:border-slate-400 transition-all"
                required
              />
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Time <span className="text-accent-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 hover:border-slate-400 transition-all"
                required
              />
              {errors.startTime && <p className="text-sm text-red-500 mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 hover:border-slate-400 transition-all"
              />
              {errors.endTime && <p className="text-sm text-red-500 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          {/* Meet Link */}
          <Input
            label="Meeting Link"
            type="url"
            value={meetLink}
            onChange={(e) => setMeetLink(e.target.value)}
            placeholder="https://meet.google.com/..."
            error={errors.meetLink}
            helperText="Google Meet, Zoom, or other video call link"
          />

          {/* Recurring */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 text-accent-500 border-slate-300 rounded focus:ring-accent-500"
              />
              <div>
                <span className="font-medium text-slate-900">Recurring Session</span>
                <p className="text-sm text-slate-500">This session repeats on a schedule</p>
              </div>
            </label>

            {isRecurring && (
              <div className="mt-4 space-y-4 pt-4 border-t border-slate-200">
                {/* Recurrence Preset */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Repeat Frequency
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {RECURRENCE_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setRecurrencePreset(preset.value);
                          if (preset.value === 'weekdays') {
                            setSelectedDays(['MO', 'TU', 'WE', 'TH', 'FR']);
                          } else if (preset.value === 'weekly') {
                            setSelectedDays([getCurrentDayCode()]);
                          } else if (preset.value === 'daily') {
                            setSelectedDays([]);
                          }
                        }}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                          recurrencePreset === preset.value
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Selection for Custom */}
                {(recurrencePreset === 'custom' || recurrencePreset === 'weekly') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {recurrencePreset === 'weekly' ? 'Repeat on' : 'Select Days'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            if (recurrencePreset === 'weekly') {
                              setSelectedDays([day.value]);
                            } else {
                              toggleDay(day.value);
                            }
                          }}
                          className={`w-12 h-12 text-sm font-medium rounded-xl border transition-all ${
                            selectedDays.includes(day.value)
                              ? 'bg-accent-500 text-white border-accent-500'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {errors.selectedDays && (
                      <p className="text-sm text-red-500 mt-1">{errors.selectedDays}</p>
                    )}
                  </div>
                )}

                {/* Repeat Until */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Repeat Until <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={repeatUntil}
                    onChange={(e) => setRepeatUntil(e.target.value)}
                    min={startDate}
                    className="w-full md:w-48 px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 hover:border-slate-400 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave empty for indefinite recurrence</p>
                </div>
              </div>
            )}
          </div>

          {/* Program Assignment */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allPrograms}
                onChange={(e) => {
                  setAllPrograms(e.target.checked);
                  if (e.target.checked) setSelectedPrograms([]);
                }}
                className="w-4 h-4 text-accent-500 border-slate-300 rounded focus:ring-accent-500"
              />
              <div>
                <span className="font-medium text-slate-900">All Programs</span>
                <p className="text-sm text-slate-500">Session is available to all learners</p>
              </div>
            </label>

            {!allPrograms && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Programs
                </label>
                {programs && programs.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {programs.filter(p => p.isPublished).map((program) => (
                      <label
                        key={program.id}
                        className="flex items-center gap-3 p-2.5 hover:bg-white rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPrograms.includes(program.id)}
                          onChange={() => toggleProgram(program.id)}
                          className="w-4 h-4 text-accent-500 border-slate-300 rounded focus:ring-accent-500"
                        />
                        <span className="text-sm text-slate-700">{program.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No published programs available</p>
                )}
              </div>
            )}
          </div>
        </div>

        <Modal.Footer>
          {isEditing && onDelete && session && (
            <Button
              type="button"
              variant="danger"
              onClick={() => onDelete(session)}
              className="mr-auto"
            >
              Delete Session
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Session'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
