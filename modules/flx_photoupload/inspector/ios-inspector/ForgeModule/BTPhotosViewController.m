#import "BTPhotosViewController.h"
#import "BTPhotoDetailViewController.h"
#import "BTPhotoUploader.h"
#import "BTPhotoAsset.h"
#import "BTCommentBadge.h"
#import "Constants.h"
#import <AssetsLibrary/AssetsLibrary.h>
#import <QuartzCore/QuartzCore.h>

@interface BTPhotosViewController ()

@end

@implementation BTPhotosViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    _library = [[ALAssetsLibrary alloc] init];
    _assetsGroup = [[ALAssetsGroup alloc] init];
}

- (void)dealloc
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

//- (void)button1Tapped:(UIButton *)sender
//{
//    BTPhotoAsset *assetToUpload = [[[BTPhotoUploader sharedPhotoUploader] photos] objectAtIndex:path.row];
//    [assetToUpload setUploadStatus:@"1"];
//    [[[BTPhotoUploader sharedPhotoUploader] photos] replaceObjectAtIndex:path.row withObject:assetToUpload];
//    [[BTPhotoUploader sharedPhotoUploader] uploadNow];
//}

