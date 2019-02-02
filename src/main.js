import Vue from "vue";
import App from "./App.vue";
import Buefy from "buefy";
import store from "./store";
import "./registerServiceWorker";

Vue.config.productionTip = false;

Vue.use(Buefy);

new Vue({
  store,
  render: h => h(App)
}).$mount("#app");
