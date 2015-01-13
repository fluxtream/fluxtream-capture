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
#import "PhotoLibrary.h"

@interface PhotoUploader()

// Upload URL, authentication string and access token
@property (nonatomic, strong) NSString *uploadURL;
@property (nonatomic, strong) NSString *authentication;
@property (nonatomic, strong) NSString *accessToken;
@property (nonatomic, strong) NSNumber *accessTokenExpiration;
@property (nonatomic, strong) NSString *accessTokenUpdateURL;

// True if the upload thread is running
@property (nonatomic) BOOL isUploading;

// Id of the photo currently being uploaded
@property (nonatomic, strong) NSNumber *currentPhoto;

// The queue of ids of photos waiting for upload (enqueued at the end, dequeued at the front)
@property (nonatomic, strong) NSMutableArray *pendingPhotos;

// A mutex to avoid accessing these arrays concurrently
@property (nonatomic, strong) NSObject *mutex;

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
        self.mutex = [NSObject new];
    }
    return self;
}

- (void)setParams:(NSDictionary *)params {
    self.userId = [params objectForKey:@"userId"];
    NSLog(@"Set user id: %@", self.userId);
    self.uploadURL = [params objectForKey:@"upload_url"];
    self.authentication = [params objectForKey:@"authentication"];
    self.accessToken = [params objectForKey:@"access_token"];
    self.accessTokenExpiration = [params objectForKey:@"access_token_expiration"];
    self.accessTokenUpdateURL = [params objectForKey:@"access_token_update_url"];
    
    [[PhotoLibrary singleton] clearPhotoList];
}

- (void)logoutUser {
    NSLog(@"Call to logoutUser");
    @synchronized (self.mutex) {
        self.userId = nil;
        self.uploadURL = nil;
        self.authentication = nil;
        self.currentPhoto = nil;
        [self.pendingPhotos removeAllObjects];
        [[PhotoLibrary singleton] clearPhotoList];
        
        // TODO interrupt upload thread
    }
}

- (BOOL)isPhotoUploaded:(NSNumber *)photoId {
    return [[[PhotoLibrary singleton] photoWithId:photoId].uploadStatus isEqual:@"uploaded"];
}

- (void)uploadPhoto:(NSNumber *)photoId {
    NSLog(@"Received request to upload photo %@", photoId);
    @synchronized (self.mutex) {
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
        // Find photo
        PhotoAsset *photo = [[PhotoLibrary singleton] photoWithId:photoId];
        // Check if photo exists
        if (!photo) {
            NSLog(@"Photo %@ does not exist", photoId);
            return;
        }
        // Check if photo is already uploaded
        if ([photo.uploadStatus isEqualToString:@"uploaded"]) {
            NSLog(@"Photo %@ is already uploaded", photoId);
            [[ForgeApp sharedApp] event:@"photoupload.uploaded" withParam:[self eventDataForId:photoId]];
            return;
        }
        
        // Add the photo to the upload queue
        [self.pendingPhotos addObject:photoId];
        
        // Mark the photo as pending
        photo.uploadStatus = @"pending";
        
        // Start upload if it is not started yet
        [self startUploading];
    }
}

- (void)cancelUpload:(NSNumber *)photoId {
    NSLog(@"Call to PhotoUploader.cancelUpload(%@)", photoId);
    @synchronized (self.mutex) {
        // Remove from pending upload queue
        [self.pendingPhotos removeObject:photoId];
        // Find photo
        PhotoAsset *photo = [[PhotoLibrary singleton] photoWithId:photoId];
        // Reset photo status
        photo.uploadStatus = @"none";
    }
}

- (NSString *)getFacetId:(NSNumber *)photoId {
    return [[PhotoLibrary singleton] photoWithId:photoId].facetId;
}

- (BOOL)isCurrentlyUploading {
    return self.isUploading;
}


// Private methods

