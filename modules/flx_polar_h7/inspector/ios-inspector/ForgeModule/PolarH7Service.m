//
//  PolarH7Service.m
//  ForgeModule
//
//  Created by Julien Dupuis on 14/01/15.
//

#import "PolarH7Service.h"
#import "DataUploader.h"

@interface PolarH7Service()

@property (strong, nonatomic) DataUploader *dataUploader;

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
            [self startSimulationThread]; // TODO remove
        }
    }
}

// TODO remove...
// Simulation for debug purposes only
- (void)startSimulationThread {
    NSThread *thread = [[NSThread alloc] initWithTarget:self selector:@selector(runSimulationThread) object:NULL];
    [thread start];
}
- (void)runSimulationThread {
    NSCondition *condition = [NSCondition new];
    NSLog(@"Starting simulation thread");
    while (true) {
        NSLog(@"Adding simulation data");
        [self.dataUploader addDataToUploadHeartBeat:60 beatSpacing:1000];
        [condition lock];
        [condition waitUntilDate:[NSDate dateWithTimeIntervalSinceNow:1]];
        [condition unlock];
    }
}
// TODO ...until here

@end


























