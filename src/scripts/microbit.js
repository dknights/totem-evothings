export default class Microbit {
  constructor(config) {
    this.config = config;
  }

  resetScan() {
    evothings.easyble.stopScan();
    evothings.easyble.closeConnectedDevices();
  }

  startScan() {
    return new Promise((resolve, reject) => {
      evothings.easyble.startScan(device => {
          if (this.isMicrobitDevice(device)) {
            evothings.easyble.stopScan();
            resolve(device);
          }
        },
        (errorCode) => {
          reject(errorCode);
        });
    });
  }

  isMicrobitDevice(device) {
    return device && device.name && ((device.name.indexOf('MicroBit') > -1) || (device.name.indexOf('micro:bit') > -1));
  }

  connectToDevice(device) {
    return new Promise((resolve, reject) => {
      device.connect(device => {
          resolve(device);
        },
        (errorCode) => {
          evothings.ble.reset();
          reject(errorCode);
        });
    });
  }

  readServices(device) {
    return new Promise((resolve, reject) => {
      device.readServices(
        [
          this.config.ACCELEROMETER_SERVICE,
          this.config.DEVICE_INFO_SERVICE,
        ],
        resolve,
        (errorCode) => {
          reject(errorCode);
        });
    });
  }

  startNotifications(device, callback) {
    return new Promise((resolve, reject) => {
      // Due to https://github.com/evothings/cordova-ble/issues/30
      // ... we have to do double work to make it function properly
      // on both Android and iOS. This first part is only needed for Android
      // and causes an error message on iOS that is safe to ignore.

      // Set notifications to ON.
      this.writeNotificationDescriptor(device, this.config.ACCELEROMETER_DATA);

      // Set sensor period to 160 ms.
      const periodDataBuffer = new ArrayBuffer(2);
      new DataView(periodDataBuffer).setUint16(0, 500, true);
      device.enableNotification(
        this.config.ACCELEROMETER_DATA,
        callback,
        (errorCode) => {

        });
      resolve(device);
    });
  }

  writeNotificationDescriptor(device, characteristicUUID) {
    device.writeDescriptor(
      characteristicUUID,
      this.config.BLE_NOTIFICATION_UUID,
      new Uint8Array([1, 0]),
      () => {

      },
      (errorCode) => {
        // This error will happen on iOS, since this descriptor is not
        // listed when requesting descriptors. On iOS you are not allowed
        // to use the configuration descriptor explicitly. It should be
        // safe to ignore this error.
      });
  }
}