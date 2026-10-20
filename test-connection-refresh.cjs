const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync('src/components/connection/ConnectionView.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
}}).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
async function scenario({ client = true, failure = false, status = 'connected', unmount = false } = {}) {
  const effects = [], state = [], calls = [], notifications = [];
  let cursor = 0, finish;
  const response = new Promise(resolve => { finish = resolve; });
  const service = new Proxy({}, { get(_, method) { return async (...args) => {
    calls.push([method, ...args]);
    if (method === 'getStatus') {
      await response;
      if (failure) throw new Error('HTTP 503');
      return { instanceName: 'owned-session', status, qrCode: undefined };
    }
    if (method === 'getInstances') return { instances: [{ name: 'other-open', connectionStatus: 'open' }] };
    throw new Error(`Unexpected session mutation: ${method}`);
  }; }});
  const react = {
    createElement: () => null,
    useState(initial) { const slot = cursor++; state[slot] = initial; return [initial, next => {
      state[slot] = typeof next === 'function' ? next(state[slot]) : next;
    }]; },
    useCallback: callback => callback,
    useEffect(callback, deps) { if (deps.length === 0) effects.push(callback); },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, console, require(name) {
    if (name === 'react') return { __esModule: true, default: react, ...react };
    if (name.includes('connectionService')) return { connectionService: service };
    return {};
  }});
  exports.ConnectionView({ isClientView: client, defaultInstanceName: 'owned-session', onStatusChange: s => notifications.push(s) });
  assert.equal(effects.length, 1);
  const cleanup = effects[0]();
  if (unmount) cleanup();
  finish(); await tick(); await tick();
  assert(calls.every(([name]) => ['getStatus', 'getInstances'].includes(name)), 'reload must not change the session');
  assert.deepEqual(calls[0], ['getStatus', 'owned-session']);
  if (client) assert.equal(calls.length, 1, 'client must not query admin instances');
  if (unmount) assert.equal(state[0].status, 'loading');
  else assert.equal(state[0].status, failure ? 'error' : status);
  assert.equal(state[0].instanceName, unmount || failure ? 'owned-session' : 'owned-session');
  if (!unmount && !failure) assert.deepEqual(notifications, [status]);
}
(async () => {
  await scenario();
  await scenario({ status: 'disconnected' });
  await scenario({ failure: true });
  await scenario({ client: false });
  await scenario({ client: false, failure: true });
  await scenario({ unmount: true });
  console.log('6 reload lifecycle scenarios passed; no pairing, selection, restart, or logout.');
})().catch(error => { console.error(error); process.exitCode = 1; });
