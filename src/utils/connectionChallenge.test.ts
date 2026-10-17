import test from 'node:test';
import assert from 'node:assert/strict';
import { evolutionSessionState, connectionCheckIndeterminate, challengeRequestPending, preserveChallengeTime } from './connectionChallenge';

test('recognizes connected and disconnected schemas without guessing from malformed bodies', () => {
  for (const data of [{instance:{state:'open'}}, {connectionStatus:'connected'}, {instance:{status:'OPEN'}}]) assert.equal(evolutionSessionState(data), 'connected');
  for (const state of ['close', 'closed', 'disconnected']) assert.equal(evolutionSessionState({state}), 'disconnected');
  assert.equal(evolutionSessionState({state:'connecting'}), 'connecting');
  for (const data of [{}, null, {error:'Unavailable'}, {status:200}]) assert.equal(evolutionSessionState(data), 'unknown');
});

test('HTTP failures and malformed success cannot establish that a session disconnected', () => {
  for (const status of [401, 403, 408, 429, 500, 502]) assert.equal(connectionCheckIndeterminate({ok:false,status,data:{}}), true);
  assert.equal(connectionCheckIndeterminate({ok:false,status:404,data:{}}), false);
  assert.equal(connectionCheckIndeterminate({ok:true,status:200,data:{}}), true);
  assert.equal(connectionCheckIndeterminate({ok:true,status:200,data:{state:'close'}}), false);
  assert.equal(connectionCheckIndeterminate({ok:true,status:200,data:{instance:{state:'open'}}}), false);
});

test('an in-flight challenge waits without treating unrelated HTTP errors as pending', () => {
  assert.equal(challengeRequestPending(409, {error:'In progress'}), true);
  assert.equal(challengeRequestPending(202, {pending:true}), true);
  for (const status of [400,401,403,429,500,503]) assert.equal(challengeRequestPending(status,{pending:true}), false);
  assert.equal(challengeRequestPending(200,{state:'connected'}), false);
  assert.equal(challengeRequestPending(200,{pending:true,qrCode:{base64:'test-image'}}), false);
  assert.equal(challengeRequestPending(200,{pending:true,qrCode:{pairingCode:'TEST1234'}}), false);
});

test('repeated identical QR events retain their original expiry instead of extending it', () => {
  const old = {code:'test-challenge',updatedAt:1000};
  assert.equal(preserveChallengeTime({code:'test-challenge',updatedAt:30000},old).refreshAt,41000);
  assert.equal(preserveChallengeTime({code:'new-challenge',updatedAt:30000},old).refreshAt,70000);
});
