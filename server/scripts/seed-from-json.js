/**
 * Seed Supabase database from content/tidbits.json
 * 
 * Usage:
 *   node server/scripts/seed-from-json.js
 * 
 * Requires environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (for admin access)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  console.error('\nCreate a .env file in the project root with:');
  console.error('SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Simple hash function (same as ContentService)
function generateTidbitId(text, category) {
  const content = `${text}|${category}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hashStr = Math.abs(hash).toString(16);
  return `tidbit_${hashStr}`;
}

async function seedDatabase() {
  try {
    console.log('📦 Loading tidbits from JSON file...');
    const tidbitsPath = path.join(__dirname, '../../content/tidbits.json');
    const tidbitsData = JSON.parse(fs.readFileSync(tidbitsPath, 'utf8'));
    
    console.log(`📊 Found ${Object.keys(tidbitsData).length} categories`);
    
    // Count total tidbits
    let totalTidbits = 0;
    for (const categoryId in tidbitsData) {
      totalTidbits += tidbitsData[categoryId].length;
    }
    console.log(`📊 Total tidbits: ${totalTidbits}`);
    
    // Ensure categories exist first
    console.log('\n📋 Ensuring categories exist...');
    for (const categoryId in tidbitsData) {
      const categoryName = formatCategoryName(categoryId);
      const categoryDescription = getCategoryDescription(categoryId);
      
      const { error } = await supabase
        .from('categories')
        .upsert({
          id: categoryId,
          name: categoryName,
          description: categoryDescription,
        }, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ Error upserting category ${categoryId}:`, error);
      } else {
        console.log(`  ✓ Category: ${categoryName}`);
      }
    }
    
    // Insert tidbits
    console.log('\n📝 Inserting tidbits...');
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const categoryId in tidbitsData) {
      const tidbitTexts = tidbitsData[categoryId];
      console.log(`\n  Category: ${categoryId} (${tidbitTexts.length} tidbits)`);
      
      for (const text of tidbitTexts) {
        const tidbitId = generateTidbitId(text, categoryId);
        
        // Check if tidbit already exists
        const { data: existing } = await supabase
          .from('tidbits')
          .select('id')
          .eq('id', tidbitId)
          .single();
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Insert new tidbit
        const { error } = await supabase
          .from('tidbits')
          .insert({
            id: tidbitId,
            category_id: categoryId,
            text: text,
            is_active: true,
          });
        
        if (error) {
          console.error(`    ❌ Error inserting tidbit: ${text.substring(0, 50)}...`, error.message);
          errors++;
        } else {
          inserted++;
          if (inserted % 10 === 0) {
            process.stdout.write(`    ✓ Inserted ${inserted} tidbits...\r`);
          }
        }
      }
    }
    
    console.log('\n\n✅ Seeding complete!');
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    console.log(`   Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

function formatCategoryName(categoryId) {
  const names = {
    'math-54': 'MATH 54',
    history: 'History',
    science: 'Science',
    'berkeley-fun-facts': 'Berkeley Fun Facts',
    miscellaneous: 'Miscellaneous',
  };
  return names[categoryId] || categoryId;
}

function getCategoryDescription(categoryId) {
  const descriptions = {
    'math-54': 'Linear algebra and differential equations',
    history: 'Fascinating historical moments',
    science: 'Scientific discoveries and phenomena',
    'berkeley-fun-facts': 'Interesting facts about UC Berkeley',
    miscellaneous: 'Tech, psychology, finance, fun facts, and health',
  };
  return descriptions[categoryId] || '';
}

// Run the seed
seedDatabase();

