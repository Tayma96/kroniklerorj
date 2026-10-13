const assert=require('node:assert/strict'),path=require('node:path'),esbuild=require('esbuild');
const copy=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 const b=await esbuild.build({stdin:{contents:'export * as g from "./lib/game"; export * as net from "./lib/soylenti-agi"; export {TRAITS} from "./lib/world"; export {renderEvt,tFor} from "./lib/i18n";',resolveDir:path.resolve(__dirname,'../..'),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});const m={exports:{}};new Function('module','exports','require',b.outputFiles[0].text)(m,m.exports,require);const {g,net,TRAITS,renderEvt,tFor}=m.exports;
 let cases=0;const pop={v:1,n:5,k:{}};
 for(const [i,id]of ['a','b','c','d','e'].entries())pop.k[id]={id,g:'erkek',dy:-30,loc:'Yer',prof:'demirci',tr:TRAITS.indexOf(i<3?'kurnaz':'mert'),qk:0,gl:0};
 const graph={a:['b'],b:['a','c'],c:['b','d'],d:['c','e'],e:['d']};let heard=net.rumorOrigin('a',0);const rows=[];
 for(let turn=1;turn<=4;turn++){const before=copy(heard);heard=net.spreadRumor(heard,graph,pop,turn,()=>0,3);assert.deepEqual(before,turn===1?net.rumorOrigin('a',0):rows.at(-1));rows.push(copy(heard));assert.equal(heard.length,Math.min(turn+1,4));cases++;}
 assert.deepEqual(heard.at(-1).chain,['a','b','c','d']);assert(heard[3].certainty<heard[2].certainty&&heard[2].certainty<heard[1].certainty);assert(heard[3].distortion>heard[2].distortion);assert(!heard.some(h=>h.id==='e'));assert.equal(heard[3].retelling,2);assert.deepEqual(net.spreadRumor(heard,graph,pop,4,()=>0,3),heard);
 assert.equal(net.spreadRumor(net.rumorOrigin('a',1),graph,pop,1,()=>{throw Error('Aynı ay aktarım');}).length,1);cases++;
 pop.k.e.ol=0;pop.k.d.dy=0;pop.k.c.loc='Uzak';pop.k.a.dost=['b','c','d','e','@'];const actual=net.rumorGraph(pop,0);assert(!actual.d&&!actual.e&&!actual['@']);assert(actual.a.includes('b'));assert(!actual.a.includes('c'));for(const [id,edges]of Object.entries(actual))for(const other of edges){assert(actual[other].includes(id));assert.notEqual(id,other);}cases++;
 for(let n=0;n<200;n++){
  const p={v:1,n:120,k:{}};for(let i=0;i<120;i++)p.k['p'+i]={...pop.k.a,id:'p'+i,tr:n%TRAITS.length,ol:undefined,dost:[],loc:'Yer'};
  const dense=Object.fromEntries(Object.keys(p.k).map(id=>[id,Object.keys(p.k).filter(x=>x!==id)]));let h=net.rumorOrigin('p0',0);
  for(let turn=1;turn<9;turn++){let calls=0;h=net.spreadRumor(h,dense,p,turn,()=>{calls++;return n%2?.99:0;});assert(calls<=net.RUMOR_LIMITS.attempts);assert(h.length<=net.RUMOR_LIMITS.people);assert.equal(new Set(h.map(x=>x.id)).size,h.length);for(const x of h){assert(x.chain.length<=4);assert.equal(new Set(x.chain).size,x.chain.length);assert(x.certainty>0&&x.certainty<=1);assert(x.distortion>=1&&x.distortion<=1.5);}cases++;}
 }
 let base=g.newGame('Duyum','Ocak','kadın');base.player.age=base.player.base_age=30;base.player.money=500;const town=g.npcsOf(base).filter(n=>n.age>=18&&!g.oyuncuAkrabasi(base.player,n.id));assert(town.length>=3);const [source,recipient,unheard]=town;
 base.player_rumors=[{id:'test',hafta:0,tur:'hakaret',vi:0,nam:'zalim',yon:-1,siddet:3,kaynak:source.name,loc:base.player.location_name,kaynakId:source.id,duyanlar:net.rumorOrigin(source.id,0)}];
 assert(!g.gorus(base,recipient.id).kalemler.some(x=>x.k==='gorus.soylenti'));assert(!g.heardRumor(base,unheard.id));
 base.player_rumors[0].duyanlar.push({id:recipient.id,turn:0,chain:[source.id,recipient.id],certainty:.78,distortion:1.03});assert(g.gorus(base,recipient.id).kalemler.some(x=>x.k==='gorus.soylenti'&&x.v<0));assert(!g.gorus(base,unheard.id).kalemler.some(x=>x.k==='gorus.soylenti'));assert(!g.gorus(base,source.id).kalemler.some(x=>x.k==='gorus.soylenti'));cases++;
 const bad=/\b(?:NaN|undefined)\b|%[a-zA-Z0-9]|\brum(?:or)?\.net\./;
 for(const lang of ['tr','en','es','pt','ar','ru'])for(const female of [false,true])for(const hops of [0,1,3]){
  const s=copy(base);s.player.gender=female?'kadın':'erkek';s.player_rumors[0].duyanlar=[{id:recipient.id,turn:0,chain:hops===0?[recipient.id]:hops===1?[source.id,recipient.id]:[unheard.id,source.id,'araci',recipient.id],certainty:hops===3?.314:1,distortion:hops===3?1.405:1}];
  const original=copy(s);const r=g.talkWith(s,recipient,'duyum',lang);assert(r.line&&!bad.test(r.line),lang+' '+r.line);assert.equal(r.delta,0);assert.deepEqual(r.state.player,original.player);assert.deepEqual(r.state.relationships,original.relationships);assert.equal(r.state.turn,s.turn);assert.deepEqual(s,original);assert.deepEqual(g.talkWith(r.state,recipient,'duyum',lang).state,r.state);assert.equal(g.talkWith(r.state,recipient,'duyum',lang).line,'');
  for(const display of ['tr','en','es','pt','ar','ru']){const e=r.state.history.at(-1);const line=renderEvt(e.k,e.text,e.p,display,k=>tFor(display,k),female);assert(line&&!bad.test(line));}cases++;
 }
 for(const kind of ['dead','child','distant','gone','unheard']){const s=copy(base);if(kind==='dead')s.player.dead=true;if(kind==='child')s.player.age=s.player.base_age=7;if(kind==='distant')s.pop.k[recipient.id].loc='Uzak';if(kind==='gone')s.pop.k[recipient.id].ol=0;if(kind==='unheard')s.player_rumors[0].duyanlar=[];assert.equal(g.talkWith(s,recipient,'duyum','tr').line,'');cases++;}
 for(const lang of ['tr','en','es','pt','ar','ru'])for(const tur of ['hakaret','kara_cal']){
  const s=copy(base);s.player_rumors[0].tur=tur;s.player_rumors[0].vi=1;const other=copy(s);other.player_rumors[0].duyanlar[1].retelling=1;
  const a=g.talkWith(s,recipient,'duyum',lang), b=g.talkWith(other,recipient,'duyum',lang);
  assert.notEqual(a.line,b.line,'Aktarılan sözün varyantı konuşmada gerçekten değişmeli: '+lang);
  const quote=renderEvt('rumor.'+tur+'.1','',[s.player.name,g.kisiProfil(s,source.id,lang).npc.name],lang,k=>tFor(lang,k),true);assert(a.line.includes(quote),'İlk anlatıcı özgün ikinci varyantı korumalı: '+tur+' '+lang);cases++;
 }
 const old=copy(base);delete old.player_rumors[0].duyanlar;delete old.player_rumors[0].kaynakId;assert(g.gorus(old,unheard.id).kalemler.some(x=>x.k==='gorus.soylenti'));assert.deepEqual(g.migrate(copy(old)).player_rumors,old.player_rumors);assert.equal(g.talkWith(old,recipient,'duyum').line,'');cases++;
 const originalRandom=Math.random;try{
  Math.random=()=>.99;const failed=g.rumorAction(base,'test','yuzles');assert.equal(failed.player_rumors[0].siddet,4);assert.deepEqual(g.rumorAction(failed,'test','yuzles'),failed);assert.deepEqual(g.rumorAction(failed,'test','sustur'),failed);const later=copy(failed);later.turn++;assert.equal(g.rumorAction(later,'test','sustur').player.money,later.player.money-60);cases++;
  const positive=copy(base);positive.player_rumors[0].yon=1;const spread=g.rumorAction(positive,'test','yay');assert.deepEqual(g.rumorAction(spread,'test','yay'),spread);spread.turn++;assert.deepEqual(g.rumorAction(spread,'test','yay'),spread);cases++;
  Math.random=()=>0;const won=g.rumorAction(base,'test','yuzles');assert.equal(won.player_rumors.length,base.player_rumors.length);assert(won.player_rumors[0].duyanlar.find(h=>h.id===source.id).sessiz);assert.deepEqual(won.player_rumors[0].duyanlar.find(h=>h.id===recipient.id),base.player_rumors[0].duyanlar.find(h=>h.id===recipient.id));assert.deepEqual(g.rumorAction(won,'test','yuzles'),won);cases++;
  const saved=copy(base);saved.player_rumors[0].duyanlar=net.rumorOrigin(source.id,0);saved.npc_state={};const advanced=g.advance(saved);assert.deepEqual(saved.player_rumors[0].duyanlar,net.rumorOrigin(source.id,0));assert(advanced.player_rumors[0].duyanlar.length>1,'Ay ilerleyince motor gerçek komşulara aktarır');assert(advanced.player_rumors[0].duyanlar.every(h=>h.chain.length<=2));cases++;
 }finally{Math.random=originalRandom;}
 const heir=g.continueAsHeir({...copy(base),player:{...copy(base.player),dead:true,children:['Evlat']}},'esit','Evlat');assert.deepEqual(heir.player_rumors,[]);assert.deepEqual(heir.npc_state,{});cases++;
 console.log('SÖYLENTİ: TEMİZ · '+cases+' senaryo · üç halka · sınırlar · bilinen/duyulmayan · eski kayıt · kaynak konuşması · ay kilidi · vâris · 6 dil');
 console.log(JSON.stringify({threeHops:rows[2],maxPeople:net.RUMOR_LIMITS.people,maxAttempts:net.RUMOR_LIMITS.attempts}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
