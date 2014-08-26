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

// Get the unique instance of PhotoUploader
+ (PhotoUploader *)singleton;

// Set the upload parameters
- (void)setUploadURL:(NSString *)uploadURL authentication:(NSString *)authentication;

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

@end
