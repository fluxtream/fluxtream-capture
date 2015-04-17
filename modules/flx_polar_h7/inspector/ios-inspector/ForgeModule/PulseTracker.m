//
//  BTPulseTracker.m
//  ForgeModule
//
//  Created by Julien Dupuis on 20/01/15
//  Adapted from Randy Sargent and Nick Winter
//

#import "PulseTracker.h"
#include "Constants.h"


@interface PulseTracker()

// Whether we are currently scanning for a device
@property (nonatomic) BOOL scanningForDevice;

// The bluetooth manager
@property (strong) CBCentralManager *manager;

// The current connected bluetooth device
@property (strong, nonatomic) CBPeripheral *peripheral;

// Whether we are currently waiting for the device with the best signal
@property BOOL waitingForBestRSSI;
// Current best signal found
@property double bestRSSI;
// Device correspending to the best signal
@property (strong) CBPeripheral *bestPeripheral;

// Data uploader to which we are sending sampled data
@property (strong, nonatomic) DataUploader *dataUploader;

// Name of the device currently locked (or null if no device is locked)
@property (nonatomic, strong) NSString *lockedDeviceName;

@end


@implementation PulseTracker

#pragma mark - Object lifecycle

- (id)initWithDataUploader:(DataUploader *)dataUploader {
    NSLog(@"Init PulseTracker");
    if (self = [super init]) {
        
        // Create bluetooth manager
        self.manager = [[CBCentralManager alloc] initWithDelegate:self queue:nil];
        
        // Set data uploader
        self.dataUploader = dataUploader;
        
        // Reader locked devices from defaults
        NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
        self.lockedDeviceName = [defaults stringForKey:DEFAULTS_LOCKED_HEART_DEVICE_NICKNAME];
        
        // Initially enable this tracker
        self.enabled = true;
    }
    return self;
}

- (void)dealloc {
    [self stopScan];
    [self.peripheral setDelegate:nil];
}

#pragma mark - Enable/disable

- (void)setEnabled:(BOOL)enabled {
    enabled = !!enabled;
    if (enabled != _enabled) {
        _enabled = enabled;
        if (enabled) {
            [self start];
        } else {
            [self stop];
        }
    }
}

- (void)lockCurrentDevice:(BOOL)newState {
    if (newState) {
        // Lock current device
        if (self.peripheral) {
            // A device is connected, lock it
            self.lockedDeviceName = self.peripheral.name;
            [[NSUserDefaults standardUserDefaults] setValue:self.lockedDeviceName forKey:DEFAULTS_LOCKED_HEART_DEVICE_NICKNAME];
            [[NSUserDefaults standardUserDefaults] synchronize];
            [[ForgeApp sharedApp] event:@"heartrate.lockSuccess" withParam:nil];
        } else {
            // Not connected to a device, fail locking
            [[ForgeApp sharedApp] event:@"heartrate.lockFailure" withParam:nil];
        }
    } else {
        // Unlock current device
        self.lockedDeviceName = nil;
        [[NSUserDefaults standardUserDefaults] removeObjectForKey:DEFAULTS_LOCKED_HEART_DEVICE_NICKNAME];
        [[NSUserDefaults standardUserDefaults] synchronize];
        // Restart scan
        if (!self.peripheral) {
            [self startScan];
        }
    }
}

#pragma mark - Public connection stuff

- (void)stop {
    [self stopScan];
    if (self.peripheral) {
        [self disconnectPeripheral: self.peripheral];
    }
    self.scanningForDevice = false;
    self.peripheral = NULL;
}

- (void)start {
    if (!self.peripheral) {
        [self startScan];
    }
}

- (void)setPeripheral:(CBPeripheral*)peripheral {
    // Remove delegate from previous peripheral
    [_peripheral setDelegate:nil];
    // Set this as delegate for new peripheral
    _peripheral = peripheral;
    [peripheral setDelegate:self];
}

#pragma mark - Start/Stop Scan methods


/**
 * Request CBCentralManager to scan for heart rate peripherals using service UUID 0x180D
 */
- (void) startScan {
    self.scanningForDevice = true;
    self.peripheral = nil;
    
    if (self.lockedDeviceName) {
        // Don't try to connect to best signal
        self.waitingForBestRSSI = NO;
    } else {
        // Try to connect to best signal
        self.waitingForBestRSSI = YES;
        self.bestPeripheral = nil;
        self.bestRSSI = -1e100;
        // Wait for 3 seconds before choosing the device with the best signal
        double waitTime = 3;
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t) (waitTime * NSEC_PER_SEC)),
                       dispatch_get_main_queue(),
                       ^{ [self connectToBestSignal]; });
    }
    [[ForgeApp sharedApp] event:@"heartrate.discoveryStarted" withParam:nil];
    [self.manager scanForPeripheralsWithServices:[NSArray arrayWithObject:[CBUUID UUIDWithString:@"180D"]] options:nil];
}

