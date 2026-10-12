import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import vm from "node:vm";

import {
  GA4_PRODUCTION_HOSTNAME,
  AnalyticsScripts,
  buildGa4InitializerScript,
  isGa4ProductionHostname,
  resolveGaMeasurementId,
} from "./AnalyticsScripts";

const MEASUREMENT_ID = "G-Z2TV02DKPZ";
const FUNNEL_SOURCE = readFileSync("src/lib/analytics/fridge-trust-funnel.ts", "utf8");
const LAYOUT = readFileSync("src/app/layout.tsx", "utf8");

type DataLayerCommand = ArrayLike<unknown>;

function runInitializer(hostname: string, measurementId = MEASUREMENT_ID) {
  const loaderSrcs: string[] = [];
  const sandbox: Record<string, unknown> = {
    window: {
      location: { hostname },
    },
    document: {
      head: {
        appendChild(node: { src: string }) {
          loaderSrcs.push(node.src);
        },
      },
      documentElement: {
        appendChild(node: { src: string }) {
          loaderSrcs.push(node.src);
        },
      },
      getElementsByTagName() {
        return [
          {
            parentNode: {
              insertBefore(node: { src: string }) {
                loaderSrcs.push(node.src);
              },
            },
          },
        ];
      },
      createElement() {
        return { async: false, src: "" };
      },
    },
  };
  vm.runInNewContext(buildGa4InitializerScript(measurementId), sandbox, {
    timeout: 1000,
  });
  const win = sandbox.window as { gtag?: unknown; dataLayer?: DataLayerCommand[] };
  return { gtag: win.gtag, dataLayer: win.dataLayer, loaderSrcs };
}

function assertGa4Disabled(hostname: string) {
  const result = runInitializer(hostname);
  assert.equal(typeof result.gtag, "undefined", hostname);
  assert.equal(result.dataLayer, undefined, hostname);
  assert.deepEqual(result.loaderSrcs, [], hostname);
}

test("production hostname initializes the same GA4 config", () => {
  assert.equal(isGa4ProductionHostname("buckparts.com"), true);
  assert.equal(isGa4ProductionHostname("BUCKPARTS.COM"), true);
  assert.equal(isGa4ProductionHostname("buckparts.com."), true);

  const result = runInitializer("buckparts.com");
  assert.equal(typeof result.gtag, "function");
  assert.deepEqual(result.loaderSrcs, [
    `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`,
  ]);
  assert.ok(result.dataLayer);
  assert.equal(result.dataLayer.length, 2);
  assert.equal(result.dataLayer[0]?.[0], "js");
  const jsAt = result.dataLayer[0]?.[1] as { getTime?: () => number };
  assert.equal(typeof jsAt?.getTime, "function");
  assert.equal(result.dataLayer[1]?.[0], "config");
  assert.equal(result.dataLayer[1]?.[1], MEASUREMENT_ID);
  const config = result.dataLayer[1]?.[2] as { send_page_view?: boolean };
  assert.deepEqual(Object.keys(config), ["send_page_view"]);
  assert.equal(config.send_page_view, true);
});

test("deploy-preview and other non-production hosts do not initialize GA4", () => {
  const disabled = [
    "deploy-preview-51--buckparts.netlify.app",
    "deploy-preview-60--buckparts.netlify.app",
    "buckparts.netlify.app",
    "main--buckparts.netlify.app",
    "localhost",
    "127.0.0.1",
    "::1",
    "www.buckparts.com",
    "buckparts.com.evil.example",
    "notbuckparts.com",
    "",
  ];
  for (const hostname of disabled) {
    assert.equal(isGa4ProductionHostname(hostname), false, hostname);
    assertGa4Disabled(hostname);
  }
});

test("initializer returns before config on a non-production host", () => {
  const script = buildGa4InitializerScript(MEASUREMENT_ID);
  const gateAt = script.indexOf(`if (host !== ${JSON.stringify(GA4_PRODUCTION_HOSTNAME)}) return;`);
  const configAt = script.indexOf(`gtag('config', ${JSON.stringify(MEASUREMENT_ID)}, { send_page_view: true });`);
  assert.ok(gateAt >= 0);
  assert.ok(configAt > gateAt);
  assert.equal(script.includes("https://www.googletagmanager.com/gtag/js"), true);
});

test("rendered markup does not request gtag.js until the host gate runs", () => {
  const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = MEASUREMENT_ID;
  try {
    const html = renderToStaticMarkup(createElement(AnalyticsScripts));
    assert.match(html, /id="buckparts-ga4"/);
    assert.equal(html.includes("<script src="), false);
    assert.equal(html.includes("googletagmanager.com/gtag/js"), true);
    assert.match(html, /if \(host !== "buckparts\.com"\) return;/);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
  }
});

test("missing measurement id still renders nothing", () => {
  const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  try {
    assert.equal(resolveGaMeasurementId(), null);
    assert.equal(renderToStaticMarkup(createElement(AnalyticsScripts)), "");
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
  }
});

test("layout still mounts AnalyticsScripts only in the body", () => {
  const bodyOpen = LAYOUT.indexOf("<body");
  const analyticsIdx = LAYOUT.indexOf("<AnalyticsScripts />");
  assert.ok(analyticsIdx > bodyOpen);
});

test("fridge trust funnel event code is unchanged by the host gate", () => {
  assert.equal(FUNNEL_SOURCE.includes("isGa4ProductionHostname"), false);
  assert.equal(FUNNEL_SOURCE.includes("gtag(\"event\", built.event_name, built)"), true);
  assert.equal(FUNNEL_SOURCE.includes("hostname"), false);
});
