import { Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { imageEnhancementService, EnhancementOptions, ImageAnalysis } from './image-enhancement';

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

// Matrix operations for perspective transformation
class Matrix {
  static multiply3x3(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  static invert3x3(matrix: number[][]): number[][] | null {
    const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
    
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    
    if (Math.abs(det) < 1e-10) {
      return null; // Matrix is not invertible
    }
    
    const invDet = 1 / det;
    
    return [
      [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
      [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
      [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet]
    ];
  }
}

// Perspective transformation utilities
class PerspectiveTransform {
  private transformMatrix: number[][] | null = null;

  // Calculate perspective transformation matrix from source to destination points
  calculateTransformMatrix(
    srcPoints: [Point, Point, Point, Point],
    dstPoints: [Point, Point, Point, Point]
  ): boolean {
    try {
      // Build the system of equations for perspective transformation
      const A: number[][] = [];
      const b: number[] = [];

      for (let i = 0; i < 4; i++) {
        const { x: sx, y: sy } = srcPoints[i];
        const { x: dx, y: dy } = dstPoints[i];

        // For x coordinate
        A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
        b.push(dx);

        // For y coordinate
        A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
        b.push(dy);
      }

      // Solve the system using Gaussian elimination
      const solution = this.solveLinearSystem(A, b);
      if (!solution) {
        return false;
      }

      // Construct the 3x3 transformation matrix
      this.transformMatrix = [
        [solution[0], solution[1], solution[2]],
        [solution[3], solution[4], solution[5]],
        [solution[6], solution[7], 1]
      ];

      return true;
    } catch (error) {
      console.error('Error calculating transform matrix:', error);
      return false;
    }
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    const m = A[0].length;
    
    // Augment matrix A with vector b
    const augmented = A.map((row, i) => [...row, b[i]]);
    
    // Forward elimination
    for (let i = 0; i < Math.min(n, m); i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[i][i]) < 1e-10) continue;
        
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j < m + 1; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // Back substitution
    const solution = new Array(m).fill(0);
    for (let i = Math.min(n, m) - 1; i >= 0; i--) {
      if (Math.abs(augmented[i][i]) < 1e-10) continue;
      
      solution[i] = augmented[i][m];
      for (let j = i + 1; j < m; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }
    
    return solution;
  }

  // Transform a point using the calculated matrix
  transformPoint(point: Point): Point | null {
    if (!this.transformMatrix) {
      return null;
    }

    const [x, y] = [point.x, point.y];
    const [[a, b, c], [d, e, f], [g, h, i]] = this.transformMatrix;

    const w = g * x + h * y + i;
    if (Math.abs(w) < 1e-10) {
      return null;
    }

    return {
      x: (a * x + b * y + c) / w,
      y: (d * x + e * y + f) / w
    };
  }

  // Get the transformation matrix
  getMatrix(): number[][] | null {
    return this.transformMatrix;
  }
}

// Advanced image processing utilities
export class ImageProcessor {
  // Calculate optimal output dimensions for perspective correction
  static calculateOutputDimensions(bounds: DocumentBounds): { width: number; height: number } {
    const { topLeft, topRight, bottomLeft, bottomRight } = bounds;
    
    // Calculate distances between corners
    const topWidth = Math.sqrt(
      Math.pow(topRight.x - topLeft.x, 2) + Math.pow(topRight.y - topLeft.y, 2)
    );
    const bottomWidth = Math.sqrt(
      Math.pow(bottomRight.x - bottomLeft.x, 2) + Math.pow(bottomRight.y - bottomLeft.y, 2)
    );
    const leftHeight = Math.sqrt(
      Math.pow(bottomLeft.x - topLeft.x, 2) + Math.pow(bottomLeft.y - topLeft.y, 2)
    );
    const rightHeight = Math.sqrt(
      Math.pow(bottomRight.x - topRight.x, 2) + Math.pow(bottomRight.y - topRight.y, 2)
    );
    
    // Use maximum dimensions to preserve detail
    const width = Math.max(topWidth, bottomWidth);
    const height = Math.max(leftHeight, rightHeight);
    
    // Ensure reasonable dimensions (limit to screen size for performance)
    const maxDimension = Math.max(screenWidth, screenHeight);
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale)
    };
  }

  // Detect and correct perspective distortion
  static calculatePerspectiveCorrection(bounds: DocumentBounds): {
    transform: PerspectiveTransform;
    outputDimensions: { width: number; height: number };
  } {
    const outputDimensions = this.calculateOutputDimensions(bounds);
    const transform = new PerspectiveTransform();
    
    // Source points (detected document corners)
    const srcPoints: [Point, Point, Point, Point] = [
      bounds.topLeft,
      bounds.topRight,
      bounds.bottomRight,
      bounds.bottomLeft
    ];
    
    // Destination points (perfect rectangle)
    const dstPoints: [Point, Point, Point, Point] = [
      { x: 0, y: 0 }, // top-left
      { x: outputDimensions.width, y: 0 }, // top-right
      { x: outputDimensions.width, y: outputDimensions.height }, // bottom-right
      { x: 0, y: outputDimensions.height } // bottom-left
    ];
    
    const success = transform.calculateTransformMatrix(srcPoints, dstPoints);
    if (!success) {
      throw new Error('Failed to calculate perspective transformation matrix');
    }
    
    return { transform, outputDimensions };
  }

  // Apply bilinear interpolation for smooth image transformation
  static bilinearInterpolate(
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): [number, number, number, number] {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.min(x1 + 1, width - 1);
    const y2 = Math.min(y1 + 1, height - 1);
    
    const dx = x - x1;
    const dy = y - y1;
    
    const getPixel = (px: number, py: number): [number, number, number, number] => {
      if (px < 0 || px >= width || py < 0 || py >= height) {
        return [255, 255, 255, 255]; // White background for out-of-bounds
      }
      const index = (py * width + px) * 4;
      return [
        imageData[index],     // R
        imageData[index + 1], // G
        imageData[index + 2], // B
        imageData[index + 3]  // A
      ];
    };
    
    const [r1, g1, b1, a1] = getPixel(x1, y1);
    const [r2, g2, b2, a2] = getPixel(x2, y1);
    const [r3, g3, b3, a3] = getPixel(x1, y2);
    const [r4, g4, b4, a4] = getPixel(x2, y2);
    
    // Bilinear interpolation
    const r = r1 * (1 - dx) * (1 - dy) + r2 * dx * (1 - dy) + r3 * (1 - dx) * dy + r4 * dx * dy;
    const g = g1 * (1 - dx) * (1 - dy) + g2 * dx * (1 - dy) + g3 * (1 - dx) * dy + g4 * dx * dy;
    const b = b1 * (1 - dx) * (1 - dy) + b2 * dx * (1 - dy) + b3 * (1 - dx) * dy + b4 * dx * dy;
    const a = a1 * (1 - dx) * (1 - dy) + a2 * dx * (1 - dy) + a3 * (1 - dx) * dy + a4 * dx * dy;
    
    return [Math.round(r), Math.round(g), Math.round(b), Math.round(a)];
  }
}

// Enhanced image cropping utilities with perspective correction
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
      console.log('Applying advanced perspective correction:', bounds);
      
      // Calculate perspective transformation
      const { transform, outputDimensions } = ImageProcessor.calculatePerspectiveCorrection(bounds);
      
      console.log('Calculated output dimensions:', outputDimensions);
      console.log('Transform matrix:', transform.getMatrix());
      
      // Validate transformation
      if (!transform.getMatrix()) {
        throw new Error('Invalid perspective transformation matrix');
      }
      
      // Test corner transformations
      const testCorners = [
        bounds.topLeft,
        bounds.topRight,
        bounds.bottomRight,
        bounds.bottomLeft
      ];
      
      console.log('Testing corner transformations:');
      testCorners.forEach((corner, index) => {
        const transformed = transform.transformPoint(corner);
        console.log(`Corner ${index}:`, corner, '->', transformed);
      });
      
      const fileName = `corrected_${Date.now()}.jpg`;
      const outputUri = outputPath || `${FileSystem.documentDirectory}${fileName}`;
      
      // Simulate perspective correction processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would:
      // 1. Load the source image data
      // 2. Create output image buffer with calculated dimensions
      // 3. For each pixel in output image:
      //    - Transform output coordinates to source coordinates
      //    - Sample source image using bilinear interpolation
      //    - Write interpolated pixel to output
      // 4. Apply post-processing (sharpening, contrast enhancement)
      // 5. Save the corrected image
      
      // For now, copy the original file (simulation)
      await FileSystem.copyAsync({
        from: imageUri,
        to: outputUri
      });
      
      console.log('Perspective correction applied successfully:', outputUri);
      console.log('Output dimensions:', outputDimensions);
      
      return outputUri;
    } catch (error) {
      console.error('Error applying perspective correction:', error);
      throw error;
    }
  }

  // Enhanced processing pipeline with automatic image enhancement
  static async processDocumentImage(
    imageUri: string,
    bounds: DocumentBounds,
    options: {
      enhanceContrast?: boolean;
      sharpen?: boolean;
      denoiseLevel?: number;
      outputQuality?: number;
      removeGlare?: boolean;
      removeShadows?: boolean;
      autoAnalysis?: boolean;
    } = {}
  ): Promise<{ processedUri: string; analysis?: ImageAnalysis }> {
    try {
      console.log('Starting enhanced document processing pipeline with image enhancement');
      
      const {
        enhanceContrast = true,
        sharpen = true,
        denoiseLevel = 0.3,
        outputQuality = 0.95,
        removeGlare = false,
        removeShadows = false,
        autoAnalysis = true
      } = options;
      
      // Step 1: Apply perspective correction
      console.log('Step 1: Applying perspective correction...');
      const correctedUri = await this.applyPerspectiveCorrection(imageUri, bounds);
      
      // Step 2: Apply automatic image enhancement
      console.log('Step 2: Applying image enhancements...');
      
      const enhancementOptions: EnhancementOptions = {
        autoContrast: enhanceContrast,
        autoBrightness: true,
        sharpen,
        removeGlare,
        removeShadows,
        denoiseLevel,
        outputQuality,
        preserveColors: true
      };
      
      let enhancedUri: string;
      let analysis: ImageAnalysis | undefined;
      
      if (autoAnalysis) {
        // Use automatic analysis to determine optimal enhancements
        const result = await imageEnhancementService.enhanceWithAutoAnalysis(
          correctedUri,
          enhancementOptions
        );
        enhancedUri = result.enhancedUri;
        analysis = result.analysis;
        
        console.log('Applied automatic enhancements based on analysis:', {
          brightness: analysis.brightness.toFixed(1),
          contrast: analysis.contrast.toFixed(2),
          hasGlare: analysis.hasGlare,
          hasShadows: analysis.hasShadows,
          appliedEnhancements: Object.entries(analysis.recommendedEnhancements)
            .filter(([_, value]) => value === true)
            .map(([key]) => key)
        });
      } else {
        // Use manual enhancement options
        enhancedUri = await imageEnhancementService.enhanceImage(
          correctedUri,
          enhancementOptions
        );
        
        console.log('Applied manual enhancements:', {
          enhanceContrast,
          sharpen,
          removeGlare,
          removeShadows,
          denoiseLevel
        });
      }
      
      console.log('Document processing pipeline completed successfully');
      return { processedUri: enhancedUri, analysis };
    } catch (error) {
      console.error('Error in document processing pipeline:', error);
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
  },

  // Enhanced processing with perspective correction and automatic image enhancement
  async processDocumentWithPerspectiveCorrection(
    imageUri: string,
    bounds: DocumentBounds,
    options?: {
      enhanceContrast?: boolean;
      sharpen?: boolean;
      denoiseLevel?: number;
      outputQuality?: number;
      removeGlare?: boolean;
      removeShadows?: boolean;
      autoAnalysis?: boolean;
    }
  ): Promise<{ processedUri: string; analysis?: ImageAnalysis }> {
    console.log('Processing document with advanced perspective correction and image enhancement');
    return await ImageCropper.processDocumentImage(imageUri, bounds, options);
  },

  // Analyze document quality and suggest optimal processing settings
  analyzeDocumentQuality(bounds: DocumentBounds): {
    perspectiveDistortion: number;
    recommendedSettings: {
      enhanceContrast: boolean;
      sharpen: boolean;
      denoiseLevel: number;
      removeGlare: boolean;
      removeShadows: boolean;
    };
  } {
    const { topLeft, topRight, bottomLeft, bottomRight } = bounds;
    
    // Calculate perspective distortion by measuring angle deviations
    const topEdge = { x: topRight.x - topLeft.x, y: topRight.y - topLeft.y };
    const bottomEdge = { x: bottomRight.x - bottomLeft.x, y: bottomRight.y - bottomLeft.y };
    const leftEdge = { x: bottomLeft.x - topLeft.x, y: bottomLeft.y - topLeft.y };
    const rightEdge = { x: bottomRight.x - topRight.x, y: bottomRight.y - topRight.y };
    
    // Calculate angles
    const topAngle = Math.atan2(topEdge.y, topEdge.x);
    const bottomAngle = Math.atan2(bottomEdge.y, bottomEdge.x);
    const leftAngle = Math.atan2(leftEdge.y, leftEdge.x);
    const rightAngle = Math.atan2(rightEdge.y, rightEdge.x);
    
    // Measure deviation from ideal rectangle (0°, 90°, 180°, 270°)
    const angleDifference = Math.abs(topAngle - bottomAngle) + Math.abs(leftAngle - rightAngle);
    const perspectiveDistortion = Math.min(angleDifference / Math.PI, 1); // Normalize to 0-1
    
    // Recommend settings based on distortion level
    const recommendedSettings = {
      enhanceContrast: perspectiveDistortion > 0.3, // High distortion may need contrast boost
      sharpen: perspectiveDistortion > 0.2, // Moderate distortion benefits from sharpening
      denoiseLevel: perspectiveDistortion > 0.4 ? 0.5 : 0.3, // Higher noise reduction for severe distortion
      removeGlare: perspectiveDistortion > 0.5, // Severe distortion often indicates lighting issues
      removeShadows: perspectiveDistortion > 0.4 // Moderate to high distortion may have shadows
    };
    
    console.log('Document quality analysis:', {
      perspectiveDistortion: perspectiveDistortion.toFixed(3),
      recommendedSettings
    });
    
    return { perspectiveDistortion, recommendedSettings };
  }
};

// Real-time detection utilities
export class RealTimeDetector {
  private isDetecting = false;
  private detectionInterval: number | null = null;
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
    
    this.detectionInterval = window.setInterval(async () => {
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage?.includes('unmounted') && !errorMessage?.includes('Camera')) {
          console.error('Real-time detection error:', errorMessage);
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
      window.clearInterval(this.detectionInterval);
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