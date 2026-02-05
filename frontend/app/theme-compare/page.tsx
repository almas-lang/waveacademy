'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { themes, Theme, ThemeId } from '@/lib/themes';
import {
  BookOpen,
  Users,
  Calendar,
  LayoutDashboard,
  Bell,
  Search,
  Plus,
  MoreVertical,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Info,
  Award,
  Sparkles,
} from 'lucide-react';

// Component preview with theme applied
function ThemePreview({ theme, isActive }: { theme: Theme; isActive: boolean }) {
  const { colors } = theme;

  return (
    <div
      className="rounded-2xl overflow-hidden border-2 transition-all duration-300"
      style={{
        borderColor: isActive ? colors.accent[500] : colors.border,
        boxShadow: isActive ? `0 0 0 4px ${colors.accent[500]}20` : 'none',
      }}
    >
      {/* Theme Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: colors.primary[700] }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: colors.primary[900] }}
          >
            XW
          </div>
          <span className="text-white font-semibold text-sm">{theme.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${colors.primary[600]}` }}
          >
            <Bell className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex" style={{ backgroundColor: colors.background }}>
        {/* Sidebar */}
        <div
          className="w-48 p-3 border-r"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <div className="space-y-1">
            {[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: BookOpen, label: 'Programs', active: false },
              { icon: Users, label: 'Learners', active: false },
              { icon: Calendar, label: 'Sessions', active: false },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: item.active ? colors.primary[700] : 'transparent',
                  color: item.active ? '#fff' : colors.textMuted,
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4" style={{ backgroundColor: colors.background }}>
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Programs', value: '12' },
              { label: 'Learners', value: '248' },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <p className="text-xs mb-1" style={{ color: colors.textMuted }}>
                  {stat.label}
                </p>
                <p className="text-xl font-bold" style={{ color: colors.text }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Buttons Row */}
          <div className="flex gap-2 mb-4">
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
              style={{ backgroundColor: colors.accent[500] }}
            >
              <Plus className="w-3 h-3" />
              Primary
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
              style={{ backgroundColor: colors.primary[700] }}
            >
              Secondary
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-xs font-medium border"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              }}
            >
              Outline
            </button>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#dcfce7', color: '#166534' }}
            >
              Success
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
            >
              Warning
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
            >
              Error
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${colors.primary[100]}`, color: colors.primary[700] }}
            >
              Info
            </span>
            {colors.highlight && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                style={{ backgroundColor: `${colors.highlight}20`, color: colors.highlight }}
              >
                <Award className="w-3 h-3" />
                Premium
              </span>
            )}
          </div>

          {/* Card with List */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <div
              className="px-3 py-2 border-b flex items-center justify-between"
              style={{ borderColor: colors.border }}
            >
              <span className="text-sm font-semibold" style={{ color: colors.text }}>
                Recent Items
              </span>
              <button
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: colors.accent[500] }}
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {[1, 2].map((_, i) => (
              <div
                key={i}
                className="px-3 py-2.5 flex items-center justify-between border-b last:border-0"
                style={{ borderColor: `${colors.border}80` }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${colors.primary[100]}` }}
                  >
                    <BookOpen className="w-4 h-4" style={{ color: colors.primary[600] }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.text }}>
                      Course {i + 1}
                    </p>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      12 lessons
                    </p>
                  </div>
                </div>
                <MoreVertical className="w-4 h-4" style={{ color: colors.textMuted }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Theme Label */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: colors.surface, borderTop: `1px solid ${colors.border}` }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: colors.text }}>
            {theme.name}
          </p>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            {theme.description}
          </p>
        </div>
        {isActive && (
          <span
            className="px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
            style={{ backgroundColor: colors.accent[500], color: '#fff' }}
          >
            <Check className="w-3 h-3" />
            Active
          </span>
        )}
      </div>
    </div>
  );
}

// Color Swatch Component
function ColorSwatch({
  color,
  label,
  description,
}: {
  color: string;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg shadow-inner border border-black/10"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 font-mono">{color}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
    </div>
  );
}

