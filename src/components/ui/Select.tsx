"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "badge";
  badgeColorMap?: Record<string, { bg: string; text: string }>;
}

export function CustomSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select an option", 
  icon,
  className = "",
  disabled = false,
  variant = "default",
  badgeColorMap = {}
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const badgeStyle = variant === 'badge' && value && badgeColorMap[value] 
    ? { backgroundColor: badgeColorMap[value].bg, color: badgeColorMap[value].text, border: 'none', padding: '0.25rem 0.75rem', borderRadius: '999px', display: 'inline-flex', width: 'auto' }
    : {};

  return (
    <div ref={ref} className={`premium-select ${className}`} style={{ position: 'relative', ...(variant === 'badge' ? { display: 'inline-block', width: 'auto' } : {}) }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`premium-select-trigger ${isOpen ? 'open' : ''} ${variant === 'badge' ? 'badge-variant' : ''}`}
        style={badgeStyle}
      >
        {icon && <span className="premium-select-icon">{icon}</span>}
        <span className={`premium-select-value ${!selectedOption ? 'placeholder' : ''}`} style={variant === 'badge' ? { fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' } : {}}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`premium-select-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className={`premium-select-dropdown ${variant === 'badge' ? 'badge-variant' : ''}`}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`premium-select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} className="premium-select-check" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
