//
//  PhotoUploader.m
//  ForgeModule
//
//  Created by Julien Dupuis on 20/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import "PhotoUploader.h"
#import "Constants.h"
#import "PhotoUploadRequest.h"
#import "PhotoAsset.h"

@interface PhotoUploader()

// Upload URL and authentication string
@property (nonatomic, strong) NSString *uploadURL;
@property (nonatomic, strong) NSString *authentication;

// True if the upload thread is running
@property (nonatomic) BOOL isUploading;

// True when we want to cancel the current upload
@property (nonatomic) BOOL cancelCurrentUpload;

// Id of the photo currently being uploaded
@property (nonatomic, strong) NSNumber *currentPhoto;

// The queue of ids of photos waiting for upload (enqueued at the end, dequeued at the front)
@property (nonatomic, strong) NSMutableArray *pendingPhotos;

// The list of ids of photos that have been successfully uploaded
@property (nonatomic, strong) NSMutableArray *uploadedPhotos;

// A mutex to avoid accessing these arrays concurrently
@property (nonatomic, strong) NSObject *mutex;

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
        self.library = [ALAssetsLibrary new];
    }
    return self;
}

- (void)setUploadURL:(NSString *)uploadURL authentication:(NSString *)authentication {
    self.uploadURL = uploadURL;
    self.authentication = authentication;
}

- (BOOL)isPhotoUploaded:(NSNumber *)photoId {
    return [[PhotoAsset photoWithId:photoId].uploadStatus isEqual:@"uploaded"];
}

- (void)uploadPhoto:(NSNumber *)photoId {
    NSLog(@"Received request to upload photo %@", photoId);
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
    return [PhotoAsset photoWithId:photoId].facetId;
}

- (BOOL)isCurrentlyUploading {
    return self.isUploading;
}


// Private methods

- (void)startUploading {
    NSLog(@"Starting upload thread");
    @synchronized(self.mutex) {
        // Check if upload thread already exists
        if (self.isUploading) {
            // TODO interrupt thread
            return;
        }
        // Mark as uploading
        self.isUploading = true;
        // Create and start upload thread
        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, (unsigned long)NULL), ^(void) {
            [self runUploadThread];
        });
    }
}

- (void)setPhotoUploaded:(NSNumber *)photoId withFacetId:(NSString *)facetId {
    PhotoAsset *photo = [PhotoAsset photoWithId:photoId];
    photo.facetId = facetId;
    photo.uploadStatus = @"uploaded";
}

- (void)runUploadThread {
    NSLog(@"Upload thread started");
    while (true) {
        // Get photo id
        NSNumber *photoId;
        @synchronized(self.mutex) {
            if (self.pendingPhotos.count == 0) {
                NSLog(@"No more photos to upload, closing upload thread");
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
                if (facetId) {
                    [self setPhotoUploaded:photoId withFacetId:facetId];
                } else {
                    // The photo does not exist anymore
                }
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
                [NSThread sleepForTimeInterval:6]; // TODO 60
            }
        }
    }
}

- (NSString *)uploadPhotoNow:(NSNumber *)photoId {
    // Generate 'started' event
    [[ForgeApp sharedApp] event:@"photoupload.started" withParam:[self eventDataForId:photoId]];
    
    // Get asset for photoId
    PhotoAsset *photoAsset = [PhotoAsset photoWithId:photoId];
    if (!photoAsset) return nil;
    ALAsset *asset = photoAsset.actualAsset;
    
    // Create request
    NSLog(@"Starting request to %@", self.uploadURL);
    NSURLRequest *request = [PhotoUploadRequest uploadRequestForAsset:asset
                                                            uploadURL:self.uploadURL
                                                       authentication:self.authentication];
    
    // Run request
    NSURLResponse *response = nil;
    NSError *error = nil;
    NSData *data = [NSURLConnection sendSynchronousRequest:request
                                         returningResponse:&response
                                                     error:&error];
    if (error) {
        NSLog(@"photo upload error code: %ld", (long)[error code]);
        NSLog(@"%@", error);
        @throw [NSException exceptionWithName:@"An error has occurred" reason:@"Received wrong response code" userInfo:nil];
    } else {
        int statusCode = (int)[(NSHTTPURLResponse *) response statusCode];
        NSLog(@"photo uploader got %@", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]);
        NSLog(@"photo upload success: status %d", statusCode);
        
        NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:&error];
        
        // Make sure that the result we receive is "OK"
        NSString *resultField = [json objectForKey:@"result"];
        if (![resultField isEqualToString:@"OK"]) {
            @throw [NSException exceptionWithName:@"An error occurred while uploading the photo"
                                           reason:[NSString stringWithFormat:@"Result is %@", resultField]
                                         userInfo:nil];
        }
        
        // Get facetId
        NSString *facetId = [[json objectForKey:@"payload"] objectForKey:@"id"];
        return facetId;
    }
    
}

- (NSMutableDictionary *)eventDataForId:(NSNumber *)photoId {
    return [NSMutableDictionary dictionaryWithDictionary:@{@"photoId": photoId}];
}

@end
