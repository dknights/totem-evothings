import "babel-polyfill";
import firebase from 'firebase';
import Microbit from './microbit';

export default class App {
  constructor() {
    this.CONNECT_TIMEOUT = 5000;
    this.lastLog = null;
    this.totemPosition = 1;
    this.oldTotemPosition = 1;
    this.xhr = new XMLHttpRequest();
    this.microbit = new Microbit({
      ACCELEROMETER_SERVICE: 'e95d0753-251d-470a-a062-fa1922dfa9a8',
      ACCELEROMETER_DATA: 'e95dca4b-251d-470a-a062-fa1922dfa9a8',
      ACCELEROMETER_PERIOD: 'e95dfb24-251d-470a-a062-fa1922dfa9a8',
      DEVICE_INFO_SERVICE: '0000180a-0000-1000-8000-00805f9b34fb',
      DEVICE_MODEL: '00002a24-0000-1000-8000-00805f9b34fb',
      SERIAL_NUMBER: '00002a25-0000-1000-8000-00805f9b34fb',
      FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
      BLE_NOTIFICATION_UUID: '00002902-0000-1000-8000-00805f9b34fb'
    });

    this.firebaseConfig = {
      apiKey: 'API_KEY',
      authDomain: 'AUTH_DOMAIN',
      databaseURL: 'DATABASE_URL',
      projectId: 'PROJECT_ID',
      storageBucket: 'STORAGE_BUCKET',
      messagingSenderId: 'MESSAGING_SENDER_ID'
    };
  }

  initialize() {
    document.addEventListener('deviceready', () => {
      evothings.scriptsLoaded(this.onDeviceReady.bind(this));
    }, false);
    this.initializeFirebase();
  }

  initializeFirebase() {
    firebase.initializeApp(this.firebaseConfig);
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
    document.getElementById('status').innerHTML = info;
    return this;
  }

  createNewStatus(status, timestamp, userId) {
    firebase.database().ref('user-status/' + userId + "/").push({
      status: status,
      timestamp: timestamp
    });
  }



changeStatus(message, emoji)
  {
    this.temp_token ='xoxp-3360794059-3518803224-233131626928-8cdbab0f8c3359eff31d69cc2e72b186';
  	var url = 'https://slack.com/api/users.profile.set';
  	this.xhr.open("POST", url, true);
  	this.xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
  	this.xhr.send('token=xoxp-3360794059-3518803224-233838040384-4d0af36f2f27b88e0303c6b720e4199a&profile=%7B%22status_text%22%3A%22'+message+'%22%2C%22status_emoji%22%3A%22%3A'+emoji+'%3A%22%7D');

  }

  onStartButton() {
    this
      .onStopButton()
      .startScan()
      .showInfo('Scanning...')
      .startConnectTimer();
  }

  onStopButton() {
    this.stopConnectTimer();
    this.microbit.resetScan();
    this.showInfo('Stopped.');
    return this;
  }

  startConnectTimer() {
    this.connectTimer = setTimeout(() => {
        this.showInfo('Scanning...\nPlease start the Microbit.');
      },
      this.CONNECT_TIMEOUT);
    return this;
  }

  stopConnectTimer() {
    clearTimeout(this.connectTimer);
  }

  startScan() {
    this
      .microbit
      .startScan()
      .then(device => {
        this.showInfo(`Device found: ${device.name}. Connecting...`);
        return this.microbit.connectToDevice(device);
      })
      .then(device => {
        this.showInfo('Connected - reading Microbit services...');
        this.stopConnectTimer();
        this.resetTotemPosition();
        return this.microbit.readServices(device);
      })
      .then(device => {
        this.showInfo('Starting notifications...');
        return this.microbit.startNotifications(device, this.handleAccelerometerValues.bind(this));
      })
      .then(() => {
        this.showInfo('Setup complete. Receiving data...');
      })
      .catch(err => {
        this.showInfo(`Error: ${err}.`);
      });
    return this;
  }

  resetTotemPosition() {
    this.totemPosition = 1;
    this.oldTotemPosition = 1;
  }

  updateImage() {

    this.innerEmoji="em em-"+this.emoji;
    document.getElementById('accelerometer').innerHTML = `<br><i class="${this.innerEmoji}"></i><p>`+unescape(this.message)+`</p>`;
  }

  handleAccelerometerValues(data) {
    // TODO - remove status update from parseAccelerometerValues function
    this.parseAccelerometerValues(new Uint8Array(data));
    const now = new Date().getTime();

    if (!this.lastLog || now > this.lastLog + 1000) {
      this.lastLog = now;
      this.updateImage();
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
    const rawX = evothings.util.littleEndianToInt16(data, 0);
    const rawY = evothings.util.littleEndianToInt16(data, 2);
    const rawZ = evothings.util.littleEndianToInt16(data, 4);

    // TODO - check why the totemPosition is confused when dropping the microbit
    if (rawZ > 850 && rawZ < 1200) {
      this.totemPosition = 1;
      this.message = "work%20mode%3A%20Stopped";
      this.emoji = "raised_hand";
    }

    if (rawZ < -850 && rawZ > -1200) {
      this.totemPosition = 2;
      this.message = "mode%3A%20Paused";
      this.emoji = "zzz";
    }

    if (rawX > 850 && rawX < 1200) {
      this.totemPosition = 3;
        this.message = "mode%3A%20Conceptual";
        this.emoji = "cloud";
    }

    if (rawX < -850 && rawX > -1200) {
      this.totemPosition = 4;
      this.message = "mode%3A%20Tangible";
      this.emoji = "no_entry_sign";
    }

    if (rawY > 850 && rawY < 1200) {
      this.totemPosition = 5;
      this.message = "mode%3A%20getting%20shit%20done";
      this.emoji = "sweat_drops";
    }

    if (rawY < -850 && rawY > -1200) {
      this.totemPosition = 6;
      this.message = "mode%3A%20Inspiration";
      this.emoji = "blossom";
    }

    if (this.oldTotemPosition !== this.totemPosition) {
      this.createNewStatus(this.totemPosition - 1, new Date().getTime(), 0);
      this.changeStatus(this.message, this.emoji);
      this.oldTotemPosition = this.totemPosition;
    }

    // log raw values every now and then
    const now = new Date().getTime();
    if (!this.lastLog || now > this.lastLog + 3000) {
      this.lastLog = now;
    }
  }
}

const app = new App();
app.initialize();
