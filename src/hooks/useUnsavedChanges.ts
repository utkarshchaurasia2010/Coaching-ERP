"use client";

import { useEffect } from 'react';
import { useFormDirty } from '@/context/FormDirtyContext';

export function useUnsavedChanges(localIsDirty: boolean, message?: string) {
  const { setIsDirty } = useFormDirty();

  useEffect(() => {
    setIsDirty(localIsDirty);
    
    // Cleanup to ensure we don't block navigation if component unmounts for some other reason
    return () => {
      setIsDirty(false);
    };
  }, [localIsDirty, setIsDirty]);
}
