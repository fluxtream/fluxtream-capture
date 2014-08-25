//
//  AutouploadService.m
//  ForgeModule
//
//  Created by Julien Dupuis on 25/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import "AutouploadService.h"
#import "Constants.h"
#import "PhotoLibrary.h"
#import "PhotoUploader.h"
#import "PhotoAsset.h"


#define WAIT_ON_ACTIVE 2
#define WAIT_ON_NO_PHOTO 600
#define WAIT_ON_UPLOAD 2
#define WAIT_ON_DISABLED 60
#define WAIT_ON_ERROR 60

@interface AutouploadService()

// Whether photos in these orientations are being automatically uploaded
@property (nonatomic) BOOL uploadPortrait;
@property (nonatomic) BOOL uploadUpsiteDown;
@property (nonatomic) BOOL uploadLandscapeLeft;
@property (nonatomic) BOOL uploadLandscapeRight;

// Only photos after these timestamps will be uploaded automatically
@property (nonatomic) int portraitMinimumTimestamp;
@property (nonatomic) int upsideDownMinimumTimestamp;
@property (nonatomic) int landscapeLeftMinimumTimestamp;
@property (nonatomic) int landscapeRightMinimumTimestamp;

// Thread
@property (nonatomic, strong) NSThread *autouploadThread;
@property (nonatomic, strong) NSCondition *unpauseCondition;

@end


@implementation AutouploadService

+ (AutouploadService *)singleton {
    static AutouploadService *singleton;
    if (!singleton) singleton = [AutouploadService new];
    return singleton;
}

- (id)init {
    if (self = [super init]) {
        NSLog(@"Initiation AutouploadService singleton");
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(assetsLibraryChanged:) name:ALAssetsLibraryChangedNotification object:nil];
        self.unpauseCondition = [NSCondition new];
        [self readAutouploadParameters];
        NSThread *thread = [[NSThread alloc] initWithTarget:self selector:@selector(runAutouploadThread) object:nil];
        [thread start];
    }
    return self;
}

- (void)startAutouploadService:(NSDictionary *)options {
    NSLog(@"Setting autoupload options");
    [self saveOptions:options];
}

- (void)stopAutouploadService {
    [self saveOptions:@{@"upload_portrait": @NO,
                        @"upload_upside_down": @NO,
                        @"upload_landscape_left": @NO,
                        @"upload_landscape_right": @NO
                       }];
}

// Retrieves the autoupload parameters from the user defaults
- (void)readAutouploadParameters {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    self.uploadPortrait = [defaults boolForKey:DEFAULTS_PHOTO_ORIENTATION_PORTRAIT];
    self.uploadUpsiteDown = [defaults boolForKey:DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN];
    self.uploadLandscapeLeft = [defaults boolForKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT];
    self.uploadLandscapeRight = [defaults boolForKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT];
    self.portraitMinimumTimestamp = [[defaults objectForKey:DEFAULTS_PHOTO_ORIENTATION_PORTRAIT_MIN_TIMESTAMP] intValue];
    self.upsideDownMinimumTimestamp = [[defaults objectForKey:DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN_MIN_TIMESTAMP] intValue];
    self.landscapeLeftMinimumTimestamp = [[defaults objectForKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT_MIN_TIMESTAMP] intValue];
    self.landscapeRightMinimumTimestamp = [[defaults objectForKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT_MIN_TIMESTAMP] intValue];
    [[PhotoUploader singleton] setUploadURL:[defaults objectForKey:DEFAULTS_UPLOAD_URL] authentication:[defaults objectForKey:DEFAULTS_AUTHENTICATION]];
}

