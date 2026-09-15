import type { ReactNode } from 'react';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { StyleProp, ViewStyle } from 'react-native';

type Props = {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedSurface({ children, delay = 0, style }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(360).delay(delay).reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
