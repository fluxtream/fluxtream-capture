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

// The userId of the currently connected user
@property (nonatomic, strong) NSString *userId;

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
        // Subscribe to the library change event
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(assetsLibraryChanged:) name:ALAssetsLibraryChangedNotification object:nil];
        // Create interrupt condition for the thread
        self.unpauseCondition = [NSCondition new];
        // Load parameters from user defaults
        [self readAutouploadParameters];
        // Create and start the thread that will check for pictures
        NSThread *thread = [[NSThread alloc] initWithTarget:self selector:@selector(runAutouploadThread) object:nil];
        [thread start];
    }
    return self;
}

- (void)startAutouploadService:(NSDictionary *)options {
    [self saveOptions:options];
}

- (void)stopAutouploadService {
    // Set all autoupload options to false
    [self saveOptions:@{@"upload_portrait": @NO,
                        @"upload_upside_down": @NO,
                        @"upload_landscape_left": @NO,
                        @"upload_landscape_right": @NO
                       }];
}

// Retrieves the autoupload parameters from the user defaults
- (void)readAutouploadParameters {
    @synchronized (self) {
        if (!self.userId) return;
        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        self.uploadPortrait = [defaults boolForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_PORTRAIT]];
        self.uploadUpsiteDown = [defaults boolForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN]];
        self.uploadLandscapeLeft = [defaults boolForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT]];
        self.uploadLandscapeRight = [defaults boolForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT]];
        self.portraitMinimumTimestamp = [[defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_PORTRAIT_MIN_TIMESTAMP]] intValue];
        self.upsideDownMinimumTimestamp = [[defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN_MIN_TIMESTAMP] ] intValue];
        self.landscapeLeftMinimumTimestamp = [[defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT_MIN_TIMESTAMP]] intValue];
        self.landscapeRightMinimumTimestamp = [[defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT_MIN_TIMESTAMP]] intValue];
        // Apply upload url and authentication parameters to PhotoUploader
        NSMutableDictionary *params = [NSMutableDictionary dictionaryWithDictionary:@{
                                                                                      @"userId": self.userId,
                                                                                      @"upload_url": [defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_UPLOAD_URL]],
                                                                                      }];
        NSString *accessToken = [defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_ACCESS_TOKEN]];
        NSString *accessTokenExpiration = [defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_ACCESS_TOKEN_EXPIRATION]];
        NSString *accessTokenUpdateURL = [defaults objectForKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_ACCESS_TOKEN_UPDATE_URL]];
        if (accessToken) [params setObject:accessToken forKey:@"access_token"];
        if (accessTokenExpiration) [params setObject:accessTokenExpiration forKey:@"access_token_expiration"];
        if (accessTokenUpdateURL) [params setObject:accessTokenUpdateURL forKey:@"access_token_update_url"];
        [[PhotoUploader singleton] setParams:params];
    }
}

