# Document Detection System

## Overview

The enhanced camera screen now includes real-time document border detection with automatic cropping capabilities. This system provides a professional document scanning experience with visual feedback and intelligent processing.

## Features

### Real-Time Document Detection
- **Live Border Detection**: Continuously analyzes camera feed to detect document boundaries
- **Visual Overlay**: Dynamic highlighting of detected document edges with confidence indicators
- **Smart Cropping**: Automatically crops images to detected document boundaries upon capture
- **Performance Optimized**: Throttled detection (500ms intervals) to maintain smooth camera performance

### Visual Feedback System
- **Detection Status Bar**: Shows current detection state with color-coded indicators
- **Confidence Meter**: Real-time confidence percentage with animated progress bar
- **Corner Markers**: Precise corner detection with animated visual markers
- **Pulse Animation**: Capture button pulses when high-confidence document is detected

### Auto-Detection Controls
- **Toggle Switch**: Enable/disable automatic detection
- **Manual Override**: Fallback to manual framing when auto-detection is disabled
- **Smart Capture**: Capture button changes color based on detection confidence

## Technical Implementation

### Core Components

#### 1. Document Detection Engine (`lib/document-detection.ts`)
```typescript
// Edge detection using Sobel operators
class EdgeDetector {
  private sobelEdgeDetection(): number[][]
  detectEdges(): Point[]
}

// Line detection using Hough Transform
class HoughTransform {
  detectLines(edgePoints: Point[]): Array<{ rho: number; theta: number; votes: number }>
}

// Main document detection service
class DocumentDetector {
  async detectDocument(imageUri: string): Promise<DetectionResult>
}
```

#### 2. Real-Time Processing (`RealTimeDetector`)
```typescript
class RealTimeDetector {
  startRealTimeDetection(
    onDetection: (result: DetectionResult) => void,
    captureFrame: () => Promise<string | null>
  ): void
  
  stopRealTimeDetection(): void
}
```

#### 3. Image Processing (`ImageCropper`)
```typescript
class ImageCropper {
  static async cropImageToBounds(
    imageUri: string,
    bounds: DocumentBounds,
    outputPath?: string
  ): Promise<string>
  
  static async applyPerspectiveCorrection(
    imageUri: string,
    bounds: DocumentBounds,
    outputPath?: string
  ): Promise<string>
}
```

### Detection Algorithm

1. **Edge Detection**: Uses Sobel operators to identify edges in the camera frame
2. **Line Detection**: Applies Hough Transform to find straight lines from edge points
3. **Corner Finding**: Calculates intersections of horizontal and vertical lines
4. **Confidence Scoring**: Evaluates detection quality based on line strength and geometry
5. **Boundary Validation**: Ensures detected bounds form a reasonable document shape

### Performance Optimizations

- **Throttled Processing**: 500ms intervals prevent excessive CPU usage
- **Low-Quality Frames**: Uses reduced quality for real-time analysis
- **Efficient Algorithms**: Optimized edge detection and line finding
- **Web Compatibility**: Fallback implementations for React Native Web

## User Interface

### Detection Status Indicators

#### Status Colors
- 🟢 **Green (>70% confidence)**: Document clearly detected, ready to capture
- 🟡 **Yellow (40-70% confidence)**: Document partially detected
- 🔴 **Red (<40% confidence)**: Searching for document or poor detection

#### Visual Elements
- **Status Bar**: Top overlay showing detection state and auto-detection toggle
- **Confidence Meter**: Bottom overlay with animated progress bar
- **Corner Markers**: Precise corner positions with color-coded confidence
- **Capture Button**: Changes color and pulses when document is well-detected

### Camera Controls

#### Enhanced Capture Button
```typescript
// Button states based on detection confidence
const captureButtonStyle = [
  styles.captureButton,
  isDocumentDetected && detectionConfidence > 0.7 && styles.captureButtonReady,
  isProcessing && styles.captureButtonProcessing
];
```

#### Auto-Detection Toggle
- **AUTO Button**: Toggle automatic detection on/off
- **Visual Feedback**: Color changes to indicate active state
- **Fallback Mode**: Manual framing when disabled

## Integration with Photo Preview

### Auto-Cropped Images
When a document is detected with high confidence (>60%), the system:

