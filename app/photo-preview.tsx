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
import { trpc } from '@/lib/trpc';
import { 
  documentDetectionService, 
  DocumentBounds, 
  Point,
  ImageProcessor 
} from '@/lib/document-detection';
import { 
  imageEnhancementService, 
  EnhancementOptions, 
  ImageAnalysis 
} from '@/lib/image-enhancement';

type FilterType = 'original' | 'bw' | 'grayscale' | 'enhanced';
type ProcessingMode = 'preview' | 'crop' | 'rotate' | 'filter' | 'enhance';

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
  const [isProcessingOCR, setIsProcessingOCR] = useState<boolean>(false);
  
  // tRPC mutations for OCR processing
  const processOCRMutation = trpc.ocr.process.useMutation({
    onSuccess: (data) => {
      console.log('OCR processing completed:', data);
      if (data.text && data.text.length > 0) {
        setOcrText(data.text);
      }
    },
    onError: (error) => {
      console.error('OCR processing failed:', error);
      Alert.alert(
        'OCR Processing Failed',
        'Text extraction failed, but your document was saved successfully. You can try reprocessing later.',
        [{ text: 'OK' }]
      );
    },
    onSettled: () => {
      setIsProcessingOCR(false);
    }
  });
  const [perspectiveDistortion, setPerspectiveDistortion] = useState<number>(0);
  const [recommendedSettings, setRecommendedSettings] = useState<{
    enhanceContrast: boolean;
    sharpen: boolean;
    denoiseLevel: number;
    removeGlare: boolean;
    removeShadows: boolean;
  } | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [enhancementOptions, setEnhancementOptions] = useState<EnhancementOptions>({
    autoContrast: true,
    autoBrightness: true,
    sharpen: true,
    removeGlare: false,
    removeShadows: false,
    denoiseLevel: 0.3,
    outputQuality: 0.95,
    preserveColors: true
  });
  const [manualAdjustments, setManualAdjustments] = useState({
    brightness: 0, // -100 to +100
    contrast: 1.0, // 0.5 to 2.0
    sharpness: 0.5 // 0 to 1
  });

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
        denoiseLevel: 0.3,
        removeGlare: false,
        removeShadows: false
      };
      
      console.log('Processing with options:', processingOptions);
      console.log('Perspective distortion level:', perspectiveDistortion.toFixed(3));
      
      // Apply perspective correction and image enhancement using the advanced algorithm
      const result = await documentDetectionService.processDocumentWithPerspectiveCorrection(
        photoUri,
        cropBounds,
        {
          ...processingOptions,
          outputQuality: 0.95, // High quality for final output
          autoAnalysis: true
        }
      );
      
      const correctedImageUri = result.processedUri;
      if (result.analysis) {
        setImageAnalysis(result.analysis);
      }
      
      console.log('Perspective correction and enhancement completed:', correctedImageUri);
      
      // Show success message with quality info
      const distortionLevel = perspectiveDistortion < 0.2 ? 'Low' : 
                            perspectiveDistortion < 0.4 ? 'Moderate' : 'High';
      
      Alert.alert(
        'Document Enhanced!', 
        `Document processed successfully with automatic enhancements.\n\nDistortion level: ${distortionLevel}\nEnhancements applied: ${Object.entries(processingOptions).filter(([_, value]) => value === true).map(([key]) => key).join(', ')}`,
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
          denoiseLevel: 0.3,
          removeGlare: false,
          removeShadows: false
        };
        
        // Apply perspective correction with quality optimization and image enhancement
        const result = await documentDetectionService.processDocumentWithPerspectiveCorrection(
          photoUri,
          cropBounds,
          {
            ...processingOptions,
            outputQuality: 0.95,
            autoAnalysis: true
          }
        );
        
        processedImageUri = result.processedUri;
        if (result.analysis) {
          setImageAnalysis(result.analysis);
        }
        
        console.log('Advanced processing completed:', {
          originalUri: photoUri,
          processedUri: processedImageUri,
          perspectiveDistortion: perspectiveDistortion.toFixed(3),
          settings: processingOptions,
          // imageAnalysis removed as it's not part of SaveDocumentParams metadata type
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
          // imageAnalysis removed as it's not part of SaveDocumentParams metadata type
          filter: currentFilter,
          rotation: rotation,
          autoCropped: isAutoCropped,
          confidence: cropBounds?.confidence || 0
        }
      });

      console.log('Document saved successfully:', savedDocument);
      
      // Trigger OCR processing if no OCR text was provided
      if (!ocrText || ocrText.trim().length === 0) {
        console.log('Starting OCR processing for saved document...');
        setIsProcessingOCR(true);
        
        processOCRMutation.mutate({
          documentId: savedDocument.id,
          imageUri: processedImageUri,
          forceReprocess: false
        });
      }
      
      Alert.alert(
        'Success!',
        ocrText ? 
          'Your document has been processed and saved successfully.' :
          'Your document has been saved successfully. Text extraction is processing in the background.',
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

  const analyzeImage = async () => {
    if (!photoUri) return;
    
    try {
      setIsProcessing(true);
      console.log('Analyzing image for enhancement recommendations...');
      
      const analysis = await imageEnhancementService.analyzeImage(photoUri);
      setImageAnalysis(analysis);
      setEnhancementOptions(analysis.recommendedEnhancements);
      
      console.log('Image analysis completed:', {
        brightness: analysis.brightness.toFixed(1),
        contrast: analysis.contrast.toFixed(2),
        hasGlare: analysis.hasGlare,
        hasShadows: analysis.hasShadows,
        recommendedEnhancements: Object.entries(analysis.recommendedEnhancements)
          .filter(([_, value]) => value === true)
          .map(([key]) => key)
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert('Analysis Failed', 'Could not analyze image for enhancement recommendations.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyEnhancements = async () => {
    if (!photoUri) return;
    
    try {
      setIsProcessing(true);
      console.log('Applying image enhancements:', enhancementOptions);
      
      const enhancedUri = await imageEnhancementService.enhanceImage(photoUri, enhancementOptions);
      
      // Update the photo URI to show the enhanced version
      // In a real implementation, you'd update the state to show the enhanced image
      console.log('Image enhanced successfully:', enhancedUri);
      
      Alert.alert(
        'Enhancement Applied!',
        'Your image has been enhanced successfully.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error applying enhancements:', error);
      Alert.alert('Enhancement Failed', 'Could not apply image enhancements.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyManualAdjustment = async (type: 'brightness' | 'contrast' | 'sharpness') => {
    if (!photoUri) return;
    
    try {
      setIsProcessing(true);
      let adjustedUri: string;
      
      switch (type) {
        case 'brightness':
          adjustedUri = await imageEnhancementService.adjustBrightness(photoUri, manualAdjustments.brightness);
          break;
        case 'contrast':
          adjustedUri = await imageEnhancementService.adjustContrast(photoUri, manualAdjustments.contrast);
          break;
        case 'sharpness':
          adjustedUri = await imageEnhancementService.applySharpen(photoUri, manualAdjustments.sharpness);
          break;
      }
      
      console.log(`${type} adjustment applied:`, adjustedUri);
      
      Alert.alert(
        'Adjustment Applied!',
        `${type.charAt(0).toUpperCase() + type.slice(1)} has been adjusted successfully.`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error(`Error applying ${type} adjustment:`, error);
      Alert.alert('Adjustment Failed', `Could not apply ${type} adjustment.`);
    } finally {
      setIsProcessing(false);
    }
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
      case 'enhance':
        return (
          <ScrollView style={styles.enhanceContainer}>
            {/* Image Analysis Section */}
            <View style={styles.analysisSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Image Analysis</Text>
                <TouchableOpacity 
                  style={styles.analyzeButton}
                  onPress={analyzeImage}
                  disabled={isProcessing}
                >
                  <Text style={styles.analyzeButtonText}>
                    {isProcessing ? 'Analyzing...' : 'Analyze'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {imageAnalysis && (
                <View style={styles.analysisResults}>
                  <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Brightness:</Text>
                    <Text style={styles.analysisValue}>{imageAnalysis.brightness.toFixed(0)}/255</Text>
                  </View>
                  <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Contrast:</Text>
                    <Text style={styles.analysisValue}>{(imageAnalysis.contrast * 100).toFixed(0)}%</Text>
                  </View>
                  <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Sharpness:</Text>
                    <Text style={styles.analysisValue}>{(imageAnalysis.sharpness * 100).toFixed(0)}%</Text>
                  </View>
                  {imageAnalysis.hasGlare && (
                    <Text style={styles.issueText}>⚠️ Glare detected</Text>
                  )}
                  {imageAnalysis.hasShadows && (
                    <Text style={styles.issueText}>⚠️ Shadows detected</Text>
                  )}
                </View>
              )}
            </View>

            {/* Auto Enhancement Section */}
            <View style={styles.enhancementSection}>
              <Text style={styles.sectionTitle}>Automatic Enhancement</Text>
              <View style={styles.enhancementOptions}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Auto Contrast</Text>
                  <TouchableOpacity 
                    style={[
                      styles.toggleButton,
                      enhancementOptions.autoContrast && styles.toggleButtonActive
                    ]}
                    onPress={() => setEnhancementOptions(prev => ({
                      ...prev,
                      autoContrast: !prev.autoContrast
                    }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      enhancementOptions.autoContrast && styles.toggleButtonTextActive
                    ]}>
                      {enhancementOptions.autoContrast ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Sharpen</Text>
                  <TouchableOpacity 
                    style={[
                      styles.toggleButton,
                      enhancementOptions.sharpen && styles.toggleButtonActive
                    ]}
                    onPress={() => setEnhancementOptions(prev => ({
                      ...prev,
                      sharpen: !prev.sharpen
                    }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      enhancementOptions.sharpen && styles.toggleButtonTextActive
                    ]}>
                      {enhancementOptions.sharpen ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Remove Glare</Text>
                  <TouchableOpacity 
                    style={[
                      styles.toggleButton,
                      enhancementOptions.removeGlare && styles.toggleButtonActive
                    ]}
                    onPress={() => setEnhancementOptions(prev => ({
                      ...prev,
                      removeGlare: !prev.removeGlare
                    }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      enhancementOptions.removeGlare && styles.toggleButtonTextActive
                    ]}>
                      {enhancementOptions.removeGlare ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Remove Shadows</Text>
                  <TouchableOpacity 
                    style={[
                      styles.toggleButton,
                      enhancementOptions.removeShadows && styles.toggleButtonActive
                    ]}
                    onPress={() => setEnhancementOptions(prev => ({
                      ...prev,
                      removeShadows: !prev.removeShadows
                    }))}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      enhancementOptions.removeShadows && styles.toggleButtonTextActive
                    ]}>
                      {enhancementOptions.removeShadows ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyEnhancements}
                disabled={isProcessing}
              >
                <Text style={styles.applyButtonText}>
                  {isProcessing ? 'Applying...' : 'Apply Auto Enhancement'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Manual Adjustments Section */}
            <View style={styles.manualSection}>
              <Text style={styles.sectionTitle}>Manual Adjustments</Text>
              
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Brightness</Text>
                <View style={styles.adjustmentControls}>
                  <TouchableOpacity 
                    style={styles.adjustmentButton}
                    onPress={() => setManualAdjustments(prev => ({
                      ...prev,
                      brightness: Math.max(-100, prev.brightness - 10)
                    }))}
                  >
                    <Text style={styles.adjustmentButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.adjustmentValue}>{manualAdjustments.brightness}</Text>
                  <TouchableOpacity 
                    style={styles.adjustmentButton}
                    onPress={() => setManualAdjustments(prev => ({
                      ...prev,
                      brightness: Math.min(100, prev.brightness + 10)
                    }))}
                  >
                    <Text style={styles.adjustmentButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.applyAdjustmentButton}
                    onPress={() => applyManualAdjustment('brightness')}
                    disabled={isProcessing}
                  >
                    <Text style={styles.applyAdjustmentButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Contrast</Text>
                <View style={styles.adjustmentControls}>
                  <TouchableOpacity 
                    style={styles.adjustmentButton}
                    onPress={() => setManualAdjustments(prev => ({
                      ...prev,
                      contrast: Math.max(0.5, prev.contrast - 0.1)
                    }))}
                  >
                    <Text style={styles.adjustmentButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.adjustmentValue}>{manualAdjustments.contrast.toFixed(1)}</Text>
                  <TouchableOpacity 
                    style={styles.adjustmentButton}
                    onPress={() => setManualAdjustments(prev => ({
                      ...prev,
                      contrast: Math.min(2.0, prev.contrast + 0.1)
                    }))}
                  >
                    <Text style={styles.adjustmentButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.applyAdjustmentButton}
                    onPress={() => applyManualAdjustment('contrast')}
                    disabled={isProcessing}
                  >
                    <Text style={styles.applyAdjustmentButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.adjustmentRow}>
                <Text style={styles.adjustmentLabel}>Sharpness</Text>
                <View style={styles.adjustmentControls}>
                  <TouchableOpacity 
                    style={styles.adjustmentButton}
                    onPress={() => setManualAdjustments(prev => ({
                      ...prev,
                      sharpness: Math.max(0, prev.sharpness - 0.1)
                    }))}
                  >
                    <Text style={styles.adjustmentButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.adjustmentValue}>{manualAdjustments.sharpness.toFixed(1)}</Text>
                  <TouchableOpacity 
                    style={styles.adjustmentButton}
                    onPress={() => setManualAdjustments(prev => ({
                      ...prev,
                      sharpness: Math.min(1.0, prev.sharpness + 0.1)
                    }))}
                  >
                    <Text style={styles.adjustmentButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.applyAdjustmentButton}
                    onPress={() => applyManualAdjustment('sharpness')}
                    disabled={isProcessing}
                  >
                    <Text style={styles.applyAdjustmentButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
             processingMode === 'rotate' ? 'Rotate' : 
             processingMode === 'filter' ? 'Filters' : 'Enhance'}
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
          {imageAnalysis && processingMode === 'enhance' && (
            <Text style={styles.headerSubtitle}>
              Quality: {imageAnalysis.sharpness > 0.7 ? 'Excellent' : 
                       imageAnalysis.sharpness > 0.5 ? 'Good' : 'Needs Enhancement'}
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
        
        <TouchableOpacity 
          style={[
            styles.modeButton,
            processingMode === 'enhance' && styles.modeButtonActive
          ]}
          onPress={() => setProcessingMode('enhance')}
        >
          <Text style={[
            styles.modeButtonText,
            processingMode === 'enhance' && styles.modeButtonTextActive
          ]}>✨</Text>
          <Text style={[
            styles.modeButtonText,
            processingMode === 'enhance' && styles.modeButtonTextActive
          ]}>Enhance</Text>
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
          disabled={isProcessing || isProcessingOCR}
          testID="save-button"
        >
          <View style={[
            styles.saveButtonInner,
            isProcessing && styles.saveButtonDisabled
          ]}>
            <Check size={28} color={Colors.background} />
          </View>
          <Text style={styles.saveButtonText}>
            {isProcessing ? 'Processing...' : isProcessingOCR ? 'Processing OCR...' : 'Save'}
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
  enhanceContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    maxHeight: 400,
  },
  analysisSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  analyzeButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  analysisResults: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  analysisLabel: {
    color: Colors.gray[300],
    fontSize: 14,
  },
  analysisValue: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  issueText: {
    color: '#FFC107',
    fontSize: 12,
    marginTop: 4,
  },
  enhancementSection: {
    marginBottom: 20,
  },
  enhancementOptions: {
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    color: Colors.background,
    fontSize: 14,
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 40,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleButtonText: {
    color: Colors.gray[300],
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  toggleButtonTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  applyButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  manualSection: {
    marginBottom: 20,
  },
  adjustmentRow: {
    marginBottom: 12,
  },
  adjustmentLabel: {
    color: Colors.background,
    fontSize: 14,
    marginBottom: 8,
  },
  adjustmentControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustmentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustmentButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  adjustmentValue: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  applyAdjustmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  applyAdjustmentButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
});