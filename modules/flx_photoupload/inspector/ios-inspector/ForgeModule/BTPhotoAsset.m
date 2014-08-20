//
//  BTPhotoAsset.m
//  Stetho
//
//  Created by Rich Henderson on 2/5/13.
//  Copyright (c) 2013 BodyTrack. All rights reserved.
//

#import "BTPhotoAsset.h"

@implementation BTPhotoAsset

- (id)initWithAssetURL:(NSString *)assetURL uploadStatus:(NSString *)uploadStatus
{
    if (self = [super init])
    {
        _assetURL = assetURL;
        _facetID = @"";
        _uploadStatus = uploadStatus;
    }
    
    return self;
}

- (NSString *)description
{
    return [NSString stringWithFormat:@"%@ / %@ / %@", [[self uploadStatus] substringFromIndex:0], [self assetURL], [self facetID]];
}

#pragma mark - NSCoding

- (void)encodeWithCoder:(NSCoder *)aCoder
{
    [aCoder encodeObject:_assetURL forKey:@"assetURL"];
    [aCoder encodeObject:_facetID forKey:@"facetID"];
    [aCoder encodeObject:_uploadStatus forKey:@"uploadStatus"];
}

- (id)initWithCoder:(NSCoder *)aDecoder
{
    self = [super init];
    
    if (self) {
        [self setAssetURL:[aDecoder decodeObjectForKey:@"assetURL"]];
        [self setFacetID:[aDecoder decodeObjectForKey:@"facetID"]];
        [self setUploadStatus:[aDecoder decodeObjectForKey:@"uploadStatus"]];
    }
    
    return self;
}

@end
