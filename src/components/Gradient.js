import React from 'react';
import { View, StyleSheet } from 'react-native';

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function mix(from, to, t) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function Gradient({ colors, steps = 12, style, children, ...rest }) {
  const [from, to] = colors;

  return (
    <View style={[styles.container, style]} {...rest}>
      {Array.from({ length: steps }).map((_, i) => {
        const t = i / (steps - 1);
        return (
          <View
            key={i}
            style={[
              styles.band,
              {
                backgroundColor: mix(from, to, t),
                top: `${(i * 100) / steps}%`,
                height: `${100 / steps + 0.5}%`,
              },
            ]}
          />
        );
      })}
      {children != null && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0 },
  content: { flex: 1 },
});

export default Gradient;
