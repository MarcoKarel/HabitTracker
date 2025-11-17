# Premium Features Installation Guide

## Quick Setup (5 minutes)

### Prerequisites
- ✅ Supabase project set up
- ✅ Base schema already running
- ✅ React Native app running

---

## Step 1: Install Dependencies (1 min)

```bash
npm install react-native-chart-kit expo-file-system expo-sharing
```

---

## Step 2: Run Database Migrations (2 min)

Go to your **Supabase SQL Editor** and run this file:
```
Documentation/premium_features_schema.sql
```

Click "Run" and wait for:
```
✓ Added subscription fields to profiles
✓ Created habit_categories table
✓ Created habit_templates table (10 templates seeded)
✓ Created custom_themes table
✓ Created habit_photos table
✓ Created habit_insights table
✓ Created 7 premium functions
✓ Premium features schema complete!
```

---

## Step 3: Create Storage Bucket (1 min)

In **Supabase Storage**:
1. Click "New bucket"
2. Name: `habit-photos`
3. Public: ✅ Yes
4. Click "Create"

---

## Step 4: Update Your App Navigation (1 min)

Add these screens to your navigation (e.g., in `App.js` or your navigator file):

```javascript
import PremiumFeaturesScreen from './screens/PremiumFeaturesScreen';
import AdvancedAnalyticsScreen from './screens/AdvancedAnalyticsScreen';

// In your Stack.Navigator:
<Stack.Screen 
  name="PremiumFeatures" 
  component={PremiumFeaturesScreen}
  options={{ 
    title: 'Premium Features',
    headerBackTitle: 'Back'
  }}
/>
<Stack.Screen 
  name="AdvancedAnalytics" 
  component={AdvancedAnalyticsScreen}
  options={{ 
    title: 'Advanced Analytics',
    headerBackTitle: 'Back'
  }}
/>
```

---

## Step 5: Test It Out! (30 sec)

### Test as Free User:
```javascript
// Try creating more than 5 habits
// You should see the limit warning
```

### Test as Premium User:
Run this in Supabase SQL Editor:
```sql
-- Replace 'your-user-id' with your actual user ID
UPDATE profiles 
SET 
  subscription_tier = 'personal',
  subscription_status = 'active',
  subscription_ends_at = NOW() + INTERVAL '30 days'
WHERE id = 'your-user-id';
```

Now:
- ✅ Create unlimited habits
- ✅ View advanced analytics
- ✅ Export your data
- ✅ Access all premium features

---

## Step 6: Integration with PayFast (Optional, for production)

When PayFast confirms a payment, update the user's subscription:

```javascript
// In your PayFast webhook handler
import { userProfiles } from './services/supabaseService';

// After verifying payment
await userProfiles.updateSubscription(userId, {
  tier: 'personal', // or 'enterprise'
  status: 'active',
  endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});
```

---

## Troubleshooting

### "Function does not exist"
→ Make sure you ran the `premium_features_schema.sql` file

### "Table does not exist"
→ Run the base schema first: `supabase_schema.sql`

### "Can't import PremiumFeaturesScreen"
→ Check the file path is correct in your import statement

### "Charts not showing"
→ Run `npm install react-native-chart-kit` and restart your app

### "Premium status not updating"
→ Check the `subscription_ends_at` is in the future
→ Verify `subscription_status` is 'active'
→ Check `subscription_tier` is 'personal' or 'enterprise'

---

## Verify Installation

Run this query in Supabase:
```sql
-- Check if all functions exist
SELECT 
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'is_user_premium') as has_is_premium,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'can_create_habit') as has_can_create,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_habit_analytics') as has_analytics,
  EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'export_user_data') as has_export,
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'habit_categories') as has_categories,
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'habit_templates') as has_templates,
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'custom_themes') as has_themes,
  EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'habit_photos') as has_photos;
```

All should return `true` ✅

---

## What's Next?

1. **Customize** - Modify colors, add more templates
2. **Test** - Create test users and test all flows
3. **Market** - Add premium highlights to onboarding
4. **Monitor** - Track conversion metrics
5. **Iterate** - Add more premium features based on feedback

---

## Quick Links

- 📖 **Full Guide**: `Documentation/PREMIUM_FEATURES.md`
- 🚀 **Quick Reference**: `Documentation/PREMIUM_QUICK_START.md`
- 📋 **Summary**: `Documentation/PREMIUM_IMPLEMENTATION_SUMMARY.md`

---

## Need Help?

Common issues and solutions are in:
- `Documentation/PREMIUM_QUICK_START.md` (Common Issues section)

---

**You're all set!** 🎉

Your app now has a complete premium subscription system with 10+ features that make it worth paying for!

**Time to install:** ~5 minutes  
**Time to test:** ~2 minutes  
**Time to launch:** Whenever you're ready! 🚀
