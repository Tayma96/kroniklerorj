const assert=require('node:assert/strict'),path=require('node:path'),esbuild=require('esbuild'),copy=x=>structuredClone(x);
(async()=>{
 const built=await esbuild.build({stdin:{contents:'export * as g from "./lib/game";export * as b from "./lib/npc-bakis";export * as mind from "./lib/npc-mind";export {TRAITS} from "./lib/world";export {tFor,renderEvt} from "./lib/i18n";',resolveDir:path.resolve(__dirname,'../..'),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});const box={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(box,box.exports,require);const {g,b,mind,TRAITS,tFor,renderEvt}=box.exports;const old=Math.random;let cases=0;
 const same=owner=>assert.deepEqual(b.bakisOku(owner),b.bakisOku({anilar:owner.anilar}),'Artımlı defter anılarıyla eşit');
 const memory=(tur,yuk,kanit='katilim')=>({tur,yuk,kanit,hafta:0,unutma:.95,travma:false,taniklar:[],yayildi:false});
 try {
 for(const tur of Object.keys(mind.MEMORY_TYPES))for(const kanit of ['katilim','gorgu','duyum','eski']){
  const owner={anilar:[]};const ledger=b.bakisHazirla(owner),m=mind.addMemory(owner.anilar,tur,0,{kanit,bakis:ledger,huy:'cömert'});assert(m);same(owner);for(let turn=1;turn<=3;turn++){owner.anilar=mind.decayMemories(owner.anilar,ledger);same(owner);}cases++;
 }
 for(let trial=0;trial<30;trial++){
  const owner={anilar:[]},ledger=b.bakisHazirla(owner),types=Object.keys(mind.MEMORY_TYPES);
  for(let i=0;i<120;i++){
   mind.addMemory(owner.anilar,types[(i*17+trial)%types.length],i,{huy:TRAITS[(i+trial)%TRAITS.length],kanit:i%3?'katilim':'gorgu',bakis:ledger});same(owner);assert(owner.anilar.length<=24);
   if(i%4===0){owner.anilar=mind.decayMemories(owner.anilar,ledger);same(owner);}
   if(i%11===0){b.aniHafiflet(owner,m=>m.yuk<0,.4);same(owner);}
   if(i%13===0){b.aniHafiflet(owner,m=>m.tur==='hakem_aleyhte',.5,true);same(owner);}cases++;
  }
 }
 const traumas={anilar:[]},ledger=b.bakisHazirla(traumas);for(let i=0;i<40;i++){mind.addMemory(traumas.anilar,'kan',i,{bakis:ledger,yuk:-60-i});same(traumas);}assert.equal(traumas.anilar.length,24);cases++;
 const faint={anilar:[memory('guzel_sohbet',1.01)]};b.bakisHazirla(faint);faint.anilar=mind.decayMemories(faint.anilar,faint.bakis);assert.equal(faint.anilar.length,0);same(faint);cases++;
 const gift=b.bakisOku({anilar:[memory('hediye',20)]}),help=b.bakisOku({anilar:[memory('yardim',20)]}),insult=b.bakisOku({anilar:[memory('hakaret',-20)]}),threat=b.bakisOku({anilar:[memory('tehdit',-20)]});assert(help.guven>gift.guven&&help.borc>gift.borc);assert(threat.korku>insult.korku&&threat.saygi>insult.saygi);assert.equal(b.bakisOku({anilar:[memory('hayat_kurtarma',40,'gorgu')]}).borc,0);cases++;
 const crowded={anilar:[memory('tehdit',-100),memory('tehdit',-100)]};b.bakisHazirla(crowded);assert(crowded.bakis.toplam.korku>100);b.aniHafiflet(crowded,()=>true,.6);assert.equal(b.bakisOku(crowded).korku,100);same(crowded);cases++;
 const invalid={anilar:[memory('hakaret',-20)],bakis:{v:0,toplam:{guven:NaN}}},beforeInvalid=copy(invalid);assert.deepEqual(b.bakisOku(invalid),insult);assert.deepEqual(invalid,beforeInvalid);b.bakisHazirla(invalid);same(invalid);cases++;
 const fast={bakis:copy(crowded.bakis),get anilar(){throw Error('Yeni defter okunurken anı listesi taranamaz')}};b.bakisOku(fast);cases++;
 Math.random=()=>.3141592653;let base=g.newGame('Tavır','Ocak','kadın');base.player.age=base.player.base_age=30;base.player.money=500;base.player.hunger=100;base.player.health=100;base.player.governorships=[];base.player.location_name=g.LOCATIONS.slice().sort((a,z)=>g.rosterAt(base,z).length-g.rosterAt(base,a).length)[0];for(const k of Object.values(base.pop.k))if(k.loc===base.player.location_name)k.tr=TRAITS.indexOf('utangaç');
 Math.random=()=>0;let feared=g.intimidate(base);const id=Object.keys(feared.npc_state).find(id=>feared.npc_state[id].anilar?.some(m=>m.tur==='tehdit'));assert(id,'Gerçek gözdağının şahidi');Math.random=()=>.99;feared=g.advance(feared);Math.random=()=>0;feared=g.intimidate(feared);const npc=g.kisiProfil(feared,id,'tr').npc;assert(g.npcBakisi(feared,id).korku>=20);feared.relationships[id]=80;feared.player.inventory.bugday=1;const given=g.giftTo(feared,npc,'bugday');same(given.npc_state[id]);assert(g.relWith(given,id)>20,'Önceki sıcak ilişki hediye ile yüksek kalabilir');assert(g.npcBakisi(given,id).guven<5);const readBefore=copy(given);g.npcBakisi(given,id);assert.deepEqual(given,readBefore);cases++;
 for(const intent of ['dert','hedef','aile']){
  Math.random=()=>{throw Error('Kapalı özel konuşma zar tüketmez')};const out=g.talkWith(given,npc,intent);assert.equal(out.line,tFor('tr','bakis.closed'));assert.equal(out.delta,0);assert.deepEqual(out.state.player,given.player);assert.deepEqual(out.state.relationships,given.relationships);assert.deepEqual(out.state.npc_state[id].anilar,given.npc_state[id].anilar);assert.equal(out.state.turn,given.turn);assert.equal(out.state.npc_state[id].son.ok,2);assert.equal(out.state.history.at(-1).k,'bakis.closed.log');assert.deepEqual(g.talkWith(out.state,npc,intent).state,out.state);cases++;
 }
 Math.random=()=>0;const forgiven=g.helallikIste(given,npc);assert.equal(forgiven.history.at(-1).k,'npca.helalOk');same(forgiven.npc_state[id]);assert(g.npcBakisi(forgiven,id).korku<20);const open=g.talkWith(forgiven,npc,'dert');assert(open.line&&open.line!==tFor('tr','bakis.closed'));same(open.state.npc_state[id]);cases++;
 const legacy=copy(given);delete legacy.npc_state[id].bakis;const original=copy(legacy);assert.deepEqual(g.npcBakisi(legacy,id),g.npcBakisi(given,id));assert.deepEqual(legacy,original);const migrated=g.migrate(copy(legacy));assert.deepEqual(g.migrate(copy(migrated)),migrated);Math.random=()=>.99;const later=g.advance(legacy);same(later.npc_state[id]);assert(later.npc_state[id].bakis);cases++;
 const unknown=copy(given);delete unknown.npc_state[id];assert(Object.values(g.npcBakisi(unknown,id)).every(v=>v===0),'Bilmediği olaydan tavır uydurulmaz');cases++;
 const heir=g.continueAsHeir({...copy(given),player:{...copy(given.player),dead:true,children:['Evlat']}},'esit','Evlat');assert.deepEqual(heir.npc_state,{});assert(Object.values(g.npcBakisi(heir,id)).every(v=>v===0));cases++;
 const bad=/\b(?:undefined|NaN)\b|%[a-zA-Z0-9]|\bbakis\./;
 for(const lang of ['tr','en','es','pt','ar','ru'])for(const female of [false,true]){
  const s=copy(given);s.player.gender=female?'kadın':'erkek';const person=g.kisiProfil(s,id,lang).npc;const out=g.talkWith(s,person,'dert',lang);assert.equal(out.line,tFor(lang,'bakis.closed'));const e=out.state.history.at(-1),line=renderEvt(e.k,e.text,e.p,lang,k=>tFor(lang,k),female);assert(line&&!bad.test(line));for(const key of [...b.BAKIS_KEYS,'title','hint',...['cekingen','suphe','minnet','guven','saygi','sicak','kirgin','notr'].map(x=>'t.'+x)])assert(!bad.test(tFor(lang,'bakis.'+key)));cases++;
 }
 console.log('NPC TAVRI: TEMİZ · '+cases+' senaryo · altı artımlı boyut · ekleme/unutma/budama/helallik · gerçek tehdit/hediye/özel konuşma · eski kayıt/vâris · 6 dil');console.log(JSON.stringify({id,relationship:g.relWith(given,id),afterGift:g.npcBakisi(given,id),afterForgiveness:g.npcBakisi(forgiven,id)}));
 } finally {Math.random=old;}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
