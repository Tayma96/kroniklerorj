// Kontrollü saat ve oynatıcıyla yarış, temizleme ve sınır denetimi; ses kalitesini cihaz testi kanıtlar.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), esbuild = require('esbuild');
const mobile = path.resolve(__dirname, '../..');
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function clock() {
  let now = 0, id = 0; const tasks = new Map();
  const later = (fn, ms, repeat = false) => { const key = ++id; tasks.set(key, { fn, at: now + ms, ms, repeat }); return key; };
  return { now: () => now, later, cancel: key => tasks.delete(key), repeat: (fn, ms) => later(fn, ms, true), stopRepeat: key => tasks.delete(key),
    tasks, step(ms) { const end = now + ms; for (;;) { const next = [...tasks.entries()].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0]; if (!next) break; const [key,t] = next; now = t.at; if (t.repeat) t.at += t.ms; else tasks.delete(key); t.fn(); } now = end; } };
}
function player(id, deferred = false) {
  let resolve, reject; const seek = new Promise((a,b) => { resolve = a; reject = b; }); if (!deferred) resolve();
  return { id, volume: 0, loop: false, played: 0, removed: 0, paused: 0, listeners: 0,
    play() { assert.equal(this.removed, 0); this.played++; }, pause() { this.paused++; }, remove() { this.removed++; assert.equal(this.removed, 1); },
    seekTo: () => seek, resolve, reject,
    onEnd(fn) { this.end = fn; this.listeners++; return () => { this.listeners--; }; },
    addListener(_, fn) { const off = this.onEnd(() => fn({ didJustFinish: true })); return { remove: off }; },
  };
}
async function bundle(entry, context) {
  const result = await esbuild.build({ entryPoints: [path.join(mobile, entry)], bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{ name: 'sinama-baglam', setup(build) {
      for (const [filter, name] of [[/^expo-audio$/, 'audio'], [/^react-native$/, 'rn'], [/^@react-native-async-storage\/async-storage$/, 'storage'], [/^\.\/perf$/, 'perf']]) build.onResolve({ filter }, () => ({ path: name, namespace: 'sinama' }));
      build.onLoad({ filter: /.*/, namespace: 'sinama' }, args => ({ contents: `module.exports = context.${args.path}`, loader: 'js' }));
      build.onLoad({ filter: /\.(m4a|jpg)$/ }, args => { assert(fs.existsSync(args.path)); return { contents: `module.exports = ${JSON.stringify(args.path)}`, loader: 'js' }; });
    } }],
  });
  const box = { exports: {} }, timer = context.clock || clock();
  new Function('module','exports','require','context','setTimeout','clearTimeout','setInterval','clearInterval','Date', result.outputFiles[0].text)(box,box.exports,require,context,timer.later,timer.cancel,timer.repeat,timer.stopRepeat,{now:timer.now});
  return box.exports;
}
(async () => {
  const { SesMikser } = await bundle('lib/ses-mikser.ts', {});
  const timer = clock(), made = []; let defer = false;
  const mix = new SesMikser(id => { const p = player(id, defer); made.push(p); return p; }, timer);
  mix.setPlan({ music: 'a', ambiance: 'wind' }); mix.setPreferences({ music:true, ambiance:true, effects:true }); assert.equal(made.length,0);
  mix.setActive(true); timer.step(850); assert.equal(mix.snapshot().loops,2);
  assert(Math.abs(made[0].volume-.23)<1e-9); assert(Math.abs(made[1].volume-.12)<1e-9);
  for (let i=0;i<200;i++) { mix.setPlan({music:'m'+i,ambiance:'w'+i}); assert(mix.snapshot().loops<=4); assert(made.filter(p=>!p.removed).length<=4); timer.step(3); }
  timer.step(850); assert.equal(mix.snapshot().loops,2); assert.equal(made.filter(p=>!p.removed).length,2);
  defer=true; mix.effect('race',1000); const delayed=made.at(-1); mix.setPreferences({music:true,ambiance:true,effects:false}); delayed.resolve(); await flush(); assert.equal(delayed.played,0); assert.equal(delayed.removed,1);
  mix.setPreferences({music:true,ambiance:true,effects:true}); timer.step(150); mix.effect('background',1000); const bg=made.at(-1); mix.setActive(false); bg.resolve(); await flush(); assert.equal(bg.played,0); assert.equal(mix.snapshot().loops,0); assert.equal(timer.tasks.size,0);
  mix.setActive(true); defer=false;
  for(let i=0;i<20;i++) mix.effect('fx'+i,1000); await flush(); assert.equal(mix.snapshot().voices,4); assert(made.filter(p=>!p.removed).length<=6);
  timer.step(850); assert(Math.abs(made.filter(p=>!p.removed && p.loop)[0].volume-.085)<1e-9);
  timer.step(1000); assert.equal(mix.snapshot().voices,0); timer.step(850); assert(Math.abs(made.filter(p=>!p.removed && p.loop)[0].volume-.23)<1e-9);
  // Anlatım: efekt kapalıyken de müzikle çalar, müziği kısar; bütün ses kapanınca susar.
  mix.setPreferences({music:true,ambiance:true,effects:false}); timer.step(150); mix.effect('vo',1000,true,'narration'); await flush();
  assert.equal(mix.snapshot().voices,1); assert.equal(made.at(-1).volume,1); timer.step(850); assert(Math.abs(made.filter(p=>!p.removed && p.loop)[0].volume-.085)<1e-9);
  mix.effect('fx-kapali',1000); assert.equal(mix.snapshot().voices,1);
  mix.setPreferences({music:false,ambiance:true,effects:false}); assert.equal(mix.snapshot().voices,0);
  mix.dispose(); assert(made.every(p=>p.removed===1 && p.listeners===0)); assert.equal(timer.tasks.size,0);
  const failures=[]; const bad=new SesMikser(id=>{const p=player(id); p.play=()=>{throw new Error('native');}; failures.push(p); return p;},clock());
  bad.setPreferences({music:true,ambiance:false,effects:true}); bad.setPlan({music:'bad',ambiance:null}); bad.setActive(true); assert.equal(failures[0].removed,1); bad.effect('badfx',100); await flush(); assert.equal(bad.snapshot().voices,0); assert(failures.every(p=>p.removed===1)); bad.dispose();
  // Gerçek yönetici: geç ayar yükü, katman önceliği, yeniden mount, arka plan ve temizleme.
  const native=[], stateListeners=new Set(), writes=[], timing=clock(); let load;
  const ctx={clock:timing, audio:{createAudioPlayer: id=>{const p=player(id); native.push(p);return p;},setAudioModeAsync:async mode=>{assert.equal(mode.shouldPlayInBackground,false);assert.equal(mode.allowsRecording,false);}},
    rn:{AppState:{currentState:'active',addEventListener:(_,fn)=>{stateListeners.add(fn);return{remove:()=>stateListeners.delete(fn)};}}},
    storage:{multiGet:()=>new Promise(fn=>{load=fn;}),setItem:async(k,v)=>{writes.push([k,v]);}},perf:{isReduceMotion:()=>false}};
  const audio=await bundle('lib/sound.ts',ctx), stop=audio.initializeAudio();
  assert.equal(native.length,0); await audio.setMusicEnabled(false); await audio.setSoundEnabled(true);
  load([['kronikler_music_v1','1'],['kronikler_sound_v1','0'],['kronikler_ambiance_v1','0']]); await flush(); assert.equal(audio.isMusicEnabled(),false); assert.equal(audio.isSoundEnabled(),true); assert.equal(native.length,0);
  audio.playTap(); await flush(); assert.equal(native.length,1); assert.equal(native[0].played,1); native[0].end(); assert.equal(native[0].removed,1);
  await audio.setMusicEnabled(true); await audio.setAmbianceEnabled(true); timing.step(850); assert.equal(native.filter(p=>!p.removed).length,2);
  const a=audio.pushSoundscape({music:'kitlik',ambiance:'kis_ruzgar'}), b=audio.pushSoundscape({music:'dugun',ambiance:'carsi'}); timing.step(850);
  assert(native.filter(p=>!p.removed && p.loop).some(p=>p.id.endsWith('muzik/dugun.m4a')));
  audio.setSoundscape({music:'miras',ambiance:'ocak'}); a(); timing.step(850); assert(native.filter(p=>!p.removed).some(p=>p.id.endsWith('muzik/dugun.m4a')));
  b(); timing.step(850); assert(native.filter(p=>!p.removed).some(p=>p.id.endsWith('muzik/miras.m4a')));
  ctx.rn.AppState.currentState='background'; for(const fn of stateListeners) fn(); assert.equal(native.filter(p=>!p.removed).length,0); assert.equal(timing.tasks.size,0);
  ctx.rn.AppState.currentState='active'; for(const fn of stateListeners) fn(); timing.step(850); assert.equal(native.filter(p=>!p.removed).length,2);
  stop(); assert.equal(stateListeners.size,0); assert.equal(timing.tasks.size,0); assert(native.every(p=>p.removed===1 && p.listeners===0));
  const stop2=audio.initializeAudio(); stop2(); load([]); await flush(); assert.equal(native.filter(p=>!p.removed).length,0); assert.equal(stateListeners.size,0);
  const beforeFailure=native.length; ctx.audio.setAudioModeAsync=async()=>{throw new Error('mode');}; ctx.storage.multiGet=async()=>[['kronikler_music_v1','1'],['kronikler_sound_v1','1']];
  const failedAudio=await bundle('lib/sound.ts',ctx), stopFailed=failedAudio.initializeAudio(); await flush(); failedAudio.playTap(); await flush(); assert.equal(native.length,beforeFailure); stopFailed(); assert.equal(stateListeners.size,0);
  ctx.perf.isReduceMotion=()=>true; ctx.audio.setAudioModeAsync=async()=>{}; ctx.storage.multiGet=async()=>[];
  const low=await bundle('lib/sound.ts',ctx), stopLow=low.initializeAudio(); await flush(); assert.equal(low.isMusicEnabled(),false); assert.equal(low.isAmbianceEnabled(),false); assert.equal(native.length,beforeFailure); assert(writes.some(([k,v])=>k==='kronikler_music_v1' && v==='0')); await low.setMusicEnabled(true); await flush(); assert.equal(low.isMusicEnabled(),true); stopLow(); assert(native.every(p=>p.removed===1));
  const plans=await bundle('lib/ses-plan.ts',{}), bctx={path:'/oyun',age:30,season:'Kış'};
  assert.equal(plans.ekranSes(bctx).ambiance,'kis_ruzgar'); assert.equal(plans.ekranSes({...bctx,dead:true,path:'/oyun/pazar'}).music,'cenaze');
  assert.equal(plans.ekranSes({...bctx,path:'/oyun/pazar'}).music,'carsi');
  for(const [age,music] of [[7,'cocukluk'],[13,'genclik'],[18,'ciraklik'],[25,'ustalik'],[40,'olgunluk'],[60,'yaslilik']]) assert.equal(plans.ekranSes({...bctx,age}).music,music);
  assert.equal(plans.ekranSes({...bctx,path:'/oyun/mulkler'}).ambiance,'ocak'); assert.equal(plans.ekranSes({...bctx,path:'/oyun/mulkler',propertyTypes:['degirmen']}).ambiance,'degirmen');
  assert.equal(plans.olayEfekti([{k:'yanki.comert.0'},{k:'hatir.kin.ad.1'}]),'cip_kin'); assert.equal(plans.olayEfekti([{k:'dunya.foo'}]),null);
  const catalog=await bundle('lib/ses-katalog.ts',{}); assert.equal(Object.keys(catalog.MUZIK).length,21);assert.equal(Object.keys(catalog.ORTAM).length,15);assert.equal(Object.keys(catalog.EFEKT).length,27);
  for(const key of Object.keys(catalog.EFEKT)) assert(catalog.EFEKT_SURE[key]>0);
  process.stdout.write('SES: TEMİZ · 200 geçiş · ilk efekt 17→1 oynatıcı · sürekli 2 döngü, geçişte ≤4, efekt ≤4 · yarış/katman/temizleme · 63 kayıt\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
