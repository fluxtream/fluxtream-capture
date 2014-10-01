//
//  MyHttpServer.m
//  Sandbox
//
//  Created by Julien Dupuis on 26/09/14.
//  Copyright (c) 2014 Fluxtream. All rights reserved.
//

#import "ThumbnailServerHttpConnection.h"
#import "HTTPDataResponse.h"
#import "HTTPMessage.h"
#import "HTTPDataResponse.h"
//#import "DDNumber.h"
//#import "HTTPLogging.h"
#import "PhotoLibrary.h"

#import <AssetsLibrary/AssetsLibrary.h>
#import <QuartzCore/QuartzCore.h>

@interface ThumbnailServerHttpConnection()

@property (strong, nonatomic) ALAssetsLibrary* assetsLibrary;

@end


@implementation ThumbnailServerHttpConnection

- (BOOL)supportsMethod:(NSString *)method atPath:(NSString *)path {
//    NSLog(@"Call to supportsMethod:%@ at:%@", method, path);
	return YES;
}

- (BOOL)expectsRequestBodyFromMethod:(NSString *)method atPath:(NSString *)path {
//    NSLog(@"Call to expectsRequestBodyFromMethod:%@ atPath:%@", method, path);
	return NO;
}

- (NSObject<HTTPResponse> *)httpResponseForMethod:(NSString *)method URI:(NSString *)path {
//    NSLog(@"Call to httpResponseForMethod:%@ URI:%@", method, path);
    if ([path hasPrefix:@"/thumbnail/"]) {
        // Get photo
        NSString *assetId = [path substringFromIndex:[@"/thumbnail/" length]];
        PhotoAsset *photo = [[PhotoLibrary singleton] photoWithId:[NSNumber numberWithInt:[assetId intValue]]];
        // Get thumbnail data
        NSData *data = UIImageJPEGRepresentation([UIImage imageWithCGImage:[photo.actualAsset thumbnail]], .95);
        // Make http response
        HTTPDataResponse *photoResponse = [[HTTPDataResponse alloc] initWithData:data];
        return photoResponse;
    }
    // Unknown request, ignore
    return nil;
}

@end
