import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { X, FileText, Merge } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Document } from '@/types/supabase';

interface MergeDocumentsDialogProps {
  visible: boolean;
  documents: Document[];
  onClose: () => void;
  onMerge: (title: string) => Promise<void>;
  isProcessing: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const thumbnailSize = (screenWidth - 80) / 3;

export function MergeDocumentsDialog({
  visible,
  documents,
  onClose,
  onMerge,
  isProcessing
}: MergeDocumentsDialogProps) {
  const [title, setTitle] = useState<string>('');

  const handleMerge = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the merged document');
      return;
    }

    try {
      await onMerge(title.trim());
      setTitle('');
      onClose();
    } catch (error) {
      console.error('Error merging documents:', error);
      Alert.alert('Error', 'Failed to merge documents. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setTitle('');
      onClose();
    }
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
            <Merge size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Merge Documents</Text>
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={isProcessing}
            testID="close-merge-dialog"
          >
            <X size={24} color={Colors.gray[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents to Merge ({documents.length})</Text>
            <Text style={styles.sectionDescription}>
              These documents will be combined into a single multi-page document
            </Text>
            
            <View style={styles.documentsGrid}>
              {documents.map((document, index) => (
                <View key={document.id} style={styles.documentItem}>
                  <View style={styles.documentThumbnail}>
                    <Image
                      source={{ uri: document.thumbnail_url || document.file_url }}
                      style={styles.thumbnail}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.pageNumber}>
                      <Text style={styles.pageNumberText}>{index + 1}</Text>
                    </View>
                  </View>
                  <Text style={styles.documentTitle} numberOfLines={2}>
                    {document.title}
                  </Text>
                  <Text style={styles.documentDate}>
                    {formatDate(document.created_at)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Merged Document Title</Text>
            <Input
              placeholder="Enter title for merged document"
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
              editable={!isProcessing}
              testID="merge-title-input"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.infoBox}>
              <FileText size={20} color={Colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>What happens when you merge?</Text>
                <Text style={styles.infoText}>
                  • Documents will be combined in the order shown above{'\n'}
                  • OCR text from all documents will be preserved{'\n'}
                  • Original documents will be kept as individual pages{'\n'}
                  • You can split the merged document later if needed
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={isProcessing}
            testID="cancel-merge-button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.mergeButton,
              (!title.trim() || isProcessing) && styles.disabledButton
            ]}
            onPress={handleMerge}
            disabled={!title.trim() || isProcessing}
            testID="confirm-merge-button"
          >
            <Merge size={16} color={Colors.background} />
            <Text style={styles.mergeButtonText}>
              {isProcessing ? 'Merging...' : 'Merge Documents'}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
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
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  documentItem: {
    width: thumbnailSize,
    alignItems: 'center',
  },
  documentThumbnail: {
    position: 'relative',
    width: thumbnailSize,
    height: thumbnailSize * 0.75,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.gray[100],
    marginBottom: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  pageNumber: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  documentTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[900],
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  documentDate: {
    fontSize: 10,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  titleInput: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.blue[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.blue[200],
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.gray[700],
    lineHeight: 18,
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
  mergeButton: {
    backgroundColor: Colors.primary,
  },
  mergeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    opacity: 0.5,
  },
});