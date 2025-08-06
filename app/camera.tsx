import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { 
  X, 
  Camera, 
  RotateCcw, 
  Zap, 
  ZapOff,
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/Button';
import { 
  DocumentBounds, 
  DetectionResult, 
  realTimeDetector, 
  documentDetectionService,
} from '@/lib/document-detection';

const { width: screenWidth } = Dimensions.get('window');

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [detectedBounds, setDetectedBounds] = useState<DocumentBounds | null>(null);
  const [isDocumentDetected, setIsDocumentDetected] = useState<boolean>(false);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState<boolean>(true);
  
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const confidenceAnim = useRef(new Animated.Value(0)).current;

  // Real-time document detection
  const handleDetectionResult = useCallback((result: DetectionResult) => {
    setDetectedBounds(result.bounds);
    setIsDocumentDetected(result.isDocumentDetected);
    setDetectionConfidence(result.confidence);
    
    // Animate confidence indicator
    Animated.timing(confidenceAnim, {
      toValue: result.confidence,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    // Pulse animation for detected documents
    if (result.isDocumentDetected && result.confidence > 0.7) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [confidenceAnim, pulseAnim]);
  
  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!cameraRef.current || isProcessing) return null;
    
    try {
      // For real-time detection, we'd capture a low-quality frame
      // This is a simulation - in practice you'd use a different method
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3,
        base64: false,
        skipProcessing: true,
      });
      return photo?.uri || null;
    } catch (error) {
      console.error('Error capturing frame:', error);
      return null;
    }
  }, [isProcessing]);
  
  useEffect(() => {
    if (permission?.granted && autoDetectionEnabled) {
      realTimeDetector.startRealTimeDetection(handleDetectionResult, captureFrame);
    }
    
    return () => {
      realTimeDetector.stopRealTimeDetection();
    };
  }, [permission?.granted, autoDetectionEnabled, handleDetectionResult, captureFrame]);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          ScanGenius needs access to your camera to scan documents
        </Text>
        <Button 
          title="Grant Permission" 
          onPress={requestPermission}
          style={styles.permissionButton}
        />
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };
  
  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsProcessing(true);
      console.log('Taking picture...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      
      if (photo) {
        console.log('Photo taken:', photo.uri);
        
        // If we have detected bounds, crop the image automatically
        if (detectedBounds && isDocumentDetected && detectionConfidence > 0.6) {
          console.log('Auto-cropping detected document...');
          try {
            const croppedUri = await documentDetectionService.cropAndCorrectDocument(
              photo.uri,
              detectedBounds
            );
            
            router.push({
              pathname: '/photo-preview',
              params: { 
                photoUri: croppedUri,
                originalUri: photo.uri,
                autoCropped: 'true'
              }
            });
          } catch (cropError) {
            console.error('Auto-crop failed, using original:', cropError);
            router.push({
              pathname: '/photo-preview',
              params: { photoUri: photo.uri }
            });
          }
        } else {
          router.push({
            pathname: '/photo-preview',
            params: { photoUri: photo.uri }
          });
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    realTimeDetector.stopRealTimeDetection();
    router.back();
  };
  
  const toggleAutoDetection = () => {
    setAutoDetectionEnabled(!autoDetectionEnabled);
    if (!autoDetectionEnabled) {
      realTimeDetector.startRealTimeDetection(handleDetectionResult, captureFrame);
    } else {
      realTimeDetector.stopRealTimeDetection();
      setDetectedBounds(null);
      setIsDocumentDetected(false);
      setDetectionConfidence(0);
    }
  };
  
  const getDetectionStatusColor = () => {
    if (detectionConfidence > 0.7) return Colors.success;
    if (detectionConfidence > 0.4) return Colors.warning;
    return Colors.error;
  };
  
  const getDetectionStatusText = () => {
    if (!autoDetectionEnabled) return 'Auto-detection disabled';
    if (detectionConfidence > 0.7) return 'Document detected - ready to capture';
    if (detectionConfidence > 0.4) return 'Document partially detected';
    if (detectionConfidence > 0.1) return 'Searching for document...';
    return 'Position document in frame';
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      >
        {/* Header Controls */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleClose}
            testID="close-button"
          >
            <X size={24} color={Colors.background} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scan Document</Text>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={toggleFlash}
            testID="flash-button"
          >
            {flash === 'on' ? (
              <Zap size={24} color={Colors.background} />
            ) : (
              <ZapOff size={24} color={Colors.background} />
            )}
          </TouchableOpacity>
        </View>

        {/* Document Detection Overlay */}
        <View style={styles.overlay}>
          {/* Detection Status */}
          <View style={styles.detectionStatus}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: getDetectionStatusColor() }
            ]}>
              {isDocumentDetected ? (
                <CheckCircle size={16} color={Colors.background} />
              ) : detectionConfidence > 0.1 ? (
                <Target size={16} color={Colors.background} />
              ) : (
                <AlertCircle size={16} color={Colors.background} />
              )}
            </View>
            <Text style={styles.statusText}>
              {getDetectionStatusText()}
            </Text>
            <TouchableOpacity 
              style={styles.autoDetectToggle}
              onPress={toggleAutoDetection}
            >
              <Text style={[
                styles.autoDetectText,
                { color: autoDetectionEnabled ? Colors.primary : Colors.gray[400] }
              ]}>
                AUTO
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Document Bounds Overlay */}
          {detectedBounds && autoDetectionEnabled ? (
            <Animated.View 
              style={[
                styles.detectedBounds,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              {/* Draw detected document outline */}
              <View style={[
                styles.boundingBox,
                {
                  borderColor: getDetectionStatusColor(),
                  borderWidth: isDocumentDetected ? 3 : 2,
                  opacity: detectionConfidence
                }
              ]} />
              
              {/* Corner indicators */}
              <View style={[
                styles.detectedCorner,
                {
                  left: detectedBounds.topLeft.x - 10,
                  top: detectedBounds.topLeft.y - 10,
                  backgroundColor: getDetectionStatusColor()
                }
              ]} />
              <View style={[
                styles.detectedCorner,
                {
                  left: detectedBounds.topRight.x - 10,
                  top: detectedBounds.topRight.y - 10,
                  backgroundColor: getDetectionStatusColor()
                }
              ]} />
              <View style={[
                styles.detectedCorner,
                {
                  left: detectedBounds.bottomLeft.x - 10,
                  top: detectedBounds.bottomLeft.y - 10,
                  backgroundColor: getDetectionStatusColor()
                }
              ]} />
              <View style={[
                styles.detectedCorner,
                {
                  left: detectedBounds.bottomRight.x - 10,
                  top: detectedBounds.bottomRight.y - 10,
                  backgroundColor: getDetectionStatusColor()
                }
              ]} />
            </Animated.View>
          ) : (
            // Fallback frame when no detection
            <View style={styles.frameContainer}>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          )}
          
          {/* Confidence Meter */}
          {autoDetectionEnabled && detectionConfidence > 0 && (
            <View style={styles.confidenceMeter}>
              <Text style={styles.confidenceLabel}>Detection Confidence</Text>
              <View style={styles.confidenceBar}>
                <Animated.View style={[
                  styles.confidenceFill,
                  {
                    width: confidenceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: getDetectionStatusColor()
                  }
                ]} />
              </View>
              <Text style={styles.confidenceValue}>
                {Math.round(detectionConfidence * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={toggleCameraFacing}
            testID="flip-camera-button"
          >
            <RotateCcw size={24} color={Colors.background} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.captureButton,
              isDocumentDetected && detectionConfidence > 0.7 && styles.captureButtonReady,
              isProcessing && styles.captureButtonProcessing
            ]}
            onPress={takePicture}
            disabled={isProcessing}
            testID="capture-button"
          >
            <Animated.View style={[
              styles.captureButtonInner,
              { transform: [{ scale: isDocumentDetected ? pulseAnim : 1 }] }
            ]}>
              {isProcessing ? (
                <Text style={styles.processingText}>...</Text>
              ) : (
                <Camera size={32} color={Colors.background} />
              )}
            </Animated.View>
          </TouchableOpacity>
          
          <View style={styles.controlButton} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[900],
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[800],
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 16,
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    alignItems: 'center',
  },
  frame: {
    width: screenWidth * 0.8,
    height: screenWidth * 0.8 * 1.4, // A4 ratio
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.background,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonReady: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  captureButtonProcessing: {
    backgroundColor: Colors.gray[600],
    shadowColor: Colors.gray[600],
  },
  processingText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  detectionStatus: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusText: {
    flex: 1,
    color: Colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  autoDetectToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  autoDetectText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  detectedBounds: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  boundingBox: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    bottom: '30%',
    borderStyle: 'solid',
    borderRadius: 8,
  },
  detectedCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  confidenceMeter: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  confidenceLabel: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  confidenceBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
});