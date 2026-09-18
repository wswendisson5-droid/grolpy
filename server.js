// Setup Node.js App (cPanel / Passenger) Entrypoint
// This file serves as a simple bootstrap to load the compiled TypeScript backend.
// It allows cPanel to start the app using "server.js" as the application startup file.

import './dist/server.cjs';
