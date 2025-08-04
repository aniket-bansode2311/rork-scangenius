import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { Container } from '@/components/Container';
import { Colors } from '@/constants/colors';
import { FileText, RefreshCw } from 'lucide-react-native';
import { Input } from '@/components/Input';
import { DocumentCard } from '@/components/DocumentCard';
import { fetchUserDocuments, deleteDocument, searchDocuments, Document } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';



export default function ScansScreen() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  const renderDocument = ({ item }: { item: Document }) => (
    <DocumentCard
      document={item}
      onView={handleViewDocument}
      onDelete={handleDeleteDocument}
      onShare={handleShareDocument}
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

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search documents and text content..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            testID="search-input"
          />
        </View>

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
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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