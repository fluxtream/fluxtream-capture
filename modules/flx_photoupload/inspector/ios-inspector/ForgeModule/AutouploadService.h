//
//  AutouploadService.h
//  ForgeModule
//
//  Created by Julien Dupuis on 25/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface AutouploadService : NSObject

+ (AutouploadService *)singleton;
- (void)startAutouploadService:(NSDictionary *)options;
- (void)stopAutouploadService;

@end
