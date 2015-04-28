//
//  PhotoUploader.h
//  ForgeModule
//
//  Created by Julien Dupuis on 20/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>


// This singleton class uploads photos to the Fluxtream server
@interface PhotoUploader : NSObject

// Id of the currently connected user
@property (nonatomic, strong) NSString *userId;

// Gets the unique instance of PhotoUploader
+ (PhotoUploader *)singleton;

// Sets the upload parameters
- (void)setParams:(NSDictionary *)params;

// Logs out the current user and empty the upload queue
- (void)logoutUser;

// Returns whether the given photo has already been uploaded
- (BOOL)isPhotoUploaded:(NSNumber *)photoId;

// Marks the given photo for upload
- (void)uploadPhoto:(NSNumber *)photoId;

// Cancels the upload of the given photo if it has not started yet
- (void)cancelUpload:(NSNumber *)photoId;

// Returns the facetId for the given photo
- (NSString *)getFacetId:(NSNumber *)photoId;

// Returns whether an upload is in progress
- (BOOL)isCurrentlyUploading;

// Marks a photo as unuploaded and optionally delete it
- (void)markPhotoAsUnuploaded:(NSNumber *)photoId delete:(BOOL)deletePhoto;

@end
