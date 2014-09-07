//
//  BTPhotoImageUploadRequest.m
//  Stetho
//
//  Created by Rich Henderson on 3/14/13.
//  Copyright (c) 2013 BodyTrack. All rights reserved.
//

#import "PhotoUploadRequest.h"
#import <AssetsLibrary/AssetsLibrary.h>
#import <QuartzCore/QuartzCore.h>

static NSString *const kBoundary = @"b0uNd4rYb0uNd4rYaehrtiffegbib";

@implementation PhotoUploadRequest

+ (NSURLRequest *)uploadRequestForAsset:(ALAsset *)asset
                              uploadURL:(NSString *)uploadURL
                         authentication:(NSString *)authentication
{
    ALAssetRepresentation *assetRepresentation = [asset defaultRepresentation];
    
    UIImageOrientation orientation = UIImageOrientationUp;
    NSNumber *orientationValue = [asset valueForProperty:@"ALAssetPropertyOrientation"];

    if (orientationValue != nil) {
        orientation = (UIImageOrientation)[orientationValue intValue];
    }

    UIImage *image = [UIImage imageWithCGImage:[assetRepresentation fullResolutionImage] scale:1.0 orientation:orientation];

    NSData *imageData = [NSData dataWithData:UIImageJPEGRepresentation(image, 0.1f)];
    NSDate *imageDate = [asset valueForProperty:ALAssetPropertyDate];
    NSString *separator = [NSString stringWithFormat:@"--%@\r\n", kBoundary];
    NSString *closingBoundary = [NSString stringWithFormat:@"--%@--\r\n", kBoundary];
    NSString *crlf = [NSString stringWithFormat:@"\r\n"];

    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString: uploadURL]];

    [request setCachePolicy:NSURLRequestReloadIgnoringLocalCacheData];
    [request setHTTPShouldHandleCookies:NO];
    [request setTimeoutInterval:30];
    [request setHTTPMethod:@"POST"];
    [request setValue:[NSString stringWithFormat:@"multipart/form-data; boundary=%@", kBoundary] forHTTPHeaderField: @"Content-Type"];

    // post body
    NSMutableData *body = [NSMutableData data];

    // metadata
    [body appendData:[separator dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[@"Content-Disposition: form-data; name=\"metadata\"\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding]];
    NSTimeInterval dateTimeOriginal = [imageDate timeIntervalSince1970];
    [body appendData:[[NSString stringWithFormat:@"{\"capture_time_secs_utc\":%.3f}", dateTimeOriginal] dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[crlf dataUsingEncoding:NSUTF8StringEncoding]];

    // photo
    [body appendData:[separator dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[@"Content-Disposition: form-data; name=\"photo\"; filename=\"photo.jpg\"" dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[crlf dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[@"Content-Type: image/jpeg" dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[crlf dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[crlf dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:imageData];
    [body appendData:[crlf dataUsingEncoding:NSUTF8StringEncoding]];

    // closing boundary
    [body appendData:[closingBoundary dataUsingEncoding:NSUTF8StringEncoding]];

    [request setHTTPBody:body];
    [request addValue:[NSString stringWithFormat:@"%lu", (unsigned long)[body length]] forHTTPHeaderField:@"Content-Length"];

    NSString *authValue = [NSString stringWithFormat:@"Basic %@", authentication];
    [request setValue:authValue forHTTPHeaderField:@"Authorization"];
    
    return request;
}

@end
