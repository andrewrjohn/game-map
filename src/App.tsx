import am5geodata_worldLow from "@amcharts/amcharts5-geodata/usaAlbersLow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import { useEffect, useState } from "react";
import colors from "tailwindcss/colors";
import { Analytics } from "@vercel/analytics/react";

import { useQueryState } from "nuqs";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { getGameLocations } from "./lib";

const sports = {
  mlb: "MLB",
  nfl: "NFL",
  nba: "NBA",
  ncaaf: "NCAA College Football Top 25",
  ncaam: "NCAA College Basketball Top 25",
};

export default function App() {
  const [sport, setSport] = useQueryState("sport", {
    defaultValue: "nfl",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const root = am5.Root.new("chartdiv");

    const setupMap = async () => {
      setLoading(true);

      // Set themes
      // https://www.amcharts.com/docs/v5/concepts/themes/
      const customTheme = am5.Theme.new(root);
      customTheme
        .rule("MapPolygon")
        .setAll({ fill: am5.color(colors.gray[100]), strokeWidth: 1 });
      root.setThemes([
        am5themes_Animated.new(root),
        am5themes_Dark.new(root),
        customTheme,
      ]);
      // Create the map chart
      // https://www.amcharts.com/docs/v5/charts/map-chart/
      let chart = root.container.children.push(
        am5map.MapChart.new(root, {
          panX: "translateX",
          panY: "translateY",
          projection: am5map.geoMercator(),
        })
      );

      // Create main polygon series for countries
      // https://www.amcharts.com/docs/v5/charts/map-chart/map-polygon-series/
      chart.series.push(
        am5map.MapPolygonSeries.new(root, {
          geoJSON: am5geodata_worldLow,
        })
      );
      // Create line series for trajectory lines
      // https://www.amcharts.com/docs/v5/charts/map-chart/map-line-series/
      let lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
      lineSeries.mapLines.template.setAll({
        stroke: am5.color(colors.gray[600]),
        tooltipText: "{name}",
        tooltipPosition: "pointer",
        strokeWidth: 3,
        strokeOpacity: 0.6,
      });

      const locations = await getGameLocations(sport);

      const createLogoImage = (logo: string) => {
        return am5.Picture.new(root, {
          width: 48,
          height: 48,
          centerX: am5.p50,
          centerY: am5.p50,
          src: logo,
        });
      };

      // destination series
      const awayCitySeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );
      awayCitySeries.bullets.push(function (_, _2, dataItem) {
        const data = dataItem.dataContext as any;

        const sprite = createLogoImage(data.logo);

        return am5.Bullet.new(root, {
          sprite,
        });
      });

      const homeCitySeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );
      homeCitySeries.bullets.push(function (_, _2, dataItem) {
        const data = dataItem.dataContext as any;
        const sprite = createLogoImage(data.logo);
        return am5.Bullet.new(root, {
          sprite,
        });
      });

      // arrow series
      const arrowSeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );
      arrowSeries.bullets.push(function () {
        const arrow = am5.Graphics.new(root, {
          fill: am5.color(colors.gray[900]),
          fillOpacity: 1,
          tooltipText: "{name}",
          // tooltipPosition: "pointer",
          draw: function (display) {
            display.moveTo(0, -8);
            display.lineTo(18, 0);
            display.lineTo(0, 8);
            display.lineTo(0, -8);
          },
        });
        return am5.Bullet.new(root, {
          sprite: arrow,
        });
      });

      const homeCities = locations.map((l) => ({
        id: l.home.name,
        title: l.home.name,
        color: l.home.color,
        logo: l.home.logo,
        geometry: { type: "Point", coordinates: [l.home.lon, l.home.lat] },
      }));
      const awayCities = locations.map((l) => ({
        id: l.away.name,
        title: l.away.name,
        color: l.away.color,
        logo: l.away.logo,
        geometry: { type: "Point", coordinates: [l.away.lon, l.away.lat] },
      }));

      awayCitySeries.data.setAll(awayCities);
      homeCitySeries.data.setAll(homeCities);

      for (const location of locations) {
        const lineDataItem = lineSeries.pushDataItem({
          // @ts-expect-error
          name: location.label,
          geometry: {
            type: "LineString",
            coordinates: [
              [location.away.lon, location.away.lat],
              [location.home.lon, location.home.lat],
            ],
          },
        });
        arrowSeries.pushDataItem({
          // @ts-expect-error
          name: location.label,
          lineDataItem,
          positionOnLine: 0.5,
          autoRotate: true,
        });
      }

      chart.appear(1000, 100);

      setLoading(false);
    };

    setupMap();

    return () => {
      root.dispose();
    };
  }, [sport]);

  return (
    <div className="h-screen overflow-hidden w-screen bg-gray-800 flex justify-center items-center">
      <div id="chartdiv" className="w-full h-full min-h-screen" />
      <h1 className="absolute top-4 left-4 text-white text-lg bg-gray-900/80 px-3 py-1 z-10">
        {sport.toUpperCase()} Travel Map
      </h1>
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {loading && (
          <div className="h-6 w-6 rounded-full border-l-blue-400 border-2 border-t-blue-400 flex-shrink-0 border-b-blue-400 border-r-transparent animate-spin" />
        )}
        <div className="flex items-center  bg-gray-900/80 text-white px-2 py-1 text-lg">
          <Listbox value={sport} onChange={setSport}>
            <ListboxButton className={"flex items-center gap-2"}>
              {sport.toUpperCase()}

              <svg
                className="w-4 h-4 text-white pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </ListboxButton>
            <ListboxOptions
              anchor="bottom end"
              className={"bg-gray-900/80 divide-y divide-gray-700 mt-2"}
            >
              {Object.entries(sports).map(([key, label]) => (
                <ListboxOption
                  key={key}
                  value={key}
                  className={
                    "text-gray-200 px-3 py-1.5 cursor-pointer hover:bg-gray-700"
                  }
                >
                  {label}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Listbox>
        </div>
      </div>
      <a
        href="https://weaklytyped.com"
        target="_blank"
        rel="norefferer"
        className="absolute right-3 bottom-3 text-white px-2 py-1 text-sm bg-gray-900/80"
      >
        Built by Andrew Johnson
      </a>
      <Analytics />
    </div>
  );
}
