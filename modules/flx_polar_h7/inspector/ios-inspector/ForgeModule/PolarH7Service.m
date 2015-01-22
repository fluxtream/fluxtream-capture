//
//  PolarH7Service.m
//  ForgeModule
//
//  Created by Julien Dupuis on 14/01/15.
//

#import "PolarH7Service.h"
#import "DataUploader.h"
#import "PulseTracker.h"

@interface PolarH7Service()

@property (strong, nonatomic) DataUploader *dataUploader;
@property (strong, nonatomic) PulseTracker *pulseTracker;

@end

@implementation PolarH7Service

+ (instancetype)singleton {
    static PolarH7Service *instance;
    if (!instance) {
        instance = [PolarH7Service new];
    }
    return instance;
}

- (instancetype)init {
    if (self = [super init]) {
        [self updateUploaderParameters];
    }
    return self;
}

- (void)setParametersUploadURL:(NSString *)uploadURL accessToken:(NSString *)accessToken {
    [[NSUserDefaults standardUserDefaults] setObject:uploadURL forKey:@"heartrate.uploadURL"];
    [[NSUserDefaults standardUserDefaults] setObject:accessToken forKey:@"heartrate.accessToken"];
    [self updateUploaderParameters];
}

- (void)updateUploaderParameters {
    NSString *uploadURL = [[NSUserDefaults standardUserDefaults] valueForKey:@"heartrate.uploadURL"];
    NSString *accessToken = [[NSUserDefaults standardUserDefaults] valueForKey:@"heartrate.accessToken"];
    
    if (uploadURL.length && accessToken.length) {
        if (self.dataUploader) {
            [self.dataUploader setParametersUploadURL:uploadURL accessToken:accessToken];
        } else {
            self.dataUploader = [[DataUploader alloc] initWithUploadURL:uploadURL accessToken:accessToken];
            [self.dataUploader startThread];
            self.pulseTracker = [[PulseTracker alloc] initWithDataUploader:self.dataUploader];
            [self.pulseTracker setEnabled:true];
        }
    }
}

- (void)stopService {
    // Disable pulse tracker
    self.pulseTracker.enabled = false;
    // Stop uploader
    [self.dataUploader stopThread];
    self.dataUploader = nil;
}

- (void)lockCurrentDevice {
    [self.pulseTracker lockCurrentDevice:true];
}

- (void)unlockCurrentDevice {
    [self.pulseTracker lockCurrentDevice:false];
}

@end


























