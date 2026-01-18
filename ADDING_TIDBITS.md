# How to Add Tidbits via Supabase

This guide shows you how to add tidbit content to your Supabase database. There are three main methods:

## Method 1: Using Supabase Dashboard (Easiest) ⭐

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Table Editor**
   - Click **"Table Editor"** in the left sidebar
   - Click on the **`tidbits`** table

3. **Add a New Tidbit**
   - Click **"Insert"** → **"Insert row"**
   - Fill in the fields:
     - **`id`** (TEXT, PRIMARY KEY): Generate a unique ID (e.g., `tidbit_abc123` or use the hash method below)
     - **`category_id`** (TEXT): Must match an existing category ID:
       - `math-54` - MATH 54
       - `history` - History
       - `science` - Science
       - `berkeley-fun-facts` - Berkeley Fun Facts
       - `miscellaneous` - Miscellaneous
     - **`text`** (TEXT, REQUIRED): The tidbit content (e.g., "The Eiffel Tower can be 15 cm taller during summer")
     - **`difficulty`** (TEXT, OPTIONAL): `'easy'`, `'medium'`, or `'hard'` (default: `'easy'`)
     - **`tags`** (JSONB, OPTIONAL): Array of tags, e.g., `["architecture", "paris"]` or `[]`
     - **`source`** (TEXT, OPTIONAL): Source URL or reference
     - **`is_active`** (BOOLEAN): Should be `true` for active tidbits (default: `true`)
   - Click **"Save"**

4. **Verify**
   - The new tidbit should appear in your table
   - The app will automatically fetch it on the next content refresh

## Method 2: Using SQL Editor (Bulk Insert)

1. **Go to Supabase Dashboard → SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Insert Single Tidbit**
   ```sql
   INSERT INTO tidbits (id, category_id, text, difficulty, tags, is_active)
   VALUES (
     'tidbit_unique_id_here',
     'science',  -- category_id must exist
     'Your tidbit text goes here',
     'easy',  -- optional: 'easy', 'medium', or 'hard'
     '["tag1", "tag2"]'::jsonb,  -- optional: array of tags
     true  -- is_active
   );
   ```

3. **Insert Multiple Tidbits at Once**
   ```sql
   INSERT INTO tidbits (id, category_id, text, is_active) VALUES
     ('tidbit_001', 'history', 'First tidbit text here', true),
     ('tidbit_002', 'science', 'Second tidbit text here', true),
     ('tidbit_003', 'miscellaneous', 'Third tidbit text here', true);
   ```

4. **Click "Run"** (or press Ctrl+Enter)

## Method 3: Using SQL with Auto-Generated IDs

If you want to match the ID format used by the seed script, you can generate IDs using SQL:

```sql
-- Function to generate tidbit ID (matches seed script logic)
-- Fixed to handle 32-bit integer overflow like JavaScript
CREATE OR REPLACE FUNCTION generate_tidbit_id(tidbit_text TEXT, cat_id TEXT)
RETURNS TEXT AS $$
DECLARE
  content TEXT;
  hash BIGINT := 0;  -- Use BIGINT for calculations to prevent overflow
  char_code INT;
  i INT;
  mask BIGINT := 4294967295;  -- 0xFFFFFFFF (32-bit unsigned mask)
  hash_int INT;
BEGIN
  content := tidbit_text || '|' || cat_id;
  FOR i IN 1..length(content) LOOP
    char_code := ascii(substring(content FROM i FOR 1));
    -- Calculate using BIGINT to prevent overflow
    hash := ((hash::BIGINT << 5) - hash + char_code);
    -- Apply 32-bit mask (simulating JavaScript's 32-bit integer behavior)
    hash := hash & mask;
    -- Convert to signed 32-bit integer (JavaScript's behavior)
    IF hash > 2147483647 THEN
      hash := hash - 4294967296;  -- Convert unsigned to signed
    END IF;
  END LOOP;
  hash_int := hash::INT;
  -- Use abs() and convert to hex (matching JavaScript toString(16))
  RETURN 'tidbit_' || lpad(to_hex(abs(hash_int)), 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Use it to insert tidbits with auto-generated IDs
INSERT INTO tidbits (id, category_id, text, is_active)
VALUES (
  generate_tidbit_id('Your tidbit text here', 'science'),
  'science',
  'Your tidbit text here',
  true
);
```

## Generating Unique IDs Manually

If you don't use the hash function, just make sure your IDs are unique. Common patterns:
- `tidbit_science_001`, `tidbit_science_002`, ...
- `tidbit_2024_001`, `tidbit_2024_002`, ...
- UUIDs: `tidbit_550e8400-e29b-41d4-a716-446655440000`

## Available Categories

Make sure to use one of these **exact** category IDs:
- `math-54` - MATH 54
- `history` - History  
- `science` - Science
- `berkeley-fun-facts` - Berkeley Fun Facts
- `miscellaneous` - Miscellaneous

To see all categories in your database:
```sql
SELECT id, name, description FROM categories ORDER BY sort_order;
```

## Adding New Categories

To add a new category, you have two options:

### Method 1: Using Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard → Table Editor**
   - Click **"Table Editor"** in the left sidebar
   - Click on the **`categories`** table

2. **Add a New Category**
   - Click **"Insert"** → **"Insert row"**
   - Fill in the fields:
     - **`id`** (TEXT, PRIMARY KEY): Unique category ID (e.g., `technology`, `literature`, `sports`)
       - Use lowercase, hyphens for multi-word: `tech-tips`, `world-history`
       - No spaces or special characters (except hyphens)
     - **`name`** (TEXT, REQUIRED): Display name shown in app (e.g., "Technology", "Literature", "Sports")
     - **`description`** (TEXT, OPTIONAL): Short description shown under category name
     - **`sort_order`** (INTEGER, OPTIONAL): Order in category list (lower = first, default: 0)
   - Click **"Save"**