// Starts the upload thread if it is not running yet
- (void)startUploading {
    NSLog(@"Starting upload thread");
    @synchronized (self.mutex) {
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

// Mark a photo as uploaded
- (void)setPhotoUploaded:(NSNumber *)photoId withFacetId:(NSString *)facetId {
    PhotoAsset *photo = [[PhotoLibrary singleton] photoWithId:photoId];
    photo.facetId = facetId;
    photo.uploadStatus = @"uploaded"; // This will persist the data to the local storage
}

// Runs a loop to upload all the pending photos
- (void)runUploadThread {
    NSLog(@"Upload thread started");
    while (true) {
        // Check that there is a user connected
        if (!self.userId) {
            NSLog(@"User disconnected, stopping upload thread (1)");
            @synchronized (self.mutex) {
                self.isUploading = false;
            }
            return;
        }
        // Check that the photo list is initialized
        NSLog(@"Checking that the list is initialized");
        while (![[PhotoLibrary singleton] isInitialized]) {
            NSLog(@"Photo array not ready yet");
            [NSThread sleepForTimeInterval:0.1];
        }
        NSLog(@"The list is initialized");
        // Get photo id
        NSNumber *photoId;
        @synchronized (self.mutex) {
            if (self.pendingPhotos.count == 0) {
                NSLog(@"No more photos to upload, closing upload thread");
                // No more photo to upload, close thread
                @synchronized (self.mutex) {
                    self.isUploading = false;
                }
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
            NSLog(@"uploadPhotoNow returned without any error");
            // Mark photo as uploaded
            @synchronized (self.mutex) {
                if (!self.userId) {
                    NSLog(@"User disconnected, stopping upload thread (2)");
                    self.isUploading = false;
                    return;
                }
                if (facetId) {
                    NSLog(@"mark photo %@ as uploaded", photoId);
                    [self setPhotoUploaded:photoId withFacetId:facetId];
                } else {
                    // The photo does not exist anymore
                    NSLog(@"The photo does not exist anymore");
                }
                self.currentPhoto = NULL;
            }
        } @catch (NSException *exception) {
            // Check if the thread should end
            if (!self.userId) {
                NSLog(@"User disconnected, stopping upload thread (3)");
                @synchronized (self.mutex) {
                    self.isUploading = false;
                }
                return;
            }
            // An error occurred
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

// Uploads the given photo (this method is blocking, and should only be called from the upload thread)
- (NSString *)uploadPhotoNow:(NSNumber *)photoId {
    // Generate 'started' event
    [[ForgeApp sharedApp] event:@"photoupload.started" withParam:[self eventDataForId:photoId]];
    
    // Get asset for photoId
    PhotoAsset *photoAsset = [[PhotoLibrary singleton] photoWithId:photoId];
    if (!photoAsset) return nil;
    ALAsset *asset = photoAsset.actualAsset;
    if (!asset) {
        NSLog(@"Photo asset for id %@: %@", photoId, photoAsset);
        @throw [NSException exceptionWithName:@"An error has occurred"
                                       reason:@"Photo asset not found"
                                     userInfo:nil];
    }
    
    // Create request
    NSLog(@"Starting request to %@", self.uploadURL);
    NSURLRequest *request = [PhotoUploadRequest uploadRequestForAsset:asset
                                                            uploadURL:self.uploadURL
                                                       authentication:self.authentication
                                                          accessToken:self.accessToken];
    
    // Run request
    NSURLResponse *response = nil;
    NSError *error = nil;
    NSData *data = [NSURLConnection sendSynchronousRequest:request
                                         returningResponse:&response
                                                     error:&error];
    if (error) {
        NSLog(@"photo upload error code: %ld", (long)[error code]);
        NSLog(@"%@", error);
        @throw [NSException exceptionWithName:@"An error has occurred"
                                       reason:[NSString stringWithFormat:@"Received wrong response code: %d, %@", error.code, error.description]
                                     userInfo:nil];
    } else {
        int statusCode = (int)[(NSHTTPURLResponse *) response statusCode];
        if (statusCode != 200) {
            @throw [NSException exceptionWithName:@"An error has occurred"
                                           reason:[NSString stringWithFormat:@"Received wrong response code: %d, %@", error.code, error.description]
                                         userInfo:nil];
        }
        NSLog(@"photo uploader got %@", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]);
        NSLog(@"photo upload success: status %d", statusCode);
        
        NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingAllowFragments error:&error];
        
        // Make sure that the result we receive is "OK"
//        NSString *resultField = [json objectForKey:@"result"];
//        if (![resultField isEqualToString:@"OK"]) {
//            @throw [NSException exceptionWithName:@"An error occurred while uploading the photo"
//                                           reason:[NSString stringWithFormat:@"Result is %@", resultField]
//                                         userInfo:nil];
//        }
        
        // Get facetId
        NSString *facetId = [NSString stringWithFormat:@"%@", [json objectForKey:@"id"]];
        if (!facetId || [facetId isEqualToString:@""]) {
            @throw [NSException exceptionWithName:@"An error has occurred"
                                           reason:[NSString stringWithFormat:@"No facet id in %@", data]
                                         userInfo:nil];
        }
        
        // Generate 'uploaded' event
        @synchronized (self.mutex) {
            if (self.userId) {
                [[ForgeApp sharedApp] event:@"photoupload.uploaded" withParam:[self eventDataForId:photoId]];
            }
        }
        
        return facetId;
    }
    
}

// Returns a pre-filled dictionary with the photoId for Forge events
- (NSMutableDictionary *)eventDataForId:(NSNumber *)photoId {
    return [NSMutableDictionary dictionaryWithDictionary:@{@"photoId": photoId}];
}

@end
