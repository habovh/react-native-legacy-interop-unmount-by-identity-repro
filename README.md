# Reproducer: LegacyViewManagerInterop unmounts the wrong child (ghost views, `Attempt to recycle a mounted view`)

A minimal React Native 0.87.1 app (New Architecture, iOS) with a single old-architecture (Paper) container view,
`LegacyContainer`, that Fabric hosts through the legacy view manager interop layer
(`RCTLegacyViewManagerInteropComponentView`). The container has no native dependency besides React; it is a plain
`UIView` that keeps its children in `reactSubviews` and attaches them in `didUpdateReactSubviews`.

React renders keyed children into it. Commits that insert and remove children make the interop layer remove the wrong
child from the Paper view, because `unmountChildComponentView:index:` uses the Fabric index as an index into the Paper
view's `reactSubviews` (the two differ while mounts are queued):

- **Release builds:** ghost views. The container holds more subviews than React rendered, and wrong views are missing.
- **Debug builds:** an assertion terminates the app when the view that should have been removed is deleted while still
  attached: `RCTComponentViewRegistry: Attempt to recycle a mounted view.`
  (`-[RCTComponentViewRegistry _enqueueComponentViewWithComponentHandle:componentViewDescriptor:]`, from
  `RCTPerformMountInstructions`).

## Run

```sh
npm install
cd ios && bundle install && bundle exec pod install && cd ..   # or: pod install
npm start
```

Then run the app in the iOS simulator from Xcode (open `ios/InteropUnmountRepro.xcworkspace`) or `npm run ios`.

Tap **random keyed swaps** (40 deterministic pseudo-random lists of the keys `a b c x y`, 1 s apart; this is the one that
crashes a debug build), or **insert at the front** (three commits: `a b c`, `x a b`, `x a`; a smaller case that shows the
child mounted late).

To run a scenario at launch without tapping (the app reads it through `Settings`, i.e. `NSUserDefaults`):

```sh
xcrun simctl spawn booted defaults write org.reactjs.native.example.InteropUnmountRepro scenario "random keyed swaps"
xcrun simctl launch booted org.reactjs.native.example.InteropUnmountRepro
```

## What to look for

The native view logs every `insertReactSubview:`, `removeReactSubview:` and `didUpdateReactSubviews`, and 0.5 s after the
last update it compares its subview count with the number of children React rendered (the `expectedChildren` prop) and
logs `OK` or `MISMATCH`; on a mismatch the container also gets a red border.

```sh
xcrun simctl spawn booted log stream --predicate 'process == "InteropUnmountRepro" AND eventMessage CONTAINS "[legacy-container] "'
```

Observed on React Native 0.87.1 (unmodified), iOS 27 simulator, Debug:

- `MISMATCH: 8 subviews, 4 expected, 8 in reactSubviews` (also 6 vs 3, 6 vs 5, ...): ghost children;
- the process aborts a few commits in with the assertion above (two runs out of two).

With the fix (branch `fix/legacy-interop-unmount-by-identity` of https://github.com/habovh/react-native, two commits), the
same run logs only `OK` lines (40 of 40) and does not crash. To try it, build React Native from source instead of the
prebuilt core (`RCT_USE_PREBUILT_RNCORE=0 pod install`) and apply the commits to `node_modules/react-native` (the file is
`packages/react-native/React/Fabric/Mounting/ComponentViews/LegacyViewManagerInterop/RCTLegacyViewManagerInteropComponentView.mm`
in the React Native repository). The bug itself also reproduces with the default, prebuilt core.

Related upstream issue: https://github.com/facebook/react-native/issues/57872.

## Files

- `App.tsx`: the scenarios and the screen.
- `native/legacy-container/`: the Paper view manager (a local pod, autolinked).
- `ios/InteropUnmountRepro/AppDelegate.swift`: the stock template plus a `SceneDelegate` (iOS 26+ requires the UIScene
  life cycle).
