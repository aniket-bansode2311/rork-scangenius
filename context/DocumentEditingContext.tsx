import React, { useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Document } from '@/types/supabase';

interface DocumentEditingState {
  isSelectionMode: boolean;
  selectedDocuments: Document[];
  isProcessing: boolean;
  setSelectionMode: (enabled: boolean) => void;
  toggleDocumentSelection: (document: Document) => void;
  clearSelection: () => void;
  selectAllDocuments: (documents: Document[]) => void;
  isDocumentSelected: (documentId: string) => boolean;
  setProcessing: (processing: boolean) => void;
}

export const [DocumentEditingProvider, useDocumentEditing] = createContextHook<DocumentEditingState>(() => {
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const setSelectionMode = useCallback((enabled: boolean) => {
    setIsSelectionMode(enabled);
    if (!enabled) {
      setSelectedDocuments([]);
    }
  }, []);

  const toggleDocumentSelection = useCallback((document: Document) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(doc => doc.id === document.id);
      if (isSelected) {
        return prev.filter(doc => doc.id !== document.id);
      } else {
        return [...prev, document];
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDocuments([]);
  }, []);

  const selectAllDocuments = useCallback((documents: Document[]) => {
    setSelectedDocuments(documents);
  }, []);

  const isDocumentSelected = useCallback((documentId: string) => {
    return selectedDocuments.some(doc => doc.id === documentId);
  }, [selectedDocuments]);

  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  return {
    isSelectionMode,
    selectedDocuments,
    isProcessing,
    setSelectionMode,
    toggleDocumentSelection,
    clearSelection,
    selectAllDocuments,
    isDocumentSelected,
    setProcessing,
  };
});