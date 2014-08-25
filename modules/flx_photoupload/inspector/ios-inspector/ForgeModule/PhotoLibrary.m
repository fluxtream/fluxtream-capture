//
//  PhotoLibrary.m
//  ForgeModule
//
//  Created by Julien Dupuis on 11/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import "PhotoLibrary.h"
#import <AssetsLibrary/AssetsLibrary.h>
#import <QuartzCore/QuartzCore.h>
#import "PhotoAsset.h"

@interface PhotoLibrary()

// The full list of available photos
@property (nonatomic, strong) NSArray *photos; // Contains PhotoAsset instances

@end

@implementation PhotoLibrary

+ (ALAssetsLibrary *)getAssetsLibrary {
    static ALAssetsLibrary *library;
    if (!library) library = [ALAssetsLibrary new];
    return library;
}

+ (PhotoLibrary *)singleton {
    static PhotoLibrary* singleton = NULL;
    if (!singleton) singleton = [PhotoLibrary new];
    return singleton;
}

- (void)getPhotoListWithSuccess:(void (^)(NSDictionary *))successBlock
                          error:(void (^)(NSError *))errorBlock {
    
    // List of assets to be sent through the callback
    NSMutableArray *assets = [NSMutableArray new];
    
    // Block: enumerator for the assets within a group
    void (^assetEnumerator)(ALAsset *, NSUInteger, BOOL *) = ^(ALAsset *result, NSUInteger index, BOOL *stop) {
        if (result != NULL) {
            // Find or create photo
            PhotoAsset *photo = [PhotoAsset photoWithAsset:result];
            // Create data dictionary
            NSMutableDictionary *data = [NSMutableDictionary new];
            // Add id
            [data setValue:photo.identifier forKeyPath:@"id"];
            // Add date
            NSDate *dateTaken = [result valueForProperty:ALAssetPropertyDate];
            [data setValue:[NSNumber numberWithLong:dateTaken.timeIntervalSince1970] forKey:@"dateTaken"];
            // Add orientation
            [data setValue:[result valueForProperty:ALAssetPropertyOrientation] forKey:@"orientation"];
            // Add uri
            [data setValue:photo.assetURL forKey:@"uri"];
            // Add thumbnail uri
            UIImage *thumbnailImage = [UIImage imageWithCGImage:[result thumbnail]];
            NSData *imageData = UIImageJPEGRepresentation(thumbnailImage, 1.0);
            NSString *encodedString = [imageData base64Encoding];
            NSString *dataUrl = [NSString stringWithFormat:@"data:image/png;base64,%@", encodedString];
            dataUrl = @"THUMB"; // TODO remove
            [data setValue:dataUrl forKey:@"thumb_uri"];
            // Add asset to list
            [assets addObject:[NSDictionary dictionaryWithDictionary:data]];
        }
    };
    
    // Block: enumerator for asset groups
    void (^assetGroupEnumerator)(ALAssetsGroup *, BOOL *) = ^(ALAssetsGroup * group, BOOL *stop) {
        if (group != nil) {
            // Filter only photos
            [group setAssetsFilter:[ALAssetsFilter allPhotos]];
            // Enumerate assets in the group
            [group enumerateAssetsUsingBlock:assetEnumerator];
        } else {
            // All groups have been visited
//            NSLog(@"Assets: %@", [assets description]);
            successBlock(assets);
        }
    };
    
    // Enumerate all asset groups
    ALAssetsLibrary * library = [self.class getAssetsLibrary];
    [library enumerateGroupsWithTypes:ALAssetsGroupAll
                           usingBlock:assetGroupEnumerator
                         failureBlock:^(NSError *error) {
                             NSLog(@"Error while loading photo library: %@", error);
                             errorBlock(error);
                         }];
}



@end
