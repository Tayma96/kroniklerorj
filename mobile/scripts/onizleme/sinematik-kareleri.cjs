// kullanım: S=<sp> DIR=<webview> node cine.cjs <onek> <genislik> [dil] [cinsiyet:Erkek|Kadın] [tabiatSira] [ocakSira]
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const S=process.env.S,dir=process.env.DIR;const mime={'.js':'text/javascript','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.json':'application/json','.m4a':'audio/mp4','.css':'text/css'};
const [pre,w,lang='tr',cins='Erkek',ti='0',oi='0']=process.argv.slice(2);
(async()=>{const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(dir,p);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(d);});}).listen(0,()=>r(s));});
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:+w,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(`http://localhost:${srv.address().port}/?screen=/sinematik&lang=${lang}`);
for(let k=0;k<11;k++){await pg.waitForTimeout(k===0?3200:2900);const f=`${S}/${pre}-${String(k).padStart(2,'0')}.png`;await pg.screenshot({path:f});await pg.mouse.click(+w/2,422);}
console.log('bitti',errs.length?'HATA: '+[...new Set(errs)].slice(0,3).join(' | '):'hatasız');await b.close();srv.close();})();
