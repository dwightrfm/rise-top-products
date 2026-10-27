/* Team RISE deck editor. Loads only on the ?edit link. Works on a computer, tablet, or phone.
   Anyone: change words and pictures. Edits save on this device by themselves. "My copy" downloads a file of your version.
   Team key holders: "Publish to team" writes index.html back to GitHub, so the live link changes for everyone. */
(()=>{
window.EDITOR=true;
const RP=(document.querySelector('meta[name=repo]')||{content:'/'}).content.split('/');
const REPO={owner:RP[0],repo:RP[1],branch:'main'};
const LOCAL=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const API=(LOCAL&&new URLSearchParams(location.search).get('api'))||'https://api.github.com';
const KEY='rise_edit_key:'+REPO.repo,DRAFT='rise_draft:'+REPO.repo;
const TOUCH=matchMedia('(pointer: coarse)').matches||innerWidth<900;
if(TOUCH)document.body.classList.add('touch');

/* ---------- styles ---------- */
const css=document.createElement('style');css.textContent=`
#ebar{position:fixed;left:0;right:0;top:0;height:56px;z-index:1000;display:flex;align-items:center;gap:8px;padding:0 12px;background:rgba(6,14,18,.94);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.12);font:500 14px/1.2 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;color:#eef6f7;overflow-x:auto;scrollbar-width:none}
#ebar::-webkit-scrollbar{display:none}
#ebar .tag{display:flex;align-items:center;gap:8px;font-weight:700;color:#ffc46b;white-space:nowrap}
#ebar .tag i{width:9px;height:9px;border-radius:50%;background:#ffc46b;box-shadow:0 0 10px #ffc46b;flex:none}
#ebar .tag small{font-weight:500;color:rgba(238,246,247,.55);font-size:12px}
#ebar .hint{color:rgba(238,246,247,.62);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ebar button,.emod button,#eback{font:600 14px/1 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;border:0;border-radius:10px;padding:10px 13px;cursor:pointer;background:rgba(255,255,255,.1);color:#eef6f7;white-space:nowrap;flex:none}
#ebar button:hover,.emod button:hover{background:rgba(255,255,255,.18)}
#ebar .nav{display:flex;align-items:center;gap:4px;flex:none}
#ebar .nav span{min-width:56px;text-align:center;font-variant-numeric:tabular-nums}
#ebar #epub,.emod .go{background:#46d9d2;color:#032326}
#ebar #epub:hover,.emod .go:hover{background:#6ae6e0}
#ebar #epub[disabled]{background:rgba(255,255,255,.1);color:rgba(238,246,247,.4);cursor:default}
@media (max-width:1100px){#ebar .hint{display:none}}
@media (max-width:700px){#ebar{gap:6px;padding:0 8px}#ebar button{padding:9px 10px;font-size:13px}#ebar .tag b{display:none}}
body.presenting #ebar{display:none}
body:not(.presenting) #hud .tl,body:not(.presenting) #hud .tr{display:none}
#eback{position:fixed;left:12px;top:12px;z-index:1000;display:none;background:rgba(10,20,26,.6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);opacity:.75}
body.presenting #eback{display:block}
body.editing [data-img],body.editing .qr{outline:3px dashed rgba(255,196,107,.85);outline-offset:4px;cursor:pointer}
body.editing .qr [data-img]{outline:0}
body.editing.touch [data-e]{outline:1px dashed rgba(255,255,255,.4);outline-offset:6px;border-radius:6px;cursor:pointer}
body.editing [data-e]:empty::before{content:"(empty)";opacity:.4}
.eveil{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px}
.emod{background:#0b1a20;color:#eef6f7;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:22px;width:min(580px,100%);max-height:calc(100dvh - 24px);overflow:auto;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.emod h3{margin:0 0 8px;font-size:20px}
.emod p{margin:0 0 14px;color:rgba(238,246,247,.75)}
.emod label{display:block;font-size:13px;font-weight:600;color:rgba(238,246,247,.7);margin:10px 0 4px}
.emod input,.emod textarea{width:100%;font:16px/1.4 -apple-system,BlinkMacSystemFont,"Inter",sans-serif;background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:10px;padding:10px}
.emod textarea{resize:vertical;display:block}
.emod .fld{margin-bottom:10px}
.emod .fld.hot textarea{border-color:#ffc46b;box-shadow:0 0 0 2px rgba(255,196,107,.35)}
.emod .row{display:flex;gap:10px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap;position:sticky;bottom:-22px;background:#0b1a20;padding:10px 0 2px}
.emod .err{color:#ff8a7a;font-weight:600}
.emod ol{padding-left:20px;margin:0 0 10px}.emod li{margin:5px 0}
.emod .big{display:block;width:100%;text-align:left;padding:14px 16px;margin:8px 0;line-height:1.35}
.emod .big small{display:block;font-weight:500;color:rgba(238,246,247,.65);margin-top:4px}
`;document.head.appendChild(css);

/* ---------- state ---------- */
const orig=new Map(),imgs=new Map();let lastPut=null,saveFailed=false;
const revOf=html=>(html.match(/<meta name="rev" content="(\d+)"/)||[])[1]||'0';
let myRev=($('meta[name=rev]')||{content:'0'}).content;
const val=el=>el.hasAttribute('data-count')?(el.dataset.prefix||'')+el.dataset.count+(el.dataset.suffix||''):(el.classList.contains('split')&&!editing&&el.dataset.src!=null?el.dataset.src:el.innerHTML);
function capture(){orig.clear();$$('[data-e]').forEach(el=>orig.set(el.dataset.e,val(el)))}
function changes(){let n=0;$$('[data-e]').forEach(el=>{if(orig.get(el.dataset.e)!==val(el))n++});return n+imgs.size}
function refresh(){const n=changes(),b=$('#epub');b.disabled=!n;b.textContent=n?`Publish to team (${n})`:'Publish to team';$('#enum').textContent=`${idx+1} / ${N}`}
const status=t=>{$('#estat').textContent=t};

/* ---------- bar ---------- */
const bar=document.createElement('div');bar.id='ebar';bar.innerHTML=`
<div class="tag"><i></i><b>Editing</b><small id="estat"></small></div>
<div class="hint">${TOUCH?'Tap any words to change them. Tap a picture to swap it.':'Click any words to change them. Click a picture to swap it.'}</div>
<div class="nav"><button id="eprev" title="Back">‹</button><span id="enum"></span><button id="enext" title="Next">›</button></div>
<button id="ewords">Words</button><button id="eall">All slides</button><button id="eview">Preview</button><button id="eshow">Present</button><button id="emine">My copy</button><button id="ehelp">Help</button><button id="epub" disabled>Publish to team</button>`;
document.body.appendChild(bar);window.EDITBAR=56;fit();
const back=document.createElement('button');back.id='eback';back.textContent='✎ Back to editing';document.body.appendChild(back);
$('#eprev').onclick=()=>{prev();refresh()};$('#enext').onclick=()=>{next();refresh()};
$('#eall').onclick=()=>toggleOverview();
const baseGo=go;window.go=n=>{baseGo(n);refresh()};
const baseToggle=toggleEdit;window.toggleEdit=function(){baseToggle();$('#eview').textContent=editing?'Preview':'Keep editing';if(editing){fillCounts();if(TOUCH)leafs().forEach(el=>el.removeAttribute('contenteditable'))}refresh()};
$('#eview').onclick=()=>toggleEdit();
$('#ewords').onclick=()=>wordsPanel();$('#eshow').onclick=()=>present(true);back.onclick=()=>present(false);
$('#emine').onclick=minePanel;$('#ehelp').onclick=helpPanel;$('#epub').onclick=publish;
let st;const later=()=>{clearTimeout(st);st=setTimeout(()=>{refresh();saveDraft()},400)};
addEventListener('keyup',later);addEventListener('click',()=>setTimeout(refresh));
addEventListener('input',e=>{const el=e.target.closest&&e.target.closest('[data-count]');if(el)setCount(el,el.textContent);later()});
addEventListener('beforeunload',e=>{if(saveFailed&&changes()){e.preventDefault();e.returnValue=''}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('presenting'))present(false)});

/* typing: plain text only, Enter makes a line break */
document.addEventListener('paste',e=>{if(e.target.closest&&e.target.closest('[contenteditable]')){e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement&&document.activeElement.isContentEditable){e.preventDefault();document.execCommand(document.activeElement.hasAttribute('data-count')?'insertText':'insertLineBreak',false,'')}},true);

/* counters: show the real number while editing, read it back as prefix + number + suffix */
function fillCounts(){$$('[data-count]').forEach(el=>el.textContent=(el.dataset.prefix||'')+el.dataset.count+(el.dataset.suffix||''))}
function setCount(el,t){const m=t.trim().match(/^(\D*?)(\d+(?:\.\d+)?)(.*)$/);if(!m)return;el.dataset.count=m[2];if(m[1])el.dataset.prefix=m[1];else delete el.dataset.prefix;el.dataset.suffix=m[3]}

/* ---------- present ---------- */
function present(on){document.body.classList.toggle('presenting',on);if(on&&editing)toggleEdit();if(!on&&!editing)toggleEdit();window.EDITBAR=on?0:56;fit();
  if(on){const el=document.documentElement;(el.requestFullscreen||el.webkitRequestFullscreen||(()=>{})).call(el)}}

/* ---------- modal helper ---------- */
function modal(html){const v=document.createElement('div');v.className='eveil';v.innerHTML=`<div class="emod">${html}</div>`;document.body.appendChild(v);
  const close=()=>v.remove();v.addEventListener('click',e=>{if(e.target===v)close()});v.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')close()});return{el:v.firstChild,close}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- words as text boxes (the easy way on a phone) ---------- */
const LEAD=/^\s*<span[^>]*><\/span>\s*/;
function toText(h){const s=h.replace(LEAD,'').replace(/\s*\n\s*/g,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi,'*$1*').replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi,'**$1**').replace(/<[^>]+>/g,'');
  const t=document.createElement('textarea');t.innerHTML=s;return t.value.replace(/[ \t]+/g,' ').replace(/ ?\n ?/g,'\n').trim()}
function fromText(t){return esc(t.trim()).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\n/g,'<br>')}
const cur=el=>el.hasAttribute('data-count')?(el.dataset.prefix||'')+el.dataset.count+(el.dataset.suffix||''):el.innerHTML;
function setField(el,text){if(el.hasAttribute('data-count')){el.textContent=text.trim();setCount(el,text)}else{const lead=(el.innerHTML.match(LEAD)||[''])[0];el.innerHTML=lead+fromText(text)}}
function wordsPanel(focus){if(overview)toggleOverview(false);if(!editing)toggleEdit();const els=$$('[data-e]',slides[idx]);
  const m=modal(`<h3>Words on slide ${idx+1}</h3><p>Change any box, then press Done. Put <b>*stars*</b> around a word to make it the gold accent word. <b>**Two stars**</b> makes it bold. A new line in the box is a new line on the slide.</p><div id="flds"></div><div class="row"><button id="wno">Cancel</button><button class="go" id="wok">Done</button></div>`);
  const box=m.el.querySelector('#flds');let hot=null;
  els.forEach(el=>{const d=document.createElement('div');d.className='fld';const t=document.createElement('textarea');t.value=toText(cur(el));t.dataset.id=el.dataset.e;
    t.rows=Math.min(6,Math.max(1,t.value.split('\n').reduce((a,l)=>a+Math.max(1,Math.ceil(l.length/42)),0)));d.appendChild(t);box.appendChild(d);if(el.dataset.e===focus){d.classList.add('hot');hot=t}});
  m.el.querySelector('#wno').onclick=m.close;
  m.el.querySelector('#wok').onclick=()=>{$$('textarea',box).forEach(t=>{const el=$(`[data-e="${CSS.escape(t.dataset.id)}"]`,slides[idx]);if(el&&t.value!==toText(cur(el)))setField(el,t.value)});m.close();refresh();saveDraft()};
  setTimeout(()=>{if(hot){hot.scrollIntoView({block:'center'});hot.focus()}},40)}

