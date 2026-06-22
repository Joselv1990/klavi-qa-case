// Boots the mock Resources API, runs the Postman collection against it with Newman,
// then shuts the mock down. Lets `npm run test:mock` prove the suite executes green
// end-to-end without any external dependency.

const { spawn } = require('child_process');
const path = require('path');
const newman = require('newman');

const PORT = 3399;
const baseUrl = `http://localhost:${PORT}`;

const mock = spawn(process.execPath, [path.join(__dirname, 'mock', 'server.js')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'inherit',
});

const stop = (code) => { try { mock.kill(); } catch (_) {} process.exit(code); };

// Give the mock a moment to bind the port, then run the collection.
setTimeout(() => {
  newman.run(
    {
      collection: require(path.join(__dirname, 'postman', 'resources-api.postman_collection.json')),
      environment: require(path.join(__dirname, 'postman', 'resources-api.postman_environment.json')),
      envVar: [
        { key: 'baseUrl', value: baseUrl },
        { key: 'accessToken', value: 'valid-sandbox-token' },
        { key: 'consentBToken', value: 'consent-b-token' },
        { key: 'consentAResourceId', value: 'rsrc-001' },
      ],
      reporters: ['cli'],
    },
    (err, summary) => {
      if (err) { console.error(err); return stop(1); }
      const failures = summary.run.failures.length;
      console.log(`\nNewman finished: ${failures} failure(s).`);
      stop(failures === 0 ? 0 : 1);
    }
  );
}, 800);
