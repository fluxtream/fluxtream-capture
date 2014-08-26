//
//  PhotoAsset.h
//  ForgeModule
//
//  Created by Julien Dupuis on 21/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>


// Represents a photo asset, with a link to the actual ALAsset, and all the
// data (id, status, facetId) for our use
@interface PhotoAsset : NSObject <NSCoding>

// Unique integer identifier generated for each image, persisted through restart
@property (nonatomic, strong) NSNumber *identifier;

// Unique asset URL as supplied by assets library framework
@property (nonatomic, strong) NSString *assetURL;

// Fluxtream's facet ID, can be null;  used for setting comment or tags
@property (nonatomic, strong) NSString *facetId;

// "none" means never uploaded
// "pending" means we want to upload it
// "uploaded" means the photo has been uploaded
@property (nonatomic, strong) NSString *uploadStatus;

// A reference to the asset
@property (nonatomic, strong) ALAsset *actualAsset;


// Returns the complete list of photos (contains PhotoAsset instances)
+ (NSArray *)photos;

// Returns (gets from memory or creates) the photo corresponding to the given asset
+ (PhotoAsset *)photoWithAsset:(ALAsset *)asset;

// Returns the photo corresponding to the given identifier
+ (PhotoAsset *)photoWithId:(NSNumber *)photoId;

// Returns the photo corresponding to the given url
+ (PhotoAsset *)photoWithURL:(NSString *)url;

@end
