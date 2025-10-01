import React, {useState, useRef} from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme, spacing, borderRadius, fontSize } from '../constants/Theme';

export default function PaymentScreen({ navigation }) {
  const theme = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [showWebview, setShowWebview] = useState(false);
  const webviewRef = useRef();

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

      <TouchableOpacity style={styles.payButton} onPress={onStartPayment} activeOpacity={0.8}>
        <Text style={styles.payButtonText}>{selectedPlan === 'free' ? 'Continue (Free)' : `Subscribe - ${plans[selectedPlan].priceLabel}`}</Text>
      </TouchableOpacity>

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
