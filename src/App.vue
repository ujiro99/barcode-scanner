<template>
  <div id="app">
    <pre>Camera: {{ streamLabel }}</pre>

    <div
      id="interactive"
      class="viewport"
      ref="video"
      :style="{ height: videoHeight + 'px' }"
    >
      <div class="offset-top" :style="{ height: offsetHeight + 'px' }"></div>
      <div class="offset-bottom" :style="{ height: offsetHeight + 'px' }"></div>
    </div>

    <pre v-if="errorMessage"> {{ errorMessage }}</pre>

    <button @click="initialize" v-if="is(MODE.DEFAULT)">Clear</button>

    <ul>
      <li v-for="code in detectedCodes" :key="code">
        <pre> code: {{ code }}</pre>
      </li>
    </ul>
  </div>
</template>

<script>
import Quagga from "quagga";

const MODE = {
  DEFAULT: "DEFAULT",
  INITIALIZED: "INITIALIZED",
  STARTED: "STARTED",
  STOPPED: "STOPPED"
};

const DETECTED_BOX = "green";
const PROCESSED_BOX = "blue";
const PROCESSED_LINE = "red";
const OFFSET = 30; // %

let detecting = {};

export default {
  name: "app",
  data: function() {
    return {
      MODE: MODE,
      currentMode: MODE.DEFAULT,
      streamLabel: undefined,
      devices: [],
      videoHeight: undefined,
      offsetHeight: undefined,
      detectedCodes: [],
      errorMessage: undefined
    };
  },
  async mounted() {
    await this.initialize();
    this.initCameraSelection();

    this.videoHeight = this.$refs.video.children[2].clientHeight;
    this.offsetHeight = (this.videoHeight * OFFSET) / 100;

    Quagga.onDetected(this.detected);
    Quagga.onProcessed(this.processed);
  },
  methods: {
    is(mode) {
      return this.currentMode === mode;
    },
    to(mode) {
      this.currentMode = mode;
    },
    async initialize() {
      detecting = {};
      this.detectedCodes.splice(0, this.detectedCodes.length);

      const App = {
        init: async function() {
          return new Promise(resolve => {
            Quagga.init(this.state, function(err) {
              if (err) {
                throw err;
              }
              Quagga.start();
              resolve();
            });
          });
        },
        state: {
          inputStream: {
            type: "LiveStream",
            constraints: {
              facingMode: "environment"
            },
            area: {
              top: OFFSET + "%",
              right: "0%",
              left: "0%",
              bottom: OFFSET + "%"
            }
          },
          locate: true,
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 2,
          frequency: 10,
          decoder: {
            readers: [
              {
                format: "ean_reader",
                config: {}
              }
            ]
          }
        }
      };
      return App.init();
    },
    initCameraSelection: function() {
      this.streamLabel = Quagga.CameraAccess.getActiveStreamLabel();
      return Quagga.CameraAccess.enumerateVideoDevices().then(devices => {
        this.devices.push(...devices);
      });
    },
    detected(result) {
      console.log(result);
      let code = result.codeResult.code;

      if (!detecting[code]) {
        detecting[code] = { count: 1 };
      } else {
        detecting[code].count += 1;
      }

      if (detecting[code].count >= 5 && !this.detectedCodes.includes(code)) {
        this.detectedCodes.push(code);
      }

      // adjust offset height.
      result.box.forEach(point => {
        point[1] = point[1] - this.offsetHeight;
      });

      let drawingCtx = Quagga.canvas.ctx.overlay;
      if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
          color: PROCESSED_BOX,
          lineWidth: 2
        });
      }
      if (result.codeResult && result.codeResult.code) {
        Quagga.ImageDebug.drawPath(
          result.line,
          { x: "x", y: "y" },
          drawingCtx,
          { color: PROCESSED_LINE, lineWidth: 3 }
        );
      }
    },
    processed(result) {
      if (!result) {
        return;
      }

      let drawingCtx = Quagga.canvas.ctx.overlay;
      let drawingCanvas = Quagga.canvas.dom.overlay;

      if (result.boxes) {
        drawingCtx.clearRect(
          0,
          0,
          parseInt(drawingCanvas.getAttribute("width")),
          parseInt(drawingCanvas.getAttribute("height"))
        );
        result.boxes
          .filter(function(box) {
            return box !== result.box;
          })
          .forEach(function(box) {
            Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
              color: DETECTED_BOX,
              lineWidth: 2
            });
          });
      }
    }
  }
};
</script>

<style lang="scss">
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.offset-top,
.offset-bottom {
  background: white;
  opacity: 0.5;
  z-index: 1;
  position: absolute;
  right: 0;
  left: 0;
}

.offset-top {
  top: 0;
}

.offset-bottom {
  bottom: 0;
}

#interactive {
  position: relative;
  background-color: lightgray;

  & > canvas,
  & > video {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>