/**
 * Request CBCentralManager to stop scanning for heart rate peripherals
 */
- (void) stopScan {
    [self.manager stopScan];
}

#pragma mark - Heart Rate Data

/**
 * Called when new HR data has been received from the monitor device
 * Docs at http://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.heart_rate_measurement.xml
 */
- (void) newHRMDataReceived:(NSData *)data {
    const uint8_t *reportData = (const uint8_t*) [data bytes];
    const uint8_t *reportDataEnd = reportData + [data length];
    uint8_t flags = *reportData++;
    
    // Get heart beat value
    uint16_t bpm = 0;
    if (flags & 0x01) {
        /* uint16 bpm */
        bpm = CFSwapInt16LittleToHost(*(uint16_t *)reportData);
        reportData += 2;
    } else {
        /* uint8 bpm */
        bpm = *reportData++;
    }
    
    // Gather beatSpacing values
    NSMutableArray *beatSpacings = [NSMutableArray new];
    if (flags & 0x10) {
        double totalDuration = 0;
        while (reportData < reportDataEnd) {
            double an_r2r = CFSwapInt16LittleToHost(*(uint16_t*) reportData)/1024.0;
            [beatSpacings addObject:[NSNumber numberWithDouble:an_r2r]];
            totalDuration += an_r2r;
            reportData += 2;
        }
    }
    
    // Send data to data uploader
    if (beatSpacings.count) {
        for (int i = 0; i < beatSpacings.count; i++) {
            int beatSpacing = (int)([beatSpacings[i] doubleValue] * 1000);
            [self.dataUploader addDataToUploadHeartBeat:bpm beatSpacing:beatSpacing];
            [[ForgeApp sharedApp] event:@"heartrate.data" withParam:@{@"heart_rate": [NSNumber numberWithInt:bpm], @"rr": [NSNumber numberWithInt:beatSpacing]}];
        }
    }
    
}

#pragma mark - CBCentralManager delegate methods

/**
 * Invoked whenever the central manager's state is updated.
 */
- (void) centralManagerDidUpdateState:(CBCentralManager *)central {
    switch (self.manager.state) {
        case CBCentralManagerStateUnsupported:
            [[ForgeApp sharedApp] event:@"heartrate.error" withParam:@{@"error": @"Bluetooth LE not supported on this device"}];
            return;
        case CBCentralManagerStateUnauthorized:
            [[ForgeApp sharedApp] event:@"heartrate.error" withParam:@{@"error": @"Bluetooth LE not authorized for this app"}];
            return;
        case CBCentralManagerStatePoweredOff:
            [[ForgeApp sharedApp] event:@"heartrate.error" withParam:@{@"error": @"Bluetooth is currently powered off"}];
            return;
        case CBCentralManagerStatePoweredOn:
            NSLog(@"Central manager powered on, scan for peripherals");
            if (self.scanningForDevice) {
                // Start scanning
                [self.manager scanForPeripheralsWithServices:[NSArray arrayWithObject:[CBUUID UUIDWithString:@"180D"]] options:nil];
            }
            return;
        case CBCentralManagerStateUnknown:
        default:
            [[ForgeApp sharedApp] event:@"heartrate.error" withParam:@{@"error": @"Something is wrong with Bluetooth LE support"}];
            return;
    }
}

/*
 * Connecting to Bluetooth Smart / Bluetooth Low Energy devices is interesting
 *
 * Devices do not advertise a UUID;  the UUID is only discoverable upon connecting to the device
 *
 * Devices have addresses, but these addresses may be scrambled every 15 mins.
 *
 * The OS maintains a mapping from address to CBPeripheral*, so you can check to see if the CBPeripheral is identical
 * to know if the device address is identical, but again, the address can get scrambled every 15 mins, so beware.
 *
 * Until you've connected with a particular CBPeripheral, it's UUID is set to nil.
 *
 * Pseudocode for discovering all UUIDs that are available
 *
 * scan
 * for each didDiscoverPeripheral:
 *   try to load
 *
 * Pseudocode for trying to reconnect to a particular UUID:
 *
 * scan
 * discover peripheral:
 *   connect to peripheral
 *     connected:  have correct UUID?  Done!
 *
 * Pseudocode for trying to connect to best-signal
 *
 * scan
 * phase1, for 3 seconds:
 * discover peripheral:
 *    queue it
 * phase2:
 * if any discovered, connect to the one with the best signal
 * otherwise:
 * discover peripheral:
 *
 * but only populates
 * Reference: http://lists.apple.com/archives/bluetooth-dev/2012/Aug/msg00107.html
 */

