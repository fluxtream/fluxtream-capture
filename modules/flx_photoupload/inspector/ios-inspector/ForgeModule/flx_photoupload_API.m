#import "flx_photoupload_API.h"
#import "PhotoLibrary.h"
#import "PhotoUploader.h"
#import "AutouploadService.h"
#import "PhotoAsset.h"

@implementation flx_photoupload_API

//
// Here you can implement your API methods which can be called from JavaScript
//

+ (void)getPhotoList:(ForgeTask *)task {
    NSLog(@"API: getPhotoList()");
    [[PhotoLibrary singleton] getPhotoListWithSuccess:^(NSDictionary *assets) {
        [task success:assets];
    } error:^(NSError *error) {
        [task errorString:error.description];
    }];
}

+ (void)startAutouploadService:(ForgeTask *)task {
    NSLog(@"API: startAutoupladService");
    // Create singleton if it does not exist yet
    [AutouploadService singleton];
    [task success:nil];
}

+ (void)setUploadParameters:(ForgeTask *)task uploadURL:(NSString *)uploadURL authentication:(NSString *)authentication {
    NSLog(@"API: setUploadParameters(%@, %@)", uploadURL, authentication);
    [[PhotoUploader singleton] setUploadURL:uploadURL authentication:authentication];
    [task success:nil];
}

+ (void)setAutouploadOptions:(ForgeTask *)task params:(NSDictionary *)params {
    NSLog(@"API: setAutouploadOptions");
    for (NSString* key in params) {
        NSLog(@"Param: %@ = %@", key, [params valueForKey:key]);
    }
    [[AutouploadService singleton] startAutouploadService:params];
    [task success:nil];
}

+ (void)stopAutouploadService:(ForgeTask *)task {
    NSLog(@"API: stopAutouploadService");
    [[AutouploadService singleton] stopAutouploadService];
    [task success:nil];
}

+ (void)uploadPhoto:(ForgeTask *)task photoId:(NSNumber *)photoId {
    if ([photoId isKindOfClass:[NSString class]]) {
        photoId = [NSNumber numberWithInt:[(NSString *)photoId intValue]];
    }
    NSLog(@"API: uploadPhoto(%d)", [photoId intValue]);
    [[PhotoUploader singleton] uploadPhoto:photoId];
    [task success:nil];
}

+ (void)arePhotosUploaded:(ForgeTask *)task photoIds:(NSArray *)photoIds {
    NSLog(@"API: arePhotosUploaded");
    int count = (int)photoIds.count;
    NSMutableArray *array = [NSMutableArray arrayWithCapacity:count];
    for (NSNumber *photoId in photoIds) {
        PhotoAsset *photo = [PhotoAsset photoWithId:photoId];
        [array addObject:[NSNumber numberWithBool:[@"uploaded" isEqualToString:photo.uploadStatus]]];
    }
    [task success:array];
}

+ (void)cancelUpload:(ForgeTask *)task photoId:(NSNumber *)photoId {
    NSLog(@"API: cancelUpload(%d)", [photoId intValue]);
    [task errorString:@"Not implemented yet"];
    // TODO (Unused yet anyway)
}

+ (void)getFacetId:(ForgeTask *)task photoId:(NSNumber *)photoId {
    NSLog(@"API: getFacetId(%d)", [photoId intValue]);
    PhotoAsset *photo = [PhotoAsset photoWithId:photoId];
    NSString *facetId = photo.facetId;
    if (facetId) {
        [task success:facetId];
    } else {
        [task errorString:[NSString stringWithFormat:@"Photo %@ has no recorded facet id", photoId]];
    }
}

@end
