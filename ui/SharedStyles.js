import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSize, fontWeight, responsive } from '../constants/Theme';

// Centralized shared style helpers to keep styling consistent across app
export const shared = {
  card: (theme) => ({
    backgroundColor: theme.colors.card,
    padding: spacing.md,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  }),

  title: (theme) => ({
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: theme.colors.text,
  }),

  subtitle: (theme) => ({
    fontSize: fontSize.md,
    color: theme.colors.textSecondary,
  }),

  statValue: (theme) => ({
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: theme.colors.primary,
  }),

  statLabel: (theme) => ({
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
  }),
};

// Generic layout helpers that are responsive-aware
export const layout = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

// Re-export responsive helpers for convenience
export const scale = responsive.scale;
export const verticalScale = responsive.verticalScale;
export const moderateScale = responsive.moderateScale;

export default StyleSheet.create({});
