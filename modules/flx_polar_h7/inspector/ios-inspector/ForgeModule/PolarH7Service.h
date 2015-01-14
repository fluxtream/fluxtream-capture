//
//  PolarH7Service.h
//  ForgeModule
//
//  Created by Julien Dupuis on 14/01/15.
//

#import <Foundation/Foundation.h>

@interface PolarH7Service : NSObject

+ (instancetype)singleton;
- (void)setParametersUploadURL:(NSString *)uploadURL accessToken:(NSString *)accessToken;
- (void)stopService;
- (void)lockCurrentDevice;
- (void)unlockCurrentDevice;

@end
