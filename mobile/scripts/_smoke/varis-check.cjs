const assert=require("node:assert/strict"),path=require("node:path"),esbuild=require("esbuild"),copy=structuredClone;
(async()=>{
  const built=await esbuild.build({stdin:{contents:'export * as g from "./lib/game";export * as n from "./lib/nufus";export * as e from "./lib/events";',resolveDir:path.resolve(__dirname,"../.."),loader:"ts"},bundle:true,platform:"node",format:"cjs",write:false});
  const box={exports:{}};new Function("module","exports","require",built.outputFiles[0].text)(box,box.exports,require);
  const {g,n,e}=box.exports,oldRandom=Math.random;let cases=0;
  try{
    Math.random=()=>.999999;
    function start(){
      const s=g.newGame("Ata","Ocak","erkek");
      Object.assign(s.player,{age:55,base_age:55,money:600,health:100,hunger:100,married:false,mother_dead:true,father_dead:true,children:[],child_ids:{},child_meta:[],properties:[]});
      s.turn=11;s.world.npcYears=0;s.pop={v:1,k:{},n:0};s.relationships={};s.npc_state={};s.player.mother_id=s.player.father_id=s.player.spouse_id=undefined;s.player.sibling_ids=s.player.kin_ids=undefined;
      return s;
    }
    function person(s,name,gender,age,{direct=false,loc=s.player.location_name,prof="demirci",surname}={}){
      const k=n.yeniGelen(s.pop,g.worldYears(s),loc,gender,age,()=>.314159);k.ad=name;k.prof=prof;if(surname)k.sa=surname;
      if(direct){s.player.children.push(name);s.player.child_ids[name]=k.id;s.player.child_meta.push({n:name,born:s.turn-age*12});s.relationships[k.id]=0;}
      n.nufusDegisti(s.pop);return k;
    }
    function childOf(parent,other,child){child.baba=parent.g==="erkek"?parent.id:other.id;child.anne=parent.g==="kadın"?parent.id:other.id;(parent.cocuk??=[]).push(child.id);(other.cocuk??=[]).push(child.id);}

    // Reşit evlat dünya ölümüne katılır; küçük evlat korunur. Kayıt, yas haberi ve bekleyen mektup gerçek sonucu taşır.
    const mortality=start(),adult=person(mortality,"Yetişkin","erkek",100,{direct:true,loc:"Konya"}),minor=person(mortality,"Küçük","kadın",10,{direct:true});
    mortality.player.child_edu={[adult.ad]:{track:"ilim",weeks:20},[minor.ad]:{track:"ilim",weeks:5}};
    mortality.succession={favored:adult.ad,rift:30};mortality.player.child_letters=[{id:adult.id,sent:10,due:13}];
    const frozen=copy(mortality),afterDeath=g.advance(mortality);assert.deepEqual(mortality,frozen);assert.notEqual(afterDeath.pop.k[adult.id].ol,null);assert.equal(afterDeath.pop.k[minor.id].ol,undefined);
    assert.equal(afterDeath.player.child_edu[adult.ad],undefined);assert(afterDeath.player.child_edu[minor.ad]);assert.equal(afterDeath.succession.favored,null);
    const news=g.aileHaberi(afterDeath);assert.equal(news.id,adult.id);assert(news.event.k.startsWith("evlat.died"));assert(afterDeath.player.children.includes(adult.ad));
    const returned=g.advance(afterDeath);assert.equal(returned.player.child_letters,undefined);assert(returned.history.some(x=>x.k==="evlat.letter.returned"));
    assert.deepEqual(g.investInChild(returned,adult.ad,"egitim"),returned);assert.deepEqual(g.setChildEducation(returned,adult.ad,"ilim"),returned);
    const deadOnly=copy(returned);deadOnly.pop.k[minor.id].ol=g.worldYears(deadOnly);const money=deadOnly.player.money;assert.equal(g.addDowry(deadOnly,25).player.money,money);cases++;

    // Sıra kesin: yaşayan doğrudan evlat varken torun görünmez; evlat ölünce yaşayan torun devreye girer.
    const tier=start(),direct=person(tier,"Doğrudan","erkek",40,{direct:true}),mate=person(tier,"Ebeveyn","kadın",38),grand=person(tier,"Torun","kadın",20);
    childOf(direct,mate,grand);tier.player.grandchild_ids=[grand.id];tier.player.grandchildren=[grand.ad];
    assert.deepEqual(g.varisAdayDetaylari(tier).filter(x=>x.uygun).map(x=>x.tur),["evlat"]);
    direct.ol=g.worldYears(tier);assert.deepEqual(g.varisAdayDetaylari(tier).filter(x=>x.uygun).map(x=>x.tur),["torun"]);cases++;

    // Torun kimliğiyle devir: gerçek yaş, soyadı, şehir, meslek, anne-baba, kardeş, eş ve çocuk korunur.
    const estate=start(),deadParent=person(estate,"Boran","erkek",58,{direct:true}),otherParent=person(estate,"Aybike","kadın",56),heir=person(estate,"Gökçe","erkek",31,{loc:"Konya",prof:"demirci",surname:"Yalçın"}),sibling=person(estate,"Duru","kadın",27),spouse=person(estate,"İlbilge","kadın",29),own=person(estate,"Kutlu","erkek",5);
    childOf(deadParent,otherParent,heir);childOf(deadParent,otherParent,sibling);childOf(heir,spouse,own);heir.es=spouse.id;spouse.es=heir.id;heir.ey=spouse.ey=g.worldYears(estate)-6;deadParent.ol=g.worldYears(estate)-1;
    estate.player.grandchild_ids=[heir.id,sibling.id];estate.player.grandchildren=[heir.ad,sibling.ad];estate.player.dead=true;
    estate.realmArmyWar={id:"miras-cephesi",attacker:"demirhan",defender:"aksehir",started:estate.turn-1,lastTick:estate.turn,month:1,a:{troops:800,initial:900,morale:60,supplies:60},b:{troops:700,initial:850,morale:55,supplies:50},service:{side:"a",generation:1,joined:estate.turn-1,actionTurn:estate.turn,rounds:3,enemy:"press"}};
    estate.player.crowned=true;estate.player.crownSeat="demirhan";estate.player.crownConquests=["aksehir"];estate.player.crownAuthority=80;
    estate.player.appointedGov={"Akşehir":{seed:23,gender:"erkek",loyalty:80}};
    estate.warWorld={regions:{},fronts:{},lastTurn:estate.turn,truces:{"aksehir|demirhan":estate.turn+8}};
    const key=g.varisAdayDetaylari(estate).find(x=>x.id===heir.id).key,preview=g.heirPreview(estate,key),before=copy(estate),next=g.continueAsHeir(estate,"esit",key);
    assert.deepEqual(estate,before);assert.equal(next.player.name,"Gökçe Yalçın");assert.equal(next.player.age,31);assert.equal(next.player.location_name,"Konya");assert.equal(next.player.profession,"demirci");
    assert.equal(next.player.father_id,deadParent.id);assert.equal(next.player.father_dead,true);assert.equal(next.player.mother_id,otherParent.id);assert(!next.player.mother_dead);
    assert(next.player.sibling_ids.includes(sibling.id));assert.equal(next.player.spouse_id,spouse.id);assert.equal(next.pop.k[spouse.id].es,"@");
    assert.equal(next.player.child_ids[own.ad],own.id);assert.equal(next.pop.k[own.id].baba,undefined);assert(!next.pop.k[heir.id]);
    assert.equal(next.player.crownSeat,"demirhan");assert.deepEqual(next.player.crownConquests,["aksehir"]);assert.equal(next.player.crownAuthority,64);assert.equal(next.player.appointedGov["Akşehir"].loyalty,70);assert.equal(next.warWorld.truces["aksehir|demirhan"],8);
    assert.equal(next.realmArmyWar.id,"miras-cephesi");assert.equal(next.realmArmyWar.started,-1);assert.equal(next.realmArmyWar.lastTick,0);assert.equal(next.realmArmyWar.service,undefined);
    assert.equal(next.player.money,preview.money);assert.equal(next.player.reputation,preview.rep);assert.equal(next.player.stat_points,preview.points);assert.equal(preview.children,1);
    assert(next.history.some(x=>x.k==="varis.source.torun"));assert(![next.player.mother,next.player.father].includes(estate.player.name));assert.deepEqual(n.nufusDenetle(next.pop,g.worldYears(next)),[]);cases++;

    // Aynı adlı gerçek kişiler adla birleşmez; kimlik anahtarları ayrıdır. Yedek vâris çocuk yatırımını yanlışlıkla alamaz.
    const duplicate=copy(estate),same=person(duplicate,"Gökçe","kadın",22),duplicateParent=duplicate.pop.k[deadParent.id],duplicateOther=duplicate.pop.k[otherParent.id];childOf(duplicateParent,duplicateOther,same);
    duplicate.player.grandchild_ids.push(same.id);duplicate.player.grandchildren.push(same.ad);duplicate.player.child_invests={"Gökçe":["egitim"]};duplicate.player.child_edu={"Gökçe":{track:"ilim",weeks:60}};duplicate.player.child_bond={"Gökçe":100};
    const named=g.varisAdayDetaylari(duplicate).filter(x=>x.uygun&&x.ad==="Gökçe");assert.equal(named.length,2);assert.equal(new Set(named.map(x=>x.key)).size,2);
    const boosted=g.heirPreview(duplicate,named[0].key),plain=copy(duplicate);plain.player.child_invests={};plain.player.child_edu={};plain.player.child_bond={};assert.deepEqual(g.heirPreview(plain,named[0].key),boosted);cases++;

    // Torun yoksa yalnız gerçek kardeş evladı; o da yoksa yeterince yetişmiş aktif çırak aday olur.
    const nieceState=start(),lost=person(nieceState,"Kayıp","erkek",30,{direct:true}),uncle=person(nieceState,"Kardeş","erkek",45),niece=person(nieceState,"Yeğen","kadın",21);lost.ol=g.worldYears(nieceState);niece.baba=uncle.id;uncle.cocuk=[niece.id];nieceState.player.sibling_ids=[uncle.id];
    let options=g.varisAdayDetaylari(nieceState).filter(x=>x.uygun);assert.deepEqual(options.map(x=>x.tur),["yegen"]);assert.equal(options[0].id,niece.id);cases++;
    const apprenticeState=start(),apprentice=person(apprenticeState,"Çırak","erkek",24),decoy=person(apprenticeState,"Ustaİşaretli","kadın",30);decoy.usta=true;
    apprenticeState.player.apprentice={id:apprentice.id,name:apprentice.ad,months:11,skill:"trade"};assert.equal(g.varisAdaylari(apprenticeState).length,0);
    apprenticeState.player.apprentice.months=12;options=g.varisAdayDetaylari(apprenticeState).filter(x=>x.uygun);assert.deepEqual(options.map(x=>x.tur),["cirak"]);assert.equal(options[0].id,apprentice.id);
    apprenticeState.player.dead=true;const apprenticeNext=g.continueAsHeir(apprenticeState,"esit",options[0].key);assert(apprenticeNext.history.some(x=>x.k==="varis.source.cirak"));assert(!apprenticeNext.player.kin_ids?.includes(decoy.id));cases++;

    // Yaşayan evlat/torun kalmadığında güncel aile kartları hayalet kişileri kullanmaz.
    const ghost=copy(mortality);ghost.pop.k[adult.id].ol=g.worldYears(ghost);ghost.pop.k[minor.id].ol=g.worldYears(ghost);ghost.player.age=60;
    assert.equal(e.DILEMMAS.find(x=>x.id==="evlat_dert").when(ghost.player,ghost),false);assert.equal(e.SON_YAS.find(x=>x.id==="son_olmeden").when(ghost.player,ghost),false);assert.equal(e.DILEMMAS.find(x=>x.id==="yasli_torun").when(ghost.player,ghost),false);cases++;

    console.log("YEDEK VÂRİS: TEMİZ · "+cases+" küme · yetişkin evlat ölümü/küçük koruması · evlat→torun→yeğen→çırak sırası · gerçek kimlik/aile/şehir/meslek · önizleme paritesi · hayalet eylem yok");
  }finally{Math.random=oldRandom;}
})().catch(err=>{console.error(err.stack);process.exitCode=1;});
