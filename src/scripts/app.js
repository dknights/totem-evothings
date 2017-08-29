// JavaScript code for the Microbit Demo app.

export default class App {
  constructor() {
    //Timeout (ms) after which a message is shown if the Microbit wasn't found.
    this.CONNECT_TIMEOUT = 3000;

    // microbit information
    this.microbit = {
      ACCELEROMETER_SERVICE: 'e95d0753-251d-470a-a062-fa1922dfa9a8',
      ACCELEROMETER_DATA: 'e95dca4b-251d-470a-a062-fa1922dfa9a8',
      ACCELEROMETER_PERIOD: 'e95dfb24-251d-470a-a062-fa1922dfa9a8',
      MAGNETOMETER_SERVICE: 'e95df2d8-251d-470a-a062-fa1922dfa9a8',
      MAGNETOMETER_DATA: 'e95dfb11-251d-470a-a062-fa1922dfa9a8',
      MAGNETOMETER_PERIOD: 'e95d386c-251d-470a-a062-fa1922dfa9a8',
      MAGNETOMETER_BEARING: 'e95d9715-251d-470a-a062-fa1922dfa9a8',
      BUTTON_SERVICE: 'e95d9882-251d-470a-a062-fa1922dfa9a8',
      BUTTON_A: 'e95dda90-251d-470a-a062-fa1922dfa9a8',
      BUTTON_B: 'e95dda91-251d-470a-a062-fa1922dfa9a8',
      TEMPERATURE_SERVICE: 'e95d6100-251d-470a-a062-fa1922dfa9a8',
      TEMPERATURE_DATA: 'e95d9250-251d-470a-a062-fa1922dfa9a8',
      TEMPERATURE_PERIOD: 'e95d1b25-251d-470a-a062-fa1922dfa9a8',
      DEVICE_INFO_SERVICE: '0000180a-0000-1000-8000-00805f9b34fb',
      DEVICE_MODEL: '00002a24-0000-1000-8000-00805f9b34fb',
      SERIAL_NUMBER: '00002a25-0000-1000-8000-00805f9b34fb',
      FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
      BLE_NOTIFICATION_UUID: '00002902-0000-1000-8000-00805f9b34fb',
      // HARDWARE_REVISION: '00002a27-0000-1000-8000-00805f9b34fb',
      // SOFTWARE_REVISION: '00002a28-0000-1000-8000-00805f9b34fb',
      // MANUFACTURER: '00002a29-0000-1000-8000-00805f9b34fb',
    };
  }

  initialize() {
    document.addEventListener('deviceready', () => {
      evothings.scriptsLoaded(this.onDeviceReady.bind(this));
    }, false);
  }

  onDeviceReady() {
    document
      .getElementById('connect-button')
      .addEventListener('click', () => {
        this.onStartButton();
      });

    document
      .getElementById('disconnect-button')
      .addEventListener('click', () => {
        this.onStopButton();
      });
    this.showInfo('Activate the Microbit and tap Start.');
  }

  showInfo(info) {
    document.getElementById('Status').innerHTML = info;
    return this;
  }

  onConnect(context) {

  }

  createNewStatus(status, timestamp, userId) {
    firebase.database().ref('user-status/' + userId + "/").push({
      status: status,
      timestamp: timestamp
    });
  }

  onStartButton() {
    this
      .onStopButton()
      .startScan()
      .showInfo('Status: Scanning...')
      .startConnectTimer();
  }

  onStopButton() {
    // Stop any ongoing scan and close devices.
    this.stopConnectTimer();
    evothings.easyble.stopScan();
    evothings.easyble.closeConnectedDevices();
    this.showInfo('Status: Stopped.');
    return this;
  }

  startConnectTimer() {
    // If connection is not made within the timeout
    // period, an error message is shown.
    this.connectTimer = setTimeout(() => {
        this.showInfo('Status: Scanning...\nPlease start the Microbit.');
      },
      this.CONNECT_TIMEOUT);
    return this;
  }

  stopConnectTimer() {
    clearTimeout(this.connectTimer);
  }

  startScan() {
    evothings.easyble.startScan((device) => {
        // Connect if we have found an Microbit.
        if (this.deviceIsMicrobit(device)) {
          this.showInfo(`Status: Device found: ${device.name}.`);
          evothings.easyble.stopScan();
          this.connectToDevice(device);
          this.stopConnectTimer();
        }
      },
      (errorCode) => {
        this.showInfo(`Error: startScan: ${errorCode}.`);
      });
    return this;
  }

  deviceIsMicrobit(device) {
      return (device != null) && (device.name != null) && ((device.name.indexOf('MicroBit') > -1) || (device.name.indexOf('micro:bit') > -1));
  };

