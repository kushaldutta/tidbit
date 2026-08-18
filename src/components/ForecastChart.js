/**
 * ForecastChart — multi-series line chart drawn with plain Views.
 *
 * The project has no SVG dependency, so each segment is a thin rectangle
 * rotated to the angle between two points. React Native rotates around a
 * view's centre, so positioning each segment at the midpoint of its pair makes
 * the transform exact rather than approximate.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PLOT_HEIGHT = 172;
const GRID_VALUES = [0, 25, 50, 75, 100];
const DASH_COUNT = 26;

function Line({ points, color, width, maxDay, thickness = 2.5, opacity = 1, dotted = false }) {
  if (!points || points.length < 2 || width <= 0) return null;

  const x = (day) => (day / Math.max(maxDay, 1)) * width;
  const y = (pct) => PLOT_HEIGHT - (Math.max(0, Math.min(100, pct)) / 100) * PLOT_HEIGHT;

  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const x1 = x(points[i - 1].day);
    const y1 = y(points[i - 1].pct);
    const x2 = x(points[i].day);
    const y2 = y(points[i].pct);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!length) continue;

    segments.push(
      <View
        key={i}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: (x1 + x2) / 2 - length / 2,
          top: (y1 + y2) / 2 - thickness / 2,
          width: length,
          height: thickness,
          borderRadius: thickness / 2,
          backgroundColor: color,
          opacity: dotted ? opacity * 0.75 : opacity,
          transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
        }}
      />,
    );
  }

  const last = points[points.length - 1];
  segments.push(
    <View
      key="end"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x(last.day) - 4.5,
        top: y(last.pct) - 4.5,
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: color,
        opacity,
      }}
    />,
  );

  return <>{segments}</>;
}

export default function ForecastChart({ series, maxDay, target, theme, xLabels }) {
  const [width, setWidth] = useState(0);
  const styles = makeStyles(theme);
  const targetY = target != null ? PLOT_HEIGHT - (target / 100) * PLOT_HEIGHT : null;

  return (
    <View>
      <View style={styles.plotRow}>
        <View style={styles.yAxis}>
          {GRID_VALUES.slice().reverse().map((v) => (
            <Text key={v} style={styles.yLabel}>{v}</Text>
          ))}
        </View>

        <View
          style={styles.plot}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {GRID_VALUES.map((v) => (
            <View
              key={v}
              pointerEvents="none"
              style={[
                styles.grid,
                { bottom: (v / 100) * PLOT_HEIGHT, backgroundColor: theme.border },
              ]}
            />
          ))}

          {targetY != null && width > 0 && (
            <View pointerEvents="none" style={[styles.dashRow, { top: targetY - 1 }]}>
              {Array.from({ length: DASH_COUNT }).map((_, i) => (
                <View key={i} style={[styles.dash, { backgroundColor: theme.success }]} />
              ))}
            </View>
          )}

          {series.map((s) => (
            <Line
              key={s.key}
              points={s.points}
              color={s.color}
              width={width}
              maxDay={maxDay}
              thickness={s.emphasis ? 3 : 2}
              opacity={s.emphasis ? 1 : 0.72}
            />
          ))}
        </View>
      </View>

      <View style={styles.xAxis}>
        {xLabels.map((label, i) => (
          <Text
            key={label + i}
            style={[
              styles.xLabel,
              i === 0 && { textAlign: 'left' },
              i === xLabels.length - 1 && { textAlign: 'right' },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  plotRow: { flexDirection: 'row' },
  yAxis: {
    width: 26,
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  yLabel: { fontSize: 9, color: theme.textMuted, lineHeight: 10, marginTop: -5 },
  plot: { flex: 1, height: PLOT_HEIGHT, position: 'relative' },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  dashRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dash: { width: 4, height: 2, borderRadius: 1, opacity: 0.65 },
  xAxis: { flexDirection: 'row', marginTop: 8, marginLeft: 26 },
  xLabel: { flex: 1, fontSize: 10, color: theme.textMuted, textAlign: 'center' },
});
