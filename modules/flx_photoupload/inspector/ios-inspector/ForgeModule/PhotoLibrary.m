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

@interface PhotoLibrary()
@end

@implementation PhotoLibrary

+ (void)getPhotoListWithCallback:(ForgeTask *)task {
    
    // List of assets, will be constructed through this algorithm
    NSMutableArray * assets = [NSMutableArray new];
    
    // Block: enumerator for the assets within a group
    void (^assetEnumerator)(ALAsset *, NSUInteger, BOOL *) = ^(ALAsset *result, NSUInteger index, BOOL *stop) {
        if (result != NULL) {
            // Create data dictionary
            NSMutableDictionary *data = [NSMutableDictionary new];
            // Add id
            [data setValue:result.defaultRepresentation.filename forKeyPath:@"id"];
            // Add date
            NSDate *dateTaken = [result valueForProperty:ALAssetPropertyDate];
            [data setValue:[NSNumber numberWithLong:dateTaken.timeIntervalSince1970] forKey:@"dateTaken"];
            // Add orientation
            [data setValue:[result valueForProperty:ALAssetPropertyOrientation] forKey:@"orientation"];
            // Add uri
            [data setValue:[[result valueForProperty:ALAssetPropertyAssetURL] description] forKey:@"uri"];
            // Add thumbnail uri
            UIImage *thumbnailImage = [UIImage imageWithCGImage:[result thumbnail]];
            NSData *imageData = UIImageJPEGRepresentation(thumbnailImage, 1.0);
            NSString *encodedString = [imageData base64Encoding];
            NSString *dataUrl = [NSString stringWithFormat:@"data:image/png;base64,%@", encodedString];
            [data setValue:dataUrl forKey:@"thumb_uri"];
            // Add asset to list
            [assets addObject:[NSDictionary dictionaryWithDictionary:data]];
        } else {
            NSLog(@"Result is null!");
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
            NSLog(@"Assets: %@", [assets description]);
            [task success:assets];
        }
    };
    
    // Enumerate all asset groups
    ALAssetsLibrary * library = [ALAssetsLibrary new];
    [library enumerateGroupsWithTypes:ALAssetsGroupAll
                           usingBlock:assetGroupEnumerator
                         failureBlock:^(NSError *error) {
                             NSLog(@"Failure");
                         }];
}



@end
