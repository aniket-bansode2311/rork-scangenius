import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Platform
} from 'react-native';
import { X, Search, Globe } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { SUPPORTED_LANGUAGES, Language, getLanguageByCode } from '@/constants/languages';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  multiSelect?: boolean;
  title?: string;
  subtitle?: string;
}

export function LanguageSelector({
  visible,
  onClose,
  selectedLanguages,
  onLanguagesChange,
  multiSelect = false,
  title = 'Select Language',
  subtitle = 'Choose the language(s) for OCR processing'
}: LanguageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleLanguageToggle = (languageCode: string) => {
    if (multiSelect) {
      if (selectedLanguages.includes(languageCode)) {
        // Remove language
        const newLanguages = selectedLanguages.filter(code => code !== languageCode);
        onLanguagesChange(newLanguages);
      } else {
        // Add language
        const newLanguages = [...selectedLanguages, languageCode];
        onLanguagesChange(newLanguages);
      }
    } else {
      // Single select
      onLanguagesChange([languageCode]);
      onClose();
    }
  };
  
  const handleClearAll = () => {
    onLanguagesChange([]);
  };
  
  const handleSelectAutoDetect = () => {
    onLanguagesChange(['auto']);
    if (!multiSelect) {
      onClose();
    }
  };
  
  const isLanguageSelected = (languageCode: string) => {
    return selectedLanguages.includes(languageCode);
  };
  
  const getSelectedLanguagesText = () => {
    if (selectedLanguages.length === 0) {
      return 'None selected';
    }
    if (selectedLanguages.includes('auto')) {
      return 'Auto-detect';
    }
    if (selectedLanguages.length === 1) {
      return getLanguageByCode(selectedLanguages[0]).name;
    }
    return `${selectedLanguages.length} languages selected`;
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Globe size={24} color={Colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            testID="close-language-selector"
          >
            <X size={24} color={Colors.gray[600]} />
          </TouchableOpacity>
        </View>
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.gray[500]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search languages..."
            placeholderTextColor={Colors.gray[500]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="language-search-input"
          />
        </View>
        
        {/* Selected Languages Summary */}
        {multiSelect && selectedLanguages.length > 0 && (
          <View style={styles.selectedSummary}>
            <Text style={styles.selectedSummaryText}>
              Selected: {getSelectedLanguagesText()}
            </Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearAll}
              testID="clear-languages-button"
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Language List */}
        <ScrollView
          style={styles.languageList}
          showsVerticalScrollIndicator={false}
          testID="language-list"
        >
          {/* Auto-detect option */}
          <TouchableOpacity
            style={[
              styles.languageItem,
              isLanguageSelected('auto') && styles.languageItemSelected
            ]}
            onPress={handleSelectAutoDetect}
            testID="language-auto"
          >
            <View style={styles.languageInfo}>
              <Text style={styles.languageFlag}>🌐</Text>
              <View style={styles.languageNames}>
                <Text style={[
                  styles.languageName,
                  isLanguageSelected('auto') && styles.languageNameSelected
                ]}>
                  Auto-detect
                </Text>
                <Text style={[
                  styles.languageNativeName,
                  isLanguageSelected('auto') && styles.languageNativeNameSelected
                ]}>
                  Let Google Cloud Vision detect the language
                </Text>
              </View>
            </View>
            {isLanguageSelected('auto') && (
              <View style={styles.selectedIndicator} />
            )}
          </TouchableOpacity>
          
          {/* Language options */}
          {filteredLanguages.filter(lang => lang.code !== 'auto').map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                isLanguageSelected(language.code) && styles.languageItemSelected
              ]}
              onPress={() => handleLanguageToggle(language.code)}
              testID={`language-${language.code}`}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageNames}>
                  <Text style={[
                    styles.languageName,
                    isLanguageSelected(language.code) && styles.languageNameSelected
                  ]}>
                    {language.name}
                  </Text>
                  <Text style={[
                    styles.languageNativeName,
                    isLanguageSelected(language.code) && styles.languageNativeNameSelected
                  ]}>
                    {language.nativeName} ({language.code})
                  </Text>
                </View>
              </View>
              {isLanguageSelected(language.code) && (
                <View style={styles.selectedIndicator} />
              )}
            </TouchableOpacity>
          ))}
          
          {filteredLanguages.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No languages found</Text>
              <Text style={styles.noResultsSubtext}>
                Try adjusting your search query
              </Text>
            </View>
          )}
        </ScrollView>
        
        {/* Footer */}
        {multiSelect && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
              testID="done-language-selection"
            >
              <Text style={styles.doneButtonText}>
                Done ({selectedLanguages.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[600],
    lineHeight: 18,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray[900],
    padding: 0,
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  selectedSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  clearButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  languageList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  languageItemSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageNames: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  languageNameSelected: {
    color: Colors.primary,
  },
  languageNativeName: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  languageNativeNameSelected: {
    color: Colors.primary + 'CC',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
});