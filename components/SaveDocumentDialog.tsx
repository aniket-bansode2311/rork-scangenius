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
import { X, Wand2 } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { trpc } from '@/lib/trpc';

interface SaveDocumentDialogProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, tags?: string[]) => Promise<void>;
  loading?: boolean;
  ocrText?: string;
  currentTags?: string[];
}

export function SaveDocumentDialog({
  visible,
  onClose,
  onSave,
  loading = false,
  ocrText = '',
  currentTags = []
}: SaveDocumentDialogProps) {
  const [title, setTitle] = useState<string>('');
  const [tags, setTags] = useState<string[]>(currentTags);
  const [saving, setSaving] = useState<boolean>(false);
  const [generatingSuggestion, setGeneratingSuggestion] = useState<boolean>(false);
  const [lastSuggestion, setLastSuggestion] = useState<{
    title: string;
    tags: string[];
    confidence: number;
    reasoning: string;
  } | null>(null);
  const [autoSuggestionAttempted, setAutoSuggestionAttempted] = useState<boolean>(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a document title');
      return;
    }

    try {
      setSaving(true);
      await onSave(title.trim(), tags);
      setTitle('');
      setTags([]);
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
      setLastSuggestion(null);
      setAutoSuggestionAttempted(false);
      onClose();
    }
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
              
              {tags.length > 0 && (
                <View style={styles.tagsSection}>
                  <Text style={styles.label}>Tags</Text>
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
                </View>
              )}
              
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
    backgroundColor: Colors.gray[50],
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
});