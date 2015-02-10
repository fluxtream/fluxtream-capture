fluxtream-capture
=================

mobile app

Note: to test on your iOS device, please copy the mobile provision shared on Google Drive to fluxtreamcapture/IOS_certificates/development/ 

How to build for Android
------------------------

This assumes you already have configured your Trigger.io environment.

### Configuration

1. Configure the app (in `fluxtreamcapture/src/config.json` or using the toolkit).
  1. Set app name and Android package name (`name` and `core.android.package_name`)
  2. Configure Parse application id and client key (`modules.parse.config`)
2. Create a keystore and a key: `keytool -genkey -alias MY_KEY_NAME -keypass MY_KEY_PASSWORD -validity 365000 -keystore fluxtream.keystore -storepass MY_KEYSTORE_PASSWORD`
3. Check the environment configuration in `fluxtreamcapture/src/js/config/env.js`. They should be as in `env.sample.js`.

### Build steps (using the toolkit)

1. Check the configuration.
2. In the toolkit, click Forge, then click Package->Android and enter your keystore and key information.
3. The APK is generated in the `fluxtreamcapture/release/android` folder.

### Build steps (with command line)

1. Check the configuration.
2. Run `forge package android --android.profile.keystore fluxtream.keystore --android.profile.storepass KEYSTORE_PASSWORD --android.profile.keypass KEY_PASSWORD --android.profile.keyalias MY_KEY_NAME`
3. The APK is generated in the `fluxtreamcapture/release/android` folder.
