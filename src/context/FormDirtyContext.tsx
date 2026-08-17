"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type FormDirtyContextType = {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  attemptNavigation: (href: string) => void;
  attemptBack: () => void;
};

const FormDirtyContext = createContext<FormDirtyContextType | undefined>(undefined);

export function FormDirtyProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        const message = "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };

    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty) return;
      
      const target = (e.target as HTMLElement).closest('a');
      if (!target || !target.href) return;
      
      if (target.target === '_blank') return;

      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(target.href);
      
      if (currentUrl.pathname === targetUrl.pathname && currentUrl.search === targetUrl.search) {
         return; // Same page hash link
      }

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(target.href);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleAnchorClick, { capture: true });
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleAnchorClick, { capture: true });
    };
  }, [isDirty]);

  const attemptNavigation = (href: string) => {
    if (isDirty) {
      setPendingHref(href);
    } else {
      router.push(href);
    }
  };

  const attemptBack = () => {
    if (isDirty) {
      setPendingHref('BACK');
    } else {
      router.back();
    }
  };

  const confirmNavigation = () => {
    if (pendingHref) {
      setIsDirty(false);
      if (pendingHref === 'BACK') {
        router.back();
      } else {
        router.push(pendingHref);
      }
      setPendingHref(null);
    }
  };

  const cancelNavigation = () => {
    setPendingHref(null);
  };

  return (
    <FormDirtyContext.Provider value={{ isDirty, setIsDirty, attemptNavigation, attemptBack }}>
      {children}
      
      {/* Global Unsaved Changes Modal */}
      {pendingHref && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2rem', background: 'var(--surface-solid)', borderRadius: 'var(--radius)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: 'var(--foreground)' }}>Unsaved Changes</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="btn btn-outline" 
                onClick={cancelNavigation}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={confirmNavigation}
              >
                Yes, leave
              </button>
            </div>
          </div>
        </div>
      )}
    </FormDirtyContext.Provider>
  );
}

export function useFormDirty() {
  const context = useContext(FormDirtyContext);
  if (context === undefined) {
    throw new Error('useFormDirty must be used within a FormDirtyProvider');
  }
  return context;
}
