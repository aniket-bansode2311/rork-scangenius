import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { X, Check, Sparkles, Tag, Edit3, Plus } from 'lucide-react-native';
import { AIOrganizationResult, analyzeDocumentContent } from '@/lib/ai-organization';

interface SmartSuggestionsDialogProps {
  visible: boolean;
  onClose: () => void;
  onApply: (title: string, tags: string[]) => void;
  ocrText: string;
  currentTitle: string;
  currentTags?: string[];
}

export default function SmartSuggestionsDialog({
  visible,
  onClose,
  onApply,
  ocrText,
  currentTitle,
  currentTags = [],
}: SmartSuggestionsDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<AIOrganizationResult | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>('');
  const [error, setError] = useState<string>('');

  const analyzDocument = useCallback(async () => {
    if (!ocrText || ocrText.trim().length === 0) {
      setError('No text content available for analysis');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const result = await analyzeDocumentContent({
        text: ocrText,
        currentTitle,
      });

      setSuggestions(result);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setError('Failed to analyze document. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [ocrText, currentTitle]);

  useEffect(() => {
    if (visible && ocrText) {
      analyzDocument();
    }
  }, [visible, ocrText, analyzDocument]);

  useEffect(() => {
    if (suggestions) {
      setEditedTitle(suggestions.suggestedTitle);
      setEditedTags(suggestions.suggestedTags);
    }
  }, [suggestions]);



  const handleAddTag = () => {
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !editedTags.includes(trimmedTag)) {
      setEditedTags([...editedTags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
  };

  const handleApply = () => {
    if (!editedTitle.trim()) {
      Alert.alert('Error', 'Please provide a title for the document');
      return;
    }

    onApply(editedTitle.trim(), editedTags);
    onClose();
  };

  const handleClose = () => {
    setSuggestions(null);
    setEditedTitle('');
    setEditedTags([]);
    setNewTag('');
    setError('');
    onClose();
  };

  const confidenceColor = suggestions?.confidence 
    ? suggestions.confidence > 0.7 ? '#10B981' 
    : suggestions.confidence > 0.4 ? '#F59E0B' 
    : '#EF4444'
    : '#6B7280';

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
            <Sparkles size={24} color="#8B5CF6" />
            <Text style={styles.headerTitle}>Smart Suggestions</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isAnalyzing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Analyzing document content...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={analyzDocument} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : suggestions ? (
            <>
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>AI Confidence:</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
                  <Text style={styles.confidenceText}>
                    {Math.round(suggestions.confidence * 100)}%
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Edit3 size={20} color="#374151" />
                  <Text style={styles.sectionTitle}>Document Title</Text>
                </View>
                <TextInput
                  style={styles.titleInput}
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  placeholder="Enter document title"
                  multiline
                />
                <Text style={styles.currentLabel}>Current: {currentTitle}</Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Tag size={20} color="#374151" />
                  <Text style={styles.sectionTitle}>Tags</Text>
                </View>
                
                <View style={styles.tagsContainer}>
                  {editedTags.map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.tag}
                      onPress={() => handleRemoveTag(tag)}
                    >
                      <Text style={styles.tagText}>{tag}</Text>
                      <X size={14} color="#6B7280" />
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.addTagContainer}>
                  <TextInput
                    style={styles.tagInput}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Add new tag"
                    onSubmitEditing={handleAddTag}
                  />
                  <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                    <Plus size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>

                {currentTags.length > 0 && (
                  <>
                    <Text style={styles.currentLabel}>Current tags:</Text>
                    <View style={styles.currentTagsContainer}>
                      {currentTags.map((tag, index) => (
                        <View key={index} style={styles.currentTag}>
                          <Text style={styles.currentTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>

        {suggestions && !isAnalyzing && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  confidenceLabel: {
    fontSize: 16,
    color: '#374151',
    marginRight: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 44,
    textAlignVertical: 'top',
  },
  currentLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 4,
  },
  addTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginRight: 8,
  },
  addTagButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  currentTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  currentTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  currentTagText: {
    color: '#6B7280',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});