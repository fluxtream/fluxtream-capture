//
//  DataUploader.m
//  ForgeModule
//
//  Created by Julien Dupuis on 14/01/15.
//  Copyright (c) 2015 Trigger Corp. All rights reserved.
//

#import "DataUploader.h"

@interface DataUploader()

//@property (strong, nonatomic) NSUserDefaults *userDefaults;

@property (strong, nonatomic) NSThread *thread;
@property (nonatomic, strong) NSCondition *interruptCondition;

// Counts the number of unuploaded samples
//@property (nonatomic) int dataCounter;

@property (strong, nonatomic) NSString *uploadURL;
@property (strong, nonatomic) NSString *accessToken;

@property (strong, nonatomic) NSMutableDictionary *unsynchronizedData;

@end


@implementation DataUploader

- (instancetype)initWithUploadURL:(NSString *)uploadURL accessToken:(NSString *)accessToken {
    if (self = [super init]) {
        // Get user defaults containing the sampled data
//        self.userDefaults = [[NSUserDefaults alloc] initWithSuiteName:@"org.fluxtream.flx_polar_h7_data"];
        self.unsynchronizedData = [[[NSUserDefaults standardUserDefaults] valueForKey:@"heartrate.unsynchronizedData"] mutableCopy];
        if (!self.unsynchronizedData) self.unsynchronizedData = [NSMutableDictionary new];
        // Count the data
//        self.dataCounter = self.userDefaults.dictionaryRepresentation.count;
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
    [self.unsynchronizedData setValue:[DataUploader encodeDataHeartRate:heartBeat beatSpacing:beatSpacing]
                            forKey:[NSNumber numberWithDouble:[[NSDate date] timeIntervalSince1970]].description];
    [[NSUserDefaults standardUserDefaults] setValue:self.unsynchronizedData forKey:@"heartrate.unsynchronizedData"];
    [[NSUserDefaults standardUserDefaults] synchronize];
//    self.dataCounter++;
    NSLog(@"Adding data (%d, %d) ; Data counter = %d", heartBeat, beatSpacing, self.unsynchronizedData.count);
    // Interrupt waiting thread
    [self.interruptCondition lock];
    [self.interruptCondition signal];
    [self.interruptCondition unlock];
}

+ (NSString *)encodeDataHeartRate:(int)heartBeat beatSpacing:(int)beatSpacing {
    return [NSString stringWithFormat:@"%d,%d", heartBeat, beatSpacing];
}

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

- (void)runUploadThread {
    NSLog(@"Starting HR upload thread");
    while (![NSThread currentThread].cancelled) {
        @try {
            // Record the number of data before waiting for 5 seconds to see if new data has arrived in the meantime
            int dataCountBeforeWait = self.unsynchronizedData.count;
            // Wait for 5 seconds (unless data size is already worth uploading)
            if (self.unsynchronizedData.count < BUNCH_SIZE) {
                @synchronized(self) {
                    // Wait for 5 seconds. This will get notified if data comes in.
                    [self.interruptCondition lock];
                    [self.interruptCondition waitUntilDate:[NSDate dateWithTimeIntervalSinceNow:5]];
                    [self.interruptCondition unlock];
                }
            }
            // Stop if the thread should be canceled
            if ([NSThread currentThread].cancelled) return;
            // Check if data should be uploaded (i.e. if no data has been added over the last 5 seconds, or the bunch size has been reached)
            if (self.unsynchronizedData.count != 0 && (self.unsynchronizedData.count == dataCountBeforeWait || self.unsynchronizedData.count >= BUNCH_SIZE)) {
                // No data received for 5 seconds or data bunch size reached
                NSLog(@"self.dataCounter = %d and dataCountBeforeWait = %d", self.unsynchronizedData.count, dataCountBeforeWait);
                [self synchronizeNextDataBunch];
            }
        } @catch (NSException *e) {
            if ([NSThread currentThread].cancelled) return;
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
    
    /*
    // Create list of parameters
    List<NameValuePair> params = new ArrayList<NameValuePair>();
    params.add(new BasicNameValuePair("dev_nickname", "PolarStrap"));
    params.add(new BasicNameValuePair("channel_names", "[\"HeartBeat\",\"BeatSpacing\"]"));
    params.add(new BasicNameValuePair("data", dataString));
    params.add(new BasicNameValuePair("access_token", accessToken));
    
    // Create request
    HttpPost httpPost = new HttpPost(uploadURL);
    httpPost.setEntity(new UrlEncodedFormEntity(params, HTTP.UTF_8));
    
    // Execute request with a timeout of 30 seconds
    HttpParams httpParams = new BasicHttpParams();
    HttpConnectionParams.setConnectionTimeout(httpParams, 30000);
    HttpConnectionParams.setSoTimeout(httpParams, 30000);
    HttpClient httpClient = new DefaultHttpClient(httpParams);
    HttpResponse response = httpClient.execute(httpPost);
    
    // Check response status code
    int statusCode = response.getStatusLine().getStatusCode();
    Log.i(PolarH7Service.LOG_TAG, "Response status code: " + statusCode);
    if (statusCode / 100 != 2) {
        throw new Exception("Wrong http response received when fetching access token (" + statusCode + ")");
    }
    // Read response
    BufferedReader reader = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
    String line = null;
    String responseBody = "";
    while ((line = reader.readLine()) != null) {
        responseBody = responseBody + line;
    }
    Log.i(PolarH7Service.LOG_TAG, "Upload response: " + responseBody);
    // Parse response
    JSONObject jsonResponse = new JSONObject(responseBody);
    // Get whether the request was successful
    String successfulRecords = jsonResponse.getString("successful_records");
    boolean success = (Integer.parseInt(successfulRecords) != 0);
     */
    BOOL success = YES;
    if (success) {
        // The request was successful, remove data from queue
        NSLog(@"Removing %d pieces of data", data.count);
        [self removeDataFromQueue:data];
        if (self.unsynchronizedData.count < BUNCH_SIZE) {
            [[ForgeApp sharedApp] event:@"heartrate.uploadDone" withParam:NULL];
        }
    }
}



@end


































