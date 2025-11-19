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
const bottomPanel = document.createElement("div");
bottomPanel.id = "bottomPanel";

const statusPanelDiv = document.createElement("div");
statusPanelDiv.id = "statusPanel";
bottomPanel.appendChild(statusPanelDiv);

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

// Movement mode selection panel (below map)
const movementModePanel = document.createElement("div");
movementModePanel.id = "movementModePanel";

const keyMovementButton = document.createElement("button");
keyMovementButton.textContent = "🎮 Use Keys";
keyMovementButton.id = "keyMovementButton";

const geoMovementButton = document.createElement("button");
geoMovementButton.textContent = "🚶 Use Geolocation";
geoMovementButton.id = "geoMovementButton";

const resetButton = document.createElement("button");
resetButton.textContent = "🔄 Reset Game";

movementModePanel.append(keyMovementButton, geoMovementButton, resetButton);
bottomPanel.appendChild(movementModePanel);

// Directional controls panel (below movement mode panel)
const directionalPanel = document.createElement("div");
directionalPanel.id = "directionalPanel";

const upButton = document.createElement("button");
upButton.textContent = "⬆️";
const downButton = document.createElement("button");
downButton.textContent = "⬇️";
const leftButton = document.createElement("button");
leftButton.textContent = "⬅️";
const rightButton = document.createElement("button");
rightButton.textContent = "➡️";

// Row 1: Up button
const row1 = document.createElement("div");
row1.className = "button-row";
row1.append(upButton);

// Row 2: Left, Down, Right buttons
const row2 = document.createElement("div");
row2.className = "button-row";
row2.append(leftButton, downButton, rightButton);

directionalPanel.append(row1, row2);
bottomPanel.appendChild(directionalPanel);
document.body.append(bottomPanel);

// Movement mode state
let _useGeolocation = false;
let geolocationWatchId: number | null = null;

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

// Save game state to localStorage
function saveGameState() {
  const gameState = {
    playerInventory,
    playerPosition: {
      lat: playerMarker.getLatLng().lat,
      lng: playerMarker.getLatLng().lng,
    },
    cellMementos: Array.from(cellMementos.entries()),
  };
  localStorage.setItem("gameState", JSON.stringify(gameState));
}

// Timer for auto-dismissing error messages
let errorMessageTimer: number | null = null;

function updateStatus() {
  statusPanelDiv.innerHTML = `Points: ${playerPoints} <br/> Inventory: ${
    playerInventory ?? "empty"
  }`;
}

// Show a temporary error message that reverts after 4 seconds
function showErrorMessage(message: string) {
  statusPanelDiv.innerHTML = message;

  // Clear any existing timer
  if (errorMessageTimer !== null) {
    clearTimeout(errorMessageTimer);
  }

  // Set new timer to revert to status after 4 seconds
  errorMessageTimer = setTimeout(() => {
    updateStatus();
    errorMessageTimer = null;
  }, 4000);
}

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

// Memento: stores the state of modified cells
interface CellMemento {
  i: number;
  j: number;
  token: number | null;
}

// Flyweight pattern: only visible cells are stored here
const flyweightCells = new Map<string, Cell>();

// Memento pattern: persistent storage for modified cells
const cellMementos = new Map<string, CellMemento>();

// Load game state from localStorage
function loadGameState() {
  const saved = localStorage.getItem("gameState");
  if (saved) {
    try {
      const gameState = JSON.parse(saved);
      playerInventory = gameState.playerInventory;

      // Restore player position
      if (gameState.playerPosition) {
        const pos = leaflet.latLng(
          gameState.playerPosition.lat,
          gameState.playerPosition.lng,
        );
        playerMarker.setLatLng(pos);
        map.setView(pos);
      }

      // Restore cell mementos
      if (gameState.cellMementos) {
        cellMementos.clear();
        gameState.cellMementos.forEach(
          ([key, memento]: [string, CellMemento]) => {
            cellMementos.set(key, memento);
          },
        );
      }

      updateStatus();
    } catch (e) {
      console.error("Error loading game state:", e);
      localStorage.removeItem("gameState");
    }
  }
}

