# Test the App in Browser First

Since connecting to your phone is proving difficult, let's test the app in your **web browser** first to make sure everything works!

## Step 1: Start the Server

In your terminal, run:
```bash
npx expo start --web
```

Or if that doesn't work:
```bash
npx expo start
```
Then press **`w`** to open in web browser

## Step 2: App Opens in Browser

The app should open at: `http://localhost:8081` or similar

## Step 3: Test the Features

You should be able to:
- ✅ See the Home screen
- ✅ Navigate to Categories tab
- ✅ Select categories
- ✅ View Stats
- ✅ Test the tidbit functionality

## Why Test in Browser?

1. **Verify the app works** before dealing with phone connection
2. **See if there are any errors** we need to fix
3. **Easier to debug** than on phone
4. **Then we can focus** on phone connection once we know the app works

## After Testing in Browser

Once we confirm the app works in the browser, we can:
- Fix any bugs
- Then tackle the phone connection issue
- Or you can use the web version for now

## Try This Now

Run: `npx expo start --web`

This should open the app in your browser automatically. Let's make sure the app itself works first!

