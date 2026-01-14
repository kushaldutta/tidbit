# Content (`content/tidbits.json`)

This app loads tidbits from `content/tidbits.json`.

## Format

`content/tidbits.json` is a single JSON object:

- Keys are **category ids** (lowercase letters/numbers with hyphens), e.g. `math-54`, `berkeley-fun-facts`
- Values are arrays of **tidbit strings**

Example:

```json
{
  "math-54": [
    "Eigenvalues are found by solving det(A − λI) = 0."
  ],
  "miscellaneous": [
    "Honey never spoils—archaeologists have found 3000-year-old honey that's still edible."
  ]
}
```

## Writing guidelines

- Keep tidbits **short** (aim ~50–150 characters) so they read well in notifications
- One clear idea per tidbit
- Avoid leading/trailing whitespace
- Avoid duplicates

## Tools

### Validate content

```bash
npm run content:validate
```

### Add a tidbit (CLI)

```bash
npm run content:add -- --category "math-54" --text "Your tidbit here"
```

Notes:
- Category ids must be lowercase/hyphenated (e.g. `math-54`).
- The add script dedupes within the category by default.


