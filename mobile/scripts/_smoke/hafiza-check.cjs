const assert = require('node:assert/strict'), path = require('node:path'), esbuild = require('esbuild');
const root = path.resolve(__dirname, '../..'), copy = x => JSON.parse(JSON.stringify(x));
(async () => {
  const build = await esbuild.build({ stdin: { contents: 'export * as g from "./lib/game"; export * as m from "./lib/npc-mind"; export {recollectionLine} from "./lib/hafiza-sohbet"; export {TRAITS} from "./lib/world"; export {renderEvt,tFor} from "./lib/i18n";', resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
  const module = { exports: {} }; new Function('module','exports','require',build.outputFiles[0].text)(module,module.exports,require); const { g,m,recollectionLine,TRAITS,renderEvt,tFor } = module.exports;
  const base = g.newGame('Hatıra','Ocak','kadın'); base.player.age = base.player.base_age = 30; base.player.money = 500;
  const api=[];assert.equal(m.addMemory(api,'guzel_sohbet',0,{yuk:3.123456}).yuk,3.123456);assert.equal(m.addMemory(api,'bilinmeyen',0),null);assert.equal(api.length,1);
  const target = g.npcsOf(base).find(n => n.age >= 18 && !g.oyuncuAkrabasi(base.player,n.id)); assert(target);
  const rows = []; let cases = 0;
  for (const trait of ['cömert','dindar','kurnaz']) {
    let s = copy(base); s.pop.k[target.id].tr = TRAITS.indexOf(trait); const npc = g.npcsOf(s).find(n=>n.id===target.id); assert.equal(npc.trait,trait);
    s = g.helpNpcGoal(s,npc); const mem = s.npc_state[npc.id].anilar.find(a=>a.tur==='yardim'); assert(mem);
    assert.equal(mem.sahip,npc.id); assert(mem.kimlik&&mem.olay); assert.equal(mem.kesinlik,1); assert.equal(mem.kanit,'katilim'); assert.deepEqual(mem.kaynakZinciri,[npc.id]);
    assert.deepEqual(g.helpNpcGoal(s,npc),s,'Yardım tur kilidi değişmedi');
    s.turn++; const before = copy(s), rel = g.relWith(s,npc.id), recalled = g.talkWith(s,npc,'hatira','tr');
    assert(recalled.line.includes('1 ay önce')); assert.equal(recalled.delta,0); assert.equal(g.relWith(recalled.state,npc.id),rel);
    assert.deepEqual(recalled.state.player,before.player); assert.equal(recalled.state.npc_state[npc.id].anilar.length,before.npc_state[npc.id].anilar.length);
    assert.equal(recalled.state.npc_state[npc.id].anilar[0].sonAnilma,s.turn); assert.equal(g.talkWith(recalled.state,npc,'hatira','tr').line,'');
    assert.deepEqual(g.talkWith(recalled.state,npc,'hatira','tr').state,recalled.state,'Anı konuşmak kaynak/ilişki/XP farmı yapamaz');
    rows.push({trait,weight:mem.yuk,relation:rel,line:recalled.line}); cases++;
  }
  assert.equal(new Set(rows.map(r=>r.weight)).size,3); assert.equal(new Set(rows.map(r=>r.relation)).size,3); assert.equal(new Set(rows.map(r=>r.line)).size,3);
  assert(rows[0].weight>rows[1].weight&&rows[1].weight>rows[2].weight);
  const bad=/\b(?:NaN|undefined)\b|%[a-zA-Z0-9]|\b(?:mem|mind)\.(?:remember|recall)/;
  for(const [tur,spec] of Object.entries(m.MEMORY_TYPES)) for(const trait of TRAITS) for(const lang of ['tr','en','es','pt','ar','ru']) for(const female of [false,true]) {
    const list=[]; const mem=m.addMemory(list,tur,0,{huy:trait}); assert(mem&&Number.isFinite(mem.yuk)); const original=JSON.stringify(mem);
    const line=recollectionLine({...target,trait},mem,13,lang,female); assert(line.trim()&&!bad.test(line),lang+' '+tur+' '+line); assert.equal(JSON.stringify(mem),original,'Metin okuması belleğe yazamaz'); cases++;
  }
  const trauma=[]; m.addMemory(trauma,'saldiri',0); m.addMemory(trauma,'guzel_sohbet',1); assert.equal(m.salientMemory(trauma,1).tur,'saldiri');
  trauma[0].sonAnilma=1; assert.equal(m.salientMemory(trauma,1).tur,'guzel_sohbet'); assert.equal(m.salientMemory(trauma,1,true).tur,'saldiri');
  for(let i=0;i<100;i++)m.addMemory(trauma,'guzel_sohbet',i); assert.equal(trauma.length,24); assert(trauma.some(x=>x.tur==='saldiri'));
  let decayed=trauma; for(let i=0;i<200;i++)decayed=m.decayMemories(decayed); assert(decayed.some(x=>x.tur==='saldiri')); assert(decayed.length<=24); cases++;
  const old={tur:'yardim',hafta:0,yuk:20,unutma:.995,travma:false,taniklar:[],yayildi:false};
  let legacy=copy(base); legacy.npc_state[target.id]={mood:0,memories:[],anilar:[old]}; legacy=g.migrate(legacy); assert.equal(legacy.npc_state[target.id].anilar[0].yuk,20);
  const result=g.talkWith(legacy,g.npcsOf(legacy).find(n=>n.id===target.id),'hatira','tr'); assert(result.line); assert.equal(result.state.npc_state[target.id].anilar[0].yuk,20); cases++;
  for(const months of [0,1,13]) for(const lang of ['tr','en','es','pt','ar','ru']) for(const female of [false,true]) {
    const s=copy(legacy); s.turn=months; s.player.gender=female?'kadın':'erkek'; const r=g.talkWith(s,target,'hatira','tr');const e=r.state.history.at(-1);
    const line=renderEvt(e.k,e.text,e.p,lang,k=>tFor(lang,k),female); assert(line&&!bad.test(line)); assert(!line.includes('1 months')); assert(!line.includes('1 meses')); cases++;
  }
  for(const kind of ['dead','distant','gone','empty']) {
    const s=copy(base); s.npc_state[target.id]={mood:0,memories:[],anilar:kind==='empty'?[]:[copy(old)]};
    if(kind==='dead')s.player.dead=true; if(kind==='distant')s.pop.k[target.id].loc=g.LOCATIONS.find(x=>x!==s.player.location_name); if(kind==='gone')s.pop.k[target.id].ol=0;
    const r=g.talkWith(s,target,'hatira','tr'); assert.equal(r.line,''); assert.equal(r.delta,0); assert.deepEqual(r.state.player,s.player); cases++;
  }
  const next=g.continueAsHeir({...copy(base),player:{...copy(base.player),dead:true,children:['Evlat']}},'esit','Evlat'); assert.deepEqual(next.npc_state,{}); cases++;
  console.log('HAFIZA: TEMİZ · '+cases+' senaryo · eski gövde · kişilik · ağır anı · ay kilidi · vâris · 6 dil/iki cinsiyet');
  console.log(JSON.stringify({sameEventThreePeople:rows}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
