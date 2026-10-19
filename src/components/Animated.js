import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Animated, Easing, Text, Pressable, TouchableOpacity } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';

export const easing = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Returns an integer that increments every time the screen regains focus.
 * Use it as a `key` on a wrapper so entry animations replay on each visit.
 */
export function useFocusKey() {
  const isFocused = useIsFocused();
  const [count, setCount] = useState(0);
  const wasFocused = useRef(isFocused);

  useEffect(() => {
    if (isFocused && !wasFocused.current) setCount((c) => c + 1);
    wasFocused.current = isFocused;
  }, [isFocused]);

  return count;
}

export function ScreenAnimator({ children }) {
  const focusKey = useFocusKey();
  return React.cloneElement(children, { key: `screen-${focusKey}` });
}

export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  containerStyle,
  scaleTo = 0.95,
  spring = true,
  haptic,
  activeOpacity,
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toScale, toOpacity, withSpring) => {
      const useSpring = withSpring && spring;
      const cfg = useSpring
        ? { toValue: toScale, useNativeDriver: true, friction: 6, tension: 200 }
        : { toValue: toScale, duration: 110, easing, useNativeDriver: true };
      const cfgO = useSpring
        ? { toValue: toOpacity, useNativeDriver: true, friction: 6, tension: 200 }
        : { toValue: toOpacity, duration: 110, easing, useNativeDriver: true };
      Animated.parallel([Animated.spring(scale, cfg), Animated.spring(opacity, cfgO)]).start();
    },
    [scale, opacity, spring]
  );

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    animateTo(scaleTo, activeOpacity != null ? activeOpacity : 0.85, false);
    if (haptic) haptic();
  }, [disabled, animateTo, scaleTo, activeOpacity, haptic]);

  const handlePressOut = useCallback(() => {
    animateTo(1, 1, true);
  }, [animateTo]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={containerStyle}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function AnimatedIconButton({ children, onPress, style, pressedStyle, disabled, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, friction: 5, tension: 220 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 220 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={style}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function FadeInView({ children, delay = 0, duration = 480, translateY = 18, style, ...rest }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  const translateYValue = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [translateY, 0],
  });

  return (
    <Animated.View
      style={[{ opacity: progress, transform: [{ translateY: translateYValue }] }, style]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}

export function PopInView({ children, delay = 0, duration = 420, from = 0.94, style, ...rest }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 1] });

  return (
    <Animated.View style={[{ opacity: progress, transform: [{ scale }] }, style]} {...rest}>
      {children}
    </Animated.View>
  );
}

export function AnimatedBar({ pct, color, trackColor, height = 7, delay = 120, duration = 700, style }) {
  const progress = useRef(new Animated.Value(0)).current;
  const target = Math.min(Math.max(pct || 0, 0), 100);

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: target,
      duration,
      delay,
      easing,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, target, delay, duration]);

  const width = progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: trackColor, overflow: 'hidden' }, style]}>
      <Animated.View style={{ width, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </Animated.View>
  );
}

export function CountUp({ value = 0, duration = 900, delay = 0, prefix = '', suffix = '', decimals = 2, style }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    progress.setValue(0);
    const id = progress.addListener(({ value: v }) => setDisplay(valueRef.current * v));
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: false,
    });
    anim.start();
    return () => {
      progress.removeListener(id);
      anim.stop();
    };
  }, [value, progress, duration, delay]);

  return (
    <Text style={style}>{`${prefix}${display.toFixed(decimals)}${suffix}`}</Text>
  );
}

export function AnimatedCurrency({ value = 0, duration = 900, delay = 0, style }) {
  const [display, setDisplay] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    progress.setValue(0);
    const id = progress.addListener(({ value: v }) => setDisplay(valueRef.current * v));
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: false,
    });
    anim.start();
    return () => {
      progress.removeListener(id);
      anim.stop();
    };
  }, [value, progress, duration, delay]);

  return <Text style={style}>{formatCurrency(display)}</Text>;
}
