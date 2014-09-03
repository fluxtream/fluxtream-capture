#import "flx_photoupload_API.h"
#import "PhotoLibrary.h"
#import "PhotoUploader.h"
#import "AutouploadService.h"
#import "PhotoAsset.h"



// This is the list of methods that will be callable from the javascript application
@implementation flx_photoupload_API

/**
 * Creates a JSON list of the photos available on the device's local photo gallery
 * Each photo object will have the following information:
 * - id: the identifier of the photo
 * - uri: the local URI of the photo
 * - orientation: the orientation of the photo ("landscape" or "portrait")
 * - thumb_uri: a URI for the photo thumbnail
 */
+ (void)getPhotoList:(ForgeTask *)task {
    NSLog(@"API: getPhotoList()");
    [[PhotoLibrary singleton] getPhotoListWithSuccess:^(NSArray *assets) {
        [task success:assets];
    } error:^(NSError *error) {
        [task errorString:error.description];
    }];
}

/**
 * Starts the service that will automatically upload photos to the Fluxtream server
 */
+ (void)startAutouploadService:(ForgeTask *)task {
    NSLog(@"API: startAutoupladService");
    // Create singleton if it does not exist yet
    [AutouploadService singleton];
    [task success:nil];
}

/**
 * Sets the upload parameters (used for automatic upload and regular upload)
 *
 * uploadURL: The URL at which the photos will be sent
 * authentication: The basic authentication string (base64 of "{username}:{password}")
 */
+ (void)setUploadParameters:(ForgeTask *)task userId:(NSString *)userId uploadURL:(NSString *)uploadURL authentication:(NSString *)authentication {
    NSLog(@"API: setUploadParameters(%@, %@, %@)", userId, uploadURL, authentication);
    [[PhotoUploader singleton] setUserId:userId uploadURL:uploadURL authentication:authentication];
    [task success:nil];
}

/**
 * Sets parameters for the photo autoupload feature. See AutouploadService documentation
 * for the list of allowed parameters.
 */
+ (void)setAutouploadOptions:(ForgeTask *)task params:(NSDictionary *)params {
    NSLog(@"API: setAutouploadOptions");
    for (NSString* key in params) {
        NSLog(@"Param: %@ = %@", key, [params valueForKey:key]);
    }
    [[AutouploadService singleton] startAutouploadService:params];
    [task success:nil];
}

/**
 * Stops the autoupload service
 */
+ (void)stopAutouploadService:(ForgeTask *)task {
    NSLog(@"API: stopAutouploadService");
    [[AutouploadService singleton] stopAutouploadService];
    [task success:nil];
}

/**
 * Logs out the current user and stops all uploads
 */
+ (void)logoutUser:(ForgeTask *)task {
    NSLog(@"API: logoutUser");
    [[AutouploadService singleton] stopAutouploadService];
    [[PhotoUploader singleton] logoutUser];
}

/**
 * Adds a photo to the pending upload list, and starts the upload process if it was idle
 */
+ (void)uploadPhoto:(ForgeTask *)task photoId:(NSNumber *)photoId {
    if ([photoId isKindOfClass:[NSString class]]) {
        photoId = [NSNumber numberWithInt:[(NSString *)photoId intValue]];
    }
    NSLog(@"API: uploadPhoto(%d)", [photoId intValue]);
    [[PhotoUploader singleton] uploadPhoto:photoId];
    [task success:nil];
}

/**
 * This method takes a list of photo ids and produces a list of booleans, in the same order, telling
 * if each photo has already been uploaded or not
 */
+ (void)arePhotosUploaded:(ForgeTask *)task photoIds:(NSArray *)photoIds {
    NSLog(@"API: arePhotosUploaded");
    int count = (int)photoIds.count;
    NSMutableArray *array = [NSMutableArray arrayWithCapacity:count];
    for (NSNumber *photoId in photoIds) {
        PhotoAsset *photo = [[PhotoLibrary singleton] photoWithId:photoId];
        [array addObject:[NSNumber numberWithBool:[@"uploaded" isEqualToString:photo.uploadStatus]]];
    }
    [task success:array];
}

/**
 * Tries canceling a photo upload, if it is not too late.
 */
+ (void)cancelUpload:(ForgeTask *)task photoId:(NSNumber *)photoId {
    NSLog(@"API: cancelUpload(%d)", [photoId intValue]);
    [[PhotoUploader singleton] cancelUpload:photoId];
    [task success:nil];
}

/**
 * Returns the facet id for the given photo
 */
+ (void)getFacetId:(ForgeTask *)task photoId:(NSNumber *)photoId {
    NSLog(@"API: getFacetId(%d)", [photoId intValue]);
    PhotoAsset *photo = [[PhotoLibrary singleton] photoWithId:photoId];
    NSString *facetId = photo.facetId;
    if (facetId) {
        [task success:facetId];
    } else {
        [task errorString:[NSString stringWithFormat:@"Photo %@ has no recorded facet id", photoId]];
    }
}

@end
