// Upgrade the pinned 2.3.7 session-v1 image without deleting any auth state.
const fs = require('node:fs');

function patchPairing(source) {
  if (source.includes('groplyPairingPatchV2')) return source;
  if (!source.includes('groplySessionPatchV1')) throw new Error('Apply the session-v1 patch first');
  const restart = 'async restart(){if(this.groplyRestartPromise)';
  if (source.split(restart).length !== 2) throw new Error('Unknown restart implementation');
  source = source.replace(restart, 'async restart(number=this.phoneNumber){if(this.groplyRestartPromise)');
  const reconnect = 'return await this.connectToWhatsapp(this.phoneNumber)})();';
  if (source.split(reconnect).length !== 2) throw new Error('Unknown restart reconnect implementation');
  source = source.replace(reconnect, 'this.instance.qrcode={count:0};return await this.connectToWhatsapp(number)})();');

  // Scope matching to the controller overload, never the Baileys service method.
  const method = /async connectToWhatsapp\(\{instanceName:(\w+),number:(\w+)=null\}\)\{([\s\S]*?)(?=async \w+\()/g;
  let replacements = 0;
  source = source.replace(method, (full, instanceName, number) => {
    const branch = /if\((\w+)===?["']connecting["']\)return (\w+)\.qrCode;/;
    const ternary = /(\w+)===?["']connecting["']\?(\w+)\.qrCode:/;
    if (!branch.test(full) && !ternary.test(full)) throw new Error('Unknown connecting branch');
    replacements++;
    const body = (instance) => `const groplyPairingPatchV2=true;if(${number}&&${instance}.phoneNumber!==${number}){await ${instance}.restart(${number});await new Promise(resolve=>setTimeout(resolve,2000))}return ${instance}.qrCode;`;
    if (ternary.test(full)) return full.replace(ternary, (_, state, instance) =>
      `${state}=="connecting"?await(async()=>{${body(instance)}})():`);
    return full.replace(branch, (_, state, instance) =>
      `if(${state}=="connecting"){${body(instance)}}`);
  });
  if (replacements !== 1) throw new Error('Unknown Evolution build: pairing controller anchor mismatch');
  return source;
}

module.exports = { patchPairing };
if (require.main === module) {
  const file = process.argv[2] || '/evolution/dist/main.js';
  const source = fs.readFileSync(file, 'utf8');
  const patched = patchPairing(source);
  if (source === patched) { console.log('Pairing patch already applied'); process.exit(0); }
  fs.copyFileSync(file, file + '.groply-pairing-backup');
  fs.writeFileSync(file, patched);
  console.log('Patched QR-to-number switching; credentials and session volumes preserved');
}
