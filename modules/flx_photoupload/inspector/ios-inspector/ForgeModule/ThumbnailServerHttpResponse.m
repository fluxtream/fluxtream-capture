//
//  ThumbnailServerHttpResponse.m
//  ForgeModule
//
//  Created by Julien Dupuis on 17/04/15.
//  Copyright (c) 2015 Trigger Corp. All rights reserved.
//

#import "ThumbnailServerHttpResponse.h"

@implementation ThumbnailServerHttpResponse

- (NSDictionary *)httpHeaders {
    // Add cache information to prevent reloading the images on each page reload
    return [NSDictionary dictionaryWithObject:@"public, max-age=86400" forKey:@"Cache-Control"];
}

@end
