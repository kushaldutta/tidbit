import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '../services/StorageService';
import { ContentService } from '../services/ContentService';
import { NotificationService } from '../services/NotificationService';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { spacing, radius, elevation, iconSize } from '../theme/tokens';

export default function CategorySelectionScreen({ navigation }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const selected = await StorageService.getSelectedCategories();
    const available = ContentService.getAvailableCategories();
    
    // Filter out invalid categories (categories that no longer exist)
    const availableIds = available.map(cat => cat.id);
    const validSelected = selected.filter(catId => availableIds.includes(catId));
    
    // If any invalid categories were removed, update storage
    if (validSelected.length !== selected.length) {
      await StorageService.setSelectedCategories(validSelected);
    }
    
    // If no categories selected yet, default to some popular ones
    if (validSelected.length === 0) {
      const defaultSelected = ['miscellaneous'];
      setSelectedCategories(defaultSelected);
      await StorageService.setSelectedCategories(defaultSelected);
    } else {
      setSelectedCategories(validSelected);
    }
    
    setAvailableCategories(available);
  };

  const filterCategories = (categories, query) => {
    if (!query.trim()) {
      return categories;
    }
    const lowerQuery = query.toLowerCase();
    return categories.filter(category => {
      const nameMatch = category.name.toLowerCase().includes(lowerQuery);
      const descMatch = category.description?.toLowerCase().includes(lowerQuery);
      return nameMatch || descMatch;
    });
  };

  const filteredCategories = filterCategories(availableCategories, searchQuery);

  const toggleCategory = async (categoryId) => {
    let newSelected;
    if (selectedCategories.includes(categoryId)) {
      newSelected = selectedCategories.filter(id => id !== categoryId);
    } else {
      newSelected = [...selectedCategories, categoryId];
    }
    
    setSelectedCategories(newSelected);
    await StorageService.setSelectedCategories(newSelected);
    
    // Sync category changes to server so notifications use correct categories
    await NotificationService.syncPreferences();
  };

  const handleNext = () => {
    if (selectedCategories.length === 0) {
      // Don't allow proceeding without at least one category
      return;
    }
    // Navigate to permission request screen
    navigation.navigate('PermissionRequest');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>What interests you?</Text>
          <Text style={styles.subtitle}>
            Select the topics you'd like to learn about
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            You can select multiple categories. Choose at least one to continue.
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.categoriesList}>
          {filteredCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No categories found matching "{searchQuery}"
              </Text>
            </View>
          ) : (
            filteredCategories.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected,
                ]}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryContent}>
                  <View style={styles.categoryInfo}>
                    <Text style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}>
                      {category.name}
                    </Text>
                    <Text style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                  </View>
                  <Switch
                    value={isSelected}
                    onValueChange={() => toggleCategory(category.id)}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </TouchableOpacity>
            );
            })
          )}
        </View>

        {selectedCategories.length === 0 && (
          <View style={styles.warningBox}>
            <Icon name="warning" size={iconSize.md} color={theme.warningText} />
            <Text style={styles.warningText}>
              Please select at least one category to continue
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            selectedCategories.length === 0 && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={selectedCategories.length === 0}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.nextButtonText,
            selectedCategories.length === 0 && styles.nextButtonTextDisabled,
          ]}>
            Next
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xxxl,
    paddingTop: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: theme.infoBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderLeftWidth: 4,
    borderLeftColor: theme.info,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.infoText,
  },
  searchContainer: {
    marginBottom: spacing.xl,
  },
  searchInput: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: theme.text,
    borderWidth: 2,
    borderColor: theme.border,
  },
  categoriesList: {
    marginBottom: spacing.xxl,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  categoryCard: {
    backgroundColor: theme.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: theme.border,
    ...elevation.card,
  },
  categoryCardSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginRight: spacing.lg,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: spacing.xs,
  },
  categoryNameSelected: {
    color: theme.primary,
  },
  categoryDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: theme.warningBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    borderLeftWidth: 4,
    borderLeftColor: theme.warning,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: theme.warningText,
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: theme.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    ...elevation.raised,
  },
  nextButtonDisabled: {
    backgroundColor: theme.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButtonTextDisabled: {
    color: theme.textMuted,
  },
});
