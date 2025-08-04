import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { X, ArrowUpDown, GripVertical } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Document } from '@/types/supabase';

interface PageReorderDialogProps {
  visible: boolean;
  document: Document;
  pages: Document[];
  onClose: () => void;
  onReorder: (newOrder: string[]) => Promise<void>;
  isProcessing: boolean;
}



export function PageReorderDialog({
  visible,
  document,
  pages,
  onClose,
  onReorder,
  isProcessing
}: PageReorderDialogProps) {
  const [orderedPages, setOrderedPages] = useState<Document[]>([]);

  useEffect(() => {
    setOrderedPages([...pages]);
  }, [pages]);

  const handleReorder = async () => {
    try {
      const newOrder = orderedPages.map(page => page.id);
      await onReorder(newOrder);
      onClose();
    } catch (error) {
      console.error('Error reordering pages:', error);
      Alert.alert('Error', 'Failed to reorder pages. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setOrderedPages([...pages]);
      onClose();
    }
  };

  const movePageUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...orderedPages];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setOrderedPages(newOrder);
    }
  };

  const movePageDown = (index: number) => {
    if (index < orderedPages.length - 1) {
      const newOrder = [...orderedPages];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setOrderedPages(newOrder);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(orderedPages.map(p => p.id)) !== JSON.stringify(pages.map(p => p.id));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ArrowUpDown size={24} color={Colors.primary} />
            <View>
              <Text style={styles.headerTitle}>Reorder Pages</Text>
              <Text style={styles.headerSubtitle}>{document.title}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={isProcessing}
            testID="close-reorder-dialog"
          >
            <X size={24} color={Colors.gray[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pages ({orderedPages.length})</Text>
            <Text style={styles.sectionDescription}>
              Drag pages up or down to reorder them within the document
            </Text>
            
            <View style={styles.pagesContainer}>
              {orderedPages.map((page, index) => (
                <View key={page.id} style={styles.pageItem}>
                  <View style={styles.pageContent}>
                    <View style={styles.pageNumber}>
                      <Text style={styles.pageNumberText}>{index + 1}</Text>
                    </View>
                    
                    <View style={styles.pageThumbnail}>
                      <Image
                        source={{ uri: page.thumbnail_url || page.file_url }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>
                    
                    <View style={styles.pageInfo}>
                      <Text style={styles.pageTitle} numberOfLines={2}>
                        {page.title}
                      </Text>
                      <Text style={styles.pageDate}>
                        {formatDate(page.created_at)}
                      </Text>
                    </View>
                    
                    <View style={styles.pageControls}>
                      <TouchableOpacity
                        style={[
                          styles.controlButton,
                          index === 0 && styles.disabledControlButton
                        ]}
                        onPress={() => movePageUp(index)}
                        disabled={index === 0 || isProcessing}
                        testID={`move-up-${index}`}
                      >
                        <Text style={styles.controlButtonText}>↑</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.controlButton,
                          index === orderedPages.length - 1 && styles.disabledControlButton
                        ]}
                        onPress={() => movePageDown(index)}
                        disabled={index === orderedPages.length - 1 || isProcessing}
                        testID={`move-down-${index}`}
                      >
                        <Text style={styles.controlButtonText}>↓</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.dragHandle}>
                      <GripVertical size={20} color={Colors.gray[400]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={isProcessing}
            testID="cancel-reorder-button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              (!hasChanges() || isProcessing) && styles.disabledButton
            ]}
            onPress={handleReorder}
            disabled={!hasChanges() || isProcessing}
            testID="save-reorder-button"
          >
            <ArrowUpDown size={16} color={Colors.background} />
            <Text style={styles.saveButtonText}>
              {isProcessing ? 'Saving...' : 'Save Order'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray[600],
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 16,
    lineHeight: 20,
  },
  pagesContainer: {
    gap: 12,
  },
  pageItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    overflow: 'hidden',
  },
  pageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  pageThumbnail: {
    width: 60,
    height: 45,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.gray[100],
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  pageInfo: {
    flex: 1,
    paddingHorizontal: 8,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
    marginBottom: 4,
    lineHeight: 18,
  },
  pageDate: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  pageControls: {
    flexDirection: 'column',
    gap: 4,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  disabledControlButton: {
    opacity: 0.3,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  dragHandle: {
    paddingHorizontal: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.gray[300],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    opacity: 0.5,
  },
});