- (void)saveOptions:(NSDictionary *)options {
    // Save userId
    self.userId = options[@"userId"];
    // Copy parameters to defaults
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    for (NSString* key in options) {
        if ([key isEqualToString:@"upload_portrait"]) {
            [defaults setBool:[options[key] boolValue] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_PORTRAIT]];
        } else if ([key isEqualToString:@"upload_upside_down"]) {
            [defaults setBool:[options[key] boolValue] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN]];
        } else if ([key isEqualToString:@"upload_landscape_left"]) {
            [defaults setBool:[options[key] boolValue] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT]];
        } else if ([key isEqualToString:@"upload_landscape_right"]) {
            [defaults setBool:[options[key] boolValue] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT]];
        } else if ([key isEqualToString:@"portrait_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_PORTRAIT_MIN_TIMESTAMP]];
        } else if ([key isEqualToString:@"upside_down_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_UPSIDE_DOWN_MIN_TIMESTAMP]];
        } else if ([key isEqualToString:@"landscape_left_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_LEFT_MIN_TIMESTAMP]];
        } else if ([key isEqualToString:@"landscape_right_minimum_timestamp"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_PHOTO_ORIENTATION_LANDSCAPE_RIGHT_MIN_TIMESTAMP]];
        } else if ([key isEqualToString:@"upload_url"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_UPLOAD_URL]];
        } else if ([key isEqualToString:@"authentication"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_AUTHENTICATION]];
        } else if ([key isEqualToString:@"access_token"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_ACCESS_TOKEN]];
        } else if ([key isEqualToString:@"access_token_expiration"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_ACCESS_TOKEN_EXPIRATION]];
        } else if ([key isEqualToString:@"access_token_update_url"]) {
            [defaults setObject:options[key] forKey:[NSString stringWithFormat:@"user.%@.autoupload.%@", self.userId, DEFAULTS_ACCESS_TOKEN_UPDATE_URL]];
        } else if ([key isEqualToString:@"userId"]) {
            // Don't record user id, just keep it in memory
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

// Runs the autoupload thread. The autoupload thread never ends.
- (void)runAutouploadThread {
    while (true) {
        // Look for a new picture to upload, and get the time interval to wait
        double waitTime = [self checkForNewPhotos];
        // Sleep for the given time
        [self.unpauseCondition lock];
        [self.unpauseCondition waitUntilDate:[NSDate dateWithTimeIntervalSinceNow:waitTime]];
        [self.unpauseCondition unlock];
    }
}

// Browse the photo list to find a photo to upload next
- (double)checkForNewPhotos {
    @synchronized (self) {
        if (!self.userId) {
            // No user connected, wait
            return 0.5;
        }
        if ([[PhotoUploader singleton] isCurrentlyUploading]) {
            // Don't make simultaneous requests to the photo uploader
            return WAIT_ON_ACTIVE;
        }
        // Look for photos only if autoupload is active
        if (self.uploadPortrait || self.uploadUpsiteDown || self.uploadLandscapeLeft || self.uploadLandscapeRight) {
            NSCondition *photoListLoadedCondition = [NSCondition new];
            [photoListLoadedCondition lock];
            [[PhotoLibrary singleton] getPhotoListWithSuccess:^(NSArray *assets) {
                [photoListLoadedCondition lock];
                [photoListLoadedCondition signal];
                [photoListLoadedCondition unlock];
            } error:^(NSError *error) {
                // An error has occurred
                [photoListLoadedCondition lock];
                [photoListLoadedCondition signal];
                [photoListLoadedCondition unlock];
            }];
            [photoListLoadedCondition wait];
            [photoListLoadedCondition unlock];
            // Look through photos
            NSArray *photos = [[PhotoLibrary singleton] photos];
            for (PhotoAsset *photo in photos) {
                if (!photo.actualAsset) {
                    // The photo has been deleted from the device
                    continue;
                }
                if ([photo.uploadStatus isEqualToString:@"uploaded"]) {
                    // The photo has already been uploaded
                    continue;
                }
                // This will be set to false if the photo must not be uploaded
                BOOL mustBeUploaded = YES;
                // Get photo orientation
                ALAssetOrientation orientation = (ALAssetOrientation)[[photo.actualAsset valueForProperty:ALAssetPropertyOrientation] intValue];
                // Get photo date
                NSDate *date = [photo.actualAsset valueForProperty:ALAssetPropertyDate];
                int dateTaken = [NSNumber numberWithLong:date.timeIntervalSince1970].intValue;
                // Check if photo should be uploaded
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
                    // Send photo for upload
                    [[PhotoUploader singleton] uploadPhoto:photo.identifier];
                    // Stop looking for another photo, only one photo is being uploaded at a time
                    return WAIT_ON_UPLOAD;
                }
            }
            // No photo needs to be uploaded
            return WAIT_ON_NO_PHOTO;
        }
        // Autoupload is currently disabled
        return WAIT_ON_DISABLED;
    }
}

#pragma mark - Assets Library Notifications

// This is called when the photo library is uploaded
- (void)assetsLibraryChanged:(NSNotification *)notification {
    // Interrupt the thread to look again for a photo to upload
    [self.unpauseCondition lock];
    [self.unpauseCondition signal];
    [self.unpauseCondition unlock];
}

@end
