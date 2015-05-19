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
#import "PhotoUploader.h"
#import "HTTPServer.h"
#import "ThumbnailServerHttpConnection.h"
#import "Constants.h"

@interface PhotoLibrary()

// Raw list of photos
@property (nonatomic, strong) NSArray *rawPhotoArray; // Contains the list of ALAsset instances, right from the asset library

// The full list of available photos
@property (nonatomic, strong) NSMutableArray *photoArray; // Contains PhotoAsset instances

@property (nonatomic, strong) NSMutableDictionary *urlToPhotoMap;
@property (nonatomic, strong) NSMutableDictionary *idToPhotoMap;

@property (nonatomic) BOOL libraryReady;
@property (nonatomic) BOOL initializing;

@property (nonatomic, strong) HTTPServer *httpServer;

@end

@implementation PhotoLibrary

// Returns an instance of ALAssetsLibrary
+ (ALAssetsLibrary *)getAssetsLibrary {
    // Keep it in a static variable to make sure we keep a reference to it
    // and ALAssets stay readable
    static ALAssetsLibrary *library;
    if (!library) library = [ALAssetsLibrary new];
    return library;
}

+ (PhotoLibrary *)singleton {
    static PhotoLibrary* singleton = NULL;
    if (!singleton) singleton = [PhotoLibrary new];
    return singleton;
}

- (id)init {
    if (self = [super init]) {
        // Create and start small local http server to deliver photo thumbnails
        self.httpServer = [HTTPServer new];
        [self.httpServer setType:@"_http."];
        [self.httpServer setPort:THUMBNAIL_SERVER_PORT];
        [self.httpServer setConnectionClass:[ThumbnailServerHttpConnection class]];
        NSError *error;
        if (![self.httpServer start:&error]) {
            NSLog(@"Error starting http server: %@", error);
        } else {
            NSLog(@"Thumbnail mini-server started");
        }
    }
    return self;
}

- (void)getPhotoListWithSuccess:(void (^)(NSArray *))successBlock
                          error:(void (^)(NSError *))errorBlock {
    
    // List of assets to be sent through the callback
    NSMutableArray *assets = [NSMutableArray new];
    
    // List of raw asset
    NSMutableArray *rawAssets = [NSMutableArray new];
    
    // Block: enumerator for the assets within a group
    void (^assetEnumerator)(ALAsset *, NSUInteger, BOOL *) = ^(ALAsset *result, NSUInteger index, BOOL *stop) {
        if (result != NULL) {
            // Add to raw list
            [rawAssets addObject:result];
            // Find or create photo
            PhotoAsset *photo = [self photoWithAsset:result];
            // Create data dictionary
            NSMutableDictionary *data = [NSMutableDictionary new];
            // Add id
            [data setValue:photo.identifier forKeyPath:@"id"];
            // Add date
            NSDate *dateTaken = [result valueForProperty:ALAssetPropertyDate];
            [data setValue:[NSNumber numberWithLong:dateTaken.timeIntervalSince1970] forKey:@"date_taken"];
            // Add orientation
            NSString *orientation = @"";
            switch ([[result valueForProperty:ALAssetPropertyOrientation] intValue]) {
                case ALAssetOrientationUp:
                case ALAssetOrientationUpMirrored:
                    // Landscape left
                    orientation = @"landscape_left";
                    break;
                case ALAssetOrientationDown:
                case ALAssetOrientationDownMirrored:
                    // Landscape right
                    orientation = @"landscape_right";
                    break;
                case ALAssetOrientationLeft:
                case ALAssetOrientationLeftMirrored:
                    // Upsite down
                    orientation = @"upside_down";
                    break;
                case ALAssetOrientationRight:
                case ALAssetOrientationRightMirrored:
                    // Portrait
                    orientation = @"portrait";
                    break;
                default:
                    NSLog(@"Unknown photo orientation");
                    break;
            }
            [data setValue:orientation forKey:@"orientation"];
            // Add uri
            [data setValue:photo.assetURL forKey:@"uri"];
            // Add thumbnail uri
            // TODO Instead of creating a base64 image url, we should provide an API call to get the thumbnail content
//            UIImage *thumbnailImage = [UIImage imageWithCGImage:[result thumbnail]];
//            NSData *imageData = UIImageJPEGRepresentation(thumbnailImage, 1.0);
//            NSString *encodedString = [imageData base64Encoding];
//            NSString *dataUrl = [NSString stringWithFormat:@"data:image/png;base64,%@", encodedString];
//            [data setValue:dataUrl forKey:@"thumb_uri"];
            // Generate uri for the thumbnail through local thumbnail server
            [data setValue:[NSString stringWithFormat:@"http://127.0.0.1:%d/thumbnail/%@/%@", THUMBNAIL_SERVER_PORT, [photo.identifier description], [PhotoUploader singleton].userId]
                    forKey:@"thumb_uri"];
            // Add asset to list
            [assets addObject:[NSDictionary dictionaryWithDictionary:data]];
        }
    };
    
    // Block: enumerator for asset groups
    void (^assetGroupEnumerator)(ALAssetsGroup *, BOOL *) = ^(ALAssetsGroup * group, BOOL *stop) {
        if (group != nil) {
            if ([[group valueForProperty:@"ALAssetsGroupPropertyType"] intValue] == ALAssetsGroupSavedPhotos) {
                // Filter only photos
                [group setAssetsFilter:[ALAssetsFilter allPhotos]];
                // Enumerate assets in the group
                [group enumerateAssetsUsingBlock:assetEnumerator];
            }
        } else {
            // All groups have been visited
            // Save raw asset list
            self.rawPhotoArray = rawAssets;
            self.libraryReady = true;
            // Persist photo array to disk
            [self persistPhotoArray];
            // Return asset array
            successBlock(assets);
            self.initializing = false;
        }
    };
    
    // Enumerate all asset groups
    ALAssetsLibrary * library = [self.class getAssetsLibrary];
    self.initializing = true;
    [library enumerateGroupsWithTypes:ALAssetsGroupSavedPhotos
                           usingBlock:assetGroupEnumerator
                         failureBlock:^(NSError *error) {
                             NSLog(@"Error while loading photo library: %@", error);
                             errorBlock(error);
                         }];
}

