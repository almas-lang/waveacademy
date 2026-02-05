'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, BookOpen, Users, FileText, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SearchResult {
  id: string;
  type: 'program' | 'learner' | 'lesson';
  title: string;
  subtitle?: string;
  href: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Search API
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['admin-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { results: [] };
      const response = await api.get('/admin/search', { params: { q: debouncedQuery, limit: 12 } });
      return response.data;
    },
    enabled: debouncedQuery.length >= 2
  });

  const results: SearchResult[] = searchData?.results || [];

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].href);
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'program':
        return <BookOpen className="w-4 h-4" />;
      case 'learner':
        return <Users className="w-4 h-4" />;
      case 'lesson':
        return <FileText className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getIconStyle = (type: string) => {
    switch (type) {
      case 'program':
        return 'bg-accent-50 text-accent-600';
      case 'learner':
        return 'bg-blue-50 text-blue-600';
      case 'lesson':
        return 'bg-emerald-50 text-emerald-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'program': return 'Program';
      case 'learner': return 'Learner';
      case 'lesson': return 'Lesson';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative flex items-start justify-center pt-[12vh]">
        <div className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Search Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search programs, learners, lessons..."
              className="flex-1 text-base text-slate-900 placeholder:text-slate-400 bg-transparent border-none outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-none focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              autoComplete="off"
              spellCheck="false"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              Close
              <kbd className="ml-1 text-[10px] text-slate-400">ESC</kbd>
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[55vh] overflow-y-auto">
            {/* Loading state */}
            {isLoading && query.length >= 2 && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-slate-200 border-t-accent-500 rounded-full" />
              </div>
            )}

            {/* No results */}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Search className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-slate-600 font-medium">No results found</p>
                <p className="text-sm text-slate-400 mt-1">Try a different search term</p>
              </div>
            )}

            {/* Results list */}
            {results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      router.push(result.href);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-slate-100'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconStyle(result.type)}`}>
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 truncate">
                          {result.title}
                        </p>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getIconStyle(result.type)}`}>
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-opacity ${
                      index === selectedIndex ? 'opacity-100 text-slate-400' : 'opacity-0'
                    }`} />
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!query && (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">Quick Search</p>
                <p className="text-sm text-slate-400 mt-1">Find programs, learners, and lessons</p>
                <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400">
                  <span className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200 font-mono">↑↓</kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200 font-mono">↵</kbd>
                    <span>Select</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200 font-mono">esc</kbd>
                    <span>Close</span>
                  </span>
                </div>
              </div>
            )}

            {/* Typing hint */}
            {query.length > 0 && query.length < 2 && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-400">Type at least 2 characters to search...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