- (void)saveOptions:(NSDictionary *)options {
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    // Apply parameters
    for (NSString* key in options) {
        if ([key isEqualToString:@"upload_portrait"]) {
            [defaults setBool:[options[key] boolValue] forKey:DEFAULTS_PHOTO_ORIENTATION_PORTRAIT];
        } else if ([key isEqualToString:@"upload_upside_down"]) {
            [defaults setBool:[options[key] boolValue] forKey:DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN];
        } else if ([key isEqualToString:@"upload_landscape_left"]) {
            [defaults setBool:[options[key] boolValue] forKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT];
        } else if ([key isEqualToString:@"upload_landscape_right"]) {
            [defaults setBool:[options[key] boolValue] forKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT];
        } else if ([key isEqualToString:@"portrait_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:DEFAULTS_PHOTO_ORIENTATION_PORTRAIT_MIN_TIMESTAMP];
        } else if ([key isEqualToString:@"upside_down_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN_MIN_TIMESTAMP];
        } else if ([key isEqualToString:@"landscape_left_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT_MIN_TIMESTAMP];
        } else if ([key isEqualToString:@"landscape_right_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT_MIN_TIMESTAMP];
        } else if ([key isEqualToString:@"upload_url"]) {
            [defaults setObject:options[key] forKey:DEFAULTS_UPLOAD_URL];
        } else if ([key isEqualToString:@"authentication"]) {
            [defaults setObject:options[key] forKey:DEFAULTS_AUTHENTICATION];
        } else {
            NSLog(@"Unknown option: %@", key);
        }
    }
    // Save parameters
    [[NSUserDefaults standardUserDefaults] synchronize];
    // Apply parameters
    [self readAutouploadParameters];
    // Interrupt waiting thread
    [self.unpauseCondition lock];
    [self.unpauseCondition signal];
    [self.unpauseCondition unlock];
}

- (void)runAutouploadThread {
    NSLog(@"Starting autoupload thread");
    while (true) {
        // Look for a new picture to upload
        double waitTime = [self checkForNewPhotos];
        [self.unpauseCondition lock];
        [self.unpauseCondition waitUntilDate:[NSDate dateWithTimeIntervalSinceNow:waitTime]];
        [self.unpauseCondition unlock];
    }
}

- (double)checkForNewPhotos {
    @synchronized (self) {
        if ([[PhotoUploader singleton] isCurrentlyUploading]) {
            // Don't make simultaneous requests to the photo uploader
            NSLog(@"A photo upload is already in progress, wait");
            return WAIT_ON_ACTIVE;
        }
        if (self.uploadPortrait || self.uploadUpsiteDown || self.uploadLandscapeLeft || self.uploadLandscapeRight) {
            NSLog(@"Checking for new photos");
            NSCondition *photoListLoadedCondition = [NSCondition new];
            [photoListLoadedCondition lock];
            [[PhotoLibrary singleton] getPhotoListWithSuccess:^(NSDictionary *assets) {
                NSLog(@"Photo library reloaded");
                [photoListLoadedCondition lock];
                [photoListLoadedCondition signal];
                [photoListLoadedCondition unlock];
            } error:^(NSError *error) {
                // An error has occurred
                [photoListLoadedCondition lock];
                [photoListLoadedCondition signal];
                [photoListLoadedCondition unlock];
            }];
            NSLog(@"Waiting for photo list reload");
            [photoListLoadedCondition wait];
            NSLog(@"End waiting for photo list reload");
            [photoListLoadedCondition unlock];
            // Look through photos
            NSArray *photos = [PhotoAsset photos];
            for (PhotoAsset *photo in photos) {
                if (!photo.actualAsset) {
                    // The photo has been deleted from the device
                    continue;
                }
                if ([photo.uploadStatus isEqualToString:@"uploaded"]) {
                    // The photo has already been uploaded
                    NSLog(@"Photo already uploaded: %@", photo);
                    continue;
                }
                BOOL mustBeUploaded = YES;
                ALAssetOrientation orientation = (ALAssetOrientation)[[photo.actualAsset valueForProperty:ALAssetPropertyOrientation] intValue];
                NSDate *date = [photo.actualAsset valueForProperty:ALAssetPropertyDate];
                int dateTaken = [NSNumber numberWithLong:date.timeIntervalSince1970].intValue;
                switch (orientation) {
                    case ALAssetOrientationUp:
                    case ALAssetOrientationUpMirrored:
                        // Landscape left
                        if (!self.uploadLandscapeLeft) mustBeUploaded = false;
                        if (dateTaken < self.landscapeLeftMinimumTimestamp) mustBeUploaded = false;
                        break;
                    case ALAssetOrientationDown:
                    case ALAssetOrientationDownMirrored:
                        // Landscape right
                        if (!self.uploadLandscapeRight) mustBeUploaded = false;
                        if (dateTaken < self.landscapeRightMinimumTimestamp) mustBeUploaded = false;
                        break;
                    case ALAssetOrientationLeft:
                    case ALAssetOrientationLeftMirrored:
                        // Upsite down
                        if (!self.uploadUpsiteDown) mustBeUploaded = false;
                        if (dateTaken < self.upsideDownMinimumTimestamp) mustBeUploaded = false;
                        break;
                    case ALAssetOrientationRight:
                    case ALAssetOrientationRightMirrored:
                        // Portrait
                        if (!self.uploadPortrait) mustBeUploaded = false;
                        if (dateTaken < self.portraitMinimumTimestamp) mustBeUploaded = false;
                        break;
                    default:
                        NSLog(@"Unknown photo orientation");
                        mustBeUploaded = false;
                        break;
                }
                if (mustBeUploaded) {
                    NSLog(@"Found a photo to upload");
                    [[PhotoUploader singleton] uploadPhoto:photo.identifier];
                    return WAIT_ON_UPLOAD;
                }
                NSLog(@"Photo need not be uploaded: %@", photo);
            }
            NSLog(@"No photo to upload");
            return WAIT_ON_NO_PHOTO;
        }
        NSLog(@"Service is disabled");
        return WAIT_ON_DISABLED;
    }
}

#pragma mark - Assets Library Notifications

- (void)assetsLibraryChanged:(NSNotification *)notification {
    [self.unpauseCondition lock];
    [self.unpauseCondition signal];
    [self.unpauseCondition unlock];
}

@end
