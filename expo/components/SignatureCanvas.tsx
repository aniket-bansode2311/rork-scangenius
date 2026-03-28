import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/Button';

interface SignatureCanvasProps {
  onSignatureCreated: (signatureData: string) => void;
  onClear: () => void;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

interface Point {
  x: number;
  y: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSignatureCreated,
  onClear,
  width = screenWidth - 40,
  height = 200,
  strokeColor = '#000000',
  strokeWidth = 2,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const pathRef = useRef<Point[]>([]);

  const createSVGPath = (points: Point[]): string => {
    if (points.length < 2) return '';
    
    let path = `M${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      path += ` L${point.x},${point.y}`;
    }
    
    return path;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const point = { x: locationX, y: locationY };
      
      pathRef.current = [point];
      setCurrentPath(createSVGPath([point]));
      setIsDrawing(true);
    },

    onPanResponderMove: (evt) => {
      if (!isDrawing) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      const point = { x: locationX, y: locationY };
      
      pathRef.current.push(point);
      const newPath = createSVGPath(pathRef.current);
      setCurrentPath(newPath);
    },

    onPanResponderRelease: () => {
      if (currentPath && isDrawing) {
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath('');
        pathRef.current = [];
      }
      setIsDrawing(false);
    },
  });

  const clearSignature = useCallback(() => {
    setPaths([]);
    setCurrentPath('');
    pathRef.current = [];
    setIsDrawing(false);
    onClear();
  }, [onClear]);

  const saveSignature = useCallback(async () => {
    if (paths.length === 0 && !currentPath) {
      return;
    }

    try {
      // Create SVG string
      const allPaths = currentPath ? [...paths, currentPath] : paths;
      const svgString = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          ${allPaths.map(path => 
            `<path d="${path}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
          ).join('')}
        </svg>
      `;

      // Convert SVG to base64
      const base64Data = `data:image/svg+xml;base64,${btoa(svgString)}`;
      
      onSignatureCreated(base64Data);
    } catch (error) {
      console.error('Error saving signature:', error);
    }
  }, [paths, currentPath, width, height, strokeColor, strokeWidth, onSignatureCreated]);

  const hasSignature = paths.length > 0 || currentPath.length > 0;

  return (
    <View style={styles.container}>
      <View
        style={[styles.canvas, { width, height }]}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height} style={styles.svg}>
          {paths.map((path, index) => (
            <Path
              key={index}
              d={path}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath && (
            <Path
              d={currentPath}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Clear"
          onPress={clearSignature}
          variant="outline"
          disabled={!hasSignature}
          style={styles.button}
        />
        <Button
          title="Save Signature"
          onPress={saveSignature}
          disabled={!hasSignature}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  canvas: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
  },
  svg: {
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
});