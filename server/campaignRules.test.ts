import assert from 'node:assert/strict';
import {isOpenJoinedGroup, nextRecurringSlot, isScheduledDue} from './campaignRules';
const own='5527999999999@s.whatsapp.net';
const group={id:'123@g.us',participants:[{id:own}]};
assert.equal(isOpenJoinedGroup(group,own),true);
for(const flags of [{isCommunity:true},{isCommunityAnnounce:true},{announce:true},{announce:'true'},{left:true},{participants:[{id:'other@s.whatsapp.net'}]},{participants:[]}]) assert.equal(isOpenJoinedGroup({...group,...flags},own),false);
assert.equal(isOpenJoinedGroup({...group,participants:[{id:'123@lid',phoneNumber:own}]},own),true);
const camp={scheduleDays:'Seg, Ter',scheduleTimes:['09:00','18:00'],createdAt:'2026-10-01T12:00:00Z'};
assert.equal(nextRecurringSlot(camp,'2026-10-05','18:30','Seg'),'2026-10-05_09:00');
assert.equal(nextRecurringSlot({...camp,completedSlots:['2026-10-05_09:00']},'2026-10-05','18:30','Seg'),'2026-10-05_18:00');
assert.equal(nextRecurringSlot({...camp,completedSlots:['2026-10-05_09:00','2026-10-05_18:00']},'2026-10-05','18:30','Seg'),undefined);
assert.equal(nextRecurringSlot(camp,'2026-10-06','09:00','Ter'),'2026-10-06_09:00');
assert.equal(nextRecurringSlot(camp,'2026-10-07','18:30','Qua'),undefined);
assert.equal(nextRecurringSlot(camp,'2026-10-12','09:00','Seg'),'2026-10-12_09:00');
const daily={scheduleDays:'Seg, Ter, Qua, Qui, Sex, Sáb, Dom',scheduleTimes:['09:00','21:00'],scheduleDate:'2026-10-11'};
for (const [date,day] of [['2026-10-07','Qua'],['2026-10-10','Sáb']]) assert.equal(nextRecurringSlot(daily,date,'23:00',day),undefined);
for (const [date,day] of [['2026-10-11','Dom'],['2026-10-12','Seg'],['2026-10-13','Ter'],['2026-10-14','Qua'],['2026-10-15','Qui'],['2026-10-16','Sex'],['2026-10-17','Sáb']]) {
  assert.equal(nextRecurringSlot(daily,date,'08:59',day),undefined);
  assert.equal(nextRecurringSlot(daily,date,'09:00',day),`${date}_09:00`);
  assert.equal(nextRecurringSlot({...daily,completedSlots:[`${date}_09:00`]},date,'21:00',day),`${date}_21:00`);
  assert.equal(nextRecurringSlot({...daily,completedSlots:[`${date}_09:00`,`${date}_21:00`]},date,'23:00',day),undefined);
}
console.log('Campaign recurrence and membership checks passed.');
for (const date of ['2026-10-10','2026-10-11']) {
  const scheduled={scheduleDate:date,scheduleTime:'09:00',status:'agendada',executed:false};
  assert.equal(isScheduledDue(scheduled,'2026-10-07','23:00'),false);
  assert.equal(isScheduledDue(scheduled,date,'08:59'),false);
  assert.equal(isScheduledDue(scheduled,date,'09:00'),true);
  assert.equal(isScheduledDue({...scheduled,executed:true},date,'10:00'),false);
}
