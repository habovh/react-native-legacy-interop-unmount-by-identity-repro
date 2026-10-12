#import <React/RCTViewManager.h>
#import <React/UIView+React.h>

// A Paper view manager with no Fabric component of its own: Fabric hosts it through the
// legacy view manager interop layer (RCTLegacyViewManagerInteropComponentView).
//
// Like most Paper container views, it keeps the children it is given in `reactSubviews` and attaches them
// in `didUpdateReactSubviews` (the default UIView+React behaviour). The overrides below only log and check.
@interface LegacyContainerView : UIView
// How many children the container is expected to hold, as rendered by React.
@property (nonatomic, strong) NSNumber *expectedChildren;
@end

@implementation LegacyContainerView

- (void)insertReactSubview:(UIView *)subview atIndex:(NSInteger)atIndex
{
  NSLog(@"[legacy-container] insertReactSubview tag:%ld atIndex:%ld (reactSubviews: %lu)", (long)subview.tag, (long)atIndex, (unsigned long)self.reactSubviews.count);
  [super insertReactSubview:subview atIndex:atIndex];
}

- (void)removeReactSubview:(UIView *)subview
{
  NSLog(@"[legacy-container] removeReactSubview tag:%ld (reactSubviews: %lu)", (long)subview.tag, (unsigned long)self.reactSubviews.count);
  [super removeReactSubview:subview];
}

- (void)didUpdateReactSubviews
{
  NSLog(@"[legacy-container] didUpdateReactSubviews (reactSubviews: %lu)", (unsigned long)self.reactSubviews.count);
  [super didUpdateReactSubviews];
  [NSObject cancelPreviousPerformRequestsWithTarget:self selector:@selector(checkChildren) object:nil];
  [self performSelector:@selector(checkChildren) withObject:nil afterDelay:0.5];
}

// Once the commits have settled, the container must hold exactly the children React rendered.
- (void)checkChildren
{
  NSUInteger actual = self.subviews.count;
  BOOL ok = self.expectedChildren == nil || actual == self.expectedChildren.unsignedIntegerValue;
  NSLog(@"[legacy-container] %@: %lu subviews, %@ expected, %lu in reactSubviews",
        ok ? @"OK" : @"MISMATCH", (unsigned long)actual, self.expectedChildren, (unsigned long)self.reactSubviews.count);
  self.layer.borderWidth = ok ? 0 : 4;
  self.layer.borderColor = UIColor.redColor.CGColor;
}

@end

@interface LegacyContainerViewManager : RCTViewManager
@end

@implementation LegacyContainerViewManager

RCT_EXPORT_MODULE(LegacyContainer)

RCT_EXPORT_VIEW_PROPERTY(expectedChildren, NSNumber)

- (UIView *)view
{
  UIView *view = [LegacyContainerView new];
  view.clipsToBounds = YES;
  return view;
}

@end
