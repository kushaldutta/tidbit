import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { ContentService } from '../services/ContentService';

export default function CategoriesScreen() {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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
    
    setSelectedCategories(validSelected);
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
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>
          Choose what you want to learn about
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Select at least one category to start receiving tidbits. You can change
          your preferences anytime.
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          placeholderTextColor="#9ca3af"
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
                  trackColor={{ false: '#e5e7eb', true: '#6366f1' }}
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
          <Text style={styles.warningText}>
            ⚠️ Please select at least one category to receive tidbits
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1e40af',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  categoriesList: {
    marginBottom: 24,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f5f3ff',
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginRight: 16,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#6366f1',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});

