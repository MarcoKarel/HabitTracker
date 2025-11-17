# Premium Features Guide

This document outlines all the premium features added to the Habit Tracker app to make subscriptions worthwhile.

## 🌟 Premium Tiers

### Free Plan (R0/month)
- **5 Habits Maximum** - Limited to 5 active habits
- **Basic Statistics** - View completion rates and streaks
- **Standard Reminders** - One reminder per habit
- **Basic Themes** - Light and dark mode

### Personal Plan (R25/month)
- **Unlimited Habits** - Create as many habits as you need
- **Advanced Analytics** - Detailed insights and predictions
- **Habit Categories** - Organize habits by custom categories
- **Premium Templates** - Access exclusive habit templates
- **Custom Themes** - Create personalized color schemes
- **Progress Photos** - Track visual progress
- **Data Export** - Export data in JSON/CSV format
- **Multiple Reminders** - Set multiple reminders per habit
- **Priority Support** - Faster response times

### Enterprise Plan (R250/month for up to 15 users)
- **All Personal Features**
- **Team Collaboration** - Share habits with team members
- **Admin Dashboard** - Manage team members
- **Advanced Reporting** - Team-wide analytics
- **API Access** - Integrate with other tools
- **Dedicated Support** - 24/7 priority support

---

## 📊 Feature Details

### 1. **Unlimited Habits**
**Free:** 5 habit limit  
**Premium:** Unlimited

Free users see a warning when approaching the 5-habit limit and are prompted to upgrade when trying to create more.

**Implementation:**
- Database function: `can_create_habit(p_user_id)`
- Service layer check in `habits.create()`
- UI indicators on HomeScreen showing habit count

---

### 2. **Advanced Analytics** 
**Screen:** `AdvancedAnalyticsScreen.js`

Premium users get access to detailed habit analytics including:
- **Completion Rate Trends** - 7-day, 30-day, and 90-day rates
- **Best Day of Week** - When you're most likely to complete the habit
- **Most Productive Hour** - Your peak performance time
- **Consistency Score** - How consistent you are over time
- **Success Predictions** - AI-predicted likelihood of completion
- **Personalized Recommendations** - Tips to improve based on your data

**Charts & Visualizations:**
- Bar charts showing completion rate trends
- Insight cards with key metrics
- Recommendation cards with actionable tips

**Database Functions:**
- `get_habit_analytics(p_user_id, p_habit_id)` - Returns comprehensive analytics
- `habit_insights` table - Caches daily insights for performance

---

### 3. **Habit Categories & Tags**
**Premium Feature**

Organize habits into custom categories like:
- Health & Fitness
- Productivity
- Learning
- Mindfulness
- Social

**Features:**
- Create unlimited categories
- Assign custom icons and colors
- Tag habits with multiple keywords
- Filter and sort by category

**Database:**
- `habit_categories` table
- `category_id` and `tags[]` columns in habits table

---

### 4. **Premium Habit Templates**
**Screen:** `PremiumFeaturesScreen.js`

Pre-made habit templates to get started quickly:

**Free Templates:**
- Morning Exercise
- Drink Water
- Meditation
- Read 30 Minutes
- Journal

**Premium Templates:**
- Learn New Language
- Meal Prep
- Deep Work Session
- Practice Instrument
- Networking

**Features:**
- Personalized recommendations based on existing habits
- One-tap habit creation from templates
- Suggested reminder times
- Pre-configured categories and tags

**Database Functions:**
- `get_habit_recommendations(p_user_id)` - Returns personalized template suggestions
- `habit_templates` table with `is_premium` flag

---

### 5. **Custom Themes**
**Premium Feature**

Create and save custom color schemes:
- Primary color
- Secondary color
- Background colors
- Accent colors
- Text colors

**Features:**
- Multiple saved themes per user
- One active theme at a time
- Preview before applying
- Export/import theme JSON

**Database:**
- `custom_themes` table
- `colors` JSONB field for color values

---

### 6. **Progress Photos**
**Premium Feature**

