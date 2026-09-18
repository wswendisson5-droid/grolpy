// Setup Node.js App (cPanel / Passenger) Entrypoint
// CommonJS bootstrap: package.json uses type=module, while the compiled backend is dist/server.cjs.
import './dist/server.cjs';
