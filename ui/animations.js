import React from 'react';
import { Animated, Pressable } from 'react-native';

// Small hook to return press-in/out handlers and animated style for scale micro-animations
export function usePressScale(initial = 1, pressedTo = 0.96, duration = 90) {
  const scale = React.useRef(new Animated.Value(initial)).current;

  const onPressIn = () => {
    Animated.timing(scale, { toValue: pressedTo, duration, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.timing(scale, { toValue: initial, duration, useNativeDriver: true }).start();
  };

  return { scale, onPressIn, onPressOut };
}

// Simple FadeIn wrapper
export function FadeIn({ children, style, duration = 350 }) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
}

// Pressable + Animated wrapper component for consistent press animations
export function AnimatedPressable({ children, onPress, style, activeOpacity = 0.9, ...props }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      {...props}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default { usePressScale, FadeIn, AnimatedPressable };
