//
//  BTPulseTracker.h
//  ForgeModule
//
//  Created by Julien Dupuis on 20/01/15
//  Adapted from Randy Sargent and Nick Winter
//

#import <Foundation/Foundation.h>
#import <CoreBluetooth/CoreBluetooth.h>
#import "DataUploader.h"


@interface PulseTracker : NSObject <CBCentralManagerDelegate, CBPeripheralDelegate>

// Whether the pulse tracker is active. Set this to false to disable.
@property (nonatomic) BOOL enabled;

// Initializes, and sets the data uploader to which data will be sent
- (instancetype)initWithDataUploader:(DataUploader *)dataUploader;

// Enable/disable connecting only to the current device
- (void)lockCurrentDevice:(BOOL)newState;

@end
