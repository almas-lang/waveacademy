'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

interface DropdownMenuProps {
  children: ReactNode;
  trigger?: ReactNode;
  className?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
}

export default function DropdownMenu({ children, trigger, className = '' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 180; // min-width of dropdown-menu

      // Calculate position - align to right edge of button
      let left = rect.right - menuWidth;
      const top = rect.bottom + 4;

      // Ensure menu doesn't go off left edge
      if (left < 8) {
        left = 8;
      }

      // Ensure menu doesn't go off right edge
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setPosition({ top, left });
    }

    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const menuWidth = 180;
        let left = rect.right - menuWidth;
        const top = rect.bottom + 4;

        if (left < 8) left = 8;
        if (left + menuWidth > window.innerWidth - 8) {
          left = window.innerWidth - menuWidth - 8;
        }

        setPosition({ top, left });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        {trigger || <MoreVertical className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          />

          {/* Menu */}
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[180px] py-1.5 bg-white rounded-lg border border-slate-200 shadow-elevated animate-scale-in origin-top-right"
            style={{
              top: position.top,
              left: position.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

// Sub-components for menu items
interface DropdownItemProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  variant?: 'default' | 'danger';
  className?: string;
}

export function DropdownItem({ children, onClick, href, variant = 'default', className = '' }: DropdownItemProps) {
  const baseClasses = "flex items-center gap-2.5 px-3.5 py-2 text-sm w-full text-left transition-colors duration-100";
  const variantClasses = variant === 'danger'
    ? "text-red-600 hover:bg-red-50"
    : "text-slate-700 hover:bg-slate-50";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClasses} ${variantClasses} ${className}`}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="my-1.5 border-t border-slate-100" />;
}
