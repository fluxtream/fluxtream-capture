//
//  DataUploader.m
//  ForgeModule
//
//  Created by Julien Dupuis on 14/01/15.
//  Copyright (c) 2015 Trigger Corp. All rights reserved.
//

#import "DataUploader.h"

@interface DataUploader()

// Upload thread
@property (strong, nonatomic) NSThread *thread;
@property (nonatomic, strong) NSCondition *interruptCondition;

// Upload request parameters
@property (strong, nonatomic) NSString *uploadURL;
@property (strong, nonatomic) NSString *accessToken;

// List of data that must still be synchronized
@property (strong, nonatomic) NSMutableDictionary *unsynchronizedData;

@end


@implementation DataUploader

- (instancetype)initWithUploadURL:(NSString *)uploadURL accessToken:(NSString *)accessToken {
    if (self = [super init]) {
        // Get user defaults containing the sampled data
        self.unsynchronizedData = [[[NSUserDefaults standardUserDefaults] valueForKey:@"heartrate.unsynchronizedData"] mutableCopy];
        if (!self.unsynchronizedData) self.unsynchronizedData = [NSMutableDictionary new];
        // Init parameters
        [self setParametersUploadURL:uploadURL accessToken:accessToken];
        // Create interrupt condition for the thread
        self.interruptCondition = [NSCondition new];
    }
    return self;
}

- (void)setParametersUploadURL:(NSString *)uploadURL accessToken:(NSString *)accessToken {
    self.uploadURL = uploadURL;
    self.accessToken = accessToken;
}

- (void)startThread {
    // Create and start the thread that will check for pictures
    self.thread = [[NSThread alloc] initWithTarget:self selector:@selector(runUploadThread) object:nil];
    [self.thread start];
}

- (void)stopThread {
    [self.thread cancel];
    // Interrupt waiting thread
    [self.interruptCondition lock];
    [self.interruptCondition signal];
    [self.interruptCondition unlock];
    // Set thread to null
    self.thread = NULL;
}

- (void)addDataToUploadHeartBeat:(int)heartBeat beatSpacing:(int)beatSpacing {
        // Add new data to
        NSUInteger dataSizeBefore = self.unsynchronizedData.count;
        [self.unsynchronizedData setValue:[DataUploader encodeDataHeartRate:heartBeat beatSpacing:beatSpacing]
                                   forKey:[NSNumber numberWithDouble:[[NSDate date] timeIntervalSince1970]].description];
        [[NSUserDefaults standardUserDefaults] setValue:self.unsynchronizedData forKey:@"heartrate.unsynchronizedData"];
        [[NSUserDefaults standardUserDefaults] synchronize];
        NSLog(@"Adding data (%d, %d) ; Data counter = %d", heartBeat, beatSpacing, (int)self.unsynchronizedData.count);
        // Interrupt waiting thread
        if (self.unsynchronizedData.count != dataSizeBefore) {
            [self.interruptCondition lock];
            [self.interruptCondition signal];
            [self.interruptCondition unlock];
        } else {
            // Data has been replaced by a new value, don't signal count change
        }
}

/**
 * Encodes data as a string
 */
+ (NSString *)encodeDataHeartRate:(int)heartBeat beatSpacing:(int)beatSpacing {
    return [NSString stringWithFormat:@"%d,%d", heartBeat, beatSpacing];
}

/**
 * Decodes data from a string. Returns an array containing two integers : heart rate and beat spacing.
 */
+ (NSArray *)decodeData:(NSString *)data {
    int heartBeat = 0;
    int beatSpacing = 0;
    @try {
        NSArray *strings = [data componentsSeparatedByString:@","];
        if (strings.count >= 1) {
            heartBeat = [[strings objectAtIndex:0] intValue];
        }
        if (strings.count >= 2) {
            beatSpacing = [[strings objectAtIndex:1] intValue];
        }
    } @catch (NSException *e) {
        NSLog(@"Error while parsing data (%@)", data);
        heartBeat = 0;
        beatSpacing = 0;
    }
    return @[[NSNumber numberWithInt:heartBeat], [NSNumber numberWithInt:beatSpacing]];
}

/**
 * Loops to upload the data when it comes in
 */
- (void)runUploadThread {
    NSLog(@"Starting HR upload thread");
    while (![NSThread currentThread].cancelled) {
        @try {
            // Record the number of data before waiting for 5 seconds to see if new data has arrived in the meantime
            NSUInteger dataCountBeforeWait = self.unsynchronizedData.count;
            // Wait for 5 seconds (unless data size is already worth uploading)
            if (self.unsynchronizedData.count < BUNCH_SIZE) {
                @synchronized(self) {
                    NSLog(@"Waiting for 5 seconds...");
                    // Wait for 5 seconds. This will get notified if data comes in.
                    [self.interruptCondition lock];
                    [self.interruptCondition waitUntilDate:[NSDate dateWithTimeIntervalSinceNow:5]];
                    [self.interruptCondition unlock];
                    NSLog(@"Waiting over");
                }
            }
            // Stop if the thread should be canceled
            if ([NSThread currentThread].cancelled) return;
            // Check if data should be uploaded (i.e. if no data has been added over the last 5 seconds, or the bunch size has been reached)
            if (self.unsynchronizedData.count != 0 && (self.unsynchronizedData.count == dataCountBeforeWait || self.unsynchronizedData.count >= BUNCH_SIZE)) {
                // No data received for 5 seconds or data bunch size reached
                NSLog(@"self.dataCounter = %d and dataCountBeforeWait = %d", (int)self.unsynchronizedData.count, (int)dataCountBeforeWait);
                [self synchronizeNextDataBunch];
            } else {
                NSLog(@"Not synchronizing yet");
            }
        } @catch (NSException *e) {
            // End the thread if it must be terminated
            if ([NSThread currentThread].cancelled) return;
            // An error has occurred, wait for 20 seconds before the next retry
            [[ForgeApp sharedApp] event:@"heartrate.uploadError" withParam:NULL];
            NSLog(@"Exception: %@", e);
            NSLog(@"Pausing HR upload thread for 20 seconds");
            NSCondition *condition = [NSCondition new];
            [condition lock];
            [condition waitUntilDate:[NSDate dateWithTimeIntervalSinceNow:20]];
            [condition unlock];
        }
    }
}

