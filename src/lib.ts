import mapboxgl from "mapbox-gl";

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("MAPBOX_ACCESS_TOKEN is not set");
}

mapboxgl.accessToken = accessToken;

type MapboxResponse = {
  features: { geometry: { coordinates: [number, number] } }[];
};

async function getCityCoords(city: string) {
  const res = await fetch(
    `${mapboxgl.baseApiUrl}/search/searchbox/v1/forward?access_token=${
      mapboxgl.accessToken
    }&country=US,CA&q=${encodeURIComponent(city)}`
  );
  const json: MapboxResponse = await res.json();

  const { features } = json;

  const [lon, lat] = features[0].geometry.coordinates;

  return { lon, lat };
}

type Team = {
  displayName: string;
  teamColor: string;
  location: string;
  logo: string;
  shortDisplayName: string;
  winner: boolean;
  isHome: boolean;
  altColor: string;
  abbrev: string;
};

type Event = {
  startTime: string;

  venue: {
    address: {
      city: string;
      state: string;
    };
  };
  teams: {
    awayTeam: Team;
    homeTeam: Team;
  };
};

type EventResponse = {
  scores: Event[];
};

export async function getGameLocations(sport: string) {
  const res = await fetch(
    `https://scores.weaklytyped.com/api/v1/sports/${sport}/events`
  );
  const data: EventResponse = await res.json();

  const locations: {
    label: string;
    home: {
      name: string;
      lon: number;
      lat: number;
      color: string;
      logo: string;
    };
    away: {
      name: string;
      lon: number;
      lat: number;
      color: string;
      logo: string;
    };
  }[] = [];

  if (data.scores) {
    for (const score of data.scores) {
      const home = await getCityCoords(
        `${score.venue.address.city},${score.venue.address.state ?? ""}`
      );

      const away = await getCityCoords(`${score.teams.awayTeam.location}`);

      locations.push({
        label: `${score.teams.awayTeam.displayName} @ ${score.teams.homeTeam.displayName}`,
        home: {
          name: score.teams.homeTeam.location,
          color: score.teams.homeTeam.teamColor,
          logo: score.teams.homeTeam.logo,
          ...home,
        },
        away: {
          name: score.teams.awayTeam.location,
          color: score.teams.awayTeam.teamColor,
          logo: score.teams.awayTeam.logo,
          ...away,
        },
      });
    }
  }

  return locations;
}