// Palette Display
function PaletteDisplay({ theme }: { theme: Theme }) {
  const { colors } = theme;

  return (
    <div className="space-y-6">
      {/* Primary Scale */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Primary</h4>
        <div className="flex rounded-lg overflow-hidden">
          {Object.entries(colors.primary).map(([shade, color]) => (
            <div
              key={shade}
              className="flex-1 h-12 flex items-end justify-center pb-1"
              style={{ backgroundColor: color }}
            >
              <span
                className={`text-[10px] font-mono ${
                  parseInt(shade) >= 500 ? 'text-white/70' : 'text-black/50'
                }`}
              >
                {shade}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Accent Scale */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Accent</h4>
        <div className="flex rounded-lg overflow-hidden">
          {Object.entries(colors.accent).map(([shade, color]) => (
            <div
              key={shade}
              className="flex-1 h-12 flex items-end justify-center pb-1"
              style={{ backgroundColor: color }}
            >
              <span
                className={`text-[10px] font-mono ${
                  parseInt(shade) >= 500 ? 'text-white/70' : 'text-black/50'
                }`}
              >
                {shade}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Neutrals */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Neutrals</h4>
        <div className="grid grid-cols-2 gap-3">
          <ColorSwatch color={colors.text} label="Text" description="Primary text" />
          <ColorSwatch color={colors.textMuted} label="Muted" description="Secondary text" />
          <ColorSwatch color={colors.background} label="Background" description="Page background" />
          <ColorSwatch color={colors.surface} label="Surface" description="Cards, panels" />
          <ColorSwatch color={colors.border} label="Border" description="Dividers, borders" />
          {colors.highlight && (
            <ColorSwatch color={colors.highlight} label="Highlight" description="Premium elements" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ThemeComparePage() {
  const router = useRouter();
  const [activeTheme, setActiveTheme] = useState<ThemeId>('slate-red');
  const [applied, setApplied] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('lms-admin-theme') as ThemeId | null;
    if (saved && themes[saved]) {
      setActiveTheme(saved);
    }
  }, []);

  const applyTheme = () => {
    localStorage.setItem('lms-admin-theme', activeTheme);
    setApplied(true);
    setTimeout(() => {
      router.push('/admin');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Theme Comparison</h1>
              <p className="text-sm text-slate-500">
                Compare and choose your admin interface theme
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Active Theme:</span>
              <select
                value={activeTheme}
                onChange={(e) => setActiveTheme(e.target.value as ThemeId)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
              >
                {Object.values(themes).map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Side by Side Previews */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Live Previews</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.values(themes).map((theme) => (
              <div key={theme.id} className="cursor-pointer" onClick={() => setActiveTheme(theme.id)}>
                <ThemePreview theme={theme} isActive={activeTheme === theme.id} />
              </div>
            ))}
          </div>
        </section>

        {/* Color Palettes */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Color Palettes</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.values(themes).map((theme) => (
              <div
                key={theme.id}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary[700]} 50%, ${theme.colors.accent[500]} 50%)`,
                    }}
                  />
                  <div>
                    <h3 className="font-semibold text-slate-900">{theme.name}</h3>
                    <p className="text-sm text-slate-500">{theme.description}</p>
                  </div>
                </div>
                <PaletteDisplay theme={theme} />
              </div>
            ))}
          </div>
        </section>

        {/* Usage Comparison */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Color Usage Comparison</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Element</th>
                  {Object.values(themes).map((theme) => (
                    <th key={theme.id} className="px-6 py-3 text-left font-semibold text-slate-600">
                      {theme.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { element: 'Primary Buttons', key: 'accent', shade: '500' },
                  { element: 'Secondary Buttons', key: 'primary', shade: '700' },
                  { element: 'Active Nav Items', key: 'primary', shade: '700' },
                  { element: 'Headers', key: 'primary', shade: '700' },
                  { element: 'Icons (default)', key: 'primary', shade: '600' },
                  { element: 'Hover States', key: 'accent', shade: '500' },
                  { element: 'Text', key: 'text', shade: null },
                  { element: 'Background', key: 'background', shade: null },
                ].map((row) => (
                  <tr key={row.element}>
                    <td className="px-6 py-4 font-medium text-slate-700">{row.element}</td>
                    {Object.values(themes).map((theme) => {
                      const color = row.shade
                        ? (theme.colors as any)[row.key]?.[row.shade]
                        : (theme.colors as any)[row.key];
                      return (
                        <td key={theme.id} className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded border border-black/10"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-mono text-xs text-slate-500">{color}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Apply Theme Button */}
        <div className="mt-8 flex justify-center">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center max-w-md">
            {applied ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Theme Applied!</h3>
                <p className="text-sm text-slate-500">
                  Redirecting to admin dashboard...
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900 mb-2">Ready to apply a theme?</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Select your preferred theme above, then click the button below to apply it to the admin interface.
                </p>
                <button
                  onClick={applyTheme}
                  className="px-6 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: themes[activeTheme].colors.accent[500] }}
                >
                  Apply {themes[activeTheme].name} Theme
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