  connectToDevice(device) {
    this.showInfo('Connecting...');
    device.connect((device) => {
        this.showInfo('Status: Connected - reading Microbit services...');
        this.readServices(device);
        window.totemPos = '1';
        window.oldTotem = '1';
      },
      (errorCode) => {
        app.showInfo(`Error: Connection failed: ${errorCode}.`);
        evothings.ble.reset();
      });
  }

  readServices(device) {
    device.readServices(
      [
        this.microbit.ACCELEROMETER_SERVICE,
        this.microbit.MAGNETOMETER_SERVICE,
        this.microbit.TEMPERATURE_SERVICE,
        this.microbit.BUTTON_SERVICE,
        this.microbit.DEVICE_INFO_SERVICE,
      ],
      this.startNotifications.bind(this),
      (errorCode) => {
        this.showInfo(`Error: Read Services Failed: ${errorCode}`)
      });
  }

  writeCharacteristic(device, characteristicUUID, value) {
    device.writeCharacteristic(
      characteristicUUID,
      new Uint8Array(value),
      () => {

      },
      (errorCode) => {

      });
  }

  writeNotificationDescriptor(device, characteristicUUID) {
    device.writeDescriptor(
      characteristicUUID,
      this.microbit.BLE_NOTIFICATION_UUID,
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

  /**
   * Read accelerometer data.
   * FirmwareManualBaseBoard-v1.5.x.pdf
   */
  startNotifications(device) {
    this.showInfo('Status: Starting notifications...');

    this.readDeviceInfo(device);

    // Due to https://github.com/evothings/cordova-ble/issues/30
    // ... we have to do double work to make it function properly
    // on both Android and iOS. This first part is only needed for Android
    // and causes an error message on iOS that is safe to ignore.

    // Set notifications to ON.
    this.writeNotificationDescriptor(device, this.microbit.ACCELEROMETER_DATA);
    this.writeNotificationDescriptor(device, this.microbit.MAGNETOMETER_DATA);
    this.writeNotificationDescriptor(device, this.microbit.MAGNETOMETER_BEARING);
    this.writeNotificationDescriptor(device, this.microbit.TEMPERATURE_DATA);
    this.writeNotificationDescriptor(device, this.microbit.BUTTON_A);
    this.writeNotificationDescriptor(device, this.microbit.BUTTON_B);

    // Set sensor period to 160 ms.
    const periodDataBuffer = new ArrayBuffer(2);
    new DataView(periodDataBuffer).setUint16(0, 500, true);
    //this.writeCharacteristic(device, this.microbit.ACCELEROMETER_PERIOD, periodDataBuffer);
    //this.writeCharacteristic(device, this.microbit.MAGNETOMETER_PERIOD, periodDataBuffer);

    // Start accelerometer notification.
    device.enableNotification(
      this.microbit.ACCELEROMETER_DATA,
      this.handleAccelerometerValues.bind(this),
      (errorCode) => {

      });

    // Start magnetometer notification.
    device.enableNotification(
      this.microbit.MAGNETOMETER_DATA,
      this.handleMagnetometerValues.bind(this),
      (errorCode) => {

      });

    // Start magnetometer bearing notification.
    device.enableNotification(
      this.microbit.MAGNETOMETER_BEARING,
      this.handleMagnetometerBearing.bind(this),
      (errorCode) => {

      });

    // Start magnetometer bearing notification.
    device.enableNotification(
      this.microbit.TEMPERATURE_DATA,
      this.handleTemperatureData.bind(this),
      (errorCode) => {

      });

    // Start magnetometer bearing notification.
    device.enableNotification(
      this.microbit.BUTTON_A,
      this.handleButtonA.bind(this),
      (errorCode) => {

      });

    // Start magnetometer bearing notification.
    device.enableNotification(
      this.microbit.BUTTON_B,
      this.handleButtonB.bind(this),
      (errorCode) => {

      });
  }

  readDeviceInfo(device) {
    this.readCharacteristic(device, this.microbit.DEVICE_MODEL, 'DeviceModel');
    this.readCharacteristic(device, this.microbit.SERIAL_NUMBER, 'SerialNumber');
    this.readCharacteristic(device, this.microbit.FIRMWARE_REVISION, 'FirmwareRevision');
    // this.readCharacteristic(device, this.microbit.HARDWARE_REVISION, 'HardwareRevision');
    // this.readCharacteristic(device, this.microbit.SOFTWARE_REVISION, 'SoftwareRevision');
    // this.readCharacteristic(device, this.microbit.MANUFACTURER, 'Manufacturer');
    this.readCharacteristicUint16(device, this.microbit.ACCELEROMETER_PERIOD, 'Acc period');
    this.readCharacteristicUint16(device, this.microbit.MAGNETOMETER_PERIOD, 'Mag period');
    this.readCharacteristicUint16(device, this.microbit.TEMPERATURE_PERIOD, 'Tem period');
  }

  readCharacteristicUint16(device, uuid, name) {
    device.readCharacteristic(uuid, (data) => {
        //console.log(name+': '+evothings.util.littleEndianToUint16(new Uint8Array(data), 0));
      },
      (errorCode) => {

      });
  }

  readCharacteristic(device, uuid, spanID) {
    device.readCharacteristic(uuid, (data) => {
        const str = utf8ArrayToStr(data, (out, c) => {
          return out + '[' + c + ']';
        });
        //console.log(spanID+': '+str);
        //app.value(spanID, str);
      },
      (errorCode) => {

      });
  }

  value(elementId, value) {
    document.getElementById(elementId).innerHTML = value;
  }

  handleAccelerometerValues(data) {

    const values = app.parseAccelerometerValues(new Uint8Array(data));
    const totemStr = `res/icon${values.t}.png`;
    const now = new Date().getTime();

    if (!this.lastLog || now > this.lastLog + 1000) {
      this.lastLog = now;
      this.value('Accelerometer', "<img src='" + totemStr + "'/>");
    }
  }

  /**
   * Calculate accelerometer values from raw data for Microbit.
   * @param data - an Uint8Array.
   * @return Object with fields: x, y, z.
   */
  parseAccelerometerValues(data) {
    // We want to scale the values to +/- 1.
    // Documentation says: "Values are in the range +/-1000 milli-newtons, little-endian."
    // Actual maximum values is measured to be 2048.
    const divisor = 2048;
    // Calculate accelerometer values.
    const rawX = evothings.util.littleEndianToInt16(data, 0);
    const rawY = evothings.util.littleEndianToInt16(data, 2);
    const rawZ = evothings.util.littleEndianToInt16(data, 4);
    const ax = rawX / divisor;
    const ay = rawY / divisor;
    const az = rawZ / divisor;

//console.log (window.totemPos);

    if (rawZ > 850 && rawZ < 1200) {
      window.totemPos = '1';
    }

    if (rawZ < -850 && rawZ > -1200) {
      window.totemPos = '2'
    }

    if (rawX > 850 && rawX < 1200) {
      window.totemPos = '3';
    }

    if (rawX < -850 && rawX > -1200) {
      window.totemPos = '4';
    }

    if (rawY > 850 && rawY < 1200) {
      window.totemPos = '5';
    }

    if (rawY < -850 && rawY > -1200) {
      window.totemPos = '6';
    }

    if (window.oldTotem !== window.totemPos) {
      this.createNewStatus(parseInt(totemPos) - 1, new Date().getTime(), 0);
      console.log("updated");
      window.oldTotem = window.totemPos;
    }

    // log raw values every now and then
    const now = new Date().getTime();	// current time in milliseconds since 1970.
    if (!this.lastLog || now > this.lastLog + 3000) {
      this.lastLog = now;
      // console.log("old totem "+window.oldTotem);
    }

    return { t: window.totemPos };
  }

  handleMagnetometerValues(data) {
    const values = app.parseMagnetometerValues(new Uint8Array(data));
    //app.value('MagnetometerAxes', values.x+', '+values.y+', '+values.z);
  }

  parseMagnetometerValues(data) {
    const values = {
      x: evothings.util.littleEndianToUint16(data, 0),
      y: evothings.util.littleEndianToUint16(data, 2),
      z: evothings.util.littleEndianToUint16(data, 2),
    };
    return values;
  }

  handleMagnetometerBearing(data) {
    data = new Uint8Array(data);
    // log raw values every now and then
    const now = new Date().getTime();	// current time in milliseconds since 1970.

    if (!this.lastLog || now > this.lastLog + 1000) {
      this.lastLog = now;
    }

    const value = evothings.util.littleEndianToUint16(data, 0);
    //this.value('MagnetometerBearing', value);
  }

  handleTemperatureData(data) {
    //this.value('Temperature', evothings.util.littleEndianToInt8(new Uint8Array(data), 0)+' °C');
  }

  handleButtonA(data) {
    //this.value('ButtonA', evothings.util.littleEndianToInt8(new Uint8Array(data), 0));
  }

  handleButtonB(data) {
    //this.value('ButtonB', evothings.util.littleEndianToInt8(new Uint8Array(data), 0));
  }
}

// http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
/* utf.js - utf-8 <=> UTF-16 conversion
*
* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
* Version: 1.1
* LastModified: Nov 27 2015
* This library is free. You can redistribute it and/or modify it.
*/
function utf8ArrayToStr(array, errorHandler) {
  var out, i, len, c;
  var char2, char3;
  array = new Uint8Array(array);
  out = "";
  len = array.length;
  i = 0;
  while (i < len) {
    c = array[i++];
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12:
      case 13:
        // 110x xxxx 10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx 10xx xxxx 10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0));
        break;
      default:
        if (errorHandler)
          out = errorHandler(out, c)
        else
          throw "Invalid UTF-8!";
    }
  }
  return out;
}

const app = new App();
app.initialize();