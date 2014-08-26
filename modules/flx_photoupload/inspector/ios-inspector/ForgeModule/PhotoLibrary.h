//
//  PhotoLibrary.h
//  ForgeModule
//
//  Created by Julien Dupuis on 11/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>


// This singleton class provides a method to fetch the list
// of photos from the device's image library
@interface PhotoLibrary : NSObject

// Returns the unique instance of this class
+ (PhotoLibrary *)singleton;

// Fetches the list of photos
- (void)getPhotoListWithSuccess:(void(^)(NSArray *))successBlock
                          error:(void(^)(NSError *))errorBlock;

@end
