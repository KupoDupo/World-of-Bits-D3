# D3: {World of Bits}

## Game Design Vision

A map filled with tokens that players can merge together. Players can hold one token at a time.

## Technologies

- TypeScript for most game code, little to no explicit HTML, and all CSS collected in common `style.css` file
- Deno and Vite for building
- GitHub Actions + GitHub Pages for deployment automation

## Assignments

## D3.a: Core mechanics (token collection and crafting)

Focusing on core mechanics (token collection and crafting)\
Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?\
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps for part a

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

Focusing on globe-spanning gameplay.\
Key technical challenge: Can you set up your implementation to support gameplay anywhere in the real world, not just locations near our classroom?\
Key gameplay challenge: Can players craft an even higher value token by moving to other locations to get access to additional crafting materials?

### Steps for Part b

- [x] Create a new data type (an interface) for modeling cell grids independent of the representation of grid cells on the screen - can be structured as i,j pairs
- [x] The representation of grid cells should use an earth-spanning coordinate system anchored at Null Island (zero latitude, zero longitude)
- [x] Create functions (or methods on a class) for converting continous latitude-longitude pairs into cell identifiers and for converting cell identifiers into the top-left and bottom-right bounds of a cell in terms of latitude longitude
- [x] Let player us wasd or arrows keys to move around the map by one grid step
- [x] As the player moves, spawn and despawn cells as necessary to keep cells visible all the way out the edge of the map
- [x] Ensure that only cells near their current location are available for interaction as the player moves
- [x] Cells should be memoryless, they forget their state when they are no longer on the screen
- [x] Update highest token value to 128

## D3.c

Focusing on object (cell and token) persistence.\
Key technical challenge: Can your software accurately remember the state of map cells even when they scroll off the screen?\
Key gameplay challenge: Can you fix a gameplay bug where players can farm tokens by moving into and out of a region repeatedly to get access to fresh resources?

### Steps for part c

- [x] Apply the Flyweight pattern so cells not visible on the map do no require memory for storage if they have not been modified by the player
- [x] Apply the Memento pattern to preserve the state of modified cells when players scroll off-screen, and restore them when they return to view
- [x] After steps 1 and 2, ensure that cells have a memory of their state even when they are not visible on the map
- [x] Check code design and refactor if needed to ensure that the code is NOT using a design where you have a single data type that directly combines cell coordinates i, j with a token value TokenValue. If there is an instance like this, swap out for a Map that uses cells as keys and token as values
- [x] Check code design and refactor if needed to make sure that the display (of tokens on the map) is rebuilt from scratch with the previously stored data rather than trying to maintain player-visible objects on the screen when the map moves

## D3.d

Focusing on gameplay across real-world space and time.\
Key technical challenges: Can your software remember game state even when the page is closed? Is the player character’s in-game movement controlled by the real-world geolocation of their device?\
Key gameplay challenge: Can the user test the game with multiple gameplay sessions, some involving real-world movement and some involving simulated movement?

### Steps for part d

- [x] Implement a console with up, down, left, right buttons (by the points and inventory label) that players can use to move in case they don't have keys (to support gameplay on a mobile device)
- [x] Implement on screen buttons (by points and inventory label) that lets players switch between button/key control and real world movement of their device (to be implemented in future steps)
- [x] Implement across page persistence so that game state remains the same even if player closes the page and reopens it later, do this by using browser localStorage API
- [x] Implement a start over/replay button (located in the same area as the above implementation) that lets players start the game over (new state)
- [x] Linked to the real world movement control button, use the browser geolocation API to control player character movement instead of on screen buttons/keys
- [x] Utilizing the Facade design pattern, make sure that implementation of this new player movement control system should be hidden behind an interface so that most of the game code does not depend on what moves the character
- [x] Implement an html panel with two buttons - one for using keys to move and one for using geolocation
- [x] Make sure there is a separate html panel with the up, down, left, right arrow keys for players to use if they don't have keys
- [x] Place the above two steps/html elements below the map display
- [x] Make sure that, for computer screens only, arrow buttons appear in the following order: up key (row 1) left key down key right key (row 2). For phone, leave in one column
- [x] Make error messages, such as location error or no valid interaction here or too far, disappear after 4 seconds and revert back to points and inventory text

## Ideas for further development

- [ ] Night/Day Mode: Light and dark css with toggle in top right (over map)
- [ ] "Mimic Tokens": Some tokens (maybe half a shade darker in bg coloring?) end up subtracting from user's total worth instead of adding
- [ ] Sound effects
- [ ] "Feisty Tokens": Special yellow tokens of greater worth (like a 16, separate from a 16 token the player makes themselves and places down) have a pop up with a little minigame that players have to win to collect it. Leaflet has a built in pop up that you can build inside of so use that and have the minigame be something simple
- [ ] Refactor stinkiness!
