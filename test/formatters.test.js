import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CT_HUB_2,
  formatForecast,
  formatBusArrivals,
  formatPlaces,
  haversineMetres,
} from "../src/tools.js";
import { formatSingaporeTime } from "../src/prompt.js";

test("formatForecast picks the requested area", () => {
  const payload = {
    data: {
      items: [
        {
          valid_period: { text: "12 pm to 2 pm" },
          forecasts: [
            { area: "Geylang", forecast: "Fair" },
            { area: "Kallang", forecast: "Light Rain" },
          ],
        },
      ],
    },
  };

  assert.deepEqual(formatForecast(payload, "Kallang"), {
    area: "Kallang",
    forecast: "Light Rain",
    valid_period: "12 pm to 2 pm",
  });
});

test("formatBusArrivals converts durations to whole minutes", () => {
  const payload = {
    services: [
      {
        no: "13",
        next: { duration_ms: 100_798 },
        subsequent: { duration_ms: 1_210_000 },
      },
      { no: "107M", next: { duration_ms: 30_000 }, subsequent: null },
    ],
  };

  assert.deepEqual(formatBusArrivals(payload, "07371"), {
    stop_code: "07371",
    services: [
      { service: "13", next_min: 2, subsequent_min: 20 },
      { service: "107M", next_min: 1, subsequent_min: null },
    ],
  });
});

test("haversineMetres measures CT Hub 2 to Lavender MRT at 400-550 m", () => {
  const lavenderMrt = { latitude: 1.3073, longitude: 103.8631 };
  const distance = haversineMetres(CT_HUB_2, lavenderMrt);
  assert.ok(distance > 400 && distance < 550, `got ${distance}`);
});

test("formatPlaces keeps open status and measures from the origin", () => {
  const places = [
    {
      displayName: { text: "Lavender Food Square" },
      rating: 4.1,
      location: { latitude: 1.3073, longitude: 103.8631 },
      currentOpeningHours: { openNow: false },
    },
    { displayName: { text: "No Hours Stall" }, location: CT_HUB_2 },
  ];

  const [square, stall] = formatPlaces(places, CT_HUB_2);
  assert.equal(square.name, "Lavender Food Square");
  assert.equal(square.open_now, false);
  assert.ok(square.distance_m > 400 && square.distance_m < 550);
  assert.equal(stall.open_now, null);
  assert.equal(stall.distance_m, 0);
});

test("formatSingaporeTime converts UTC to Singapore time and date", () => {
  // 04:30 UTC is 12:30 pm in Singapore.
  const lunch = formatSingaporeTime(new Date("2026-10-02T04:30:00Z"));
  assert.match(lunch, /Friday/);
  assert.match(lunch, /12:30/);
  assert.match(lunch, /pm/i);

  // 20:00 UTC Thursday is 4 am Friday in Singapore.
  const early = formatSingaporeTime(new Date("2026-10-01T20:00:00Z"));
  assert.match(early, /Friday/);
  assert.match(early, /2 October/);
});