/* ---------- taps and clicks on the slide ---------- */
stage.addEventListener('click',e=>{if(!editing||overview)return;const qr=e.target.closest('.qr');const host=(qr&&qr.querySelector('[data-img]'))||e.target.closest('[data-img]');
  if(host){e.preventDefault();e.stopPropagation();picMenu(host,!!qr);return}
  const w=e.target.closest('[data-e]');if(w&&TOUCH){e.preventDefault();e.stopPropagation();wordsPanel(w.dataset.e)}},true);

/* ---------- pictures ---------- */
function picMenu(el,isQR){const m=modal(`<h3>Change this picture</h3>
  <p>${isQR?'Make a new QR code from a link, or upload a picture.':'Pick a new picture. It replaces this one in the same spot.'}</p>
  ${isQR?`<label>Link the QR code should open</label><input id="qurl" placeholder="https://..." inputmode="url"><div class="row" style="justify-content:flex-start;margin-top:6px;position:static"><button class="go" id="qmake">Make QR code</button></div><p id="qerr" class="err"></p><label>Or</label>`:''}
  <div class="row" style="justify-content:flex-start;margin-top:6px;position:static"><button id="pup">Upload a picture</button><button id="pcancel">Cancel</button></div>`);
  const fi=document.createElement('input');fi.type='file';fi.accept='image/*';
  m.el.querySelector('#pup').onclick=()=>fi.click();m.el.querySelector('#pcancel').onclick=m.close;
  fi.onchange=async()=>{if(!fi.files[0])return;try{await setPic(el,await shrink(fi.files[0],isQR));m.close()}catch(err){alert('That file could not be opened as a picture.')}};
  if(isQR){const go=async()=>{const u=m.el.querySelector('#qurl').value.trim();if(!/^https?:\/\/\S+\.\S+/.test(u)){m.el.querySelector('#qerr').textContent='Paste the full link, starting with https://';return}
      try{await setPic(el,await makeQR(u));m.close();toast('New QR code in place. Scan it to test it.')}catch(err){m.el.querySelector('#qerr').textContent='Could not make the QR code. Check your internet and try again.'}};
    m.el.querySelector('#qmake').onclick=go;m.el.querySelector('#qurl').addEventListener('keydown',e=>{if(e.key==='Enter')go()})}}
