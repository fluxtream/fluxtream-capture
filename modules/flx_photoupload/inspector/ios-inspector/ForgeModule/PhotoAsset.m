//
//  PhotoAsset.m
//  ForgeModule
//
//  Created by Julien Dupuis on 21/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import "PhotoAsset.h"
#import "PhotoLibrary.h"

@implementation PhotoAsset

// Sets the upload status and persists the new data to disk
- (void)setUploadStatus:(NSString *)uploadStatus {
    _uploadStatus = uploadStatus;
    [[PhotoLibrary singleton] persistPhotoArray];
}

// Updates photo status but does not persist the photo array now
- (void)setUploadStatusWithoutPersisting:(NSString *)uploadStatus {
    _uploadStatus = uploadStatus;
}

// Returns a string representation of this photo (for debugging purposes)
- (NSString *)description {
    return [NSString stringWithFormat:@"[Photo Asset: %@, %@, (%@), %@, %@]", self.identifier, self.assetURL, self.actualAsset, self.uploadStatus, self.facetId];
}

- (NSString *)thumbnailURI {
    if (self.actualAsset) {
        UIImage *thumbnailImage = [UIImage imageWithCGImage:[self.actualAsset thumbnail]];
        NSData *imageData = UIImageJPEGRepresentation(thumbnailImage, 1.0);
        NSString *encodedString = [imageData base64Encoding];
        NSString *dataUrl = [NSString stringWithFormat:@"data:image/png;base64,%@", encodedString];
        return dataUrl;
    } else {
        return nil;
    }
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
