// @deno-types="npm:@types/leaflet"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css"; // supporting style for Leaflet
import "./style.css"; // student-controlled page style

// Fix missing marker images
import "./_leafletWorkaround.ts"; // fixes for missing Leaflet images

// Import our luck function
import luck from "./_luck.ts";

// Create basic UI elements

const controlPanelDiv = document.createElement("div");
controlPanelDiv.id = "controlPanel";
document.body.append(controlPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
document.body.append(statusPanelDiv);

// Our classroom location
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const _NEIGHBORHOOD_SIZE = 8;
const _CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(CLASSROOM_LATLNG, { draggable: true });
playerMarker.bindTooltip("That's you! (drag to move)");
playerMarker.addTo(map);

// Display the player's inventory and status
const playerPoints = 0;
let playerInventory: number | null = null;
function updateStatus() {
  statusPanelDiv.innerHTML = `Points: ${playerPoints} <br/> Inventory: ${
    playerInventory ?? "empty"
  }`;
}
updateStatus();

// A cell with optional token state
type Cell = {
  i: number;
  j: number;
  rect: leaflet.Rectangle;
  label?: leaflet.Marker | undefined;
  token: number | null;
};

const cells = new Map<string, Cell>();

function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

// Convert a latlng to local grid coordinates relative to CLASSROOM_LATLNG
function latLngToCellIndices(latlng: leaflet.LatLng) {
  const i = Math.floor((latlng.lat - CLASSROOM_LATLNG.lat) / TILE_DEGREES);
  const j = Math.floor((latlng.lng - CLASSROOM_LATLNG.lng) / TILE_DEGREES);
  return { i, j };
}

// Get center latlng for a cell
function cellCenter(i: number, j: number) {
  return leaflet.latLng(
    CLASSROOM_LATLNG.lat + (i + 0.5) * TILE_DEGREES,
    CLASSROOM_LATLNG.lng + (j + 0.5) * TILE_DEGREES,
  );
}

// Spawn a cell: rectangle and optional token label
function spawnCell(i: number, j: number) {
  const origin = CLASSROOM_LATLNG;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);
  const rect = leaflet.rectangle(bounds, {
    color: "#666",
    weight: 1,
    fillOpacity: 0.0,
  }).addTo(map);

  // deterministic spawn of a token
  const hasToken = luck([i, j, "hasToken"].toString()) < 0.3;
  const token = hasToken
    ? [1, 2, 4][Math.floor(luck([i, j, "token"].toString()) * 3)]
    : null;

  let label: leaflet.Marker | undefined = undefined;
  if (token !== null) {
    label = leaflet
      .marker(cellCenter(i, j), {
        icon: leaflet.divIcon({
          className: "token-label",
          html: `${token}`,
          iconSize: [28, 28],
          iconAnchor: [15.5, 15.5],
        }),
        interactive: false,
      })
      .addTo(map);
  }

  const cell: Cell = { i, j, rect, label, token };
  cells.set(cellKey(i, j), cell);
  refreshCellVisual(cell);

  rect.on("click", () => {
    const playerCell = latLngToCellIndices(playerMarker.getLatLng());
    const dist = Math.max(
      Math.abs(playerCell.i - i),
      Math.abs(playerCell.j - j),
    );
    if (dist > 3) {
      statusPanelDiv.innerHTML = "Too far — move closer to interact";
      return;
    }

    // If inventory empty, pick up if token exists
    if (playerInventory === null && cell.token !== null) {
      playerInventory = cell.token;
      cell.token = null;
      if (cell.label) {
        map.removeLayer(cell.label);
        cell.label = undefined;
      }
      updateStatus();
      return;
    }

    // If player has a token and the cell is empty, place the token
    if (playerInventory !== null && cell.token === null) {
      cell.token = playerInventory;
      cell.label = leaflet
        .marker(cellCenter(i, j), {
          icon: leaflet.divIcon({
            className: "token-label",
            html: `${cell.token}`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          interactive: false,
        })
        .addTo(map);
      playerInventory = null;
      updateStatus();
      return;
    }

    // If player has a token and the cell has the same token, merge
    if (playerInventory !== null && cell.token === playerInventory) {
      const newToken = playerInventory * 2;
      cell.token = newToken;
      // update label
      if (cell.label) {
        map.removeLayer(cell.label);
        cell.label = undefined;
      }
      cell.label = leaflet
        .marker(cellCenter(i, j), {
          icon: leaflet.divIcon({
            className: "token-label",
            html: `${cell.token}`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          interactive: false,
        })
        .addTo(map);

      playerInventory = null;
      updateStatus();

      // congrats if token 16
      if (newToken === 16) {
        alert("🎉 Congratulations! You made a token of 16!");
      }
      return;
    }

    // Other interactions are intentionally limited
    statusPanelDiv.innerHTML = "No valid interaction here";
  });
}

// Update the cell rectangle style based on player distance
function refreshCellVisual(cell: Cell) {
  const playerCell = latLngToCellIndices(playerMarker.getLatLng());
  const dist = Math.max(
    Math.abs(playerCell.i - cell.i),
    Math.abs(playerCell.j - cell.j),
  );

  // If out-of-range, color light red, otherwise transparent
  if (dist > 3) {
    cell.rect.setStyle({ fillColor: "#ffcccc", fillOpacity: 0.35 });
  } else {
    cell.rect.setStyle({ fillColor: "#fff", fillOpacity: 0.0 });
  }
}

// Spawn cells to fill the current viewport
function spawnCellsForViewport() {
  const bounds = map.getBounds();
  // compute i,j index range
  const latMin = bounds.getSouth();
  const latMax = bounds.getNorth();
  const lngMin = bounds.getWest();
  const lngMax = bounds.getEast();

  const iMin = Math.floor((latMin - CLASSROOM_LATLNG.lat) / TILE_DEGREES) - 1;
  const iMax = Math.floor((latMax - CLASSROOM_LATLNG.lat) / TILE_DEGREES) + 1;
  const jMin = Math.floor((lngMin - CLASSROOM_LATLNG.lng) / TILE_DEGREES) - 1;
  const jMax = Math.floor((lngMax - CLASSROOM_LATLNG.lng) / TILE_DEGREES) + 1;

  for (let i = iMin; i <= iMax; i++) {
    for (let j = jMin; j <= jMax; j++) {
      const key = cellKey(i, j);
      if (!cells.has(key)) spawnCell(i, j);
    }
  }
}

// Look around the player's neighborhood for caches to spawn
// spawn initial set covering the viewport
spawnCellsForViewport();

// Rebuild cell visuals when the player moves
playerMarker.on("dragend", () => {
  cells.forEach((c) => refreshCellVisual(c));
});

// Recompute which cells we should show when the map moves / zooms
map.on("moveend", () => {
  spawnCellsForViewport();
  cells.forEach((c) => refreshCellVisual(c));
});