# pragma mark - Private methods

// Returns a mutable array containing the list of photos. On the first time,
// this list is fetched from local storage.
- (NSMutableArray *)getPersistedPhotoArray {
    @synchronized (self) {
        if (!self.photoArray) {
            NSLog(@"THUMB_SERVER Creating photo array");
            // Reset maps
            self.urlToPhotoMap = [NSMutableDictionary new];
            self.idToPhotoMap = [NSMutableDictionary new];
            // Read photo array from local storage
            NSString *archivePath = [self archivePath];
            NSLog(@"Reading from archive path %@", archivePath);
            self.photoArray = [NSKeyedUnarchiver unarchiveObjectWithFile:archivePath];
            if (!self.photoArray) {
                self.photoArray = [NSMutableArray new];
            }
            // Init maps
            for (PhotoAsset *photo in self.photoArray) {
                [self.urlToPhotoMap setObject:photo forKey:photo.assetURL];
                [self.idToPhotoMap setObject:photo forKey:photo.identifier];
            }
            // Synchronize with raw assets
            for (ALAsset *asset in self.rawPhotoArray) {
                for (PhotoAsset *photo in [self.photoArray copy]) {
                    if ([asset.defaultRepresentation.url.absoluteURL.description isEqualToString:photo.assetURL]) {
                        // Associate asset to photo
                        [self photoWithAsset:asset];
                    }
                }
            }
            // Persist photo array
            NSLog(@"THUMB_SERVER photoLibrary singleton (%@) vs. this (%@)", [PhotoLibrary singleton], self);
            [self persistPhotoArray];
            // Look for unuploaded photos
            for (PhotoAsset *photo in self.photoArray) {
                if ([photo.uploadStatus isEqualToString:@"pending"]) {
                    [[PhotoUploader singleton] uploadPhoto:photo.identifier];
                }
            }
            NSString *keys = @"";
            for(id key in self.idToPhotoMap) keys = [keys stringByAppendingFormat:@"%@ ", key];
            NSLog(@"THUMB_SERVER Initialized idToPhotoMap [%@]", keys);
        }
        return self.photoArray;
    }
}

- (void)clearPhotoList {
    @synchronized (self) {
        // Make sure photo array is persisted
        [self persistPhotoArray];
        // Clear photo array to make sure it will be reloaded
        NSLog(@"THUMB_SERVER Clearing idToPhotoMap");
        self.photoArray = nil;
        self.idToPhotoMap = nil;
        self.urlToPhotoMap = nil;
        NSLog(@"THUMB_SERVER Cleared idToPhotoMap");
    }
}

