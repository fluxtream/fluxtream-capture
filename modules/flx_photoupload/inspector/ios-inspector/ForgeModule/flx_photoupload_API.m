#import "flx_photoupload_API.h"
#import "PhotoLibrary.h"

@implementation flx_photoupload_API

//
// Here you can implement your API methods which can be called from JavaScript
// an example method is included below to get you started.
//

// This will be callable from JavaScript as 'flx_photoupload.showAlert'
// it will require a parameter called text
//+ (void)showAlert:(ForgeTask*)task text:(NSString *)text {
//	if ([text length] == 0) {
//		[task error:@"You must enter a message"];
//		return;
//	}
//	UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Alert"
//													message:text
//												   delegate:nil
//										  cancelButtonTitle:@"OK"
//										  otherButtonTitles:nil];
//	[alert show];
//	[task success:nil];
//}

+ (void)getPhotoList:(ForgeTask *)task {
    NSLog(@"API: getPhotoList()");
    [PhotoLibrary getPhotoListWithCallback:task];
}

+ (void)startAutouploadService:(ForgeTask *)task {
    NSLog(@"API: startAutoupladService");
    [task errorString:@"Not implemented yet"];
    // TODO
}

+ (void)setUploadParameters:(ForgeTask *)task uploadURL:(NSString *)uploadURL authentication:(NSString *)authentication {
    NSLog(@"API: setUploadParameters(%@, %@)", uploadURL, authentication);
    [task success:nil];
    // TODO
}

+ (void)setAutouploadOptions:(ForgeTask *)task params:(NSDictionary *)params {
    NSLog(@"API: setAutouploadOptions");
    for (NSString* key in params) {
        NSLog(@"Param: %@ = %@", key, [params valueForKey:key]);
    }
    [task errorString:@"Not implemented yet"];
    // TODO
}

+ (void)stopAutouploadService:(ForgeTask *)task {
    NSLog(@"API: stopAutouploadService");
    [task errorString:@"Not implemented yet"];
    // TODO
}

+ (void)uploadPhoto:(ForgeTask *)task photoId:(NSNumber *)photoId {
    NSLog(@"API: uploadPhoto(%d)", [photoId intValue]);
    [task errorString:@"Not implemented yet"];
}

+ (void)arePhotosUploaded:(ForgeTask *)task photoIds:(NSArray *)photoIds {
    NSLog(@"API: arePhotosUploaded");
    int count = (int)photoIds.count;
    NSMutableArray *array = [NSMutableArray arrayWithCapacity:count];
    for (int i = 0; i < count; i++) {
        [array addObject:[NSNumber numberWithBool:true]];
    }
    [task success:array];
    // TODO
}

+ (void)cancelUpload:(ForgeTask *)task photoId:(NSNumber *)photoId {
    NSLog(@"API: cancelUpload(%d)", [photoId intValue]);
    [task errorString:@"Not implemented yet"];
    // TODO
}

+ (void)getFacetId:(ForgeTask *)task photoId:(NSNumber *)photoId {
    NSLog(@"API: getFacetId(%d)", [photoId intValue]);
    [task errorString:@"Not implemented yet"];
    // TODO
}

@end
