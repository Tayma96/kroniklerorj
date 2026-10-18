// Hedefli karar kontrolü: hayat simülasyonu veya geniş smoke çalıştırmaz.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), esbuild = require('esbuild');
const root = path.resolve(__dirname, '..'), copy = structuredClone;
(async () => {
 const built = await esbuild.build({stdin:{contents:'export * as g from "./lib/game";export * as cb from "./lib/combat";export {WAR_METIN} from "./lib/i18n-war";export {tFor} from "./lib/i18n";',resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,alias:{'@react-native-async-storage/async-storage':path.join(root,'scripts/_smoke/as-stub.cjs')},plugins:[{name:'campaign-test-only',setup(b){b.onLoad({filter:/[/\\]lib[/\\]game\.ts$/},({path:file})=>({contents:fs.readFileSync(file,'utf8')+'\nexport {crownCampaignTick,tickCaravan};',loader:'ts'}));}}]});
 const box={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(box,box.exports,require);
 const {g,cb,WAR_METIN,tFor}=box.exports;
 const s=g.newGame('Ordu','Denetim','erkek');Object.assign(s.player,{age:40,base_age:40,crowned:true,crownAuthority:75,money:20000,health:100,hunger:100,fame:80,reputation:80,honor:60,stats:{strength:7,intelligence:7,charisma:7,stamina:7}});s.rng_state=1;
 const target=g.campaignTargets(s)[0].id;
 const treaty=g.negotiateTreaty(s,target,'ticaret');assert(treaty.success);assert.equal(treaty.state.player.money,s.player.money-g.treatyCost(s,'ticaret'));assert(!s.player.crownTreaties);
 treaty.state.turn++;assert(!g.canLaunchCampaign(treaty.state,target));assert(!g.demandTribute(treaty.state,target).success);
 treaty.state.turn=12;assert.equal(g.crownTreaty(treaty.state,target),null);assert(g.canLaunchCampaign(treaty.state,target));
 const launched=g.launchCampaign(s,target).state;assert(launched.crownCampaign);assert.equal(launched.crownCampaign.supplies,65);
 const supplied=g.commandCampaign(launched,'ikmal');assert.equal(supplied.crownCampaign.supplies,100);assert.equal(supplied.player.money,launched.player.money-g.campaignOrderCost(launched,'ikmal'));
 assert.deepEqual(g.commandCampaign(supplied,'hucum'),supplied);const next=copy(supplied);next.turn++;
 const assault=g.commandCampaign(next,'hucum');assert.equal(assault.crownCampaign.supplies,80);assert.equal(assault.player.health,next.player.health-3);
 const starved=copy(next);starved.crownCampaign.supplies=20;assert.deepEqual(g.commandCampaign(starved,'hucum'),starved);
 const saved=JSON.stringify(supplied);const a=JSON.parse(saved),b=JSON.parse(saved);for(let i=0;i<3;i++){a.turn++;b.turn++;g.crownCampaignTick(a);g.crownCampaignTick(b);}assert.deepEqual(a,b);assert.equal(a.crownCampaign,null);
 const foreign=g.LOCATIONS.find(x=>g.isAppointableKind(x)&&!g.crownControls(s,x));assert(foreign);assert(!g.canAppointGovernor(s,foreign));const seated=g.migrate(copy(s));seated.player.home_name=foreign;assert(!g.crownControls(seated,foreign),'Taşınmak ülke sınırını değiştirdi');
 const conquered=copy(s);conquered.player.crownConquests=g.campaignTargets(s).map(x=>x.id);assert(g.canAppointGovernor(conquered,foreign));
 const caravan=copy(s);caravan.rng_state=123456789;caravan.caravan={invested:600,dest:foreign,route:[s.player.location_name,foreign],step:0,lost:0,spread:1.2};
 const trade=copy(caravan);trade.player.crownTreaties=Object.fromEntries(g.campaignTargets(s).map(x=>[x.id,{kind:'ticaret',until:12}]));
 g.tickCaravan(caravan);g.tickCaravan(trade);assert(trade.player.money>caravan.player.money,'Ticaret ahdi gerçek kervan gelirini artırmadı');
 const welfare=g.setCrownPolicy(conquered,'refah');assert(g.crownTribute(welfare)<g.crownTribute(conquered));assert.deepEqual(g.setCrownPolicy(welfare,'sefer'),welfare);
 const mobilised=copy(conquered);mobilised.player.crownPolicy='sefer';assert(g.campaignOdds(mobilised)>=g.campaignOdds(conquered));
 const damaged=copy(launched);damaged.player.crownTreaties={bad:{kind:'x',until:999}};damaged.crownCampaign.supplies=NaN;const migrated=g.migrate(damaged);assert(!migrated.player.crownTreaties.bad);assert.equal(migrated.crownCampaign.supplies,65);assert.deepEqual(g.migrate(copy(migrated)),migrated);
 const injured=copy(s.player);injured.health=15;assert.equal(cb.startBattle(injured,g.ENCOUNTERS[0],1).playerHp,15);
 let fight=cb.startBattle(s.player,g.ENCOUNTERS[0],1);fight.breath=0;const before=copy(fight),recovered=cb.stepBattle(fight,s.player,'toparlan');assert(recovered.breath>0);assert(recovered.playerHp<fight.playerHp);assert.deepEqual(fight,before);
 const full=cb.startBattle(s.player,g.ENCOUNTERS[0],1),empty=copy(full);assert.equal(cb.stepBattle(full,s.player,'toparlan'),full);empty.breath=0;const fullOut=cb.stepBattle(full,s.player,'ozel'),emptyOut=cb.stepBattle(empty,s.player,'ozel');assert(emptyOut.enemyHp>=fullOut.enemyHp);assert(emptyOut.log.some(e=>e.k==='war.log.exhausted'));
 for(const stance of ['dengeli','saldirgan','savunmaci']) {let f=cb.startBattle(s.player,g.ENCOUNTERS[0],71);for(let n=0;n<20&&!f.over;n++){f=cb.stepBattle(f,s.player,['hamle','ozel','savustur','toparlan'][n%4],stance);assert(f.breath>=0&&f.breath<=f.breathMax);}}
 for(const lang of ['tr','en','es','pt','ar','ru']) {assert.equal(Object.keys(WAR_METIN[lang]).length,38);for(const [key,value] of Object.entries(WAR_METIN[lang])){assert.equal(tFor(lang,key),value);assert.deepEqual((value.match(/%\d+/g)||[]).sort(),(WAR_METIN.en[key].match(/%\d+/g)||[]).sort(),lang+'/'+key);}}
 console.log('SAVAŞ/YÖNETİM: hedefli kontrol temiz; antlaşma/kilit/süre/ikmal/emir/sınır/siyaset/göç/nefes/6 dil. Hayat simülasyonu yok.');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
