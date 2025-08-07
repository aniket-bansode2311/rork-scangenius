import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { X, Sparkles, Plus } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { trpc } from '@/lib/trpc';

interface TagSuggestion {
  tag: string;
  confidence: number;
  reasoning: string;
}

interface CategorySuggestion {
  category: string;
  confidence: number;
  reasoning: string;
}

interface DocumentTagsDialogProps {
  visible: boolean;
  onClose: () => void;
  onApply: (tags: string[], category?: string) => void;
  ocrText?: string;
  receiptData?: any;
  currentTags?: string[];
  currentCategory?: string;
}

export function DocumentTagsDialog({
  visible,
  onClose,
  onApply,
  ocrText = '',
  receiptData,
  currentTags = [],
  currentCategory = ''
}: DocumentTagsDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);
  const [customTag, setCustomTag] = useState<string>('');
  const [suggestedTags, setSuggestedTags] = useState<TagSuggestion[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState<CategorySuggestion | null>(null);
  const [predefinedCategories, setPredefinedCategories] = useState<string[]>([]);
  const [commonTags, setCommonTags] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [documentType, setDocumentType] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [reasoning, setReasoning] = useState<string>('');

  const handleAISuggestion = useCallback(async () => {
    if (!ocrText || ocrText.trim().length === 0) {
      Alert.alert('No Content', 'No text content available for AI analysis.');
      return;
    }

    try {
      setLoading(true);
      console.log('Requesting AI tag suggestions for OCR text:', ocrText.substring(0, 100));
      
      const result = await trpc.ai.suggestTags.mutate({
        ocrText: ocrText.trim(),
        receiptData,
        currentTags: selectedTags
      });

      console.log('AI tag suggestion result:', result);

      if (result.success && result.suggestion) {
        setSuggestedTags(result.suggestion.tags);
        setSuggestedCategory(result.suggestion.category);
        setDocumentType(result.suggestion.documentType);
        setConfidence(result.suggestion.confidence);
        setReasoning(result.suggestion.reasoning);
        setPredefinedCategories(result.suggestion.predefinedCategories);
        setCommonTags(result.suggestion.commonTags);
      } else {
        Alert.alert('Error', result.error || 'Failed to generate tag suggestions');
      }
    } catch (error) {
      console.error('Error getting AI tag suggestions:', error);
      Alert.alert('Error', 'Failed to get AI suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [ocrText, receiptData, selectedTags]);

  useEffect(() => {
    if (visible && ocrText && ocrText.trim().length > 10) {
      handleAISuggestion();
    }
  }, [visible, ocrText, handleAISuggestion]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
      setCustomTag('');
    }
  };

  const handleApply = () => {
    onApply(selectedTags, selectedCategory);
    onClose();
  };

  const handleClose = () => {
    setSelectedTags(currentTags);
    setSelectedCategory(currentCategory);
    setCustomTag('');
    setSuggestedTags([]);
    setSuggestedCategory(null);
    onClose();
  };

  const renderTag = (tag: string, isSelected: boolean, confidence?: number, reasoning?: string) => (
    <TouchableOpacity
      key={tag}
      style={[styles.tag, isSelected && styles.selectedTag]}
      onPress={() => handleTagToggle(tag)}
    >
      <Text style={[styles.tagText, isSelected && styles.selectedTagText]}>
        {tag}
        {confidence && ` (${confidence}%)`}
      </Text>
    </TouchableOpacity>
  );

  const renderCategory = (category: string, isSelected: boolean) => (
    <TouchableOpacity
      key={category}
      style={[styles.categoryItem, isSelected && styles.selectedCategory]}
      onPress={() => setSelectedCategory(category)}
    >
      <Text style={[styles.categoryText, isSelected && styles.selectedCategoryText]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>Document Tags & Category</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <X size={20} color={Colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* AI Suggestions Section */}
            {ocrText && ocrText.trim().length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>AI Suggestions</Text>
                  <TouchableOpacity
                    style={[styles.aiButton, loading && styles.aiButtonDisabled]}
                    onPress={handleAISuggestion}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Sparkles size={16} color={Colors.primary} />
                    )}
                    <Text style={styles.aiButtonText}>
                      {loading ? 'Analyzing...' : 'Refresh AI'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {documentType && (
                  <View style={styles.aiInfo}>
                    <Text style={styles.aiInfoText}>
                      Detected: {documentType} (Confidence: {confidence}%)
                    </Text>
                    <Text style={styles.aiReasoningText}>{reasoning}</Text>
                  </View>
                )}

                {suggestedCategory && (
                  <View style={styles.suggestedCategorySection}>
                    <Text style={styles.subSectionTitle}>Suggested Category</Text>
                    <TouchableOpacity
                      style={[
                        styles.suggestedCategoryItem,
                        selectedCategory === suggestedCategory.category && styles.selectedCategory
                      ]}
                      onPress={() => setSelectedCategory(suggestedCategory.category)}
                    >
                      <Text style={[
                        styles.categoryText,
                        selectedCategory === suggestedCategory.category && styles.selectedCategoryText
                      ]}>
                        {suggestedCategory.category} ({suggestedCategory.confidence}%)
                      </Text>
                      <Text style={styles.categoryReasoningText}>
                        {suggestedCategory.reasoning}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {suggestedTags.length > 0 && (
                  <View style={styles.suggestedTagsSection}>
                    <Text style={styles.subSectionTitle}>Suggested Tags</Text>
                    <View style={styles.tagsContainer}>
                      {suggestedTags.map(tagSuggestion => 
                        renderTag(
                          tagSuggestion.tag, 
                          selectedTags.includes(tagSuggestion.tag),
                          tagSuggestion.confidence,
                          tagSuggestion.reasoning
                        )
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.categoriesContainer}>
                {predefinedCategories.length > 0 ? predefinedCategories.map(category =>
                  renderCategory(category, selectedCategory === category)
                ) : [
                  'invoice', 'receipt', 'contract', 'legal', 'medical', 'travel',
                  'personal', 'business', 'financial', 'insurance', 'tax',
                  'education', 'government', 'utility', 'other'
                ].map(category => renderCategory(category, selectedCategory === category))}
              </View>
            </View>

            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Selected Tags</Text>
                <View style={styles.tagsContainer}>
                  {selectedTags.map(tag => renderTag(tag, true))}
                </View>
              </View>
            )}

            {/* Common Tags */}
            {commonTags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Common Tags</Text>
                <View style={styles.tagsContainer}>
                  {commonTags.filter(tag => !selectedTags.includes(tag)).map(tag =>
                    renderTag(tag, false)
                  )}
                </View>
              </View>
            )}

            {/* Custom Tag Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add Custom Tag</Text>
              <View style={styles.customTagContainer}>
                <TextInput
                  style={styles.customTagInput}
                  value={customTag}
                  onChangeText={setCustomTag}
                  placeholder="Enter custom tag"
                  placeholderTextColor={Colors.gray[500]}
                  onSubmitEditing={handleAddCustomTag}
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={handleAddCustomTag}
                  disabled={!customTag.trim()}
                >
                  <Plus size={16} color={customTag.trim() ? Colors.primary : Colors.gray[400]} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              onPress={handleClose}
              style={[styles.button, styles.cancelButton]}
              textStyle={styles.cancelButtonText}
            />
            <Button
              title="Apply"
              onPress={handleApply}
              style={[styles.button, styles.applyButton]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dialog: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
    maxHeight: 500,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 4,
  },
  aiInfo: {
    backgroundColor: Colors.gray[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[800],
    marginBottom: 4,
  },
  aiReasoningText: {
    fontSize: 12,
    color: Colors.gray[600],
    lineHeight: 16,
  },
  suggestedCategorySection: {
    marginBottom: 16,
  },
  suggestedCategoryItem: {
    backgroundColor: Colors.gray[50],
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  suggestedTagsSection: {
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  selectedCategory: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  selectedCategoryText: {
    color: Colors.background,
  },
  categoryReasoningText: {
    fontSize: 10,
    color: Colors.gray[500],
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.gray[100],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  selectedTag: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  selectedTagText: {
    color: Colors.background,
  },
  customTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.gray[900],
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  addTagButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
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
  applyButton: {
    backgroundColor: Colors.primary,
  },
});