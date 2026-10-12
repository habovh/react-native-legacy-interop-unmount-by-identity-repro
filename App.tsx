import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  Settings,
  StyleSheet,
  Text,
  View,
  requireNativeComponent,
  type ViewProps,
} from 'react-native';

// A Paper (old architecture) view manager, rendered through the legacy view manager interop layer.
const LegacyContainer = requireNativeComponent<ViewProps & {expectedChildren: number}>('LegacyContainer');

const COLORS: Record<string, string> = {
  a: '#e6194b',
  b: '#3cb44b',
  c: '#4363d8',
  x: '#f58231',
  y: '#911eb4',
};

// One native view per child (no children of its own), so the container's subview count is the number of keys.
const Box = ({name, slot}: {name: string; slot: number}) => (
  <View style={[styles.box, {left: slot * 52, backgroundColor: COLORS[name]}]} />
);

// Each scenario is a sequence of commits (the keys of the children) applied one second apart.
const SCENARIOS: Record<string, string[][]> = {
  // The number of children stays 3 between the first two commits, so the host view receives no update and the child
  // inserted at the front stays queued in the interop layer: the container shows 2 children instead of 3 until the
  // next commit (logged as MISMATCH). Expected at the end: x a.
  'insert at the front': [['a', 'b', 'c'], ['x', 'a', 'b'], ['x', 'a']],
};

// A deterministic pseudo-random sequence of keyed lists (a linear congruential generator, so runs are comparable).
const randomCommits = (count: number): string[][] => {
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648);
  const letters = ['a', 'b', 'c', 'x', 'y'];
  return Array.from({length: count}, () =>
    letters.filter(() => next() % 3 !== 0).sort(() => (next() % 2 ? 1 : -1)),
  );
};
SCENARIOS['random keyed swaps'] = randomCommits(40);

export default function App() {
  const [keys, setKeys] = useState<string[]>(['a', 'b', 'c']);
  const [log, setLog] = useState('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback((name: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    SCENARIOS[name].forEach((commit, i) => {
      timers.current.push(
        setTimeout(() => {
          setKeys(commit);
          setLog(`${name}: commit ${i + 1}/${SCENARIOS[name].length} -> [${commit.join(' ')}]`);
        }, i * 1000),
      );
    });
  }, []);

  // `defaults write <bundle id> scenario "<name>"` on the simulator runs a scenario at launch (see README).
  useEffect(() => {
    const name = Settings.get('scenario');
    if (typeof name === 'string' && SCENARIOS[name]) {
      run(name);
    }
  }, [run]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Children of a Paper view through the interop layer</Text>
        <Text style={styles.title}>{log}</Text>
        {/* A fixed size, so the host view is never updated by the commits below. */}
        <LegacyContainer style={styles.container} expectedChildren={keys.length}>
          {keys.map((k, i) => (
            <Box key={k} name={k} slot={i} />
          ))}
        </LegacyContainer>
        <Text style={styles.title}>Expected children, left to right: {keys.join(' ')}</Text>
        {Object.keys(SCENARIOS).map(name => (
          <Button key={name} title={name} onPress={() => run(name)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: 16, gap: 12},
  title: {fontWeight: '600', color: '#888'},
  container: {width: 300, height: 60, backgroundColor: '#eee'},
  box: {position: 'absolute', top: 10, width: 44, height: 40, },
});
