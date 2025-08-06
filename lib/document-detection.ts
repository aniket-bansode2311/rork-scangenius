import { Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface Point {
  x: number;
  y: number;
}

export interface DocumentBounds {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
  confidence: number;
}

export interface DetectionResult {
  bounds: DocumentBounds | null;
  isDocumentDetected: boolean;
  confidence: number;
}

// Edge detection using simple gradient analysis
class EdgeDetector {
  private imageData: Uint8ClampedArray | null = null;
  private width: number = 0;
  private height: number = 0;

  async loadImageData(uri: string): Promise<void> {
    try {
      // For now, we'll simulate image data loading
      // In a real implementation, you'd convert the image to pixel data
      this.width = 640;
      this.height = 480;
      this.imageData = new Uint8ClampedArray(this.width * this.height * 4);
      
      // Simulate some edge data
      for (let i = 0; i < this.imageData.length; i += 4) {
        this.imageData[i] = Math.random() * 255;     // R
        this.imageData[i + 1] = Math.random() * 255; // G
        this.imageData[i + 2] = Math.random() * 255; // B
        this.imageData[i + 3] = 255;                 // A
      }
    } catch (error) {
      console.error('Error loading image data:', error);
      throw error;
    }
  }

  private getPixel(x: number, y: number): number {
    if (!this.imageData || x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return 0;
    }
    const index = (y * this.width + x) * 4;
    // Convert to grayscale
    return (this.imageData[index] + this.imageData[index + 1] + this.imageData[index + 2]) / 3;
  }

  private sobelEdgeDetection(): number[][] {
    const edges: number[][] = [];
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < this.height - 1; y++) {
      edges[y] = [];
      for (let x = 1; x < this.width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = this.getPixel(x + kx, y + ky);
            gx += pixel * sobelX[ky + 1][kx + 1];
            gy += pixel * sobelY[ky + 1][kx + 1];
          }
        }
        
        edges[y][x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    
    return edges;
  }

  detectEdges(): Point[] {
    if (!this.imageData) return [];
    
    const edges = this.sobelEdgeDetection();
    const edgePoints: Point[] = [];
    const threshold = 50;
    
    for (let y = 0; y < edges.length; y++) {
      if (!edges[y]) continue;
      for (let x = 0; x < edges[y].length; x++) {
        if (edges[y][x] > threshold) {
          edgePoints.push({ x, y });
        }
      }
    }
    
    return edgePoints;
  }
}

// Hough Transform for line detection
class HoughTransform {
  private rhoResolution: number = 1;
  private thetaResolution: number = Math.PI / 180;
  private threshold: number = 50;

  detectLines(edgePoints: Point[]): Array<{ rho: number; theta: number; votes: number }> {
    const maxRho = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
    const rhoSteps = Math.ceil(2 * maxRho / this.rhoResolution);
    const thetaSteps = Math.ceil(Math.PI / this.thetaResolution);
    
    const accumulator: number[][] = Array(rhoSteps).fill(null).map(() => Array(thetaSteps).fill(0));
    
    // Vote for lines
    edgePoints.forEach(point => {
      for (let thetaIdx = 0; thetaIdx < thetaSteps; thetaIdx++) {
        const theta = thetaIdx * this.thetaResolution;
        const rho = point.x * Math.cos(theta) + point.y * Math.sin(theta);
        const rhoIdx = Math.round((rho + maxRho) / this.rhoResolution);
        
        if (rhoIdx >= 0 && rhoIdx < rhoSteps) {
          accumulator[rhoIdx][thetaIdx]++;
        }
      }
    });
    
    // Find peaks
    const lines: Array<{ rho: number; theta: number; votes: number }> = [];
    for (let rhoIdx = 0; rhoIdx < rhoSteps; rhoIdx++) {
      for (let thetaIdx = 0; thetaIdx < thetaSteps; thetaIdx++) {
        if (accumulator[rhoIdx][thetaIdx] > this.threshold) {
          const rho = (rhoIdx * this.rhoResolution) - maxRho;
          const theta = thetaIdx * this.thetaResolution;
          lines.push({ rho, theta, votes: accumulator[rhoIdx][thetaIdx] });
        }
      }
    }
    
    return lines.sort((a, b) => b.votes - a.votes).slice(0, 10);
  }
}

// Document contour detection
class DocumentDetector {
  private edgeDetector = new EdgeDetector();
  private houghTransform = new HoughTransform();

  async detectDocument(imageUri: string): Promise<DetectionResult> {
    try {
      console.log('Starting document detection for:', imageUri);
      
      // Load and process image
      await this.edgeDetector.loadImageData(imageUri);
      
      // Detect edges
      const edgePoints = this.edgeDetector.detectEdges();
      console.log('Detected edge points:', edgePoints.length);
      
      if (edgePoints.length < 100) {
        return {
          bounds: null,
          isDocumentDetected: false,
          confidence: 0
        };
      }
      
      // Detect lines using Hough Transform
      const lines = this.houghTransform.detectLines(edgePoints);
      console.log('Detected lines:', lines.length);
      
      if (lines.length < 4) {
        return this.getFallbackBounds();
      }
      
      // Find document corners from line intersections
      const corners = this.findDocumentCorners(lines);
      
      if (!corners) {
        return this.getFallbackBounds();
      }
      
      const confidence = this.calculateConfidence(lines, corners);
      
      return {
        bounds: corners,
        isDocumentDetected: confidence > 0.6,
        confidence
      };
    } catch (error) {
      console.error('Document detection error:', error);
      return this.getFallbackBounds();
    }
  }

  private findDocumentCorners(lines: Array<{ rho: number; theta: number; votes: number }>): DocumentBounds | null {
    // Group lines by orientation (horizontal vs vertical)
    const horizontalLines = lines.filter(line => 
      Math.abs(Math.sin(line.theta)) < 0.5 || Math.abs(Math.sin(line.theta)) > 0.866
    );
    const verticalLines = lines.filter(line => 
      Math.abs(Math.cos(line.theta)) < 0.5
    );
    
    if (horizontalLines.length < 2 || verticalLines.length < 2) {
      return null;
    }
    
    // Find intersections
    const intersections: Point[] = [];
    
    for (const hLine of horizontalLines.slice(0, 2)) {
      for (const vLine of verticalLines.slice(0, 2)) {
        const intersection = this.lineIntersection(hLine, vLine);
        if (intersection) {
          intersections.push(intersection);
        }
      }
    }
    
    if (intersections.length < 4) {
      return null;
    }
    
    // Sort intersections to form a quadrilateral
    const sortedCorners = this.sortCorners(intersections);
    
    return {
      topLeft: sortedCorners[0],
      topRight: sortedCorners[1],
      bottomLeft: sortedCorners[2],
      bottomRight: sortedCorners[3],
      confidence: 0.8
    };
  }

  private lineIntersection(
    line1: { rho: number; theta: number },
    line2: { rho: number; theta: number }
  ): Point | null {
    const cos1 = Math.cos(line1.theta);
    const sin1 = Math.sin(line1.theta);
    const cos2 = Math.cos(line2.theta);
    const sin2 = Math.sin(line2.theta);
    
    const det = cos1 * sin2 - sin1 * cos2;
    
    if (Math.abs(det) < 1e-10) {
      return null; // Lines are parallel
    }
    
    const x = (sin2 * line1.rho - sin1 * line2.rho) / det;
    const y = (cos1 * line2.rho - cos2 * line1.rho) / det;
    
    return { x, y };
  }

  private sortCorners(points: Point[]): Point[] {
    // Sort points to form a proper quadrilateral
    const center = points.reduce(
      (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
      { x: 0, y: 0 }
    );
    center.x /= points.length;
    center.y /= points.length;
    
    return points.sort((a, b) => {
      const angleA = Math.atan2(a.y - center.y, a.x - center.x);
      const angleB = Math.atan2(b.y - center.y, b.x - center.x);
      return angleA - angleB;
    });
  }

  private calculateConfidence(lines: any[], corners: DocumentBounds): number {
    // Calculate confidence based on line strength and corner positions
    const lineStrength = lines.reduce((sum, line) => sum + line.votes, 0) / lines.length;
    const normalizedStrength = Math.min(lineStrength / 100, 1);
    
    // Check if corners form a reasonable rectangle
    const area = this.calculateQuadrilateralArea(corners);
    const screenArea = screenWidth * screenHeight;
    const areaRatio = area / screenArea;
    
    // Prefer documents that take up a reasonable portion of the screen
    const areaScore = areaRatio > 0.1 && areaRatio < 0.8 ? 1 : 0.5;
    
    return (normalizedStrength * 0.7 + areaScore * 0.3);
  }

  private calculateQuadrilateralArea(bounds: DocumentBounds): number {
    // Shoelace formula for quadrilateral area
    const points = [bounds.topLeft, bounds.topRight, bounds.bottomRight, bounds.bottomLeft];
    let area = 0;
    
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  private getFallbackBounds(): DetectionResult {
    // Provide reasonable default bounds when detection fails
    const margin = screenWidth * 0.1;
    const aspectRatio = 1.4; // A4 ratio
    const width = screenWidth - (margin * 2);
    const height = width * aspectRatio;
    
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    
    return {
      bounds: {
        topLeft: { x: centerX - width/2, y: centerY - height/2 },
        topRight: { x: centerX + width/2, y: centerY - height/2 },
        bottomLeft: { x: centerX - width/2, y: centerY + height/2 },
        bottomRight: { x: centerX + width/2, y: centerY + height/2 },
        confidence: 0.3
      },
      isDocumentDetected: false,
      confidence: 0.3
    };
  }
}

// Image cropping utilities
export class ImageCropper {
  static async cropImageToBounds(
    imageUri: string,
    bounds: DocumentBounds,
    outputPath?: string
  ): Promise<string> {
    try {
      console.log('Cropping image to bounds:', bounds);
      
      // For now, we'll simulate the cropping process
      // In a real implementation, you'd use native image processing
      
      const fileName = `cropped_${Date.now()}.jpg`;
      const outputUri = outputPath || `${FileSystem.documentDirectory}${fileName}`;
      
      // Simulate cropping delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Copy original file as cropped (simulation)
      await FileSystem.copyAsync({
        from: imageUri,
        to: outputUri
      });
      
      console.log('Image cropped successfully:', outputUri);
      return outputUri;
    } catch (error) {
      console.error('Error cropping image:', error);
      throw error;
    }
  }

  static async applyPerspectiveCorrection(
    imageUri: string,
    bounds: DocumentBounds,
    outputPath?: string
  ): Promise<string> {
    try {
      console.log('Applying perspective correction:', bounds);
      
      // Simulate perspective correction
      const fileName = `corrected_${Date.now()}.jpg`;
      const outputUri = outputPath || `${FileSystem.documentDirectory}${fileName}`;
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await FileSystem.copyAsync({
        from: imageUri,
        to: outputUri
      });
      
      console.log('Perspective correction applied:', outputUri);
      return outputUri;
    } catch (error) {
      console.error('Error applying perspective correction:', error);
      throw error;
    }
  }
}

// Main document detection service
export const documentDetectionService = {
  detector: new DocumentDetector(),
  
  async detectDocumentInImage(imageUri: string): Promise<DetectionResult> {
    return await this.detector.detectDocument(imageUri);
  },
  
  async cropAndCorrectDocument(
    imageUri: string,
    bounds: DocumentBounds
  ): Promise<string> {
    const croppedUri = await ImageCropper.cropImageToBounds(imageUri, bounds);
    return await ImageCropper.applyPerspectiveCorrection(croppedUri, bounds);
  }
};

// Real-time detection utilities
export class RealTimeDetector {
  private isDetecting = false;
  private detectionInterval: NodeJS.Timeout | null = null;
  private lastDetectionTime = 0;
  private readonly DETECTION_THROTTLE = 1000; // Increased to 1000ms to reduce camera stress
  private consecutiveErrors = 0;
  private readonly MAX_CONSECUTIVE_ERRORS = 3;

  startRealTimeDetection(
    onDetection: (result: DetectionResult) => void,
    captureFrame: () => Promise<string | null>
  ): void {
    if (this.isDetecting) {
      console.log('Real-time detection already running');
      return;
    }
    
    this.isDetecting = true;
    this.consecutiveErrors = 0;
    console.log('Starting real-time document detection');
    
    this.detectionInterval = setInterval(async () => {
      if (!this.isDetecting) {
        return; // Stop if detection was disabled
      }
      
      const now = Date.now();
      if (now - this.lastDetectionTime < this.DETECTION_THROTTLE) {
        return;
      }
      
      try {
        const frameUri = await captureFrame();
        if (frameUri && this.isDetecting) {
          const result = await documentDetectionService.detectDocumentInImage(frameUri);
          if (this.isDetecting) { // Check again before calling callback
            onDetection(result);
            this.lastDetectionTime = now;
            this.consecutiveErrors = 0; // Reset error count on success
          }
        } else if (!frameUri) {
          this.consecutiveErrors++;
          if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
            console.log('Too many consecutive frame capture failures, stopping detection');
            this.stopRealTimeDetection();
          }
        }
      } catch (error) {
        this.consecutiveErrors++;
        
        // Only log non-camera errors
        if (!error.message?.includes('unmounted') && !error.message?.includes('Camera')) {
          console.error('Real-time detection error:', error);
        }
        
        // Stop detection if too many consecutive errors
        if (this.consecutiveErrors >= this.MAX_CONSECUTIVE_ERRORS) {
          console.log('Too many consecutive detection errors, stopping');
          this.stopRealTimeDetection();
        }
      }
    }, this.DETECTION_THROTTLE);
  }

  stopRealTimeDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.isDetecting = false;
    this.consecutiveErrors = 0;
    console.log('Stopped real-time document detection');
  }

  isRunning(): boolean {
    return this.isDetecting;
  }
}

export const realTimeDetector = new RealTimeDetector();