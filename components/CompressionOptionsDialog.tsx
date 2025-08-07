import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { X, Zap, BarChart3, FileImage } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { 
  CompressionLevel, 
  compressionUtils,
  imageCompressionService 
} from '@/lib/image-compression';

interface CompressionOptionsDialogProps {
  visible: boolean;
  onClose: () => void;
  onApply: (level: CompressionLevel) => void;
  originalFileSize?: number;
  loading?: boolean;
}

export function CompressionOptionsDialog({
  visible,
  onClose,
  onApply,
  originalFileSize = 0,
  loading = false
}: CompressionOptionsDialogProps) {
  const [selectedLevel, setSelectedLevel] = useState<CompressionLevel>('medium');
  const [estimatedSizes, setEstimatedSizes] = useState<Record<CompressionLevel, {
    size: number;
    reduction: number;
  }>>({
    'high-quality': { size: 0, reduction: 0 },
    'medium': { size: 0, reduction: 0 },
    'small-file': { size: 0, reduction: 0 }
  });

  const compressionLevels = compressionUtils.getCompressionLevels();

  // Calculate estimated sizes when dialog opens or file size changes
  useEffect(() => {
    if (originalFileSize > 0) {
      const estimates: typeof estimatedSizes = {
        'high-quality': compressionUtils.estimateSize(originalFileSize, 'high-quality'),
        'medium': compressionUtils.estimateSize(originalFileSize, 'medium'),
        'small-file': compressionUtils.estimateSize(originalFileSize, 'small-file')
      };
      setEstimatedSizes(estimates);
    }
  }, [originalFileSize]);

  const handleApply = () => {
    onApply(selectedLevel);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getIconForLevel = (level: CompressionLevel) => {
    switch (level) {
      case 'high-quality':
        return <FileImage size={20} color={Colors.primary} />;
      case 'medium':
        return <BarChart3 size={20} color={Colors.primary} />;
      case 'small-file':
        return <Zap size={20} color={Colors.primary} />;
    }
  };

  const getRecommendationText = (level: CompressionLevel) => {
    switch (level) {
      case 'high-quality':
        return 'Best for archival and professional documents';
      case 'medium':
        return 'Recommended for most documents';
      case 'small-file':
        return 'Best for sharing and storage efficiency';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
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
              <Text style={styles.title}>Compression Options</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
                disabled={loading}
              >
                <X size={20} color={Colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.description}>
                Choose the compression level that best fits your needs. Higher compression reduces file size but may affect image quality.
              </Text>

              {originalFileSize > 0 && (
                <View style={styles.originalSizeInfo}>
                  <Text style={styles.originalSizeLabel}>Original Size:</Text>
                  <Text style={styles.originalSizeValue}>
                    {compressionUtils.formatFileSize(originalFileSize)}
                  </Text>
                </View>
              )}

              <View style={styles.optionsContainer}>
                {compressionLevels.map((option) => {
                  const isSelected = selectedLevel === option.value;
                  const estimate = estimatedSizes[option.value];
                  
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected
                      ]}
                      onPress={() => setSelectedLevel(option.value)}
                      disabled={loading}
                    >
                      <View style={styles.optionHeader}>
                        <View style={styles.optionTitleRow}>
                          {getIconForLevel(option.value)}
                          <Text style={[
                            styles.optionTitle,
                            isSelected && styles.optionTitleSelected
                          ]}>
                            {option.label}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <View style={styles.selectedDot} />
                          </View>
                        )}
                      </View>
                      
                      <Text style={[
                        styles.optionDescription,
                        isSelected && styles.optionDescriptionSelected
                      ]}>
                        {option.description}
                      </Text>
                      
                      <Text style={styles.optionSpecs}>
                        {option.estimatedSize}
                      </Text>
                      
                      <Text style={styles.optionRecommendation}>
                        {getRecommendationText(option.value)}
                      </Text>

                      {originalFileSize > 0 && (
                        <View style={styles.estimateContainer}>
                          <View style={styles.estimateRow}>
                            <Text style={styles.estimateLabel}>Estimated Size:</Text>
                            <Text style={styles.estimateValue}>
                              {compressionUtils.formatFileSize(estimate.size)}
                            </Text>
                          </View>
                          <View style={styles.estimateRow}>
                            <Text style={styles.estimateLabel}>Space Saved:</Text>
                            <Text style={[
                              styles.estimateValue,
                              styles.spaceSavedValue
                            ]}>
                              {(estimate.reduction * 100).toFixed(0)}% 
                              ({compressionUtils.formatFileSize(originalFileSize - estimate.size)})
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>💡 Compression Tips</Text>
                <Text style={styles.infoText}>
                  • High Quality: Minimal compression, best for important documents{'\n'}
                  • Medium: Good balance of quality and file size{'\n'}
                  • Small File: Maximum compression, ideal for sharing
                </Text>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Button
                title="Cancel"
                onPress={handleClose}
                style={[styles.button, styles.cancelButton]}
                textStyle={styles.cancelButtonText}
                disabled={loading}
                testID="cancel-compression-button"
              />
              <Button
                title={loading ? 'Compressing...' : 'Apply'}
                onPress={handleApply}
                style={[styles.button, styles.applyButton]}
                disabled={loading}
                testID="apply-compression-button"
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
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
  description: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 20,
    marginBottom: 16,
  },
  originalSizeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  originalSizeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  originalSizeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 2,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.background,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.gray[600],
    marginBottom: 6,
  },
  optionDescriptionSelected: {
    color: Colors.gray[700],
  },
  optionSpecs: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 6,
  },
  optionRecommendation: {
    fontSize: 12,
    color: Colors.primary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  estimateContainer: {
    backgroundColor: Colors.gray[100],
    padding: 10,
    borderRadius: 6,
    gap: 4,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimateLabel: {
    fontSize: 12,
    color: Colors.gray[600],
  },
  estimateValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[800],
  },
  spaceSavedValue: {
    color: Colors.green[600],
  },
  infoBox: {
    backgroundColor: Colors.blue[50],
    borderLeftWidth: 3,
    borderLeftColor: Colors.blue[400],
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.blue[800],
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: Colors.blue[700],
    lineHeight: 16,
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
  applyButton: {
    backgroundColor: Colors.primary,
  },
});