/**
 * Reads in the prefs the set of data to be uploaded next
 */
- (NSDictionary *)getDataToSynchronize {
    @synchronized(self) {
        NSMutableDictionary *data = [NSMutableDictionary new];
        for (NSString *key in self.unsynchronizedData) {
            [data setValue:self.unsynchronizedData[key] forKey:key];
            if (data.count >= MAX_BUNCH_SIZE) break;
        }
        return data;
    }
}

/**
 * Removes from the prefs the data when it has been uploaded
 */
- (void)removeDataFromQueue:(NSDictionary *)data {
    @synchronized(self) {
        for (NSString *key in data) {
            [self.unsynchronizedData removeObjectForKey:key];
        }
        [[NSUserDefaults standardUserDefaults] setValue:self.unsynchronizedData forKey:@"heartrate.unsynchronizedData"];
        [[NSUserDefaults standardUserDefaults] synchronize];
    }
}

/**
 * Uploads the next MAX_BUNCH_SIZE samples
 */
- (void)synchronizeNextDataBunch {
    NSLog(@"Synchronizing now");
    [[ForgeApp sharedApp] event:@"heartrate.startUpload" withParam:NULL];
    
    // Collect data to upload
    NSDictionary *data = self.getDataToSynchronize;
    
    // Construct data string
    NSMutableArray *dataArray = [NSMutableArray new];
    for (NSString *key in data) {
        NSArray *ints = [DataUploader decodeData:data[key]];
        [dataArray addObject:@[[NSNumber numberWithInt:key.intValue], ints[0], ints[1]]];
    }
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dataArray
                                                       options:0
                                                         error:&error];
    NSString *dataString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    NSLog(@"Data to send: %@", dataString);
    
    // Create request
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] init];
    [request setHTTPMethod:@"POST"];
    [request setValue:@"application/x-www-form-urlencoded" forHTTPHeaderField:@"Content-Type"];
    [request setURL:[NSURL URLWithString:[self.uploadURL stringByAppendingString:@"?"]]];
    [request setTimeoutInterval:30.0];
    // Add body to request
    NSData *body = [[NSString stringWithFormat:@"access_token=%@&dev_nickname=%@&channel_names=%@&data=%@",
                     [self.accessToken stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding],
                     @"PolarStrap",
                     [@"[\"HeartBeat\",\"BeatSpacing\"]" stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding],
                     [dataString stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding]]
                    dataUsingEncoding:NSUTF8StringEncoding];
    NSString *bodyLength = [NSString stringWithFormat:@"%ld", (long)[body length]];
    [request setValue:bodyLength forHTTPHeaderField:@"Content-Length"];
    [request setHTTPBody:body];
    
    // Send request and wait for response
    NSURLResponse *response;
    NSData *responseData = [NSURLConnection sendSynchronousRequest:request
                                                 returningResponse:&response
                                                             error:&error];
    
    // Make sure status code is 2**
    int statusCode = (int)[(NSHTTPURLResponse*) response statusCode];
    NSLog(@"Response status code: %d", statusCode);
    if (statusCode / 100 != 2) @throw [NSException exceptionWithName:@"Wrong status code"
                                                              reason:[NSString stringWithFormat:@"Received wrong status code: %d", statusCode]
                                                            userInfo:nil];
    
    // Make sure response indicates successful records
    NSDictionary *json = [NSJSONSerialization JSONObjectWithData:responseData options:NSJSONReadingAllowFragments error:&error];
    int successfulRecords = [NSString stringWithFormat:@"%@", [json objectForKey:@"successful_records"]].intValue;
    if (!successfulRecords) @throw [NSException exceptionWithName:@"Wrong response"
                                                           reason:[NSString stringWithFormat:@"Unexpected response: %@", [[NSString alloc] initWithData:responseData encoding:NSUTF8StringEncoding]]
                                                         userInfo:nil];
    
    // The request was successful, remove data from queue
    NSLog(@"Removing %d pieces of data", (int)data.count);
    [self removeDataFromQueue:data];
    if (self.unsynchronizedData.count < BUNCH_SIZE) {
        [[ForgeApp sharedApp] event:@"heartrate.uploadDone" withParam:NULL];
    }
}

@end