Track visual progress with photos:
- Attach photos to habit completions
- Before/after comparison view
- Photo gallery per habit
- Add notes to photos
- Cloud storage integration

**Features:**
- Upload from camera or gallery
- Automatic date stamping
- Photo timeline view
- Share progress photos

**Database:**
- `habit_photos` table
- Storage bucket: `habit-photos`
- Links to completions via `completion_id`

---

### 7. **Data Export**
**Premium Feature**
**Screen:** `PremiumFeaturesScreen.js`

Export all your habit data:

**Formats:**
- **JSON** - Complete data structure with all metadata
- **CSV** - Spreadsheet-friendly format for analysis

**Exported Data:**
- Profile information
- All habits with details
- All completions with dates
- Categories and tags
- Statistics summary
- Export timestamp

**Implementation:**
- Database function: `export_user_data(p_user_id)`
- Service functions: `downloadAsJSON()`, `downloadAsCSV()`
- Uses Expo FileSystem and Sharing APIs

---

### 8. **Advanced Reminders**
**Premium Feature**

**Free:** 1 reminder per habit  
**Premium:** Multiple reminders per habit

Features:
- Multiple times per day
- Custom days of the week
- Smart suggestions based on completion history
- Snooze and reschedule
- Reminder history

**Database:**
- `reminders` table supports multiple entries per habit
- `days[]` array for day-of-week targeting

---

### 9. **Insights & Predictions**
**Premium Feature**

AI-powered insights:
- **Pattern Detection** - "You complete habits better in the morning"
- **Streak Predictions** - Likelihood of maintaining streak
- **Best Time Suggestions** - Optimal reminder times
- **Habit Pairing** - Habits that work well together
- **Risk Alerts** - Warning when streak is at risk

**Database:**
- `habit_insights` table with `predictions` and `insights` JSONB fields
- Updated daily via scheduled job

---

### 10. **Priority Support**
**Premium Feature**

Premium users get:
- Faster response times (24 hours vs 3 days)
- Direct email support
- Priority bug fixes
- Feature request consideration
- Dedicated support badge in app

---

## 🔧 Implementation Guide

### 1. Run Database Migrations

```sql
-- Run in Supabase SQL Editor

-- First, run the base schema
-- File: Documentation/supabase_schema.sql

-- Then run the streak tracking setup
-- File: Documentation/streak_tracking_setup.sql

-- Finally, run the premium features schema
-- File: Documentation/premium_features_schema.sql
```

### 2. Update Supabase Service

The `services/supabaseService.js` file has been enhanced with:
- `userProfiles.isPremium(userId)` - Check premium status
- `userProfiles.updateSubscription()` - Update subscription after payment
- `habits.getHabitCount()` - Get user's habit count
- `habits.getAnalytics()` - Get advanced analytics (premium)
- `habitCategories` - CRUD operations for categories
- `habitTemplates` - Get templates and recommendations
- `dataExport` - Export functions
- `customThemes` - Theme management
- `habitPhotos` - Photo upload and management

### 3. Add New Screens to Navigation

Update your navigation to include:
- `AdvancedAnalyticsScreen` - Detailed analytics
- `PremiumFeaturesScreen` - Premium features hub

### 4. Update Payment Processing

When a user successfully completes payment (via PayFast webhook):

```javascript
import { userProfiles } from '../services/supabaseService';

// After PayFast confirms payment
await userProfiles.updateSubscription(userId, {
  tier: 'personal', // or 'enterprise'
  status: 'active',
  endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
});
```

### 5. Handle Habit Creation Limits

The `habits.create()` function automatically checks limits:

```javascript
const { data, error } = await habits.create({
  user_id: userId,
  name: habitName,
  // ... other fields
});

if (error?.isPremiumFeature) {
  // Show upgrade prompt
  Alert.alert(
    'Upgrade Required',
    error.message,
    [
      { text: 'Cancel' },
      { text: 'Upgrade', onPress: () => navigation.navigate('Payment') }
    ]
  );
}
```

---

## 🎨 UI/UX Enhancements

