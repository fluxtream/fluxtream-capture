#import "flx_polar_h7_API.h"
#import "PolarH7Service.h"

@implementation flx_polar_h7_API

/**
 * Starts the heart rate monitoring service
 * uploadURL: URL at which the data will be uploaded
 * accessToken: Access token for the upload authentication
 */
+ (void)startService:(ForgeTask*)task uploadURL:(NSString *)uploadURL accessToken:(NSString*)accessToken {
    [[PolarH7Service singleton] setParametersUploadURL:uploadURL accessToken:accessToken];
}

/**
 * Stops the heart rate monitoring service and erases the recorded access token
 */
+ (void)stopService:(ForgeTask *)task {
    [[PolarH7Service singleton] stopService];
}

/**
 * Stores the current heart rate device's address and make sure only this device will get connected
 */
+ (void)lockCurrentDevice:(ForgeTask *)task {
    [[PolarH7Service singleton] lockCurrentDevice];
}

/**
 * Removes the limitation on a single device, allowing to connect to any device
 */
+ (void)unlockCurrentDevice:(ForgeTask *)task {
    [[PolarH7Service singleton] unlockCurrentDevice];
}

@end
