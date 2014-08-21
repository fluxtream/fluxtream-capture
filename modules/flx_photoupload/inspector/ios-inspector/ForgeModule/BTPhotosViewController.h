
#import <UIKit/UIKit.h>
#import <AssetsLibrary/AssetsLibrary.h>
#import "BTPhotoUploader.h"

@interface BTPhotosViewController : UIViewController <UICollectionViewDataSource, UICollectionViewDelegateFlowLayout>

@property (strong, nonatomic) ALAssetsLibrary *library;
@property (strong, nonatomic) ALAssetsGroup *assetsGroup;

@end
