//
//  PhotoUploadRequest.h
//  Stetho
//
//  Created by Rich Henderson on 3/14/13.
//  Copyright (c) 2013 BodyTrack. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <AssetsLibrary/AssetsLibrary.h>
#import <QuartzCore/QuartzCore.h>

@interface PhotoUploadRequest : NSObject

+ (NSURLRequest *)uploadRequestForAsset:(ALAsset *)asset
                              uploadURL:(NSString *)uploadURL
                         authentication:(NSString *)authentication;

@end
