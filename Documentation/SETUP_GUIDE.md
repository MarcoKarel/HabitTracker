# Quick Setup Guide

## Step 1: Configure Supabase Credentials

You need to add your Supabase credentials. There are two ways:

### Option A: Update config/supabase.js (Recommended for testing)
```javascript
export const supabaseConfig = {
  url: 'https://your-project.supabase.co',  // Replace with your Supabase URL
  anonKey: 'your-anon-key-here',             // Replace with your anon/public key
};
```

### Option B: Use Environment Variables (Recommended for production)
In `app.config.js`, add:
```javascript
export default {
  expo: {
    // ... existing config
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    }
  }
}
```

## Step 2: Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the entire contents of `Documentation/supabase_schema.sql`
5. Click "Run" to execute the SQL

This will create all the necessary tables, policies, and functions.

## Step 3: Configure Authentication Settings (Optional)

For easier testing, you may want to disable email confirmation:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Under "Email" section, find "Confirm email"
4. Toggle it OFF for testing (turn it back ON for production)

## Step 4: Install Dependencies (if needed)

```powershell
npm install @supabase/supabase-js
# or
npx expo install @supabase/supabase-js
```

## Step 5: Clear Old Data (if you have existing AsyncStorage data)

If you've been testing with local storage, you may want to clear it:

```javascript
// Add this temporarily to LoginScreen.js for one run
import AsyncStorage from '@react-native-async-storage/async-storage';

// In a useEffect:
AsyncStorage.clear();
```

Or simply uninstall and reinstall the app on your test device.

## Step 6: Test the App

1. **Start the app:**
   ```powershell
   npx expo start
   ```

2. **Test Authentication:**
   - Try accessing the app → Should show Login screen
   - Register a new account
   - Verify user created in Supabase (check Authentication → Users)
   - Verify profile created in Supabase (check Table Editor → profiles)

3. **Test Habits:**
   - Create a new habit
   - Check Supabase Table Editor → habits (should see your habit)
   - Complete the habit
   - Check Supabase Table Editor → completions (should see completion)

4. **Test Persistence:**
   - Close the app
   - Reopen it
   - Should still be logged in
   - Should see your habits

5. **Test Multi-Device Sync:**
   - Login on another device with the same account
   - Should see the same habits and completions

## Troubleshooting

### "Supabase not configured" Error
- Check that you've updated `config/supabase.js` with your credentials
- Make sure the URL doesn't still contain "YOUR_SUPABASE_URL_HERE"

### Can't Create Habits or Completions
- Check that Row Level Security (RLS) is properly set up
- Run the SQL schema again
- Check Supabase logs (Dashboard → Logs)

### User Not Authenticated
- Clear app data and try again
- Check Supabase Authentication → Users to see if user exists
- Try logging out and back in

### "Failed to fetch" or Network Errors
- Check your internet connection
- Verify Supabase URL is correct
- Check if Supabase project is paused (free tier pauses after inactivity)

## What's Working

✅ User registration and login
✅ Authentication state persistence
✅ Creating habits (stored in Supabase)
✅ Completing habits (stored in Supabase)
✅ Viewing habits on HomeScreen
✅ Viewing and managing habits on HabitsScreen
✅ Setting up notifications (settings stored in Supabase)

## What Still Needs Migration

⏳ StatisticsScreen (still uses AsyncStorage)
⏳ ProfileScreen (still uses AsyncStorage)

These will continue to work with local storage for now, but won't sync across devices.

## Next Actions

After confirming everything works:

1. Migrate StatisticsScreen to use Supabase
2. Migrate ProfileScreen to use Supabase
3. Remove AsyncStorage dependency completely
4. Add offline support (optional)
5. Add real-time sync (optional)

---

Happy testing! 🎉
