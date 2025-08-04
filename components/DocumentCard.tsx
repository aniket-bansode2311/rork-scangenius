import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { MoreVertical, Share, Eye, Check, FileStack } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface Document {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string;
  page_count?: number;
  created_at: string;
  updated_at: string;
}

interface DocumentCardProps {
  document: Document;
  onView: (document: Document) => void;
  onDelete: (document: Document) => void;
  onShare: (document: Document) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (document: Document) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 60) / 2; // 2 columns with padding

export function DocumentCard({
  document,
  onView,
  onDelete,
  onShare,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection
}: DocumentCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const showActionMenu = () => {
    Alert.alert(
      document.title,
      'Choose an action',
      [
        {
          text: 'View',
          onPress: () => onView(document)
        },
        {
          text: 'Share',
          onPress: () => onShare(document)
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Document',
              `Are you sure you want to delete "${document.title}"? This action cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(document)
                }
              ]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handlePress = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(document);
    } else {
      onView(document);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.selectedCard
      ]}
      onPress={handlePress}
      testID={`document-card-${document.id}`}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: document.thumbnail_url || document.file_url }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
          placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />
        {isSelectionMode ? (
          <View style={[
            styles.selectionButton,
            isSelected && styles.selectedButton
          ]}>
            {isSelected && <Check size={16} color={Colors.background} />}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={showActionMenu}
            testID={`document-menu-${document.id}`}
          >
            <MoreVertical size={16} color={Colors.background} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {document.title}
          </Text>
          {document.page_count && document.page_count > 1 && (
            <View style={styles.pageCountBadge}>
              <FileStack size={12} color={Colors.primary} />
              <Text style={styles.pageCountText}>{document.page_count}</Text>
            </View>
          )}
        </View>
        <Text style={styles.date}>
          {formatDate(document.created_at)}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onView(document)}
          testID={`view-button-${document.id}`}
        >
          <Eye size={16} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onShare(document)}
          testID={`share-button-${document.id}`}
        >
          <Share size={16} color={Colors.gray[600]} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: Colors.background,
    borderRadius: 12,
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: cardWidth * 0.75, // 4:3 aspect ratio
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.gray[100],
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  menuButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: Colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  content: {
    padding: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[900],
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  pageCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue[50],
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  pageCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
  date: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
});