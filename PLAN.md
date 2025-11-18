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

...

### 
