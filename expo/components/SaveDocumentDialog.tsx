import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { X, Wand2, Tags, Settings } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { trpc } from '@/lib/trpc';
import { DocumentTagsDialog } from '@/components/DocumentTagsDialog';
import { CompressionOptionsDialog } from '@/components/CompressionOptionsDialog';
import { CompressionLevel, compressionUtils } from '@/lib/image-compression';

interface SaveDocumentDialogProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, tags?: string[], category?: string, compressionLevel?: CompressionLevel) => Promise<void>;
  loading?: boolean;
  ocrText?: string;
  receiptData?: any;
  currentTags?: string[];
  currentCategory?: string;
  imageUri?: string;
  originalFileSize?: number;
}

export function SaveDocumentDialog({
  visible,
  onClose,
  onSave,
  loading = false,
  ocrText = '',
  receiptData,
  currentTags = [],
  currentCategory = '',
  imageUri,
  originalFileSize = 0
}: SaveDocumentDialogProps) {
  const [title, setTitle] = useState<string>('');
  const [tags, setTags] = useState<string[]>(currentTags);
  const [category, setCategory] = useState<string>(currentCategory);
  const [saving, setSaving] = useState<boolean>(false);
  const [showTagsDialog, setShowTagsDialog] = useState<boolean>(false);
  const [showCompressionDialog, setShowCompressionDialog] = useState<boolean>(false);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium');
  const [compressionApplied, setCompressionApplied] = useState<boolean>(false);
  const [generatingSuggestion, setGeneratingSuggestion] = useState<boolean>(false);
  const [lastSuggestion, setLastSuggestion] = useState<{
    title: string;
    tags: string[];
    confidence: number;
    reasoning: string;
  } | null>(null);
  const [autoSuggestionAttempted, setAutoSuggestionAttempted] = useState<boolean>(false);

  const handleAISuggestion = useCallback(async () => {
    if (!ocrText || ocrText.trim().length === 0) {
      Alert.alert('No Content', 'No text content available for AI analysis.');
      return;
    }

    if (ocrText.trim().length < 10) {
      Alert.alert('Insufficient Content', 'Need more text content for accurate AI suggestions.');
      return;
    }

    try {
      setGeneratingSuggestion(true);
      console.log('Requesting AI title suggestion for OCR text:', ocrText.substring(0, 100));
      
      const result = await trpc.ai.suggestTitle.mutate({
        ocrText: ocrText.trim(),
      });

      console.log('AI suggestion result:', result);

      if (result.suggestion) {
        setLastSuggestion(result.suggestion);
        
        // Show confirmation dialog with the suggestion
        Alert.alert(
          'AI Suggestion',
          `Title: "${result.suggestion.title}"\n\nTags: ${result.suggestion.tags.join(', ')}\n\nConfidence: ${result.suggestion.confidence}%\n\n${result.suggestion.reasoning}`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Apply',
              onPress: () => {
                setTitle(result.suggestion.title);
                setTags(result.suggestion.tags);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate suggestion');
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      Alert.alert('Error', 'Failed to get AI suggestion. Please try again.');
    } finally {
      setGeneratingSuggestion(false);
    }
  }, [ocrText]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a document title');
      return;
    }

    try {
      setSaving(true);
      await onSave(title.trim(), tags, category, compressionLevel);
      setTitle('');
      setTags([]);
      setCategory('');
      setCompressionLevel('medium');
      setCompressionApplied(false);
      onClose();
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving && !loading) {
      setTitle('');
      setTags([]);
      setCategory('');
      setLastSuggestion(null);
      setAutoSuggestionAttempted(false);
      setCompressionLevel('medium');
      setCompressionApplied(false);
      onClose();
    }
  };

  const handleTagsApply = (newTags: string[], newCategory?: string) => {
    setTags(newTags);
    if (newCategory) {
      setCategory(newCategory);
    }
  };

  const handleCompressionApply = (level: CompressionLevel) => {
    setCompressionLevel(level);
    setCompressionApplied(true);
    setShowCompressionDialog(false);
  };

  const getCompressionLevelLabel = (level: CompressionLevel): string => {
    return level.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };



  // Auto-suggest title when dialog opens with OCR text
  useEffect(() => {
    if (visible && ocrText && ocrText.trim().length > 20 && !autoSuggestionAttempted && !title) {
      setAutoSuggestionAttempted(true);
      // Delay to allow dialog to fully open
      const timer = setTimeout(() => {
        handleAISuggestion();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, ocrText, autoSuggestionAttempted, title, handleAISuggestion]);



  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity 
            style={styles.dialog}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Save Document</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
                disabled={saving || loading}
              >
                <X size={20} color={Colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.titleSection}>
                <Text style={styles.label}>Document Title</Text>
                {ocrText && ocrText.trim().length > 0 && (
                  <TouchableOpacity
                    style={[styles.smartButton, generatingSuggestion && styles.smartButtonDisabled]}
                    onPress={handleAISuggestion}
                    disabled={saving || loading || generatingSuggestion}
                  >
                    {generatingSuggestion ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Wand2 size={16} color={Colors.primary} />
                    )}
                    <Text style={styles.smartButtonText}>
                      {generatingSuggestion ? 'Analyzing...' : 'AI Suggest'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Enter document title"
                style={styles.input}
                autoFocus
                editable={!saving && !loading}
                testID="document-title-input"
              />
              
              <View style={styles.tagsSection}>
                <View style={styles.tagsSectionHeader}>
                  <Text style={styles.label}>Tags & Category</Text>
                  <TouchableOpacity
                    style={styles.tagsButton}
                    onPress={() => setShowTagsDialog(true)}
                    disabled={saving || loading}
                  >
                    <Tags size={16} color={Colors.primary} />
                    <Text style={styles.tagsButtonText}>Manage Tags</Text>
                  </TouchableOpacity>
                </View>
                
                {category && (
                  <View style={styles.categoryDisplay}>
                    <Text style={styles.categoryLabel}>Category:</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{category}</Text>
                    </View>
                  </View>
                )}
                
                {tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {tags.map((tag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.tag}
                        onPress={() => handleRemoveTag(tag)}
                        disabled={saving || loading}
                      >
                        <Text style={styles.tagText}>{tag}</Text>
                        <X size={12} color={Colors.background} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.compressionSection}>
                <View style={styles.compressionSectionHeader}>
                  <Text style={styles.label}>Image Compression</Text>
                  <TouchableOpacity
                    style={styles.compressionButton}
                    onPress={() => setShowCompressionDialog(true)}
                    disabled={saving || loading}
                  >
                    <Settings size={16} color={Colors.primary} />
                    <Text style={styles.compressionButtonText}>Options</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.compressionInfo}>
                  <View style={styles.compressionRow}>
                    <Text style={styles.compressionLabel}>Level:</Text>
                    <Text style={styles.compressionValue}>
                      {getCompressionLevelLabel(compressionLevel)}
                    </Text>
                  </View>
                  
                  {originalFileSize > 0 && (
                    <View style={styles.compressionRow}>
                      <Text style={styles.compressionLabel}>Original Size:</Text>
                      <Text style={styles.compressionValue}>
                        {compressionUtils.formatFileSize(originalFileSize)}
                      </Text>
                    </View>
                  )}
                  
                  {originalFileSize > 0 && (
                    <View style={styles.compressionRow}>
                      <Text style={styles.compressionLabel}>Estimated Size:</Text>
                      <Text style={[styles.compressionValue, styles.estimatedSize]}>
                        {compressionUtils.formatFileSize(
                          compressionUtils.estimateSize(originalFileSize, compressionLevel).size
                        )}
                        <Text style={styles.spaceSaved}>
                          {' '}(-{(compressionUtils.estimateSize(originalFileSize, compressionLevel).reduction * 100).toFixed(0)}%)
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              {lastSuggestion && (
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionLabel}>Last AI Suggestion</Text>
                  <Text style={styles.suggestionText}>
                    Confidence: {lastSuggestion.confidence}% • {lastSuggestion.reasoning}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <Button
                title="Cancel"
                onPress={handleClose}
                style={[styles.button, styles.cancelButton]}
                textStyle={styles.cancelButtonText}
                disabled={saving || loading}
                testID="cancel-button"
              />
              <Button
                title={saving || loading ? 'Saving...' : 'Save'}
                onPress={handleSave}
                style={[styles.button, styles.saveButton]}
                disabled={saving || loading || !title.trim()}
                testID="save-button"
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
      
      <DocumentTagsDialog
        visible={showTagsDialog}
        onClose={() => setShowTagsDialog(false)}
        onApply={handleTagsApply}
        ocrText={ocrText}
        receiptData={receiptData}
        currentTags={tags}
        currentCategory={category}
      />
      
      <CompressionOptionsDialog
        visible={showCompressionDialog}
        onClose={() => setShowCompressionDialog(false)}
        onApply={handleCompressionApply}
        originalFileSize={originalFileSize}
        loading={saving || loading}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.gray[100],
    borderColor: Colors.gray[300],
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: Colors.gray[100],
  },
  cancelButtonText: {
    color: Colors.gray[700],
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  smartButtonDisabled: {
    opacity: 0.6,
  },
  smartButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  tagsSection: {
    marginTop: 16,
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tagsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[600],
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.background,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  suggestionInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 11,
    color: Colors.gray[600],
    lineHeight: 16,
  },
  compressionSection: {
    marginTop: 16,
  },
  compressionSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compressionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  compressionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  compressionInfo: {
    backgroundColor: Colors.gray[100],
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  compressionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compressionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[600],
  },
  compressionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  estimatedSize: {
    color: Colors.green[600],
  },
  spaceSaved: {
    fontSize: 11,
    color: Colors.green[500],
    fontWeight: '500',
  },
});