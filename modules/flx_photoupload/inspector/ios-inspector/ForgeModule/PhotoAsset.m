//
//  PhotoAsset.m
//  ForgeModule
//
//  Created by Julien Dupuis on 21/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import "PhotoAsset.h"

@implementation PhotoAsset

# pragma mark - Private static methods

// Returns a mutable array containing the list of photos. On the first time,
// this list is fetched from local storage.
+ (NSMutableArray *)getPersistedPhotoArray {
    static NSMutableArray *photoArray;
    if (!photoArray) {
        photoArray = [NSKeyedUnarchiver unarchiveObjectWithFile:[self archivePath]];
        if (!photoArray) {
            photoArray = [NSMutableArray new];
        }
        // Init maps
        for (PhotoAsset *photo in photoArray) {
            [[self urlToPhotoMap] setObject:photo forKey:photo.assetURL];
            [[self idToPhotoMap] setObject:photo forKey:photo.identifier];
        }
    }
    return photoArray;
}

// Returns the path on the local storage to the file containing the archived list of photos
+ (NSString *)archivePath {
    NSArray *documentDirectories = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentDirectory = [documentDirectories objectAtIndex:0];
    NSString *path = [documentDirectory stringByAppendingPathComponent:@"photos.archive"];
    return path;
}

// Saves the photo list to local storage
+ (void)persistPhotoArray {
    NSLog(@"Persisting the photo list");
    [NSKeyedArchiver archiveRootObject:[self getPersistedPhotoArray] toFile:[self archivePath]];
}

// Returns a new unique integer photo identifier
+ (NSNumber *)newIdentifier {
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

// Returns the static dictionary that maps urls to PhotoAssets
+ (NSMutableDictionary *)urlToPhotoMap {
    static NSMutableDictionary *urlToPhotoMap;
    if (!urlToPhotoMap) {
        urlToPhotoMap = [NSMutableDictionary new];
    }
    return urlToPhotoMap;
}

// Returns the static dictonary that maps photo identifiers to PhotoAssets
+ (NSMutableDictionary *)idToPhotoMap {
    static NSMutableDictionary *idToPhotoMap;
    if (!idToPhotoMap) {
        idToPhotoMap = [NSMutableDictionary new];
    }
    return idToPhotoMap;
}


#pragma mark - Public static methods

+ (NSArray *)photos {
    return [self getPersistedPhotoArray];
}

+ (PhotoAsset *)photoWithAsset:(ALAsset *)asset {
    // Make sure list of photos is initialized
    NSMutableArray *photos = [PhotoAsset getPersistedPhotoArray];
    // Find asset in the list
    PhotoAsset *photo = [self photoWithURL:asset.defaultRepresentation.url.absoluteURL.description];
    if (photo) {
        NSLog(@"Found an existing photo asset for: %@", asset.defaultRepresentation.url.absoluteURL.description);
        // An instance of this photo is already in the list, assign it its asset
        photo.actualAsset = asset;
        return photo;
    }
    // This asset is not in the list yet, create a new one
    NSLog(@"Creating a new photo asset for: %@", asset.defaultRepresentation.url.absoluteURL.description);
    photo = [PhotoAsset new];
    [photos addObject:photo];
    photo.actualAsset = asset;
    photo.assetURL = asset.defaultRepresentation.url.absoluteURL.description;
    photo.identifier = [PhotoAsset newIdentifier];
    // Set upload status, this will persist the photo list
    photo.uploadStatus = @"none";
    // Update maps
    [[self idToPhotoMap] setObject:photo forKey:photo.identifier];
    [[self urlToPhotoMap] setObject:photo forKey:photo.assetURL];
    return photo;
}

+ (PhotoAsset *)photoWithId:(NSNumber *)photoId {
    // Make sure list of photos is initialized
    [PhotoAsset getPersistedPhotoArray];
    // Return photo corresponding to id
    PhotoAsset *result = [[self idToPhotoMap] objectForKey:photoId];
    return result;
}

+ (PhotoAsset *)photoWithURL:(NSString *)url {
    // Make sure list of photos is initialized
    [PhotoAsset getPersistedPhotoArray];
    // Return photo corresponding nto url
    return [[self urlToPhotoMap] objectForKey:url];
}


#pragma mark - Instance methods

// Sets the upload status and persists the new data to disk
- (void)setUploadStatus:(NSString *)uploadStatus {
    _uploadStatus = uploadStatus;
    [PhotoAsset persistPhotoArray];
}

// Returns a string representation of this photo (for debugging purposes)
- (NSString *)description {
    return [NSString stringWithFormat:@"[Photo Asset: %@, %@, (%@), %@, %@]", self.identifier, self.assetURL, self.actualAsset, self.uploadStatus, self.facetId];
}

#pragma mark - NSCoding

- (void)encodeWithCoder:(NSCoder *)coder {
    [coder encodeObject:self.identifier forKey:@"identifier"];
    [coder encodeObject:self.assetURL forKey:@"assetURL"];
    [coder encodeObject:self.facetId forKey:@"facetId"];
    [coder encodeObject:self.uploadStatus forKey:@"uploadStatus"];
}

- (id)initWithCoder:(NSCoder *)decoder {
    if (self = [super init]) {
        _identifier = [decoder decodeObjectForKey:@"identifier"];
        _assetURL = [decoder decodeObjectForKey:@"assetURL"];
        _facetId = [decoder decodeObjectForKey:@"facetId"];
        _uploadStatus = [decoder decodeObjectForKey:@"uploadStatus"];
    }
    return self;
}

@end
