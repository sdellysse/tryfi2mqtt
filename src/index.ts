import { connectAsync as mqttConnectAsync } from "async-mqtt";
import * as rt from "runtypes";
import { CookieJar } from "tough-cookie";
import * as tryfi from "./tryfi";

(async () => {
  const tryfiEmail = rt.String.check(process.env["tryfi_email"]);
  const tryfiPassword = rt.String.check(process.env["tryfi_password"]);
  const mqttUrl = rt.String.check(process.env["mqtt_url"]);
  const mqttTopic = rt.String.check(process.env["mqtt_topic"]);
  const mqttInterval = rt.String.check(process.env["mqtt_interval"]);

  const cookieJar = new CookieJar();

  const mqtt = await mqttConnectAsync(mqttUrl);

  let loopGuard = false;
  setInterval(async () => {
    if (!loopGuard) {
      loopGuard = true;

      const json = await tryfi.getDetails(tryfiEmail, tryfiPassword, cookieJar);
      await mqtt.publish(mqttTopic, JSON.stringify(json));
      console.log(new Date() + " published");

      loopGuard = false;
    }
  }, parseInt(mqttInterval, 10));
})();
