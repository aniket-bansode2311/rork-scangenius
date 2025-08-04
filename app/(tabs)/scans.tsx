import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  RefreshControl,
  Alert,
  Platform,
  TouchableOpacity
} from 'react-native';
import { Container } from '@/components/Container';
import { Colors } from '@/constants/colors';
import { FileText, RefreshCw, CheckSquare, X, Merge, Trash2, ArrowUpDown } from 'lucide-react-native';
import { Input } from '@/components/Input';
import { DocumentCard } from '@/components/DocumentCard';
import { MergeDocumentsDialog } from '@/components/MergeDocumentsDialog';
import { PageReorderDialog } from '@/components/PageReorderDialog';
import { 
  fetchUserDocuments, 
  deleteDocument, 
  searchDocuments, 
  Document,
  mergeDocuments,
  deleteMultipleDocuments,
  getDocumentPages,
  reorderDocumentPages
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useDocumentEditing } from '@/context/DocumentEditingContext';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';



export default function ScansScreen() {
  const { user } = useAuth();
  const {
    isSelectionMode,
    selectedDocuments,
    isProcessing,
    setSelectionMode,
    toggleDocumentSelection,
    clearSelection,
    selectAllDocuments,
    isDocumentSelected,
    setProcessing,
  } = useDocumentEditing();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showMergeDialog, setShowMergeDialog] = useState<boolean>(false);
  const [showReorderDialog, setShowReorderDialog] = useState<boolean>(false);
  const [reorderDocument, setReorderDocument] = useState<Document | null>(null);
  const [reorderPages, setReorderPages] = useState<Document[]>([]);

  const loadDocuments = useCallback(async (showRefreshing = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('Loading documents for user:', user.id);
      const userDocuments = await fetchUserDocuments(user.id);
      setDocuments(userDocuments);
      setFilteredDocuments(userDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Load documents when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments])
  );

  // Search documents with OCR text support
  const performSearch = useCallback(async (query: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Searching documents with query:', query);
      
      const searchResults = await searchDocuments(user.id, query);
      setFilteredDocuments(searchResults);
    } catch (error) {
      console.error('Error searching documents:', error);
      // Fallback to local search if server search fails
      const filtered = documents.filter(doc =>
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        (doc.ocr_text && doc.ocr_text.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredDocuments(filtered);
    } finally {
      setLoading(false);
    }
  }, [user, documents]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFilteredDocuments(documents);
      } else {
        performSearch(searchQuery);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, documents, performSearch]);

  const handleRefresh = () => {
    loadDocuments(true);
  };

  const handleViewDocument = (document: Document) => {
    if (isSelectionMode) {
      return;
    }
    
    console.log('Viewing document:', document.title);
    // Navigate to document detail screen
    router.push({
      pathname: '/document-detail',
      params: {
        id: document.id,
        title: document.title,
        file_url: document.file_url,
        thumbnail_url: document.thumbnail_url || '',
        created_at: document.created_at,
        ocr_text: document.ocr_text || '',
        ocr_processed: document.ocr_processed ? 'true' : 'false'
      }
    });
  };

  const handleDeleteDocument = async (document: Document) => {
    try {
      console.log('Deleting document:', document.id);
      await deleteDocument(document.id, document.file_url, document.thumbnail_url);
      
      // Remove from local state
      const updatedDocuments = documents.filter(doc => doc.id !== document.id);
      setDocuments(updatedDocuments);
      
      // Update filtered documents
      if (!searchQuery.trim()) {
        setFilteredDocuments(updatedDocuments);
      } else {
        performSearch(searchQuery);
      }
      
      Alert.alert('Success', 'Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      Alert.alert('Error', 'Failed to delete document. Please try again.');
    }
  };

  const handleShareDocument = (document: Document) => {
    console.log('Sharing document:', document.title);
    
    if (Platform.OS === 'web') {
      // For web, copy URL to clipboard or open in new tab
      if (navigator.clipboard) {
        navigator.clipboard.writeText(document.file_url);
        Alert.alert('Success', 'Document URL copied to clipboard');
      } else {
        window.open(document.file_url, '_blank');
      }
    } else {
      // For mobile, you would use expo-sharing here
      Alert.alert('Share', 'Share functionality will be implemented here');
    }
  };

  // Advanced editing handlers
  const handleStartSelection = () => {
    setSelectionMode(true);
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    clearSelection();
  };

  const handleSelectAll = () => {
    selectAllDocuments(filteredDocuments);
  };

  const handleMergeDocuments = async (title: string) => {
    try {
      setProcessing(true);
      console.log('Merging documents:', selectedDocuments.map(d => d.title));
      
      await mergeDocuments(selectedDocuments, title, user!.id);
      
      // Refresh documents list
      await loadDocuments();
      
      // Exit selection mode
      setSelectionMode(false);
      clearSelection();
      
      Alert.alert('Success', `Documents merged into "${title}"`);
    } catch (error) {
      console.error('Error merging documents:', error);
      Alert.alert('Error', 'Failed to merge documents. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSelected = async () => {
    Alert.alert(
      'Delete Documents',
      `Are you sure you want to delete ${selectedDocuments.length} document(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await deleteMultipleDocuments(selectedDocuments);
              
              // Refresh documents list
              await loadDocuments();
              
              // Exit selection mode
              setSelectionMode(false);
              clearSelection();
              
              Alert.alert('Success', 'Documents deleted successfully');
            } catch (error) {
              console.error('Error deleting documents:', error);
              Alert.alert('Error', 'Failed to delete documents. Please try again.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleReorderPages = async (document: Document) => {
    try {
      console.log('Loading pages for document:', document.id);
      const pages = await getDocumentPages(document.id);
      
      if (pages.length === 0) {
        Alert.alert('Info', 'This document has no pages to reorder.');
        return;
      }
      
      setReorderDocument(document);
      setReorderPages(pages);
      setShowReorderDialog(true);
    } catch (error) {
      console.error('Error loading document pages:', error);
      Alert.alert('Error', 'Failed to load document pages.');
    }
  };

  const handleSavePageOrder = async (newOrder: string[]) => {
    if (!reorderDocument) return;
    
    try {
      setProcessing(true);
      await reorderDocumentPages(reorderDocument.id, newOrder);
      
      Alert.alert('Success', 'Page order updated successfully');
      setShowReorderDialog(false);
      setReorderDocument(null);
      setReorderPages([]);
    } catch (error) {
      console.error('Error reordering pages:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <DocumentCard
      document={item}
      onView={handleViewDocument}
      onDelete={handleDeleteDocument}
      onShare={handleShareDocument}
      isSelectionMode={isSelectionMode}
      isSelected={isDocumentSelected(item.id)}
      onToggleSelection={toggleDocumentSelection}
    />
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <RefreshCw size={48} color={Colors.gray[400]} />
          <Text style={styles.emptyStateTitle}>Loading documents...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && filteredDocuments.length === 0) {
      return (
        <View style={styles.emptyState}>
          <FileText size={48} color={Colors.gray[400]} />
          <Text style={styles.emptyStateTitle}>No documents found</Text>
          <Text style={styles.emptyStateText}>
            No documents match your search query
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <FileText size={48} color={Colors.gray[400]} />
        <Text style={styles.emptyStateTitle}>No scans yet</Text>
        <Text style={styles.emptyStateText}>
          Your scanned documents will appear here
        </Text>
      </View>
    );
  };

  const renderSelectionHeader = () => {
    if (!isSelectionMode) {
      return (
        <View style={styles.normalHeader}>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={handleStartSelection}
            testID="start-selection-button"
          >
            <CheckSquare size={20} color={Colors.primary} />
            <Text style={styles.selectionButtonText}>Select</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.selectionHeader}>
        <View style={styles.selectionInfo}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSelection}
            disabled={isProcessing}
            testID="cancel-selection-button"
          >
            <X size={20} color={Colors.gray[600]} />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedDocuments.length} selected
          </Text>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={handleSelectAll}
            disabled={isProcessing}
            testID="select-all-button"
          >
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        </View>
        
        {selectedDocuments.length > 0 && (
          <View style={styles.selectionActions}>
            {selectedDocuments.length >= 2 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowMergeDialog(true)}
                disabled={isProcessing}
                testID="merge-button"
              >
                <Merge size={16} color={Colors.primary} />
                <Text style={styles.actionButtonText}>Merge</Text>
              </TouchableOpacity>
            )}
            
            {selectedDocuments.length === 1 && selectedDocuments[0].page_count && selectedDocuments[0].page_count > 1 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReorderPages(selectedDocuments[0])}
                disabled={isProcessing}
                testID="reorder-button"
              >
                <ArrowUpDown size={16} color={Colors.primary} />
                <Text style={styles.actionButtonText}>Reorder</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteSelected}
              disabled={isProcessing}
              testID="delete-selected-button"
            >
              <Trash2 size={16} color={Colors.gray[600]} />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Container>
      <View style={styles.container}>
        {renderSelectionHeader()}
        
        {!isSelectionMode && (
          <View style={styles.searchContainer}>
            <Input
              placeholder="Search documents and text content..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              testID="search-input"
            />
          </View>
        )}

        <FlatList
          data={filteredDocuments}
          keyExtractor={(item) => item.id}
          renderItem={renderDocument}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            filteredDocuments.length === 0 && styles.emptyListContent
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="documents-list"
        />
        
        <MergeDocumentsDialog
          visible={showMergeDialog}
          documents={selectedDocuments}
          onClose={() => setShowMergeDialog(false)}
          onMerge={handleMergeDocuments}
          isProcessing={isProcessing}
        />
        
        {reorderDocument && (
          <PageReorderDialog
            visible={showReorderDialog}
            document={reorderDocument}
            pages={reorderPages}
            onClose={() => {
              setShowReorderDialog(false);
              setReorderDocument(null);
              setReorderPages([]);
            }}
            onReorder={handleSavePageOrder}
            isProcessing={isProcessing}
          />
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  normalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    gap: 6,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectionHeader: {
    marginBottom: 16,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cancelButton: {
    padding: 4,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    flex: 1,
    textAlign: 'center',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButton: {
    borderColor: Colors.gray[400],
    backgroundColor: Colors.gray[100],
  },
  deleteButtonText: {
    color: Colors.gray[700],
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: Colors.gray[100],
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
});