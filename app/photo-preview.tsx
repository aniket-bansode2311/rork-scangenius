import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { 
  X, 
  Check, 
  RotateCcw,
  Share,
  Download,
  Crop,
  RotateCw,
  Palette,
  Square,
  Maximize
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { SaveDocumentDialog } from '@/components/SaveDocumentDialog';
import { saveDocumentToDatabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { extractTextFromImage, isOCRConfigured } from '@/lib/ocr';
import { 
  documentDetectionService, 
  DocumentBounds, 
  Point,
  ImageProcessor 
} from '@/lib/document-detection';

type FilterType = 'original' | 'bw' | 'grayscale' | 'enhanced';
type ProcessingMode = 'preview' | 'crop' | 'rotate' | 'filter';

// Use types from document detection library
type CornerPoint = Point;
type CropBounds = DocumentBounds;

const { width: screenWidth } = Dimensions.get('window');

export default function PhotoPreviewScreen() {
  const { photoUri, originalUri, autoCropped } = useLocalSearchParams<{ 
    photoUri: string;
    originalUri?: string;
    autoCropped?: string;
  }>();
  const { user } = useAuth();
  const isAutoCropped = autoCropped === 'true';

  const [processingMode, setProcessingMode] = useState<ProcessingMode>('preview');
  const [currentFilter, setCurrentFilter] = useState<FilterType>('original');
  const [rotation, setRotation] = useState<number>(0);
  const [cropBounds, setCropBounds] = useState<CropBounds | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string>('');
  const [isPerformingOCR, setIsPerformingOCR] = useState<boolean>(false);
  const [perspectiveDistortion, setPerspectiveDistortion] = useState<number>(0);
  const [recommendedSettings, setRecommendedSettings] = useState<{
    enhanceContrast: boolean;
    sharpen: boolean;
    denoiseLevel: number;
  } | null>(null);

  const performOCR = useCallback(async () => {
    if (!photoUri) return;
    
    try {
      setIsPerformingOCR(true);
      console.log('Starting OCR processing...');
      
      const ocrConfigured = await isOCRConfigured();
      if (!ocrConfigured) {
        console.log('OCR not configured, skipping text extraction');
        return;
      }
      
      const result = await extractTextFromImage(photoUri);
      setOcrText(result.text);
      console.log('OCR completed, extracted text length:', result.text.length);
    } catch (error) {
      console.error('OCR processing failed:', error);
    } finally {
      setIsPerformingOCR(false);
    }
  }, [photoUri]);

  const detectDocumentBorders = useCallback(async () => {
    try {
      setIsProcessing(true);
      console.log('Detecting document borders with advanced algorithm...');
      
      // Use the enhanced document detection service
      const detectionResult = await documentDetectionService.detectDocumentInImage(photoUri);
      
      if (detectionResult.bounds) {
        setCropBounds(detectionResult.bounds);
        
        // Analyze document quality and get recommendations
        const qualityAnalysis = documentDetectionService.analyzeDocumentQuality(detectionResult.bounds);
        setPerspectiveDistortion(qualityAnalysis.perspectiveDistortion);
        setRecommendedSettings(qualityAnalysis.recommendedSettings);
        
        console.log('Document detection completed:', {
          confidence: detectionResult.confidence,
          perspectiveDistortion: qualityAnalysis.perspectiveDistortion,
          recommendedSettings: qualityAnalysis.recommendedSettings
        });
      } else {
        // Fallback to default bounds if detection fails
        const margin = 40;
        const fallbackBounds: CropBounds = {
          topLeft: { x: margin, y: margin },
          topRight: { x: screenWidth - margin - 40, y: margin },
          bottomLeft: { x: margin, y: 280 },
          bottomRight: { x: screenWidth - margin - 40, y: 280 },
          confidence: 0.3
        };
        setCropBounds(fallbackBounds);
        console.log('Using fallback bounds - detection failed');
      }
    } catch (error) {
      console.error('Error detecting borders:', error);
      // Set fallback bounds on error
      const margin = 40;
      const fallbackBounds: CropBounds = {
        topLeft: { x: margin, y: margin },
        topRight: { x: screenWidth - margin - 40, y: margin },
        bottomLeft: { x: margin, y: 280 },
        bottomRight: { x: screenWidth - margin - 40, y: 280 },
        confidence: 0.3
      };
      setCropBounds(fallbackBounds);
    } finally {
      setIsProcessing(false);
    }
  }, [photoUri]);

  useEffect(() => {
    if (photoUri) {
      detectDocumentBorders();
      performOCR();
    }
  }, [photoUri, detectDocumentBorders, performOCR]);

  if (!photoUri) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>No photo to preview</Text>
        <Button 
          title="Go Back" 
          onPress={() => router.back()}
          style={styles.errorButton}
        />
      </View>
    );
  }



  const applyPerspectiveCorrection = async () => {
    if (!cropBounds) {
      Alert.alert('Error', 'No document bounds detected');
      return;
    }
    
    try {
      setIsProcessing(true);
      console.log('Applying advanced perspective correction...');
      
      // Use the enhanced processing pipeline with recommended settings
      const processingOptions = recommendedSettings || {
        enhanceContrast: true,
        sharpen: true,
        denoiseLevel: 0.3
      };
      
      console.log('Processing with options:', processingOptions);
      console.log('Perspective distortion level:', perspectiveDistortion.toFixed(3));
      
      // Apply perspective correction using the advanced algorithm
      const correctedImageUri = await documentDetectionService.processDocumentWithPerspectiveCorrection(
        photoUri,
        cropBounds,
        {
          ...processingOptions,
          outputQuality: 0.95 // High quality for final output
        }
      );
      
      console.log('Perspective correction completed:', correctedImageUri);
      
      // Show success message with quality info
      const distortionLevel = perspectiveDistortion < 0.2 ? 'Low' : 
                            perspectiveDistortion < 0.4 ? 'Moderate' : 'High';
      
      Alert.alert(
        'Perspective Correction Applied!', 
        `Document processed successfully.\n\nDistortion level: ${distortionLevel}\nEnhancements applied: ${Object.entries(processingOptions).filter(([_, value]) => value === true).map(([key]) => key).join(', ')}`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error applying perspective correction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Perspective Correction Failed', `Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const rotateImage = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    console.log('Rotating image to:', newRotation);
  };

  const applyFilter = (filter: FilterType) => {
    setCurrentFilter(filter);
    console.log('Applying filter:', filter);
  };

  const resetCropBounds = () => {
    const margin = 40;
    const defaultBounds: CropBounds = {
      topLeft: { x: margin, y: margin },
      topRight: { x: screenWidth - margin - 40, y: margin },
      bottomLeft: { x: margin, y: 280 },
      bottomRight: { x: screenWidth - margin - 40, y: 280 },
      confidence: 0.5
    };
    
    setCropBounds(defaultBounds);
    setPerspectiveDistortion(0);
    setRecommendedSettings(null);
  };

  const handleRetake = () => {
    router.back();
  };

  const handleSave = () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save documents');
      return;
    }
    setShowSaveDialog(true);
  };

  const handleSaveDocument = async (title: string, tags: string[] = []) => {
    if (!user || !photoUri) {
      throw new Error('Missing user or photo data');
    }

    try {
      console.log('Processing and saving document:', {
        title,
        tags,
        uri: photoUri,
        filter: currentFilter,
        rotation,
        cropBounds,
        userId: user.id,
        ocrTextLength: ocrText.length
      });

      // Apply advanced processing pipeline
      let processedImageUri = photoUri;
      
      if (cropBounds) {
        console.log('Applying perspective correction and enhancements...');
        
        // Use recommended settings or defaults
        const processingOptions = recommendedSettings || {
          enhanceContrast: currentFilter === 'enhanced',
          sharpen: true,
          denoiseLevel: 0.3
        };
        
        // Apply perspective correction with quality optimization
        processedImageUri = await documentDetectionService.processDocumentWithPerspectiveCorrection(
          photoUri,
          cropBounds,
          {
            ...processingOptions,
            outputQuality: 0.95
          }
        );
        
        console.log('Advanced processing completed:', {
          originalUri: photoUri,
          processedUri: processedImageUri,
          perspectiveDistortion: perspectiveDistortion.toFixed(3),
          settings: processingOptions
        });
      }

      // Apply additional filters and rotation (simulated)
      if (currentFilter !== 'original' || rotation !== 0) {
        console.log(`Applying ${currentFilter} filter and ${rotation}° rotation...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Save to Supabase with OCR text, tags, and processing metadata
      const savedDocument = await saveDocumentToDatabase({
        title,
        imageUri: processedImageUri, // Use the processed image
        userId: user.id,
        ocrText: ocrText || undefined,
        tags: tags.length > 0 ? tags : undefined,
        metadata: {
          originalUri: photoUri,
          perspectiveDistortion: perspectiveDistortion,
          processingSettings: recommendedSettings,
          filter: currentFilter,
          rotation: rotation,
          autoCropped: isAutoCropped,
          confidence: cropBounds?.confidence || 0
        }
      });

      console.log('Document saved successfully:', savedDocument);
      
      Alert.alert(
        'Success!',
        'Your document has been processed and saved successfully.',
        [
          {
            text: 'View Documents',
            onPress: () => router.replace('/(tabs)/scans')
          },
          {
            text: 'Scan Another',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  };

  const handleShare = () => {
    Alert.alert('Share', 'Share functionality will be implemented here');
  };

  const handleDownload = () => {
    Alert.alert('Download', 'Download functionality will be implemented here');
  };



  const getFilterStyle = () => {
    switch (currentFilter) {
      case 'bw':
        return { tintColor: '#000000', opacity: 0.8 };
      case 'grayscale':
        return { opacity: 0.7 };
      case 'enhanced':
        return { opacity: 1 };
      default:
        return {};
    }
  };

  const renderProcessingTools = () => {
    switch (processingMode) {
      case 'crop':
        return (
          <View style={styles.toolsContainer}>
            <TouchableOpacity 
              style={styles.toolButton}
              onPress={resetCropBounds}
            >
              <Square size={20} color={Colors.background} />
              <Text style={styles.toolButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.toolButton,
                perspectiveDistortion > 0.3 && styles.toolButtonHighPriority
              ]}
              onPress={applyPerspectiveCorrection}
              disabled={isProcessing}
            >
              <Maximize size={20} color={Colors.background} />
              <Text style={styles.toolButtonText}>
                {isProcessing ? 'Processing...' : 'Correct'}
              </Text>
              {perspectiveDistortion > 0.3 && (
                <View style={styles.priorityIndicator} />
              )}
            </TouchableOpacity>
          </View>
        );
      case 'rotate':
        return (
          <View style={styles.toolsContainer}>
            <TouchableOpacity 
              style={styles.toolButton}
              onPress={rotateImage}
            >
              <RotateCw size={20} color={Colors.background} />
              <Text style={styles.toolButtonText}>Rotate 90°</Text>
            </TouchableOpacity>
            <Text style={styles.rotationText}>Current: {rotation}°</Text>
          </View>
        );
      case 'filter':
        return (
          <ScrollView 
            horizontal 
            style={styles.filtersContainer}
            showsHorizontalScrollIndicator={false}
          >
            {(['original', 'bw', 'grayscale', 'enhanced'] as FilterType[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  currentFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => applyFilter(filter)}
              >
                <Text style={[
                  styles.filterButtonText,
                  currentFilter === filter && styles.filterButtonTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleRetake}
          testID="close-button"
        >
          <X size={24} color={Colors.background} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {processingMode === 'preview' ? 'Preview' : 
             processingMode === 'crop' ? 'Crop & Correct' :
             processingMode === 'rotate' ? 'Rotate' : 'Filters'}
          </Text>
          {isAutoCropped && (
            <Text style={styles.headerSubtitle}>Auto-cropped document</Text>
          )}
          {perspectiveDistortion > 0 && processingMode === 'crop' && (
            <Text style={[
              styles.headerSubtitle,
              perspectiveDistortion > 0.3 ? styles.highDistortion : styles.lowDistortion
            ]}>
              Distortion: {perspectiveDistortion < 0.2 ? 'Low' : 
                         perspectiveDistortion < 0.4 ? 'Moderate' : 'High'}
            </Text>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleShare}
            testID="share-button"
          >
            <Share size={20} color={Colors.background} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleDownload}
            testID="download-button"
          >
            <Download size={20} color={Colors.background} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo Display */}
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: photoUri }}
            style={[
              styles.image,
              { transform: [{ rotate: `${rotation}deg` }] },
              getFilterStyle()
            ]}
            contentFit="contain"
            transition={200}
onLoad={() => {
              console.log('Image loaded successfully');
            }}
          />
          
          {/* Crop Overlay */}
          {processingMode === 'crop' && (
            <View style={styles.cropOverlay}>
              {/* Crop boundary lines */}
              <View style={styles.cropLines} />
              
              {/* Static crop corners for web compatibility */}
              {cropBounds && (
                <>
                  <View style={[
                    styles.cropCorner,
                    { left: cropBounds.topLeft.x, top: cropBounds.topLeft.y }
                  ]} />
                  <View style={[
                    styles.cropCorner,
                    { left: cropBounds.topRight.x, top: cropBounds.topRight.y }
                  ]} />
                  <View style={[
                    styles.cropCorner,
                    { left: cropBounds.bottomLeft.x, top: cropBounds.bottomLeft.y }
                  ]} />
                  <View style={[
                    styles.cropCorner,
                    { left: cropBounds.bottomRight.x, top: cropBounds.bottomRight.y }
                  ]} />
                </>
              )}
            </View>
          )}
          
          {/* Processing indicator */}
          {(isProcessing || isPerformingOCR) && (
            <View style={styles.processingOverlay}>
              <Text style={styles.processingText}>
                {isPerformingOCR ? 'Extracting text...' : 'Processing...'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Processing Tools */}
      {processingMode !== 'preview' && renderProcessingTools()}

      {/* Mode Selection */}
      <View style={styles.modeSelector}>
        <TouchableOpacity 
          style={[
            styles.modeButton,
            processingMode === 'preview' && styles.modeButtonActive
          ]}
          onPress={() => setProcessingMode('preview')}
        >
          <Text style={[
            styles.modeButtonText,
            processingMode === 'preview' && styles.modeButtonTextActive
          ]}>Preview</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.modeButton,
            processingMode === 'crop' && styles.modeButtonActive
          ]}
          onPress={() => setProcessingMode('crop')}
        >
          <Crop size={16} color={processingMode === 'crop' ? Colors.primary : Colors.gray[400]} />
          <Text style={[
            styles.modeButtonText,
            processingMode === 'crop' && styles.modeButtonTextActive
          ]}>Crop</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.modeButton,
            processingMode === 'rotate' && styles.modeButtonActive
          ]}
          onPress={() => setProcessingMode('rotate')}
        >
          <RotateCw size={16} color={processingMode === 'rotate' ? Colors.primary : Colors.gray[400]} />
          <Text style={[
            styles.modeButtonText,
            processingMode === 'rotate' && styles.modeButtonTextActive
          ]}>Rotate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.modeButton,
            processingMode === 'filter' && styles.modeButtonActive
          ]}
          onPress={() => setProcessingMode('filter')}
        >
          <Palette size={16} color={processingMode === 'filter' ? Colors.primary : Colors.gray[400]} />
          <Text style={[
            styles.modeButtonText,
            processingMode === 'filter' && styles.modeButtonTextActive
          ]}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={handleRetake}
          testID="retake-button"
        >
          <RotateCcw size={24} color={Colors.background} />
          <Text style={styles.controlButtonText}>Retake</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isProcessing}
          testID="save-button"
        >
          <View style={[
            styles.saveButtonInner,
            isProcessing && styles.saveButtonDisabled
          ]}>
            <Check size={28} color={Colors.background} />
          </View>
          <Text style={styles.saveButtonText}>
            {isProcessing ? 'Processing...' : 'Save'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.controlButton} />
      </View>

      {/* Save Document Dialog */}
      <SaveDocumentDialog
        visible={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveDocument}
        ocrText={ocrText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[900],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 18,
    color: Colors.gray[700],
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    width: '100%',
    maxWidth: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.background,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.success,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: Colors.gray[800],
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cropLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  cropCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.background,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  processingText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  toolsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    gap: 20,
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  toolButtonText: {
    color: Colors.background,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  rotationText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 60,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeButtonText: {
    color: Colors.gray[400],
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  controlButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  controlButtonText: {
    color: Colors.background,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  saveButton: {
    alignItems: 'center',
  },
  saveButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray[600],
    shadowColor: Colors.gray[600],
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  toolButtonHighPriority: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  priorityIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFC107',
  },
  highDistortion: {
    color: '#FF6B6B',
  },
  lowDistortion: {
    color: '#4ECDC4',
  },
});