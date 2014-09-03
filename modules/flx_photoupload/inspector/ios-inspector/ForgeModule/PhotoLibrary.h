//
//  PhotoLibrary.h
//  ForgeModule
//
//  Created by Julien Dupuis on 11/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "PhotoAsset.h"


// This singleton class provides a method to fetch the list
// of photos from the device's image library
@interface PhotoLibrary : NSObject

// Returns the unique instance of this class
+ (PhotoLibrary *)singleton;

// Fetches the list of photos
- (void)getPhotoListWithSuccess:(void(^)(NSArray *))successBlock
                          error:(void(^)(NSError *))errorBlock;

// Returns the complete list of photos (contains PhotoAsset instances)
- (NSArray *)photos;

// Returns (gets from memory or creates) the photo corresponding to the given asset
- (PhotoAsset *)photoWithAsset:(ALAsset *)asset;

// Returns the photo corresponding to the given identifier
- (PhotoAsset *)photoWithId:(NSNumber *)photoId;

// Returns the photo corresponding to the given url
- (PhotoAsset *)photoWithURL:(NSString *)url;

// Saves the photo array to disk
- (void)persistPhotoArray;

// Clears the photo list (used when there is a change of user)
- (void)clearPhotoList;

// Returns whether the library is ready
- (BOOL)isInitialized;

@end
