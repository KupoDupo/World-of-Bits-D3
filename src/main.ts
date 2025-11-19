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

// Interface for cell coordinates (independent of screen representation)
interface CellId {
  i: number;
  j: number;
}

// A cell with optional token state
type Cell = {
  i: number;
  j: number;
  rect: leaflet.Rectangle;
  label?: leaflet.Marker | undefined;
  token: number | null;
};

const cells = new Map<string, Cell>();

// Null Island origin (0, 0) for earth-spanning coordinate system
const _NULL_ISLAND = leaflet.latLng(0, 0);

function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

// Convert lat/lng to cell identifier using Null Island as anchor
function latLngToCellId(latlng: leaflet.LatLng): CellId {
  const i = Math.floor(latlng.lat / TILE_DEGREES);
  const j = Math.floor(latlng.lng / TILE_DEGREES);
  return { i, j };
}

// Convert cell identifier to lat/lng bounds
function cellIdToBounds(cellId: CellId): leaflet.LatLngBounds {
  const { i, j } = cellId;
  return leaflet.latLngBounds([
    [i * TILE_DEGREES, j * TILE_DEGREES],
    [(i + 1) * TILE_DEGREES, (j + 1) * TILE_DEGREES],
  ]);
}

// Get center latlng for a cell
function cellCenter(i: number, j: number): leaflet.LatLng {
  return leaflet.latLng(
    (i + 0.5) * TILE_DEGREES,
    (j + 0.5) * TILE_DEGREES,
  );
}

// Spawn a cell: rectangle and optional token label
function spawnCell(i: number, j: number) {
  const bounds = cellIdToBounds({ i, j });
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
    const playerCell = latLngToCellId(playerMarker.getLatLng());
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

      // congrats if token reaches 128
      if (newToken === 128) {
        alert("🎉 Congratulations! You made a token of 128!");
      }
      return;
    }

    // Other interactions are intentionally limited
    statusPanelDiv.innerHTML = "No valid interaction here";
  });
}

// Update the cell rectangle style based on player distance
function refreshCellVisual(cell: Cell) {
  const playerCell = latLngToCellId(playerMarker.getLatLng());
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

// Despawn cells that are off-screen (memoryless behavior)
function despawnCellsOutsideViewport() {
  const bounds = map.getBounds();
  const latMin = bounds.getSouth();
  const latMax = bounds.getNorth();
  const lngMin = bounds.getWest();
  const lngMax = bounds.getEast();

  const iMin = Math.floor(latMin / TILE_DEGREES) - 2;
  const iMax = Math.floor(latMax / TILE_DEGREES) + 2;
  const jMin = Math.floor(lngMin / TILE_DEGREES) - 2;
  const jMax = Math.floor(lngMax / TILE_DEGREES) + 2;

  const cellsToRemove: string[] = [];
  cells.forEach((cell, key) => {
    if (cell.i < iMin || cell.i > iMax || cell.j < jMin || cell.j > jMax) {
      // Remove cell from map
      if (cell.label) map.removeLayer(cell.label);
      map.removeLayer(cell.rect);
      cellsToRemove.push(key);
    }
  });

  cellsToRemove.forEach((key) => cells.delete(key));
}

// Spawn cells to fill the current viewport
function spawnCellsForViewport() {
  const bounds = map.getBounds();
  // compute i,j index range
  const latMin = bounds.getSouth();
  const latMax = bounds.getNorth();
  const lngMin = bounds.getWest();
  const lngMax = bounds.getEast();

  const iMin = Math.floor(latMin / TILE_DEGREES) - 1;
  const iMax = Math.floor(latMax / TILE_DEGREES) + 1;
  const jMin = Math.floor(lngMin / TILE_DEGREES) - 1;
  const jMax = Math.floor(lngMax / TILE_DEGREES) + 1;

  for (let i = iMin; i <= iMax; i++) {
    for (let j = jMin; j <= jMax; j++) {
      const key = cellKey(i, j);
      if (!cells.has(key)) spawnCell(i, j);
    }
  }
}

// Keyboard movement function
function movePlayer(di: number, dj: number) {
  const currentPos = playerMarker.getLatLng();
  const currentCell = latLngToCellId(currentPos);
  const newCell = { i: currentCell.i + di, j: currentCell.j + dj };
  const newPos = cellCenter(newCell.i, newCell.j);

  playerMarker.setLatLng(newPos);
  map.panTo(newPos);

  // Refresh cell visuals and spawn/despawn cells
  spawnCellsForViewport();
  despawnCellsOutsideViewport();
  cells.forEach((c) => refreshCellVisual(c));
}

// Keyboard event listener for WASD and arrow keys
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "w":
    case "ArrowUp":
      movePlayer(1, 0); // Move north (increase latitude)
      break;
    case "s":
    case "ArrowDown":
      movePlayer(-1, 0); // Move south (decrease latitude)
      break;
    case "a":
    case "ArrowLeft":
      movePlayer(0, -1); // Move west (decrease longitude)
      break;
    case "d":
    case "ArrowRight":
      movePlayer(0, 1); // Move east (increase longitude)
      break;
  }
});

// spawn initial set covering the viewport
spawnCellsForViewport();

// Rebuild cell visuals when the player moves
playerMarker.on("dragend", () => {
  spawnCellsForViewport();
  despawnCellsOutsideViewport();
  cells.forEach((c) => refreshCellVisual(c));
});

// Recompute which cells we should show when the map moves / zooms
map.on("moveend", () => {
  spawnCellsForViewport();
  despawnCellsOutsideViewport();
  cells.forEach((c) => refreshCellVisual(c));
});
