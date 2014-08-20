//
//  PhotoUploader.m
//  ForgeModule
//
//  Created by Julien Dupuis on 20/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import "PhotoUploader.h"
#import "Constants.h"
#import "BTPhotoImageUploadRequest.h"

@interface PhotoUploader()

// Upload URL and authentication string
@property (assign) NSString *uploadURL;
@property (assign) NSString *authentication;

// True if the upload thread is running
@property (assign) BOOL isUploading;

// True when we want to cancel the current upload
@property (assign) BOOL cancelCurrentUpload;

// Id of the photo currently being uploaded
@property (assign) NSNumber *currentPhoto;

// The queue of ids of photos waiting for upload (enqueued at the end, dequeued at the front)
@property (nonatomic, strong) NSMutableArray *pendingPhotos;

// The list of ids of photos that have been successfully uploaded
@property (nonatomic, strong) NSMutableArray *uploadedPhotos;

// A mutex to avoid accessing these arrays concurrently
@property (nonatomic, strong) NSObject *mutex;

// A map converting an asset URL to the corresponding integer photo id
@property (nonatomic, strong) NSMutableDictionary *urlToPhotoIdMap;

// A map converting a photo id to an asset object
@property (nonatomic, strong) NSMutableDictionary *photoIdToAssetMap;

// The asset library
@property (nonatomic, strong) ALAssetsLibrary *library;

@end


@implementation PhotoUploader

+ (PhotoUploader *)singleton {
    static PhotoUploader* singleton = NULL;
    if (!singleton) singleton = [PhotoUploader new];
    return singleton;
}

- (id)init {
    if (self = [super init]) {
        self.pendingPhotos = [NSMutableArray new];
        self.uploadedPhotos = [NSMutableArray new];
        self.mutex = [NSObject new];
        self.urlToPhotoIdMap = [NSMutableDictionary new];
        self.photoIdToAssetMap = [NSMutableDictionary new];
        self.library = [ALAssetsLibrary new];
    }
    return self;
}

- (void)setUploadURL:(NSString *)uploadURL authentication:(NSString *)authentication {
    self.uploadURL = uploadURL;
    self.authentication = authentication;
}

- (BOOL)isPhotoUploaded:(int)photoId {
    // TODO
}

- (void)uploadPhoto:(NSNumber *)photoId {
    @synchronized(self.mutex) {
        // Check if photo is currently being uploaded
        if (self.currentPhoto == photoId) {
            NSLog(@"Upload of photo %@ is already in progress", photoId);
            [[ForgeApp sharedApp] event:@"photoupload.started" withParam:[self eventDataForId:photoId]];
            return;
        }
        // Check if photo is already in the queue
        if ([self.pendingPhotos containsObject:photoId]) {
            NSLog(@"Photo %@ already in upload queue", photoId);
            return;
        }
        // Check if photo is already uploaded
        if ([self.uploadedPhotos containsObject:photoId]) {
            NSLog(@"Photo %@ is already uploaded", photoId);
            [[ForgeApp sharedApp] event:@"photoupload.uploaded" withParam:photoId];
            return;
        }
        
        // Add the photo to the upload queue
        [self.pendingPhotos addObject:photoId];
        
        // Start upload if it is not started yet
        [self startUploading];
    }
}

- (void)cancelUpload:(NSNumber *)photoId {
    NSLog(@"Call to PhotoUploader.cancelUpload(%@)", photoId);
    @synchronized(self.mutex) {
        // Remove from pending upload queue
        [self.pendingPhotos removeObject:photoId];
        // Check if the photo is being uploaded
        if ([self.currentPhoto isEqual:photoId]) {
            // This photo is currently being uploaded, interrupt upload
            self.cancelCurrentUpload = true;
            // TODO interrupt upload thread
        }
    }
}

- (NSString *)getFacetId:(NSNumber *)photoId {
    // TODO
}


// Private methods

- (void)startUploading {
    @synchronized(self.mutex) {
        // Check if upload thread already exists
        if (self.isUploading) {
            // TODO interrupt thread
            return;
        }
        // Create and start upload thread
        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, (unsigned long)NULL), ^(void) {
            [self runUploadThread];
        });
    }
}

- (void)setPhotoUploaded:(NSNumber *)photoId withFacetId:(NSString *)facetId {
    // TODO
}

- (void)runUploadThread {
    while (true) {
        // Get photo id
        NSNumber *photoId;
        @synchronized(self.mutex) {
            if (self.pendingPhotos.count == 0) {
                // No more photo to upload, close thread
                self.isUploading = false;
                return;
            }
            photoId = self.pendingPhotos.firstObject;
            [self.pendingPhotos removeObjectAtIndex:0];
            self.currentPhoto = photoId;
        }
        // Upload photo
        @try {
            NSLog(@"Uploading photo %@", photoId);
            NSString *facetId = [self uploadPhotoNow:photoId];
            // Mark photo as uploaded
            @synchronized(self.mutex) {
                [self setPhotoUploaded:photoId withFacetId:facetId];
                self.currentPhoto = NULL;
            }
        } @catch (NSException *exception) {
            // TODO manage photo does not exist anymore
            
            // An error occurred
            if (self.cancelCurrentUpload) {
                // TODO (not yet supported anyway)
            } else {
                NSLog(@"Error while uploading photo: %@", exception);
                // Generate 'failed' event
                NSMutableDictionary *eventData = [self eventDataForId:photoId];
                [eventData setObject:exception.description forKey:@"error"];
                [[ForgeApp sharedApp] event:@"photoupload.failed" withParam:eventData];
                // Re-enqueue photo
                @synchronized (self.mutex) {
                    self.currentPhoto = NULL;
                    [self.pendingPhotos addObject:photoId];
                }
                // Wait 1 minute before continuing
                [NSThread sleepForTimeInterval:60];
            }
        }
    }
}

- (NSString *)uploadPhotoNow:(NSNumber *)photoId {
    // Generate 'started' event
    [[ForgeApp sharedApp] event:@"photoupload.started" withParam:[self eventDataForId:photoId]];
    
    // Get asset for photoId
    ALAsset *asset = [self.photoIdToAssetMap objectForKey:photoId];
    
    // Create request
    NSURLRequest *request = [BTPhotoImageUploadRequest uploadRequestForAsset:asset];
    
    // Run request
    NSURLResponse *response = nil;
    NSError *error = nil;
    NSData *data = [NSURLConnection sendSynchronousRequest:request
                          returningResponse:&response
                                      error:&error];
    if (error) {
        NSLog(@"photo upload error code: %ld", (long)[error code]);
        @throw @"An error has occured";
    } else {
        int statusCode = (int)[(NSHTTPURLResponse *) response statusCode];
        NSLog(@"photo uploader got %@", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]);
        NSLog(@"photo upload success: status %d", statusCode);
        
        NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:nil error:&error];
        
        // TODO check if response is 'ok' and get facetId
        NSString *facetId = [[json objectForKey:@"payload"] objectForKey:@"id"];
        return facetId;
    }

}

- (NSMutableDictionary *)eventDataForId:(NSNumber *)photoId {
    return [NSMutableDictionary dictionaryWithDictionary:@{@"photoId": photoId}];
}

- (void)saveOptions:(NSDictionary *)options {
    
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    
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
    [[NSUserDefaults standardUserDefaults] synchronize];
}

@end
