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
#import "ThumbnailServerHttpResponse.h"

#import <AssetsLibrary/AssetsLibrary.h>
#import <QuartzCore/QuartzCore.h>

@interface ThumbnailServerHttpConnection()

@property (strong, nonatomic) ALAssetsLibrary* assetsLibrary;

@end


@implementation ThumbnailServerHttpConnection

- (BOOL)supportsMethod:(NSString *)method atPath:(NSString *)path {
    NSLog(@"THUMB_SERVER Call to supportsMethod:%@ at:%@", method, path);
	return YES;
}

- (BOOL)expectsRequestBodyFromMethod:(NSString *)method atPath:(NSString *)path {
    NSLog(@"THUMB_SERVER Call to expectsRequestBodyFromMethod:%@ atPath:%@", method, path);
	return NO;
}

- (NSObject<HTTPResponse> *)httpResponseForMethod:(NSString *)method URI:(NSString *)path {
    NSLog(@"THUMB_SERVER Call to httpResponseForMethod:%@ URI:%@", method, path);
    if ([path hasPrefix:@"/thumbnail/"]) {
        // Get photo
        NSString *assetId = [path substringFromIndex:[@"/thumbnail/" length]];
        assetId = [assetId substringToIndex:[assetId rangeOfString:@"/"].location];
        NSLog(@"THUMB_SERVER Asset id is %@", assetId);
        PhotoAsset *photo = [[PhotoLibrary singleton] photoWithId:[NSNumber numberWithInt:[assetId intValue]]];
        if (!photo) {
            NSLog(@"THUMB_SERVER Photo not found");
        }
        else NSLog(@"THUMB_SERVER Photo found: %@, %@, %@, %@", photo.identifier, photo.assetURL, photo.uploadStatus, photo.actualAsset);
        // Get thumbnail data
        NSData *data = UIImageJPEGRepresentation([UIImage imageWithCGImage:[photo.actualAsset thumbnail]], .95);
        if (!data) NSLog(@"THUMB_SERVER Thumbnail not generated");
        // Make http response
        HTTPDataResponse *photoResponse = [[ThumbnailServerHttpResponse alloc] initWithData:data];
        NSLog(@"THUMB_SERVER Returning photoResponse object");
        return photoResponse;
    }
    // Unknown request, ignore
    NSLog(@"THUMB_SERVER Unknown request");
    return nil;
}

@end
