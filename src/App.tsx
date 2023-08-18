import am5geodata_worldLow from "@amcharts/amcharts5-geodata/usaAlbersLow";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import am5themes_Dark from "@amcharts/amcharts5/themes/Dark";
import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import { useEffect, useState } from "react";
import colors from "tailwindcss/colors";

import mapboxgl from "mapbox-gl";
mapboxgl.accessToken =
  "pk.eyJ1IjoiYXJqb2huc29uOTciLCJhIjoiY2xsZ3Vka3lxMTQxZTNkcGs4OHZtZjN3bSJ9.Pg1GGq9hS71uUKQfZ8Fm4A";

async function getCityCoords(city: string) {
  const res = await fetch(
    `${mapboxgl.baseApiUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(
      city
    )}.json?access_token=${mapboxgl.accessToken}&country=US,CA`
  );
  const { features } = await res.json();

  const [lon, lat] = features[0].center;

  return { lon, lat };
}

async function getGameLocations(sport: string) {
  const res = await fetch(
    `https://scores.weaklytyped.com/api/v1/sports/${sport}/events`
  );
  const data = await res.json();

  const locations: {
    label: string;
    home: { name: string; lon: number; lat: number };
    away: { name: string; lon: number; lat: number };
  }[] = [];

  if (data.scores) {
    for (const score of data.scores) {
      const home = await getCityCoords(
        `${score.venue.address.city},${score.venue.address.state ?? ""}`
      );
      const away = await getCityCoords(`${score.teams.awayTeam.location}`);
      locations.push({
        label: `${score.teams.awayTeam.abbrev} @ ${score.teams.homeTeam.abbrev}`,
        home: { name: score.teams.homeTeam.location, ...home },
        away: { name: score.teams.awayTeam.location, ...away },
      });
    }
  }

  return locations;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<"mlb" | "nfl">("mlb");
  const [_root, setRoot] = useState<am5.Root | null>(null);

  useEffect(() => {
    const setupMap = async () => {
      /* Chart code */
      // Create root element
      // https://www.amcharts.com/docs/v5/getting-started/#Root_element
      if (_root) {
        _root.dispose();
      }
      if (am5.registry.rootElements.length && _root) {
        am5.registry.rootElements.forEach((e) => e.dispose());
        _root.dispose();
        setRoot(null);
      }
      setLoading(true);
      const root = am5.Root.new("chartdiv");
      setRoot(root);
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
      const cont = chart.children.push(
        am5.Container.new(root, {
          layout: root.horizontalLayout,
          x: 20,
          y: 40,
          background: am5.Rectangle.new(root, {
            fill: am5.color(colors.gray[900]),
            fillOpacity: 0.8,
          }),
        })
      );

      cont.children.push(
        am5.Label.new(root, {
          centerY: am5.p50,
          text: `Today's Upcoming ${sport.toUpperCase()} Schedule`,
          fontSize: 18,
        })
      );

      // Create main polygon series for countries
      // https://www.amcharts.com/docs/v5/charts/map-chart/map-polygon-series/
      let polygonSeries = chart.series.push(
        am5map.MapPolygonSeries.new(root, {
          geoJSON: am5geodata_worldLow,
        })
      );
      // Create line series for trajectory lines
      // https://www.amcharts.com/docs/v5/charts/map-chart/map-line-series/
      let lineSeries = chart.series.push(am5map.MapLineSeries.new(root, {}));
      lineSeries.mapLines.template.setAll({
        stroke: am5.color(colors.blue[800]),
        tooltipText: "{name}",
        strokeWidth: 5,
        strokeOpacity: 0.6,
      });
      // destination series
      const awayCitySeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );
      awayCitySeries.bullets.push(function () {
        let circle = am5.Circle.new(root, {
          radius: 5,
          tooltipText: "{title}",
          tooltipPosition: "pointer",
          tooltipX: 0,
          tooltipY: 0,
          fill: am5.color(0xe43614),
        });
        return am5.Bullet.new(root, {
          sprite: circle,
        });
      });

      const homeCitySeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );
      homeCitySeries.bullets.push(function () {
        let circle = am5.Circle.new(root, {});
        return am5.Bullet.new(root, {
          sprite: circle,
        });
      });

      // arrow series
      const arrowSeries = chart.series.push(
        am5map.MapPointSeries.new(root, {})
      );
      arrowSeries.bullets.push(function () {
        const arrow = am5.Graphics.new(root, {
          fill: am5.color(colors.blue[800]),
          fillOpacity: 1,
          tooltipText: "{name}",
          tooltipPosition: "pointer",
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

      const locations = await getGameLocations(sport);
      const homeCities = locations.map((l) => ({
        id: l.home.name,
        title: l.home.name,
        geometry: { type: "Point", coordinates: [l.home.lon, l.home.lat] },
      }));
      const awayCities = locations.map((l) => ({
        id: l.away.name,
        title: l.away.name,
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
          name: location.home.name,
          lineDataItem,
          positionOnLine: 1,
          autoRotate: true,
        });
      }

      polygonSeries.events.on("datavalidated", function () {
        chart.zoomToGeoPoint({ longitude: -0.1262, latitude: 51.5002 }, 3);
      });

      chart.appear(1000, 100);

      setLoading(false);
    };

    setupMap();
  }, [sport]);
  return (
    <div className="h-screen overflow-hidden w-screen bg-gray-800 flex justify-center items-center">
      {loading && (
        <div className="h-12 absolute bottom-5 right-5 w-12 rounded-full border-l-white border-2 border-t-white flex-shrink-0 border-b-white border-r-transparent animate-spin" />
      )}
      <div id="chartdiv" className="w-full h-full min-h-screen" />
      <div className="absolute right-5 top-5 bg-gray-900/80">
        <select
          value={sport}
          onChange={(e) => {
            setSport(e.currentTarget.value as any);
          }}
          className="text-lg bg-gray-900/80 text-white"
        >
          <option value="mlb">MLB</option>
          <option value="nfl">NFL</option>
        </select>
      </div>
      <a
        href="https://github.com/andrewrjohn"
        target="_blank"
        rel="norefferer"
        className="absolute right-3 bottom-3 text-white px-2 py-1 text-sm bg-gray-900/80"
      >
        Built by Andrew Johnson
      </a>
    </div>
  );
}
