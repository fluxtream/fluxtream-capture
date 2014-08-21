//
//  PhotoUploader.h
//  ForgeModule
//
//  Created by Julien Dupuis on 20/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface PhotoUploader : NSObject

+ (PhotoUploader *)singleton;

- (void)setUploadURL:(NSString *)uploadURL authentication:(NSString *)authentication;
- (BOOL)isPhotoUploaded:(NSNumber *)photoId;
- (void)uploadPhoto:(NSNumber *)photoId;
- (void)cancelUpload:(NSNumber *)photoId;
- (NSString *)getFacetId:(NSNumber *)photoId;

@end
