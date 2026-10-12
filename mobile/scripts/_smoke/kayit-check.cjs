const assert=require('node:assert/strict'),esbuild=require('esbuild'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const state=n=>({turn:n,player:{name:'Alp',money:n,age:7},schema:1,old_field:'korunur'});
const key='kronikler_save_v1',bak=key+'_bak';
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function clock(){let id=0;const jobs=new Map();return{set(fn){jobs.set(++id,fn);return id;},clear(i){jobs.delete(i);},run(){const list=[...jobs.values()];jobs.clear();list.forEach(fn=>fn());},count:()=>jobs.size};}
function storage(initial={}){const data=new Map(Object.entries(initial));const calls=[];let active=0,max=0,gate=null,fail=null;
const op=async(type,k,value)=>{active++;max=Math.max(max,active);calls.push({type,key:k});try{if(gate&&gate.type===type&&gate.key===k){const g=gate;gate=null;g.started();await g.wait;}if(fail&&fail.type===type&&fail.key===k){fail=null;throw Error('disk');}if(type==='get')return data.get(k)??null;if(type==='set')data.set(k,value);if(type==='remove')data.delete(k);}finally{active--;}};
return{data,calls,getItem:k=>op('get',k),setItem:(k,v)=>op('set',k,v),removeItem:k=>op('remove',k),max:()=>max,fail(type,k){fail={type,key:k};},hold(type,k){let release,started;const waiting=new Promise(r=>started=r),wait=new Promise(r=>release=r);gate={type,key:k,wait,started};return{waiting,release};}};}
(async()=>{
const build=await esbuild.build({entryPoints:[path.join(root,'lib/kayit-kuyrugu.ts')],bundle:true,format:'cjs',platform:'node',write:false});const box={module:{exports:{}},setTimeout,clearTimeout};vm.runInNewContext(build.outputFiles[0].text,box);const {kayitKuyrugu,kayitGovdesi}=box.module.exports;let cases=0;
{
const d=storage({[key]:JSON.stringify(state(0))}),c=clock(),q=kayitKuyrugu(d,key,c);for(let i=1;i<=500;i++)q.schedule(state(i));assert.equal(c.count(),1);assert.equal(d.calls.length,0);c.run();await q.idle();assert.equal(JSON.parse(d.data.get(key)).turn,500);assert.equal(d.calls.filter(x=>x.type==='set'&&x.key===key).length,1);assert.equal(JSON.parse(d.data.get(bak)).turn,0);assert.equal(q.status(),'idle');cases++;
}
{
const d=storage({[key]:JSON.stringify(state(0))}),q=kayitKuyrugu(d,key,clock()),hold=d.hold('set',key);const first=q.saveNow(state(1));await hold.waiting;const writes=[q.saveNow(state(2)),q.saveNow(state(3))];hold.release();assert((await first));assert((await Promise.all(writes)).every(Boolean));assert.equal(d.max(),1);assert.equal(JSON.parse(d.data.get(key)).turn,3);assert.equal(JSON.parse(d.data.get(bak)).turn,2);cases++;
}
for(const stage of ['get','set']){
const d=storage({[key]:JSON.stringify(state(0))}),c=clock(),q=kayitKuyrugu(d,key,c),hold=d.hold(stage,key);const old=q.saveNow(state(1));await hold.waiting;const queued=q.saveNow(state(2));q.schedule(state(3));const restored=q.replace(state(99));hold.release();assert.equal(await old,false);assert.equal(await queued,false);assert.equal(await restored,true);c.run();await q.idle();assert.equal(JSON.parse(d.data.get(key)).turn,99);assert.equal(q.snapshot().turn,99);assert.equal(d.max(),1);assert.equal(c.count(),0);cases++;
}
{
const d=storage({[key]:JSON.stringify(state(0))}),c=clock(),q=kayitKuyrugu(d,key,c);q.remember(state(0));q.schedule(state(5));const version=q.version();assert.equal(await q.replace(state(10)),true);assert(q.version()>version);assert.equal(JSON.parse(d.data.get(bak)).turn,5);c.run();await q.idle();assert.equal(JSON.parse(d.data.get(key)).turn,10);cases++;
}
{
const d=storage({[key]:JSON.stringify(state(0)),[bak]:JSON.stringify(state(0))}),c=clock(),q=kayitKuyrugu(d,key,c),hold=d.hold('set',key);const writing=q.saveNow(state(1));await hold.waiting;q.schedule(state(2));const clear=q.clear();hold.release();assert.equal(await writing,false);assert.equal(await clear,true);c.run();await q.idle();assert(!d.data.has(key)&&!d.data.has(bak));assert.equal(q.snapshot(),null);cases++;
}
{
const old=JSON.stringify(state(1)),d=storage({[key]:'bozuk',[bak]:old}),q=kayitKuyrugu(d,key,clock());assert.equal(await q.saveNow(state(2)),true);assert.equal(d.data.get(bak),old);assert.equal(JSON.parse(d.data.get(key)).turn,2);cases++;
}
for(const failedKey of [key,bak]){
const old=JSON.stringify(state(1)),d=storage({[key]:old,[bak]:old}),q=kayitKuyrugu(d,key,clock());q.remember(state(1));d.fail('set',failedKey);assert.equal(await q.replace(state(10)),false);assert.equal(d.data.get(key),old);assert.equal(q.status(),'error');assert.equal(q.snapshot().turn,1);assert.equal(await q.replace(state(10)),true);assert.equal(q.status(),'idle');assert.equal(JSON.parse(d.data.get(key)).turn,10);cases++;
}
{
const d=storage({[key]:JSON.stringify(state(1)),[bak]:JSON.stringify(state(0))}),q=kayitKuyrugu(d,key,clock());q.remember(state(1));d.fail('remove',bak);assert.equal(await q.clear(),false);assert(d.data.has(key)&&d.data.has(bak));assert.equal(q.snapshot().turn,1);assert.equal(q.status(),'error');cases++;
}
{
const d=storage({[key]:JSON.stringify(state(1))}),q=kayitKuyrugu(d,key,clock()),hold=d.hold('remove',bak);const clearing=q.clear();await hold.waiting;const replacing=q.replace(state(7));hold.release();assert.equal(await clearing,false);assert.equal(await replacing,true);assert.equal(JSON.parse(d.data.get(key)).turn,7);assert.equal(q.snapshot().turn,7);cases++;
}
{
const d=storage(),q=kayitKuyrugu(d,key,clock());for(const bad of [null,[],{player:[]},{player:{},turn:-1},{player:{},turn:'bad'}])assert.equal(await q.saveNow(bad),false);assert.equal(d.calls.length,0);const old={player:{name:'Eski'}};assert(kayitGovdesi(JSON.stringify(old)));assert.equal(await q.saveNow(old),true);assert.equal(JSON.parse(d.data.get(key)).player.name,'Eski');cases++;
}
{
const d=storage(),q=kayitKuyrugu(d,key,clock());let notices=0;const stop=q.subscribe(()=>notices++);q.schedule(state(1));await q.flush();assert.equal(notices,3);stop();await q.replace(state(2));assert.equal(notices,3);cases++;
}
console.log('KAYIT: TEMİZ · '+cases+' senaryo · 500 birleştirilmiş hamle · eşzamanlı depo işlemi en çok 1');
})().catch(e=>{console.error(e);process.exitCode=1;});
