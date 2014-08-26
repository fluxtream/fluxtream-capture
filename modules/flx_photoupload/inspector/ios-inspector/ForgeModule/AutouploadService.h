//
//  AutouploadService.h
//  ForgeModule
//
//  Created by Julien Dupuis on 25/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>


// AutouploadService is a singleton class that runs a thread that will periodically check if there
// new photos that should be uploaded.
//
// The options are the following:
// - upload_portrait (BOOL): if true, the portrait photos will be automatically uploaded
// - upload_upside_down (BOOL): idem for upside-down photos
// - upload_landscape_left (BOOL): idem for landscape left photos
// - upload_landscape_right (BOOL): idem for landscape right photos
// - portrait_minimum_timestamp (int): only portrait photos after this unix timestamp will be uploaded
// - upside_down_minimum_timestamp (int): idem for upside-down photos
// - landscape_left_minimum_timestamp (int): idem for landscape left photos
// - landscape_right_minimum_timestamp (int): idem for landscape right photos
// - upload_url (string): the url at which the pictures will be uploaded
// - authentication: the authentication string used in the upload request
@interface AutouploadService : NSObject

// Creates if needed and returns the single instance of this class
+ (AutouploadService *)singleton;

// Start the autoupload with options (at least upload_url and authentication should be set)
- (void)startAutouploadService:(NSDictionary *)options;

// Stops autouploading photos
- (void)stopAutouploadService;

@end