// Returns the path on the local storage to the file containing the archived list of photos
- (NSString *)archivePath {
    NSArray *documentDirectories = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentDirectory = [documentDirectories objectAtIndex:0];
    NSString *path = [documentDirectory stringByAppendingPathComponent:[NSString stringWithFormat:@"photos.user.%@", [PhotoUploader singleton].userId]];
    return path;
}

// Returns a new unique integer photo identifier
- (NSNumber *)newIdentifier {
    // Read next id from user defaults
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSNumber *nextId = [defaults objectForKey:@"photos.nextId"];
    if (!nextId) nextId = [NSNumber numberWithInt:1];
    // Increase next id in user defaults
    [defaults setObject:[NSNumber numberWithInt:nextId.intValue + 1] forKey:@"photos.nextId"];
    [[NSUserDefaults standardUserDefaults] synchronize];
    // Return the unique id
    return nextId;
}
//
//// Returns the static dictionary that maps urls to PhotoAssets
//- (NSMutableDictionary *)urlToPhotoMap {
//    static NSMutableDictionary *urlToPhotoMap;
//    if (!urlToPhotoMap) {
//        urlToPhotoMap = [NSMutableDictionary new];
//    }
//    return urlToPhotoMap;
//}
//
//// Returns the static dictonary that maps photo identifiers to PhotoAssets
//- (NSMutableDictionary *)idToPhotoMap {
//    static NSMutableDictionary *idToPhotoMap;
//    if (!idToPhotoMap) {
//        idToPhotoMap = [NSMutableDictionary new];
//    }
//    return idToPhotoMap;
//}


#pragma mark - Public methods

// Saves the photo list to local storage
- (void)persistPhotoArray {
    @synchronized (self) {
        NSString *archivePath = [self archivePath];
        NSLog(@"THUMB_SERVER Synchronizing persisted photo array to %@", archivePath);
        [NSKeyedArchiver archiveRootObject:[self getPersistedPhotoArray]
                                    toFile:archivePath];
    }
}

- (NSArray *)photos {
    @synchronized (self) {
        return [self getPersistedPhotoArray];
    }
}

- (PhotoAsset *)photoWithAsset:(ALAsset *)asset {
    @synchronized (self) {
        NSLog(@"THUMB_SERVER Calling photoWithAsset");
        // Make sure list of photos is initialized
        [self getPersistedPhotoArray];
        // Find asset in the list
        PhotoAsset *photo = [self photoWithURL:asset.defaultRepresentation.url.absoluteURL.description];
        if (photo) {
            // An instance of this photo is already in the list, assign it its asset
            photo.actualAsset = asset;
            return photo;
        }
        // This asset is not in the list yet, create a new one
        photo = [PhotoAsset new];
        [self.photoArray addObject:photo];
        photo.actualAsset = asset;
        photo.assetURL = asset.defaultRepresentation.url.absoluteURL.description;
        photo.identifier = [self newIdentifier];
        // Set upload status, this will persist the photo list
        [photo setUploadStatusWithoutPersisting:@"none"];
        // Update maps
        [self.idToPhotoMap setObject:photo forKey:photo.identifier];
        NSLog(@"THUMB_SERVER Adding photo in idToPhotoMap: %@", photo.identifier);
        if (!self.idToPhotoMap) NSLog(@"THUMB_SERVER But idToPhotoMap is null");
        [self.urlToPhotoMap setObject:photo forKey:photo.assetURL];
        return photo;
    }
}

- (PhotoAsset *)photoWithId:(NSNumber *)photoId {
    @synchronized (self) {
    // Make sure list of photos is initialized
    [self getPersistedPhotoArray];
    // Return photo corresponding to id
    PhotoAsset *result = [self.idToPhotoMap objectForKey:photoId];
    if (!result) {
        NSString *keys = @"";
        for(id key in self.idToPhotoMap) keys = [keys stringByAppendingFormat:@"%@ ", key];
        NSLog(@"THUMB_SERVER Didn't find photo with id %@ in idToPhotoMap [%@]", photoId, keys);
    }
    return result;
    }
}

- (PhotoAsset *)photoWithURL:(NSString *)url {
    @synchronized (self) {
        // Make sure list of photos is initialized
        [self getPersistedPhotoArray];
        // Return photo corresponding nto url
        return [self.urlToPhotoMap objectForKey:url];
    }
}


- (BOOL)isInitialized {
    @synchronized (self) {
    BOOL result = self.libraryReady && self.photoArray;
    if (!result) {
        if (!self.initializing) {
            [self getPhotoListWithSuccess:^(NSArray *assets) {} error:^(NSError *error) {}];
        }
    }
    return result;
    }
}

@end