async function shrink(file,png){const bmp=await createImageBitmap(file);const k=Math.min(1,1600/Math.max(bmp.width,bmp.height));const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  let b=png?null:await new Promise(r=>c.toBlob(r,'image/webp',.86));if(!b||b.type!=='image/webp')b=await new Promise(r=>c.toBlob(r,png?'image/png':'image/jpeg',.86));return b}
function loadQRLib(){return window.qrcode?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
async function makeQR(url){await loadQRLib();const q=qrcode(0,'M');q.addData(url);q.make();const n=q.getModuleCount(),cell=16,pad=2,c=document.createElement('canvas');c.width=c.height=(n+pad*2)*cell;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#000';
  for(let r=0;r<n;r++)for(let col=0;col<n;col++)if(q.isDark(r,col))x.fillRect((col+pad)*cell,(r+pad)*cell,cell,cell);return new Promise(r=>c.toBlob(r,'image/png'))}
function picPath(el){const cur=el.tagName==='IMG'?el.getAttribute('src'):(el.style.backgroundImage.match(/url\(["']?([^"')]+)/)||[])[1]||'';return (cur.split('/').pop().replace(/\.\w+$/,'').replace(/-[a-z0-9]{6,}$/,'')||'pic')}
const toData=blob=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)});
async function setPic(el,blob,url){const ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg'}[blob.type]||'png';url=url||await toData(blob);
  imgs.set(el.dataset.img,{path:`assets/${picPath(el)}-${Date.now().toString(36)}.${ext}`,blob,url});
  if(el.tagName==='IMG')el.src=url;else el.style.backgroundImage=`url(${url})`;refresh();saveDraft()}

/* ---------- saved on this device ---------- */
function saveDraft(){const f={},im={};$$('[data-e]').forEach(el=>{const v=val(el);if(orig.get(el.dataset.e)!==v)f[el.dataset.e]=v});imgs.forEach((p,id)=>im[id]=p.url);
  try{if(!Object.keys(f).length&&!Object.keys(im).length){localStorage.removeItem(DRAFT);status('');saveFailed=false;return}
    localStorage.setItem(DRAFT,JSON.stringify({rev:myRev,f,im,t:Date.now()}));saveFailed=false;status('· saved on this device')}
  catch(e){saveFailed=true;status('· too big to save here, use My copy')}}
async function restore(){let d;try{d=JSON.parse(localStorage.getItem(DRAFT)||'null')}catch(e){}if(!d)return;let n=0;
  for(const[id,v] of Object.entries(d.f||{})){const el=$(`[data-e="${CSS.escape(id)}"]`);if(!el)continue;if(el.hasAttribute('data-count')){el.textContent=v;setCount(el,v)}else el.innerHTML=v;n++}
  for(const[id,u] of Object.entries(d.im||{})){const el=$(`[data-img="${id}"]`);if(!el)continue;await setPic(el,await (await fetch(u)).blob(),u);n++}
  if(n){refresh();status('· saved on this device');toast('Your saved edits are back')}}

/* ---------- my copy ---------- */
function minePanel(){const m=modal(`<h3>My copy</h3><p>Your edits save on this device by themselves. Come back to this same link on this device and they are still here.</p>
  <button class="big" id="mdl">Download my copy<small>One file with everything inside. Open it on any computer to present, even offline.</small></button>
  <button class="big" id="mreset">Start over<small>Throw away my edits on this device and go back to the team version.</small></button>
  <div class="row"><button class="go" id="mok">Close</button></div>`);
  m.el.querySelector('#mok').onclick=m.close;
  m.el.querySelector('#mdl').onclick=async()=>{m.close();try{await download()}catch(e){toast('Could not build the file. Check your internet and try again.')}};
  m.el.querySelector('#mreset').onclick=()=>{if(!confirm('Throw away your edits on this device?'))return;try{localStorage.removeItem(DRAFT)}catch(e){}saveFailed=false;location.reload()}}
async function inline(u){const b=await (await fetch(u)).blob();return toData(b)}
async function download(){toast('Building your copy...');
  const src=await (await fetch(location.pathname+'?r='+Date.now(),{cache:'no-store'})).text();
  const doc=apply(src,true);
  for(const im of doc.querySelectorAll('img[src]')){const s=im.getAttribute('src');if(!/^(data:|https?:)/.test(s))im.setAttribute('src',await inline(s))}
  for(const el of doc.querySelectorAll('[style*="url("]')){const st=el.getAttribute('style'),mm=st.match(/url\(["']?([^"')]+)/);if(mm&&!/^(data:|https?:)/.test(mm[1]))el.setAttribute('style',st.replace(mm[1],await inline(mm[1])))}
  const html='<!doctype html>\n'+doc.documentElement.outerHTML;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=document.title.replace(/[\\/:*?"<>|]/g,'').trim()+' (my copy).html';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast('Downloaded')}

/* ---------- help ---------- */
function helpPanel(){const m=modal(`<h3>How editing works</h3><ol>
  <li><b>Words:</b> ${TOUCH?'tap any words on a slide. A box opens with every line on that slide. Change it and press Done.':'click any words and type. Enter makes a new line. Or press <b>Words</b> to edit every line on the slide as text boxes.'}</li>
  <li><b>Accent word:</b> in the Words boxes, put *stars* around the word you want in gold.</li>
  <li><b>Pictures:</b> they have a gold dashed border. ${TOUCH?'Tap':'Click'} one to upload a new one. QR codes can be remade from a link.</li>
  <li><b>Moving around:</b> the ‹ › buttons. "All slides" shows every slide at once.</li>
  <li><b>Present:</b> hides this bar and shows the slides full size. "Back to editing" brings it back.</li>
  <li><b>Your edits save on this device</b> by themselves. "My copy" downloads them as one file, or starts you over.</li>
  <li><b>Publish to team</b> changes the live link for everyone. It needs the team edit key, and shows up in 1 to 2 minutes.</li></ol>
  <p>Mistake while typing? Undo with Ctrl+Z (Cmd+Z on a Mac). Every published version is kept, so nothing is ever lost.</p>
  <div class="row" style="justify-content:space-between"><button id="hforget">Forget the team key here</button><button class="go" id="hok">Got it</button></div>`);
  m.el.querySelector('#hok').onclick=m.close;m.el.querySelector('#hforget').onclick=()=>{try{localStorage.removeItem(KEY)}catch(e){}m.close();toast('Key removed from this device')}}

/* ---------- GitHub ---------- */
async function gh(method,path,key,body){const h={Accept:'application/vnd.github+json'};if(key)h.Authorization=`Bearer ${key}`;const r=await fetch(`${API}/repos/${REPO.owner}/${REPO.repo}${path?'/'+path:''}`,{method,cache:'no-store',headers:h,body:body?JSON.stringify(body):undefined});
  if(!r.ok){const err=new Error('GitHub '+r.status);err.status=r.status;throw err}return r.json()}
const enc=s=>{const b=new TextEncoder().encode(s);let t='';for(let i=0;i<b.length;i+=32768)t+=String.fromCharCode(...b.subarray(i,i+32768));return btoa(t)};
const dec=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
const b64=blob=>toData(blob).then(u=>u.split(',')[1]);
function getKey(){let k='';try{k=localStorage.getItem(KEY)||''}catch(e){}if(k)return Promise.resolve(k);
  return new Promise(done=>{const m=modal(`<h3>Team edit key</h3><p>Publishing changes the live link for the whole team, so it needs the team edit key. This device remembers it after the first time.</p><p>No key? That's fine. Your edits are already saved on this device, and <b>My copy</b> downloads them.</p><input id="kin" type="password" autocomplete="off" placeholder="github_pat_..."><p id="kerr" class="err"></p><div class="row"><button id="kno">Cancel</button><button class="go" id="kok">Save key</button></div>`);
    const go=async()=>{const v=m.el.querySelector('#kin').value.trim();if(!v)return;m.el.querySelector('#kerr').textContent='Checking...';
      try{const r=await gh('GET','',v);if(r.permissions&&r.permissions.push===false)throw Object.assign(new Error(),{status:403});try{localStorage.setItem(KEY,v)}catch(e){}m.close();done(v)}
      catch(e){m.el.querySelector('#kerr').textContent=e.status===401?'That key did not work. Check you copied all of it.':e.status?'That key cannot edit this deck. Ask for a new one.':'Could not reach GitHub. Check your internet.'}};
    m.el.querySelector('#kok').onclick=go;m.el.querySelector('#kin').addEventListener('keydown',e=>{if(e.key==='Enter')go()});m.el.querySelector('#kno').onclick=()=>{m.close();done('')}})}

/* turn the edits into a new page, starting from a fresh copy of it */
function apply(html,inlinePics){const doc=new DOMParser().parseFromString(html,'text/html');
  $$('[data-e]').forEach(el=>{const id=el.dataset.e,v=val(el);if(orig.get(id)===v)return;const t=doc.querySelector(`[data-e="${CSS.escape(id)}"]`);if(!t)return;
    if(el.hasAttribute('data-count')){['count','suffix','prefix'].forEach(k=>{if(el.dataset[k]!=null)t.dataset[k]=el.dataset[k];else delete t.dataset[k]});t.textContent=v}
    else{const tmp=document.createElement('div');tmp.innerHTML=v;$$('[contenteditable]',tmp).forEach(x=>x.removeAttribute('contenteditable'));t.innerHTML=tmp.innerHTML}});
  imgs.forEach((p,id)=>{const t=doc.querySelector(`[data-img="${id}"]`);if(!t)return;const u=inlinePics?p.url:p.path;if(t.tagName==='IMG')t.setAttribute('src',u);else t.style.backgroundImage=`url(${u})`});
  let meta=doc.querySelector('meta[name=rev]');if(!meta){meta=doc.createElement('meta');meta.name='rev';doc.head.appendChild(meta)}meta.content=String(Date.now());
  return doc}
let busy=false;
async function publish(){if(busy||!changes())return;const key=await getKey();if(!key)return;busy=true;const b=$('#epub');b.disabled=true;b.textContent='Publishing...';
  const n=changes();
  try{for(const p of imgs.values())if(!p.done){await gh('PUT','contents/'+p.path,key,{message:'New picture from the edit page',content:await b64(p.blob),branch:REPO.branch});p.done=true}
    for(let tries=0;;tries++){let c=await gh('GET',`contents/index.html?ref=${REPO.branch}`,key);
      if(lastPut&&c.sha===lastPut.before)c={sha:lastPut.sha,content:enc(lastPut.html)};
      const html='<!doctype html>\n'+apply(dec(c.content),false).documentElement.outerHTML;
      try{const r=await gh('PUT','contents/index.html',key,{message:`Edit from the edit page (${n} change${n>1?'s':''})`,content:enc(html),sha:c.sha,branch:REPO.branch});lastPut={before:c.sha,sha:r.content.sha,html};myRev=revOf(html);break}
      catch(e){if(e.status===409&&tries<2)continue;throw e}}
    imgs.clear();capture();saveDraft();
    const m=modal(`<h3>Published</h3><p>The live link shows your changes in 1 to 2 minutes. If someone still sees the old version after that, they refresh the page.</p><div class="row"><button class="go" id="pok">Done</button></div>`);m.el.querySelector('#pok').onclick=m.close}
  catch(e){const msg=e.status===401?'The team edit key stopped working (it may have expired). Get a new one, then press Help and "Forget the team key here" before trying again.':e.status===403||e.status===404?'This key is not allowed to change this deck. Get a new one.':e.status===409||e.status===422?'Someone else saved at the same moment. Press Publish again.':'Could not reach GitHub. Check your internet and press Publish again. Your edits are still saved on this device.';
    if(e.status===401||e.status===403||e.status===404){try{localStorage.removeItem(KEY)}catch(x){}}
    const m=modal(`<h3>Not published yet</h3><p class="err">${msg}</p><div class="row"><button class="go" id="eok">OK</button></div>`);m.el.querySelector('#eok').onclick=m.close}
  finally{busy=false;refresh()}}

/* ---------- start ---------- */
capture();if(!editing)toggleEdit();restore();refresh();
/* make sure this page is the newest team version; the live site lags a publish by a minute or two */
(async()=>{let latest;try{latest=revOf(dec((await gh('GET',`contents/index.html?ref=${REPO.branch}`)).content))}catch(e){return}
  if(latest===myRev)return;
  modal(`<h3>Loading the newest version</h3><p>Someone just published changes, and the site is still catching up. This page refreshes on its own when it is ready, usually within 2 minutes. Your own edits stay saved on this device.</p>`);
  (async function wait(){try{const t=await (await fetch(location.pathname+'?r='+Date.now(),{cache:'no-store'})).text();if(revOf(t)===latest){const q=new URLSearchParams(location.search);q.set('r',latest);location.replace(location.pathname+'?'+q+location.hash);return}}catch(e){}setTimeout(wait,15000)})()})();
toast(TOUCH?'Editing · tap any words':'Editing · click any words');
})();
