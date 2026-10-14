import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pairingCodeFrom, preserveChallengeTime, CHALLENGE_REFRESH_MS } from './src/utils/connectionChallenge';

assert.equal(pairingCodeFrom({ pairingCode: 'xg5k-sy5g' }), 'XG5KSY5G');
assert.equal(pairingCodeFrom({ qrcode: { pairingCode: 'FHFZ9R2S' } }), 'FHFZ9R2S');
for (const code of ['2@abc,def', '1234', 'ABCDEFGH9', 'ABCD--EFGH', '', 12345678]) {
  assert.equal(pairingCodeFrom({ code }), undefined, `must reject ${code}`);
}
const first = preserveChallengeTime({ code: 'qr-a', pairingCode: 'ABCDEFGH', updatedAt: 1000 });
const duplicate = preserveChallengeTime({ ...first, updatedAt: 9000 }, first);
assert.equal(duplicate.updatedAt, 1000);
assert.equal(duplicate.refreshAt, 1000 + CHALLENGE_REFRESH_MS);
const next = preserveChallengeTime({ code: 'qr-b', pairingCode: 'ABCDEFGH', updatedAt: 9000 }, first);
assert.equal(next.refreshAt, 9000 + CHALLENGE_REFRESH_MS);
const newPair = preserveChallengeTime({ ...first, pairingCode: 'NEWCODE1', updatedAt: 9000 }, first);
assert.equal(newPair.updatedAt, 9000);

const require = createRequire(import.meta.url);
const { patchPairing } = require('./ops/patch-evolution-pairing.cjs');
const fixture = `class Service{async restart(){if(this.groplyRestartPromise)return this.groplyRestartPromise;this.groplyRestartPromise=(async()=>{return await this.connectToWhatsapp(this.phoneNumber)})();}groplySessionPatchV1(){}}class Controller{async connectToWhatsapp({instanceName:e,number:t=null}){let n=this.waMonitor.waInstances[e],r=n.connectionStatus.state;if(r=="open")return this.connectionState({instanceName:e});if(r=="connecting")return n.qrCode;if(r=="close")await n.connectToWhatsapp(t);return n.qrCode}async restartInstance(){}}`;
const patched = patchPairing(fixture);
assert.equal(patchPairing(patched), patched, 'idempotent upgrade');
assert.throws(() => patchPairing('unrecognized build'));
assert.throws(() => patchPairing(fixture.replace('if(r=="connecting")return n.qrCode;', '')));
assert.doesNotThrow(() => new Function(patched));
const ternaryFixture = fixture.replace('if(r=="open")return this.connectionState({instanceName:e});if(r=="connecting")return n.qrCode;if(r=="close")await n.connectToWhatsapp(t);return n.qrCode', 'return r=="open"?await this.connectionState({instanceName:e}):r=="connecting"?n.qrCode:r=="close"?(await n.connectToWhatsapp(t),n.qrCode):n.qrCode');
const ternaryPatched = patchPairing(ternaryFixture);
assert.doesNotThrow(() => new Function(ternaryPatched));
assert.equal(patchPairing(ternaryPatched), ternaryPatched);
// Execute the upgraded controller behavior: switch once, keep the same phone stable,
// and never restart an already connected WhatsApp session.
const Controller = new Function(`${patched}; return Controller;`)();
const calls: string[] = [];
const instance = { phoneNumber: undefined as string | undefined, connectionStatus: { state: 'connecting' }, qrCode: { pairingCode: 'FRESH123' }, async restart(phone: string) { calls.push(phone); this.phoneNumber = phone; } };
const controller = new Controller();
controller.waMonitor = { waInstances: { tenant: instance } };
controller.connectionState = async () => ({ state: 'open' });
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((fn: () => void) => { fn(); return 0; }) as any;
try {
  await controller.connectToWhatsapp({ instanceName: 'tenant', number: '5527999999999' });
  await controller.connectToWhatsapp({ instanceName: 'tenant', number: '5527999999999' });
  assert.deepEqual(calls, ['5527999999999']);
  instance.connectionStatus.state = 'open';
  await controller.connectToWhatsapp({ instanceName: 'tenant', number: '5527888888888' });
  assert.equal(calls.length, 1);
} finally { globalThis.setTimeout = realTimeout; }
console.log('Connection challenge and Evolution method switching checks passed');
