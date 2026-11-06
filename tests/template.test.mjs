import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../template.tpl", import.meta.url), "utf8");
const script = source
    .split("___SANDBOXED_JS_FOR_WEB_TEMPLATE___")[1]
    .split("___WEB_PERMISSIONS___")[0];

// One page: its window, cookies, data layer and consent state, shared by every
// tag that runs on it. Consent types never set count as granted, as in GTM.
function page({ consent = {}, dataLayer = {} } = {}) {
    const window = {};
    const cookies = {};
    const listeners = [];
    const injected = [];
    const read = (key) =>
        key.split(".").reduce((value, part) => (value == null ? undefined : value[part]), window);
    const apis = {
        logToConsole: () => {},
        injectScript: (url, onSuccess) => {
            injected.push(url);
            onSuccess();
        },
        copyFromWindow: (key) => {
            const value = read(key);
            return value === undefined ? undefined : structuredClone(value);
        },
        copyFromDataLayer: (key) => dataLayer[key],
        setInWindow: (key, value, override) => {
            if (override || !(key in window)) window[key] = value;
        },
        callInWindow: () => {},
        encodeUri: encodeURI,
        getCookieValues: (name) => (name in cookies ? [cookies[name]] : []),
        setCookie: (name, value) => {
            cookies[name] = value;
        },
        makeNumber: Number,
        Math,
        isConsentGranted: (type) => consent[type] !== "denied",
        addConsentListener: (type, listener) => listeners.push({ type, listener }),
    };
    return {
        window,
        cookies,
        injected,
        fire(data) {
            const outcomes = [];
            new Function("require", "data", script)((name) => apis[name], {
                workspaceId: "ws_1",
                baseUrl: "https://t.spectaclehq.com",
                ...data,
                gtmOnSuccess: () => outcomes.push("success"),
                gtmOnFailure: () => outcomes.push("failure"),
            });
            return outcomes;
        },
        update(type, granted) {
            consent[type] = granted ? "granted" : "denied";
            for (const entry of listeners) {
                if (entry.type === type) entry.listener(type, granted);
            }
        },
    };
}

const queued = (p, method) => p.window.spectacle?.qs[method] ?? [];
const purchase = {
    methodType: "track",
    eventName: "purchase",
    useGA4EcomData: true,
};
const purchaseData = {
    "ecommerce.transaction_id": "order-1",
    "ecommerce.value": 49.5,
    "ecommerce.currency": "EUR",
};

test("template metadata, parameters and permissions are valid JSON", () => {
    for (const section of ["INFO", "TEMPLATE_PARAMETERS", "WEB_PERMISSIONS"]) {
        const json = source.split(`___${section}___`)[1]?.split(/^___/m)[0];
        assert.ok(json, `Missing ${section} section`);
        assert.doesNotThrow(() => JSON.parse(json), section);
    }
});

for (const [label, consent] of [
    ["granted", { analytics_storage: "granted" }],
    ["never set", {}],
]) {
    test(`analytics_storage ${label}: the tag runs at once`, () => {
        const p = page({ consent, dataLayer: purchaseData });
        assert.deepEqual(p.fire({ methodType: "page" }), ["success"]);
        assert.deepEqual(p.fire(purchase), ["success"]);
        assert.equal(p.injected.length, 2);
        assert.equal(queued(p, "page").length, 1);
        assert.equal(queued(p, "track")[0][1].revenue, "4950");
        assert.equal(p.cookies.sp__transaction_ids, "order-1");
    });
}

test("analytics_storage denied: nothing is stored or sent until the visitor grants it, then once", () => {
    const p = page({ consent: { analytics_storage: "denied" }, dataLayer: purchaseData });
    assert.deepEqual(p.fire({ methodType: "page" }), ["success"]);
    assert.deepEqual(p.fire(purchase), ["success"]);
    assert.deepEqual(p.injected, []);
    assert.equal(p.window.spectacle, undefined);
    assert.deepEqual(p.cookies, {});

    p.update("analytics_storage", false);
    assert.deepEqual(p.injected, []);

    p.update("analytics_storage", true);
    assert.equal(queued(p, "page").length, 1, "the page view waited and is queued");
    assert.equal(queued(p, "track").length, 1, "the purchase waited and is queued");
    assert.equal(p.cookies.sp__transaction_ids, "order-1");

    p.update("analytics_storage", false);
    p.update("analytics_storage", true);
    assert.equal(queued(p, "page").length, 1, "each tag runs once");
});

test("a run that waited does not report the tag's outcome a second time", () => {
    const p = page({ consent: { analytics_storage: "denied" } });
    const outcomes = p.fire({ methodType: "page" });
    p.update("analytics_storage", true);
    assert.deepEqual(outcomes, ["success"]);
});

test("a tag set to send data always ignores a denial", () => {
    const p = page({ consent: { analytics_storage: "denied" } });
    assert.deepEqual(p.fire({ methodType: "page", analyticsStorageConsent: "optional" }), ["success"]);
    assert.equal(queued(p, "page").length, 1);
});
