# Premium Features Quick Reference

## 🚀 Quick Start

### 1. Database Setup (Run in order)
```sql
-- 1. Base schema
psql -f Documentation/supabase_schema.sql

-- 2. Streak tracking
psql -f Documentation/streak_tracking_setup.sql

-- 3. Premium features
psql -f Documentation/premium_features_schema.sql
```

### 2. Check Premium Status
```javascript
import { userProfiles } from '../services/supabaseService';

const { data: isPremium } = await userProfiles.isPremium(userId);
```

### 3. Grant Premium Access (After Payment)
```javascript
await userProfiles.updateSubscription(userId, {
  tier: 'personal', // 'free', 'personal', or 'enterprise'
  status: 'active',
  endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});
```

---

## 🎯 Feature Summary

| Feature | Free | Personal (R25) | Enterprise (R250) |
|---------|------|----------------|-------------------|
| **Habits** | 5 | ∞ | ∞ |
| **Basic Stats** | ✅ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ✅ | ✅ |
| **Categories & Tags** | ❌ | ✅ | ✅ |
| **Premium Templates** | ❌ | ✅ | ✅ |
| **Custom Themes** | ❌ | ✅ | ✅ |
| **Progress Photos** | ❌ | ✅ | ✅ |
| **Data Export** | ❌ | ✅ | ✅ |
| **Multiple Reminders** | 1/habit | ∞ | ∞ |
| **Support** | Standard | Priority | 24/7 |
| **Team Features** | ❌ | ❌ | ✅ |

---

## 🔑 Key Database Functions

### Check Premium Status
```sql
SELECT is_user_premium('user-uuid-here');
-- Returns: true or false
```

### Check Habit Limit
```sql
SELECT can_create_habit('user-uuid-here');
-- Returns: true if user can create more habits
```

### Get Habit Count
```sql
SELECT get_user_habit_count('user-uuid-here');
-- Returns: integer count
```

### Get Advanced Analytics
```sql
SELECT * FROM get_habit_analytics('user-uuid', 'habit-uuid');
-- Returns: comprehensive analytics data
```

### Export User Data
```sql
SELECT export_user_data('user-uuid-here');
-- Returns: JSONB with all user data
```

### Get Recommendations
```sql
SELECT * FROM get_habit_recommendations('user-uuid-here');
-- Returns: personalized template recommendations
```

---

## 💻 Code Examples

### Create Habit with Limit Check
```javascript
const { data, error } = await habits.create({
  user_id: userId,
  name: 'Morning Workout',
  description: 'Exercise for 30 minutes',
  color: '#FF6B6B'
});

if (error?.isPremiumFeature) {
  // User hit the limit - show upgrade prompt
  Alert.alert('Upgrade to Premium', error.message, [
    { text: 'Not Now' },
    { text: 'Upgrade', onPress: () => navigation.navigate('Payment') }
  ]);
}
```

### Get Analytics
```javascript
const { data: analytics, error } = await habits.getAnalytics(userId, habitId);

if (error?.isPremiumFeature) {
  // Show premium feature locked screen
  navigation.navigate('AdvancedAnalytics', { locked: true });
} else {
  // Display analytics
  console.log(analytics.completion_rate_7d);
  console.log(analytics.best_day_of_week);
  console.log(analytics.predicted_success_rate);
}
```

### Export Data
```javascript
const { data, error } = await dataExport.exportUserData(userId);

if (!error) {
  // Export as JSON
  const jsonFile = dataExport.downloadAsJSON(data, 'my_habits.json');
  
  // Or export as CSV
  const csvFile = dataExport.downloadAsCSV(
    data.habits, 
    data.completions, 
    'my_habits.csv'
  );
  
  // Share the file
  await Sharing.shareAsync(fileUri);
}
```

### Create Custom Theme
```javascript
await customThemes.create({
  user_id: userId,
  name: 'Ocean Breeze',
  colors: {
    primary: '#00B4DB',
    secondary: '#0083B0',
    background: '#E8F4F8',
    card: '#FFFFFF',
    text: '#2C3E50',
    textSecondary: '#7F8C8D'
  }
});
```

---

## 🎨 UI Components

### Premium Badge
```javascript
{isPremium && (
  <View style={styles.premiumBadge}>
    <Ionicons name="star" size={16} color="#FFD700" />
    <Text>PREMIUM</Text>
  </View>
)}
```

### Lock Icon on Feature
```javascript
{!isPremium && (
  <View style={styles.lockOverlay}>
    <Ionicons name="lock-closed" size={24} color="#999" />
    <Text>Premium Feature</Text>
  </View>
)}
```

### Upgrade Button
```javascript
<TouchableOpacity 
  style={styles.upgradeButton}
  onPress={() => navigation.navigate('Payment')}
>
  <Ionicons name="star" size={20} color="#FFF" />
  <Text style={styles.upgradeText}>Upgrade to Premium</Text>
</TouchableOpacity>
```

---

## 📊 Premium Analytics Fields

