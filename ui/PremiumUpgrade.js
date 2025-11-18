import { Alert } from 'react-native';

export const showPremiumUpgrade = (navigation, opts = {}) => {
  const title = opts.title || '🌟 Premium Feature';
  const message = opts.message || 'This feature requires a Premium subscription. Upgrade now to unlock it!';
  const upgradeLabel = opts.upgradeLabel || 'Upgrade';
  const cancelLabel = opts.cancelLabel || 'Not Now';

  Alert.alert(
    title,
    message,
    [
      { text: cancelLabel, style: 'cancel' },
      { text: upgradeLabel, onPress: () => navigation?.navigate && navigation.navigate('Payment') }
    ],
    { cancelable: true }
  );
};

export default showPremiumUpgrade;