### Premium Indicators

1. **Home Screen**
   - Shows habit count vs limit for free users
   - Premium badge for premium users
   - Upgrade card prominently displayed

2. **Habits Screen**
   - Lock icon on "Add Habit" button when limit reached
   - Premium badge on premium-only features

3. **Feature Screens**
   - Beautiful "locked" state with feature list
   - Clear upgrade CTA buttons
   - Preview of what premium offers

### Visual Design

- **Premium Badge:** Gold star icon (#FFD700)
- **Lock Icon:** Shown on locked features
- **Upgrade Cards:** Eye-catching gradient backgrounds
- **Charts:** Professional charts using `react-native-chart-kit`

---

## 📈 Analytics & Tracking

Track premium feature usage:
1. Number of habits created (vs limit)
2. Analytics screen views
3. Export requests
4. Template usage
5. Theme customizations

This helps understand which features drive conversions.

---

## 🚀 Future Premium Features

Consider adding these in future updates:
1. **Habit Sharing** - Share habits with friends
2. **Social Features** - Follow other users, leaderboards
3. **Gamification** - Achievements, badges, points
4. **Integrations** - Google Calendar, Fitbit, etc.
5. **AI Coach** - Personalized coaching based on data
6. **Custom Reports** - Generate PDF/email reports
7. **Backup & Sync** - Multi-device sync
8. **Widgets** - Home screen widgets
9. **Apple Watch / Wear OS** - Companion apps
10. **Teams & Groups** - Shared accountability

---

## 💡 Marketing Tips

### Value Communication

Emphasize the value proposition:
- **Time Savings:** "Advanced analytics save you hours of manual tracking"
- **Success Rate:** "Premium users are 3x more likely to maintain streaks"
- **Flexibility:** "Unlimited habits means unlimited potential"

### Pricing Strategy

- **Free Trial:** Consider 7-day free trial for premium
- **Annual Discount:** Offer 2 months free with annual subscription
- **Referral Program:** Give 1 month free for each referral

### Conversion Points

Show upgrade prompts at high-engagement moments:
1. When user completes 7-day streak (they're invested)
2. When user tries to create 6th habit (hit the limit)
3. After user views statistics (show "see more with premium")
4. When user explores features section

---

## 🔒 Security Considerations

1. **Server-Side Validation:** Always check premium status on server
2. **Token Expiration:** Check subscription end date before granting access
3. **Webhook Verification:** Verify PayFast webhooks with signature
4. **Data Privacy:** Ensure exported data is only accessible to owner

---

## 📱 Installation & Testing

### Testing Premium Features Locally

```javascript
// Manually set user to premium for testing
await userProfiles.updateSubscription(userId, {
  tier: 'personal',
  status: 'active',
  endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
});
```

### Testing Limits

```javascript
// Test free user limits
await userProfiles.updateSubscription(userId, {
  tier: 'free',
  status: 'inactive',
  endsAt: null
});
```

---

## 📞 Support

For issues or questions about premium features:
- Email: support@habittracker.app
- Documentation: /Documentation folder
- GitHub Issues: For bug reports

---

## ✅ Checklist for Launch

- [ ] Database migrations run successfully
- [ ] All premium functions tested
- [ ] Payment webhook configured
- [ ] Subscription expiration handling implemented
- [ ] UI indicators working correctly
- [ ] Analytics tracking set up
- [ ] Support documentation created
- [ ] Marketing materials prepared
- [ ] Pricing clearly displayed
- [ ] Free trial period configured (if applicable)
- [ ] Refund policy documented
- [ ] Terms of service updated
- [ ] Privacy policy updated

---

## 📊 Expected ROI

With these premium features:
- **Conversion Rate:** Aim for 5-10% free to paid
- **Retention:** Premium users have 70%+ retention
- **Lifetime Value:** Average premium user worth R300-900
- **Upgrade Drivers:** Analytics (35%), Unlimited Habits (40%), Export (15%), Other (10%)

---

**Last Updated:** November 17, 2025  
**Version:** 1.0
