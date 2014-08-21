//
//  PhotoLibrary.h
//  ForgeModule
//
//  Created by Julien Dupuis on 11/08/14.
//  Copyright (c) 2014 Trigger Corp. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface PhotoLibrary : NSObject

+ (PhotoLibrary *)singleton;

- (void)getPhotoListWithCallback:(ForgeTask *)task;

@end
