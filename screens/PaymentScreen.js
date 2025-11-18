import React, {useState, useRef, useEffect} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme, spacing, borderRadius, fontSize } from '../constants/Theme';
import { auth, userProfiles, subscriptionTable } from '../services/supabaseService';
import { AnimatedPressable } from '../ui/animations';

// PRODUCTION NOTE: For production deployments, implement a server-side notify_url (webhook)
// to receive PayFast IPN notifications. The server should verify the payment signature and
// update the subscription in the database. This client-side approach is suitable for
// development/testing but should be complemented with server-side verification in production.
// See Documentation/PAYMENT.md for more details.

export default function PaymentScreen({ navigation }) {
  const theme = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [showWebview, setShowWebview] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const webviewRef = useRef();

  useEffect(() => {
    // Get current user
    const loadUser = async () => {
      try {
        const { data } = await auth.getCurrentUser();
        if (data?.user) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const updateSubscription = async (tier) => {
    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to subscribe');
      return false;
    }

    try {
      // Calculate subscription end date (30 days from now)
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 30);

      // Update user profile subscription fields
      const { data: profileData, error: profileError } = await userProfiles.updateSubscription(currentUser.id, {
        tier: tier,
        status: 'active',
        endsAt: endsAt.toISOString(),
      });

      // Save to subscriptions table (for premium tracking)
      let plan = tier;
      let provider = 'payfast';
      let provider_subscription_id = null; // You can set this if you have a real provider subscription ID
      let status = 'active';
      await subscriptionTable.create({
        user_id: currentUser.id,
        provider,
        provider_subscription_id,
        plan,
        status,
      });

      if (profileError) {
        console.error('Subscription update error:', profileError);
        Alert.alert('Error', 'Failed to update subscription. Please contact support.');
        return false;
      }

      Alert.alert(
        'Success!',
        `Your ${tier} subscription is now active. You have full access to all premium features!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return true;
    } catch (error) {
      console.error('Subscription update error:', error);
      Alert.alert('Error', 'Failed to update subscription. Please contact support.');
      return false;
    }
  };

  const plans = {
    free: { id: 'free', title: 'Free', subtitle: 'Basic features', priceLabel: 'R0 / month' },
    personal: { id: 'personal', title: 'Personal', subtitle: 'Full features for 1 user', priceLabel: 'R25 / month' },
    enterprise: { id: 'enterprise', title: 'Enterprise', subtitle: 'Up to 15 users', priceLabel: 'R250 / month' }
  };

  // PayFast sandbox process URL
  const payfastSandboxUrl = 'https://sandbox.payfast.co.za/eng/process';

  // For the sandbox we will POST a small HTML form into the WebView and auto-submit it.
  // You MUST replace merchant_id and merchant_key with server-generated values in production.
  function buildPayfastForm(plan) {
    // Amount mapping
    const amount = plan === 'personal' ? '25.00' : plan === 'enterprise' ? '250.00' : '0.00';

    // Every PayFast integration must have server-side signature/hash. This example is for sandbox/demo only.
    // Replace merchant_id, merchant_key, return_url, cancel_url and notify_url with your server endpoints.
    const merchant_id = '10000100'; // sandbox demo merchant id
    const merchant_key = '46f0cd694581a'; // sandbox demo merchant key

    const merchant_email = 'merchant@example.com';
    const item_name = plan === 'enterprise' ? 'HabitTracker Enterprise (15 users) Subscription' : plan === 'personal' ? 'HabitTracker Personal Subscription' : 'HabitTracker Free Plan';

    const return_url = 'https://example.com/payfast/return';
    const cancel_url = 'https://example.com/payfast/cancel';
    const notify_url = 'https://example.com/payfast/notify';

    // Simple HTML form auto-submits to PayFast sandbox
    return `
      <html>
        <body>
          <form id="payform" action="${payfastSandboxUrl}" method="post">
            <input name="merchant_id" value="${merchant_id}" />
            <input name="merchant_key" value="${merchant_key}" />
            <input name="return_url" value="${return_url}" />
            <input name="cancel_url" value="${cancel_url}" />
            <input name="notify_url" value="${notify_url}" />
            <input name="amount" value="${amount}" />
            <input name="item_name" value="${item_name}" />
            <input name="email_address" value="${merchant_email}" />
            <input type="submit" value="Pay" />
          </form>
          <script>document.getElementById('payform').submit();</script>
        </body>
      </html>
    `;
  }

  function onStartPayment() {
    if (selectedPlan === 'free') {
      Alert.alert('Free plan selected', 'You are on the free plan. No payment required.');
      return;
    }

    setShowWebview(true);
  }

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a plan</Text>
      <View style={styles.planList}>
        {Object.values(plans).map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.planItem, selectedPlan === p.id ? styles.planSelected : null]}
            onPress={() => setSelectedPlan(p.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.planTitle}>{p.title}</Text>
            <Text style={styles.planSubtitle}>{p.subtitle}</Text>
            <Text style={styles.planPrice}>{p.priceLabel}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <AnimatedPressable style={styles.payButton} onPress={onStartPayment}>
        <Text style={styles.payButtonText}>{selectedPlan === 'free' ? 'Continue (Free)' : `Subscribe - ${plans[selectedPlan].priceLabel}`}</Text>
      </AnimatedPressable>

      {showWebview && selectedPlan !== 'free' ? (
        <View style={styles.webviewContainer}>
          <TouchableOpacity style={styles.closeWebview} onPress={() => setShowWebview(false)}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <WebView
            ref={webviewRef}
            originWhitelist={["*"]}
            source={{ html: buildPayfastForm(selectedPlan) }}
            javaScriptEnabled={true}
            onMessage={(event) => {
              // You can handle messages from the page here if needed
            }}
            onNavigationStateChange={async (navState) => {
              // Check if the user has returned to the return_url (success page)
              if (navState.url.includes('payfast/return') || navState.url.includes('success')) {
                setShowWebview(false);
                // Update subscription in database
                await updateSubscription(selectedPlan);
              } else if (navState.url.includes('payfast/cancel') || navState.url.includes('cancel')) {
                setShowWebview(false);
                Alert.alert('Payment Cancelled', 'Your payment was cancelled.');
              }
            }}
            startInLoadingState={true}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: spacing.md,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    planList: {
      marginTop: spacing.sm,
    },
    planItem: {
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: theme.colors.card,
      marginBottom: spacing.sm,
    },
    planSelected: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    planTitle: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: '600'
    },
    planSubtitle: {
      color: theme.colors.textSecondary,
    },
    planPrice: {
      marginTop: spacing.xs,
      color: theme.colors.primary,
      fontWeight: '700'
    },
    payButton: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: borderRadius.lg,
      alignItems: 'center'
    },
    payButtonText: {
      color: '#fff',
      fontWeight: '700'
    },
    webviewContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background
    },
    closeWebview: {
      padding: spacing.sm,
      alignItems: 'flex-end'
    },
    closeText: {
      color: theme.colors.primary,
      fontWeight: '700'
    }
  });
}
