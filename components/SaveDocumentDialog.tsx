import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { X, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import SmartSuggestionsDialog from '@/components/SmartSuggestionsDialog';

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
  const [showSmartSuggestions, setShowSmartSuggestions] = useState<boolean>(false);

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
      onClose();
    }
  };

  const handleSmartSuggestions = () => {
    if (ocrText && ocrText.trim().length > 0) {
      setShowSmartSuggestions(true);
    } else {
      Alert.alert('No Content', 'No text content available for AI analysis.');
    }
  };

  const handleApplySuggestions = (suggestedTitle: string, suggestedTags: string[]) => {
    setTitle(suggestedTitle);
    setTags(suggestedTags);
    setShowSmartSuggestions(false);
  };

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
                    style={styles.smartButton}
                    onPress={handleSmartSuggestions}
                    disabled={saving || loading}
                  >
                    <Sparkles size={16} color={Colors.primary} />
                    <Text style={styles.smartButtonText}>AI Suggestions</Text>
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
                        <X size={12} color={Colors.gray[600]} />
                      </TouchableOpacity>
                    ))}
                  </View>
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
      
      <SmartSuggestionsDialog
        visible={showSmartSuggestions}
        onClose={() => setShowSmartSuggestions(false)}
        onApply={handleApplySuggestions}
        ocrText={ocrText}
        currentTitle={title}
        currentTags={tags}
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
});