1. **Captures Original**: Takes full-resolution photo
2. **Applies Detection**: Uses detected bounds for cropping
3. **Perspective Correction**: Corrects document perspective distortion
4. **Passes to Preview**: Sends cropped image to photo-preview screen

### Preview Screen Enhancements
```typescript
// Photo preview receives auto-crop information
const { photoUri, originalUri, autoCropped } = useLocalSearchParams<{
  photoUri: string;
  originalUri?: string;
  autoCropped?: string;
}>();

// Shows auto-crop indicator in header
{isAutoCropped && (
  <Text style={styles.headerSubtitle}>Auto-cropped document</Text>
)}
```

## Error Handling & Fallbacks

### Detection Failures
- **Graceful Degradation**: Falls back to manual framing
- **Error Recovery**: Continues operation even if detection fails
- **User Feedback**: Clear status messages for all states

### Web Compatibility
- **Platform Checks**: Conditional rendering for web-specific limitations
- **Fallback UI**: Manual framing when advanced features unavailable
- **Performance Considerations**: Optimized for both mobile and web

## Configuration Options

### Detection Parameters
```typescript
// Adjustable detection settings
const DETECTION_THROTTLE = 500; // ms between detections
const CONFIDENCE_THRESHOLD = 0.6; // Auto-crop threshold
const EDGE_THRESHOLD = 50; // Edge detection sensitivity
```

### Visual Customization
```typescript
// Customizable UI elements
const getDetectionStatusColor = () => {
  if (detectionConfidence > 0.7) return Colors.success;
  if (detectionConfidence > 0.4) return Colors.warning;
  return Colors.error;
};
```

## Future Enhancements

### Planned Improvements
1. **ML-Based Detection**: Integration with TensorFlow Lite for improved accuracy
2. **Multi-Document Support**: Detection of multiple documents in single frame
3. **Document Type Recognition**: Automatic classification (receipt, business card, etc.)
4. **Advanced Perspective Correction**: More sophisticated geometric transformations
5. **Batch Processing**: Multiple document capture in sequence

### Performance Optimizations
1. **Native Module Integration**: Custom native modules for intensive processing
2. **GPU Acceleration**: Leverage device GPU for image processing
3. **Background Processing**: Move detection to background thread
4. **Caching System**: Cache detection results for similar frames

## Usage Examples

### Basic Implementation
```typescript
// Start real-time detection
useEffect(() => {
  if (permission?.granted && autoDetectionEnabled) {
    realTimeDetector.startRealTimeDetection(handleDetectionResult, captureFrame);
  }
  
  return () => {
    realTimeDetector.stopRealTimeDetection();
  };
}, [permission?.granted, autoDetectionEnabled]);

// Handle detection results
const handleDetectionResult = useCallback((result: DetectionResult) => {
  setDetectedBounds(result.bounds);
  setIsDocumentDetected(result.isDocumentDetected);
  setDetectionConfidence(result.confidence);
}, []);
```

### Custom Detection Processing
```typescript
// Process captured image with detected bounds
if (detectedBounds && isDocumentDetected && detectionConfidence > 0.6) {
  const croppedUri = await documentDetectionService.cropAndCorrectDocument(
    photo.uri,
    detectedBounds
  );
  
  // Navigate to preview with cropped image
  router.push({
    pathname: '/photo-preview',
    params: { 
      photoUri: croppedUri,
      originalUri: photo.uri,
      autoCropped: 'true'
    }
  });
}
```

## Testing & Validation

### Test Scenarios
1. **Various Document Types**: Test with different paper sizes and orientations
2. **Lighting Conditions**: Validate performance in various lighting
3. **Background Complexity**: Test with cluttered backgrounds
4. **Edge Cases**: Handle partial documents, multiple objects
5. **Performance Testing**: Measure frame rates and battery usage

### Quality Metrics
- **Detection Accuracy**: Percentage of correctly identified documents
- **False Positive Rate**: Incorrect detections per session
- **Processing Speed**: Average detection time per frame
- **User Satisfaction**: Subjective usability testing results

This document detection system provides a professional, intelligent document scanning experience that rivals dedicated scanning apps while maintaining excellent performance and user experience across all supported platforms.