// Load saved state on startup
loadGameState();
updateStatus();

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

  // Check if there's a saved memento for this cell
  const key = cellKey(i, j);
  const memento = cellMementos.get(key);

  let token: number | null;
  if (memento !== undefined) {
    // Restore from memento
    token = memento.token;
  } else {
    // deterministic spawn of a token for unmodified cells
    const hasToken = luck([i, j, "hasToken"].toString()) < 0.3;
    token = hasToken
      ? [1, 2, 4][Math.floor(luck([i, j, "token"].toString()) * 3)]
      : null;
  }

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
  flyweightCells.set(key, cell);
  refreshCellVisual(cell);

  rect.on("click", () => {
    const playerCell = latLngToCellId(playerMarker.getLatLng());
    const dist = Math.max(
      Math.abs(playerCell.i - i),
      Math.abs(playerCell.j - j),
    );
    if (dist > 3) {
      showErrorMessage("Too far — move closer to interact");
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
      saveCellMemento(cell); // Save state after modification
      updateStatus();
      saveGameState();
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
      saveCellMemento(cell); // Save state after modification
      updateStatus();
      saveGameState();
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
      saveCellMemento(cell); // Save state after modification
      updateStatus();
      saveGameState();

      // congrats if token reaches 128
      if (newToken === 128) {
        alert("🎉 Congratulations! You made a token of 128!");
      }
      return;
    }

    // Other interactions are intentionally limited
    showErrorMessage("No valid interaction here");
  });
}

// Mark a cell as modified and save its state to memento storage
function saveCellMemento(cell: Cell) {
  const key = cellKey(cell.i, cell.j);
  cellMementos.set(key, {
    i: cell.i,
    j: cell.j,
    token: cell.token,
  });
  saveGameState(); // Persist to localStorage
}

// Check if a cell has been modified from its original state
function isCellModified(cell: Cell): boolean {
  // If there's already a memento, it's been modified
  const key = cellKey(cell.i, cell.j);
  if (cellMementos.has(key)) {
    return true;
  }

  // Check if current state differs from what would be naturally spawned
  const hasToken = luck([cell.i, cell.j, "hasToken"].toString()) < 0.3;
  const naturalToken = hasToken
    ? [1, 2, 4][Math.floor(luck([cell.i, cell.j, "token"].toString()) * 3)]
    : null;

  return cell.token !== naturalToken;
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
    cell.rect.setStyle({ fillColor: "#febbbbff", fillOpacity: 0.5 });
  } else {
    cell.rect.setStyle({ fillColor: "#fff", fillOpacity: 0.0 });
  }
}

// Despawn cells that are off-screen (with memento pattern for modified cells)
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
  flyweightCells.forEach((cell, key) => {
    if (cell.i < iMin || cell.i > iMax || cell.j < jMin || cell.j > jMax) {
      // Save memento if cell has been modified
      if (isCellModified(cell)) {
        saveCellMemento(cell);
      }

      // Remove cell from map (Flyweight pattern - unmodified cells don't persist)
      if (cell.label) map.removeLayer(cell.label);
      map.removeLayer(cell.rect);
      cellsToRemove.push(key);
    }
  });

  cellsToRemove.forEach((key) => flyweightCells.delete(key));
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
      if (!flyweightCells.has(key)) spawnCell(i, j);
    }
  }
}

// Facade pattern: Movement control interface
interface MovementController {
  moveByOffset(di: number, dj: number): void;
  moveToPosition(lat: number, lng: number): void;
}

class PlayerMovementFacade implements MovementController {
  // Move player by grid offset (for manual/key control)
  moveByOffset(di: number, dj: number): void {
    const currentPos = playerMarker.getLatLng();
    const currentCell = latLngToCellId(currentPos);
    const newCell = { i: currentCell.i + di, j: currentCell.j + dj };
    const newPos = cellCenter(newCell.i, newCell.j);
    this.updatePlayerPosition(newPos);
  }

  // Move player to absolute position (for geolocation)
  moveToPosition(lat: number, lng: number): void {
    const newPos = leaflet.latLng(lat, lng);
    this.updatePlayerPosition(newPos);
  }