/**
 * CBCentralManager discovered a peripheral during scanning
 */
- (void) centralManager:(CBCentralManager *)central
  didDiscoverPeripheral:(CBPeripheral *)peripheral
      advertisementData:(NSDictionary *)advertisementData
                   RSSI:(NSNumber *)nsRSSI
{
    double rssi = [nsRSSI doubleValue];
    
    if (self.waitingForBestRSSI) {
        // Watch for best RSSI until time is up
        if (!self.bestPeripheral || rssi > self.bestRSSI) {
            self.bestPeripheral = peripheral;
            self.bestRSSI = rssi;
        }
    } else if (!self.lockedDeviceName || [self.lockedDeviceName isEqualToString:peripheral.name]) {
        // Either we're specifically looking for a particular device by nickname,
        // or we've expired the RSSI search timeout without finding anything.
        // Either way, connect now.
        [self connectPeripheral: peripheral];
    } else {
        // Not the device we're looking for
    }
}

/**
 * Called after a small delay after starting scan.
 * Connects to the device found having the best signal.
 */
- (void) connectToBestSignal {
    if (self.waitingForBestRSSI) {
        self.waitingForBestRSSI = NO;
        if (!self.peripheral && self.bestPeripheral) {
            [self connectPeripheral: self.bestPeripheral];
        } else if (!self.bestPeripheral) {
            NSLog(@"No devices found by best signal collection timeout");
        }
    }
}

/**
 * Request connection to peripheral
 */
- (void) connectPeripheral:(CBPeripheral*)peripheral {
    if (!self.peripheral) {
        self.peripheral = peripheral;
        self.scanningForDevice = false;
        [self.manager connectPeripheral:peripheral options:[NSDictionary dictionaryWithObject:[NSNumber numberWithBool:YES] forKey:CBConnectPeripheralOptionNotifyOnDisconnectionKey]];
    }
}

/**
 * Invoked when the central manager creates a connection to a peripheral.
 */
- (void)centralManager:(CBCentralManager *)central didConnectPeripheral:(CBPeripheral *)peripheral {
    if (peripheral != self.peripheral) {
        NSLog(@"Disconnecting from unexpected device %@", peripheral.name);
        [self disconnectPeripheral:peripheral];
    } else {
        [[ForgeApp sharedApp] event:@"heartrate.deviceConnected" withParam:@{@"device_name": peripheral.name}];
        [peripheral discoverServices:nil];
    }
    [self stopScan];
}

/**
 * Request disconnection from peripheral
 */
- (void) disconnectPeripheral:(CBPeripheral *)peripheral {
    [self.manager cancelPeripheralConnection:self.peripheral];
}

/**
 * Invoked whenever an existing connection with the peripheral is torn down.
 * Reset local variables
 */
- (void)centralManager:(CBCentralManager *)central didDisconnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error {
    [[ForgeApp sharedApp] event:@"heartrate.deviceDisconnected" withParam:nil];
    if (self.peripheral == peripheral) {
        NSLog(@"Lost connection to %@", peripheral.name);
        if (self.enabled) {
            // Restart scanning for devices
            [self startScan];
        }
    } else {
        NSLog(@"Disconnected from %@", peripheral.name);
    }
}

/**
 * Invoked when the central manager fails to create a connection with the peripheral.
 */
- (void)centralManager:(CBCentralManager *)central didFailToConnectPeripheral:(CBPeripheral *)peripheral error:(NSError *)error {
    NSLog(@"Failed to connect to %@", peripheral.name);
}

#pragma mark - CBPeripheral delegate methods

/*
 Invoked upon completion of a -[discoverServices:] request.
 Discover available characteristics on interested services
 
 *
 * 1800: Generic Access
 * 1801: Generic Attribute
 * 180a: Device Informaion
 * 180d: Heart Rate
 * 180f: Battery Service
 *
 */
- (void) peripheral:(CBPeripheral *)aPeripheral didDiscoverServices:(NSError *)error {
    for (CBService *aService in aPeripheral.services) {
        [aPeripheral discoverCharacteristics:nil forService:aService];
    }
}

