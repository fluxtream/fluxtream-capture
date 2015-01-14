//
//  DataUploader.h
//  ForgeModule
//
//  Created by Julien Dupuis on 14/01/15.
//  Copyright (c) 2015 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>

#define BUNCH_SIZE 30
#define MAX_BUNCH_SIZE 60

@interface DataUploader : NSObject

- (instancetype)initWithUploadURL:(NSString *)uploadURL accessToken:(NSString *)accessToken;
- (void)setParametersUploadURL:(NSString *)uploadURL accessToken:(NSString *)accessToken;
- (void)startThread;
- (void)stopThread;
- (void)addDataToUploadHeartBeat:(int)heartBeat beatSpacing:(int)beatSpacing;

@end
