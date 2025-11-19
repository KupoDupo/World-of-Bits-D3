# D3: {World of Bits}

# Game Design Vision

A map filled with tokens that players can merge together. Players can hold one token at a time.

# Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

# Assignments

## D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a rectangle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] initial state of cells is consistent across page loads
- [x] cells contain a token (a number 1,2, or 4)
- [x] number/token is visible on the cell
- [x] token spawning consistency is implemented using a deterministic hashing mechanism (can use the luck function in the starter code)
- [x] player can pick up at most one token, removing it from the cell that contained it
- [x] player can only interact wiht cells near them (about three cells away from their current location max)
- [x] the player's inventory (consisting of one token) is clearly visible on the screen
- [x] players can place a token (if they have one) onto a cell containing a token of equal value to produce a new token of double the value
- [x] the game detects when the player has a token of 16 (congratulatory message)
- [x] allow user to place token they're holding down on an empty spot
- [x] have cells fill up whole viewport
- [x] color cells light red if too far away to interact with

## D3.b

Can players simulate local movement and have the cells continue spawning on the map as they move? Cells should be memoryless and the representation should be anchored at Null Island (zero latitude, zero longitude).

### Steps

- [x] Create a new data type (an interface) for modeling cell grids independent of the representation of grid cells on the screen - can be structured as i,j pairs
- [x] The representation of grid cells should use an earth-spanning coordinate system anchored at Null Island (zero latitude, zero longitude)
- [x] Create functions (or methods on a class) for converting continous latitude-longitude pairs into cell identifiers and for converting cell identifiers into the top-left and bottom-right bounds of a cell in terms of latitude longitude
- [x] Let player us wasd or arrows keys to move around the map by one grid step
- [x] As the player moves, spawn and despawn cells as necessary to keep cells visible all the way out the edge of the map
- [x] Ensure that only cells near their current location are available for interaction as the player moves
- [x] Cells should be memoryless, they forget their state when they are no longer on the screen
- [x] Update highest token value to 128
