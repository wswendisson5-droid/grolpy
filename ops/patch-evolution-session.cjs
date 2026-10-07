// Target: Evolution API 2.3.7. Run inside its container before restarting it.
// Keeps credentials and session storage intact; rejects unknown builds.
const fs = require('node:fs');
const file = process.argv[2] || '/evolution/dist/main.js';
let source = fs.readFileSync(file, 'utf8');
if (source.includes('groplySessionPatchV1')) { console.log('Already patched'); process.exit(0); }
const replacements = [
  ['eventHandler(){this.client.ev.process(async e=>{this.eventProcessingQueue=this.eventProcessingQueue.then(async()=>{try{if(!this.endSession){',
   'eventHandler(){const groplySessionPatchV1=this.client;this.client.ev.process(async e=>{if(this.client!==groplySessionPatchV1)return;if(e["connection.update"]){try{await this.connectionUpdate(e["connection.update"])}catch(err){this.logger.error(err)}delete e["connection.update"]}if(this.client!==groplySessionPatchV1)return;this.eventProcessingQueue=this.eventProcessingQueue.then(async()=>{try{if(!this.endSession&&this.client===groplySessionPatchV1){'],
  ['async reloadConnection(){try{return await this.createClient(this.phoneNumber)}',
   'async restart(){if(this.groplyRestartPromise)return this.groplyRestartPromise;this.groplyRestartPromise=(async()=>{const old=this.client;this.client=null;this.stateConnection={state:"connecting",statusReason:200};this.eventProcessingQueue=Promise.resolve();try{old?.ws?.close();old?.end(new Error("restart"))}catch(err){this.logger.error(err)}return await this.connectToWhatsapp(this.phoneNumber)})();try{return await this.groplyRestartPromise}finally{this.groplyRestartPromise=null}}async reloadConnection(){try{return await this.createClient(this.phoneNumber)}'],
  ['for(let i of t){let n=await this.profilePicture(i.id),r={id:i.id,subject:i.subject,',
   'for(let i of t){let n=e.skipPicture==="true"?null:await this.profilePicture(i.id),r={id:i.id,subject:i.subject,'],
];
for (const [from,to] of replacements) {
  if (source.split(from).length !== 2) throw new Error('Unknown Evolution build: patch anchor mismatch');
  source = source.replace(from,to);
}
fs.copyFileSync(file, file+'.groply-backup');
fs.writeFileSync(file, source);
console.log('Patched connection events, per-instance restart, and optional fast group metadata');