### Method 2: Using SQL Editor

```sql
INSERT INTO categories (id, name, description, sort_order)
VALUES (
  'technology',  -- category ID (lowercase, no spaces)
  'Technology',  -- display name
  'Tech tips, programming, and digital innovations',  -- description
  10  -- sort order (higher = appears later in list)
);
```

### Category ID Guidelines

- **Use lowercase** with hyphens for multi-word IDs
- **No spaces** - use hyphens instead (`world-history`, not `world history`)
- **No special characters** except hyphens
- **Keep it short** - 1-3 words max
- **Make it memorable** - users won't see this ID, but you'll use it for tidbits

**Good examples:**
- `technology` ✅
- `world-history` ✅
- `fun-science` ✅
- `cooking-tips` ✅

**Bad examples:**
- `Technology` ❌ (use lowercase)
- `world history` ❌ (no spaces)
- `tech&gadgets` ❌ (no special characters)
- `my_awesome_category` ❌ (use hyphens, not underscores)

### Sort Order Tips

- **Lower numbers appear first** in the category selection screen
- Current categories: `math-54` (1), `history` (2), `science` (3), `berkeley-fun-facts` (4), `miscellaneous` (5)
- **Add new categories** with sort_order >= 6 to appear at the bottom
- Or use specific numbers to insert between existing categories

### Example: Adding Multiple Categories

```sql
INSERT INTO categories (id, name, description, sort_order) VALUES
  ('technology', 'Technology', 'Tech tips and digital innovations', 6),
  ('literature', 'Literature', 'Classic books, authors, and literary facts', 7),
  ('sports', 'Sports', 'Athletic achievements and sports history', 8);
```

### Verifying Your New Category

After adding a category:

1. **Check in Supabase**:
   ```sql
   SELECT * FROM categories WHERE id = 'your-category-id';
   ```

2. **Verify in App**:
   - Open the app and go to **Categories** screen
   - Your new category should appear in the list
   - You can now add tidbits to this category!

### Important Notes

- **Category ID is permanent** - changing it would break existing tidbits
- **Name and description can be updated** anytime via SQL or Dashboard
- **Sort order can be changed** to reorder categories without affecting tidbits
- **Categories without tidbits** will still appear but be empty

### Updating Existing Categories

To update a category's name, description, or sort order:

```sql
UPDATE categories 
SET name = 'New Name', 
    description = 'New description',
    sort_order = 5
WHERE id = 'existing-category-id';
```

## Field Reference

### Required Fields
- **`id`** (TEXT): Unique identifier for the tidbit
- **`category_id`** (TEXT): Must reference an existing category
- **`text`** (TEXT): The tidbit content itself

### Optional Fields
- **`difficulty`** (TEXT): `'easy'`, `'medium'`, or `'hard'` (default: `'easy'`)
- **`tags`** (JSONB): JSON array of tags, e.g., `["tag1", "tag2"]` or `[]::jsonb`
- **`source`** (TEXT): Source URL or citation
- **`is_active`** (BOOLEAN): Set to `false` to hide without deleting (default: `true`)

### Auto-Generated Fields (Don't set manually)
- **`created_at`** (TIMESTAMPTZ): Automatically set to NOW()
- **`updated_at`** (TIMESTAMPTZ): Automatically updated on changes

## Tips & Best Practices

1. **Always set `is_active = true`** for new tidbits (unless you're testing)
2. **Keep tidbits concise** - They should be readable in 3 seconds
3. **Use meaningful IDs** - Makes it easier to find/edit later
4. **Bulk insert for efficiency** - Use Method 2 for adding many tidbits at once
5. **Verify categories exist** - Check the `categories` table first if unsure

## Verifying Your Tidbits

After adding tidbits, you can verify they're being served:

1. **Check in Supabase**:
   ```sql
   SELECT COUNT(*) FROM tidbits WHERE is_active = true;
   SELECT category_id, COUNT(*) FROM tidbits WHERE is_active = true GROUP BY category_id;
   ```

2. **Check via API** (if server is running):
   ```
   GET https://your-server.com/api/tidbits
   ```

3. **Test in App**:
   - Open the app and pull to refresh
   - New tidbits should appear in the next fetch

## Example: Adding Science Tidbits

```sql
INSERT INTO tidbits (id, category_id, text, difficulty, tags, is_active) VALUES
  ('tidbit_science_001', 'science', 'Honey never spoils. Archaeologists have found 3000-year-old honey that is still edible.', 'easy', '["food", "history"]'::jsonb, true),
  ('tidbit_science_002', 'science', 'Octopuses have three hearts and blue blood.', 'easy', '["animals", "biology"]'::jsonb, true),
  ('tidbit_science_003', 'science', 'A day on Venus is longer than its year. Venus rotates so slowly that it takes 243 Earth days to complete one rotation, but only 225 Earth days to orbit the sun.', 'medium', '["space", "planets"]'::jsonb, true);
```

## Troubleshooting

### "violates foreign key constraint"
- The `category_id` doesn't exist
- Check available categories: `SELECT id FROM categories;`
- Create the category first if needed

### "duplicate key value violates unique constraint"
- The `id` already exists
- Choose a different unique ID or delete the existing tidbit first

### Tidbits not showing in app
- Check `is_active = true`
- Verify the server is fetching from Supabase (check server logs)
- Make sure the category is selected in the app settings

## Need Help?

- Check the database schema: `server/supabase-schema.sql`
- View seed script for examples: `server/scripts/seed-from-json.js`
- Supabase documentation: https://supabase.com/docs