```javascript
{
  total_completions: 156,
  current_streak: 14,
  longest_streak: 28,
  completion_rate_7d: 85.7,    // percentage
  completion_rate_30d: 78.3,   // percentage
  completion_rate_90d: 72.1,   // percentage
  best_day_of_week: 'Monday',
  average_time_of_day: '07:30:00',
  most_productive_hour: 7,
  consistency_score: 76.5,     // 0-100
  predicted_success_rate: 82.0 // percentage
}
```

---

## 🔔 Error Handling

### Premium Feature Errors
```javascript
if (error?.code === 'PREMIUM_FEATURE_REQUIRED') {
  showUpgradePrompt(error.message);
}

if (error?.code === 'HABIT_LIMIT_REACHED') {
  showLimitReachedAlert();
}
```

### Standard Error Handler
```javascript
const handlePremiumFeature = async (featureFunction) => {
  const { data, error } = await featureFunction();
  
  if (error?.isPremiumFeature) {
    Alert.alert(
      '🌟 Premium Feature',
      error.message,
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Upgrade', onPress: () => navigation.navigate('Payment') }
      ]
    );
    return null;
  }
  
  if (error) {
    Alert.alert('Error', error.message);
    return null;
  }
  
  return data;
};
```

---

## 🧪 Testing

### Test as Premium User
```javascript
// In your test setup or manually in Supabase
await userProfiles.updateSubscription(testUserId, {
  tier: 'personal',
  status: 'active',
  endsAt: new Date('2099-12-31')
});
```

### Test as Free User
```javascript
await userProfiles.updateSubscription(testUserId, {
  tier: 'free',
  status: 'inactive',
  endsAt: null
});
```

### Test Habit Limit
```javascript
// Create 5 habits as free user
for (let i = 0; i < 5; i++) {
  await habits.create({
    user_id: userId,
    name: `Test Habit ${i + 1}`
  });
}

// Try to create 6th habit - should fail
const { error } = await habits.create({
  user_id: userId,
  name: 'Habit #6'
});

console.log(error.isPremiumFeature); // true
console.log(error.code); // 'HABIT_LIMIT_REACHED'
```

---

## 🔄 Subscription States

```javascript
const SUBSCRIPTION_STATES = {
  ACTIVE: 'active',       // User has active premium
  INACTIVE: 'inactive',   // Free user
  CANCELLED: 'cancelled', // Cancelled but still active until end date
  EXPIRED: 'expired'      // Past end date, reverted to free
};

const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PERSONAL: 'personal',
  ENTERPRISE: 'enterprise'
};
```

---

## 📦 Required Dependencies

Add these to `package.json` if not already present:

```json
{
  "dependencies": {
    "react-native-chart-kit": "^6.12.0",
    "expo-file-system": "~15.4.0",
    "expo-sharing": "~11.5.0"
  }
}
```

Install:
```bash
npm install react-native-chart-kit expo-file-system expo-sharing
```

---

## 🎯 Conversion Points

Show upgrade prompts at these moments:
1. ✅ **When creating 6th habit** (hit limit)
2. ✅ **After 7-day streak** (user is engaged)
3. ✅ **When viewing statistics** (natural upsell)
4. ✅ **When exploring locked features** (desire activated)
5. ✅ **Weekly reminder** (gentle nudge)

---

## 🐛 Common Issues

### "Premium feature not working after subscription"
- Check `subscription_status` is 'active'
- Verify `subscription_ends_at` is in the future
- Ensure `subscription_tier` is 'personal' or 'enterprise'
- Check computed column `is_premium` is true

### "Habit limit not enforcing"
- Verify `can_create_habit()` function exists
- Check RPC call is working in service layer
- Ensure habits table has correct user_id

### "Analytics showing undefined"
- Verify user has completions data
- Check `get_habit_analytics()` function exists
- Ensure user is premium (function throws error if not)

---

## 📱 Navigation Setup

Add these routes to your navigator:

```javascript
<Stack.Screen 
  name="PremiumFeatures" 
  component={PremiumFeaturesScreen}
  options={{ title: 'Premium Features' }}
/>
<Stack.Screen 
  name="AdvancedAnalytics" 
  component={AdvancedAnalyticsScreen}
  options={{ title: 'Advanced Analytics' }}
/>
```

---

## 💾 Storage Buckets

Create these in Supabase Storage:
1. `profile-images` - User profile pictures
2. `habit-photos` - Progress photos

Policies:
```sql
-- Allow users to upload their own photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'habit-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own photos
CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'habit-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🎉 Ready to Launch!

Your habit tracker now has comprehensive premium features that provide real value to paying users while maintaining a generous free tier.

**Key Selling Points:**
- ✅ Unlimited habits vs 5 limit
- ✅ Advanced analytics with predictions
- ✅ Data export and ownership
- ✅ Visual progress tracking
- ✅ Personalization options

**Next Steps:**
1. Run all database migrations
2. Test premium features thoroughly
3. Set up PayFast webhook to activate subscriptions
4. Add premium feature highlights to onboarding
5. Monitor conversion metrics
6. Iterate based on user feedback

---

**Questions?** Check `Documentation/PREMIUM_FEATURES.md` for detailed guide.