/*
 * Invoked upon completion of a -[discoverCharacteristics:forService:] request.
 * Perform appropriate operations on interested characteristics
 *
 * http://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicsHome.aspx
 *
 * Polar H7:
 *
 * 1800:2a00 Device Name
 * 1800:2a01 Appearance
 * 1800:2a02 Privacy flag
 * 1800:2a03 Reconnection address
 * 1800:2a04 Peripheral preferred connection parameters
 *
 * 1801:2a05 Service changed
 *
 * 180a:2a23 System ID
 * 180a:2a24 Model number string
 * 180a:2a25 Serial number string
 * 180a:2a26 Firmware revision string
 * 180a:2a27 Hardware revision string
 * 180a:2a28 Software revision string
 * 180a:2a29 Manufacturer name string
 *
 * 180d:2a37 Heart Rate measurement
 * 180d:2a38 Body Sensor Location
 *
 * 180f:2a19 Battery Level (%)
 */

unsigned long long u64(CBUUID *uuid);

unsigned long long u64(CBUUID *uuid) {
    unsigned long long ret = 0;
    const unsigned char *bytes = (const unsigned char *) uuid.data.bytes;
    for (unsigned i = 0; i < uuid.data.length; i++) {
        ret |= (((unsigned long long)bytes[uuid.data.length - 1 - i]) << (i * 8));
    }
    return ret;
}

NSString *hex(CFUUIDRef uuid);
NSString *hex(CFUUIDRef uuid) {
    CFUUIDBytes uuidBytes = CFUUIDGetUUIDBytes(uuid);
    NSMutableString *ret = [[NSMutableString alloc] init];
    for (unsigned i = 0; i < sizeof(uuidBytes); i++) {
        [ret appendFormat:@"%02X", ((unsigned char*) & uuidBytes)[i]];
    }
    return ret;
}

unsigned long long lsbFirst(NSData *data);

unsigned long long lsbFirst(NSData *data) {
    unsigned long long ret = 0;
    const unsigned char *bytes = (const unsigned char *) data.bytes;
    size_t length = data.length;
    for (unsigned i = 0; i < length; i++) {
        ret |= (((unsigned long long)bytes[i]) << (i * 8));
    }
    return ret;
}

/**
 * Discovered characteristic
 */
- (void) peripheral:(CBPeripheral *)peripheral didDiscoverCharacteristicsForService:(CBService *)service error:(NSError *)error {
    for (CBCharacteristic *ch in service.characteristics) {
        unsigned long long serviceID = (u64(service.UUID) << 32) | u64(ch.UUID);
        if (ch.properties & CBCharacteristicPropertyRead) {
            NSLog(@"Requesting read of %llX", serviceID);
            [peripheral readValueForCharacteristic:ch];
        }
        if (ch.properties & CBCharacteristicPropertyNotify) {
            NSLog(@"Requesting notification for %llX", serviceID);
            [peripheral setNotifyValue:YES forCharacteristic:ch];
        }
    }
}

- (void) peripheral:(CBPeripheral *)peripheral didUpdateValueForCharacteristic:(CBCharacteristic *)ch error:(NSError *)error {
    if (error) {
        NSLog(@"Characteristic %X has error %@", (int)u64(ch.UUID), [error description]);
        return;
    }
    if (!ch.value) {
        NSLog(@"Characteristic %X has no value", (int)u64(ch.UUID));
        return;
    }
    switch (u64(ch.UUID)) {
        case 0x2A37: // Heart rate
            [self newHRMDataReceived:ch.value];
            break;
        case 0x2A19: // Battery level
            NSLog(@"Characteristic update: Battery level is %d%%", (int)lsbFirst(ch.value));
            break;
        case 0x2A00: // Device name
            NSLog(@"Characteristic update: Device name: %@", ch.value);
            break;
        case 0x2A23: // System ID
            NSLog(@"Characteristic update: Device UUID: %llX", lsbFirst(ch.value));
            break;
        case 0x2A24: // Model number
            NSLog(@"Characteristic update: Model: %@", ch.value);
            break;
        case 0x2A25: // Serial number
            NSLog(@"Characteristic update: Serial number: %@", ch.value);
            break;
        case 0x2A26: // Firmware revision
            NSLog(@"Characteristic update: Firmware version: %@", ch.value);
            break;
        case 0x2A27: // Hardware revision
            NSLog(@"Characteristic update: Hardware version: %@", ch.value);
            break;
        case 0x2A28: // Software revision
            NSLog(@"Characteristic update: Software version: %@", ch.value);
            break;
        case 0x2A29: // Manufacturer
            NSLog(@"Characteristic update: Manufacturer: %@", ch.value);
//            self.manufacturer = [[NSString alloc] initWithData:ch.value encoding:NSUTF8StringEncoding];
            break;
        case 0x2A38: // Body sensor location
            NSLog(@"Characteristic update: Body sensor location: %d", (int)lsbFirst(ch.value));
            break;
        default:
            NSLog(@"Characteristic update: Characteristic %X: %@", (int)u64(ch.UUID), ch.value);
            break;
    }
}

@end