  // Internal method to update position and refresh game state
  private updatePlayerPosition(newPos: leaflet.LatLng): void {
    playerMarker.setLatLng(newPos);
    map.panTo(newPos);

    // Refresh cell visuals and spawn/despawn cells
    spawnCellsForViewport();
    despawnCellsOutsideViewport();
    flyweightCells.forEach((c) => refreshCellVisual(c));

    saveGameState(); // Persist position changes
  }
}

// Create movement controller instance
const movementController = new PlayerMovementFacade();

// Convenience function for backward compatibility
function movePlayer(di: number, dj: number) {
  movementController.moveByOffset(di, dj);
}

// Keyboard event listener for WASD and arrow keys
document.addEventListener("keydown", (event) => {
  // Ignore keyboard input if geolocation mode is active
  if (_useGeolocation) return;

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

// Button event listeners for directional movement
upButton.addEventListener("click", () => {
  if (!_useGeolocation) movePlayer(1, 0);
});
downButton.addEventListener("click", () => {
  if (!_useGeolocation) movePlayer(-1, 0);
});
leftButton.addEventListener("click", () => {
  if (!_useGeolocation) movePlayer(0, -1);
});
rightButton.addEventListener("click", () => {
  if (!_useGeolocation) movePlayer(0, 1);
});

// Function to enable key/button movement mode
function enableKeyMovement() {
  _useGeolocation = false;
  keyMovementButton.classList.add("active");
  geoMovementButton.classList.remove("active");

  // Enable manual controls
  upButton.disabled = false;
  downButton.disabled = false;
  leftButton.disabled = false;
  rightButton.disabled = false;

  // Stop watching geolocation
  if (geolocationWatchId !== null) {
    navigator.geolocation.clearWatch(geolocationWatchId);
    geolocationWatchId = null;
  }
}

// Function to enable geolocation movement mode
function enableGeoMovement() {
  _useGeolocation = true;
  geoMovementButton.classList.add("active");
  keyMovementButton.classList.remove("active");

  // Disable manual controls when using geolocation
  upButton.disabled = true;
  downButton.disabled = true;
  leftButton.disabled = true;
  rightButton.disabled = true;

  // Start watching geolocation
  if ("geolocation" in navigator) {
    geolocationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        // Use the facade to update player position
        movementController.moveToPosition(
          position.coords.latitude,
          position.coords.longitude,
        );
      },
      (error) => {
        console.error("Geolocation error:", error);
        showErrorMessage(`Location error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      },
    );
  } else {
    alert("Geolocation is not supported by your browser");
    enableKeyMovement();
  }
}

// Set up event listeners for movement mode buttons
keyMovementButton.addEventListener("click", enableKeyMovement);
geoMovementButton.addEventListener("click", enableGeoMovement);

// Initialize with key movement mode active
keyMovementButton.classList.add("active");

// Reset game state
resetButton.addEventListener("click", () => {
  if (
    confirm(
      "Are you sure you want to reset the game? This will clear all progress.",
    )
  ) {
    // Clear localStorage
    localStorage.removeItem("gameState");

    // Reset game state
    playerInventory = null;
    cellMementos.clear();

    // Reset player position
    playerMarker.setLatLng(CLASSROOM_LATLNG);
    map.setView(CLASSROOM_LATLNG);

    // Clear and respawn cells
    flyweightCells.forEach((cell) => {
      if (cell.label) map.removeLayer(cell.label);
      map.removeLayer(cell.rect);
    });
    flyweightCells.clear();
    spawnCellsForViewport();

    updateStatus();
  }
});

// spawn initial set covering the viewport
spawnCellsForViewport();

// Rebuild cell visuals when the player moves
playerMarker.on("dragend", () => {
  spawnCellsForViewport();
  despawnCellsOutsideViewport();
  flyweightCells.forEach((c) => refreshCellVisual(c));
});

// Recompute which cells we should show when the map moves / zooms
map.on("moveend", () => {
  spawnCellsForViewport();
  despawnCellsOutsideViewport();
  flyweightCells.forEach((c) => refreshCellVisual(c));
});
