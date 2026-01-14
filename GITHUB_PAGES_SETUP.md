# GitHub Pages Setup for Privacy Policy

## Steps to Deploy Privacy Policy

1. **Create a GitHub repository** (if you haven't already):
   - Go to GitHub and create a new repository
   - Name it something like `tidbit` or `tidbit-app`

2. **Add the privacy policy file**:
   - Copy `privacy.md` to your repository
   - Or rename it to `privacy.html` if you prefer HTML

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **main branch** (or your default branch)
   - Click **Save**

4. **Get your GitHub Pages URL**:
   - Your privacy policy will be available at:
     `https://[your-username].github.io/[repository-name]/privacy`
   - Example: `https://kushaldutta.github.io/tidbit/privacy`

5. **Update the app**:
   - Open `src/screens/SettingsScreen.js`
   - Find the privacy policy link (around line 640)
   - Replace `'https://yourusername.github.io/tidbit/privacy'` with your actual URL

## Alternative: Use Markdown Directly

If you want to keep it as `privacy.md`, GitHub will automatically render it as HTML when accessed via GitHub Pages.

## Testing

1. After deploying, test the link in your app
2. Make sure it opens correctly in a browser
3. Verify the privacy policy displays properly

## Notes

- GitHub Pages is free for public repositories
- Updates to the file will be live immediately after pushing
- You can customize the URL by using a custom domain (optional)

