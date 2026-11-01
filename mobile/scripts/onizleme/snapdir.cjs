// kullanım: node snap.cjs <cikti-oneki> <genislik> "screen=home&state=decision" ...
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const S=process.env.S,dir=process.env.DIR||S+'/webview/now';const mime={'.js':'text/javascript','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.m4a':'audio/mp4'};
const [pre,w,...qs]=process.argv.slice(2);
(async()=>{const srv=await new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(dir,p);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(d)})}).listen(0,()=>r(s))});
const port=srv.address().port;const b=await chromium.launch();
for(const q of qs){const full=q.includes('full=1');const pg=await b.newPage({viewport:{width:+w,height:844}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
await pg.goto(`http://localhost:${port}/?${q}`);await pg.waitForTimeout(2200);
if(full){const h=await pg.evaluate(()=>{const els=[...document.querySelectorAll('div')].filter(d=>d.scrollHeight>d.clientHeight+20&&getComputedStyle(d).overflowY!=='visible');const el=els.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];return el?el.scrollHeight:844});await pg.setViewportSize({width:+w,height:Math.min(h+120,5000)});await pg.waitForTimeout(800);}
const name=`${S}/${pre}-${q.replace(/[^a-z0-9]+/gi,'_')}.png`;await pg.screenshot({path:name});console.log(name.split('/').pop(),errs.length?'HATA: '+[...new Set(errs)].slice(0,3).join(' | '):'');await pg.close();}
await b.close();srv.close();})();
