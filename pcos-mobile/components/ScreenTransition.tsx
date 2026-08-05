import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DURATION = 260;

type Direction = "forward" | "back";

type Slot = { key: string; node: ReactNode; backgroundColor: string };

type Props = {
  screenKey: string;
  direction: Direction;
  backgroundColor: string;
  children: ReactNode;
};

// Cross-fades in a horizontal slide between whatever `children` was on the
// previous render and the new one, keyed by `screenKey`. Forward moves
// (going deeper, e.g. dashboard -> profile) slide in from the right; back
// moves (e.g. sign out, "home") slide in from the left, mimicking a native
// stack navigator without pulling in react-navigation.
export default function ScreenTransition({ screenKey, direction, backgroundColor, children }: Props) {
  const keyRef = useRef(screenKey);
  const prevRef = useRef<Slot>({ key: screenKey, node: children, backgroundColor });
  const outgoingRef = useRef<Slot | null>(null);
  const dirRef = useRef<Direction>(direction);
  const progress = useRef(new Animated.Value(1)).current;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (keyRef.current === screenKey) return;
    keyRef.current = screenKey;
    dirRef.current = direction;
    outgoingRef.current = prevRef.current;
    progress.setValue(0);
    setTick((t: number) => t + 1);
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      useNativeDriver: true,
    }).start(() => {
      outgoingRef.current = null;
      setTick((t: number) => t + 1);
    });
  }, [screenKey]);

  useEffect(() => {
    prevRef.current = { key: screenKey, node: children, backgroundColor };
  });

  const outgoing = outgoingRef.current;
  const isForward = dirRef.current === "forward";

  const outgoingTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: isForward ? [0, -SCREEN_WIDTH] : [0, SCREEN_WIDTH],
  });
  const incomingTranslate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: isForward ? [SCREEN_WIDTH, 0] : [-SCREEN_WIDTH, 0],
  });

  return (
    <View style={styles.fill}>
      {outgoing && (
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { backgroundColor: outgoing.backgroundColor, transform: [{ translateX: outgoingTranslate }] }]}
        >
          {outgoing.node}
        </Animated.View>
      )}
      <Animated.View
        style={[styles.fill, { backgroundColor, transform: [{ translateX: outgoing ? incomingTranslate : 0 }] }]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
});
