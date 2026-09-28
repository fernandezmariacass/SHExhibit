/* SHExhibit — data-driven site controller
   data.json is the single source of truth for artwork/site/team/map content.
*/
(async function initSHE(){
  try{
    const response=await fetch('data.json');
    if(!response.ok) throw new Error(`data.json returned ${response.status}`);
    const DATA=await response.json();
    const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
    const A=DATA.artworks,pad=n=>String(n).padStart(2,'0');

    function renderSiteContent(){
      const site=DATA.site||{};
  const pageTitle=$('#pageTitle');
  if(pageTitle) pageTitle.textContent=site.title||site.name||'';
      const variants=site.hero_variants||[];
      const requested=(new URLSearchParams(location.search).get('hero')||'A').toUpperCase();
      const variant=variants.find(v=>v.id===requested)||variants[0];
      const heroCopy=$('#heroCopy');
      if(variant&&heroCopy){
        heroCopy.innerHTML=`<p class="eyebrow">${esc(variant.eyebrow)}</p>
          <h1><span class="big"><span><b>${esc(site.name||'')}</b></span></span>
          <span class="of">${esc(site.title||'')}</span>
          <span class="sub">${esc(site.subtitle||'')}</span></h1>
          <p class="tag">${esc(variant.description)}</p>
          <a href="#gallery" class="cta">${esc(variant.cta)} <span>→</span></a>`;
      }
      const heroImage=$('#heroImage');
      if(heroImage){
        heroImage.src=site.hero_image||'';
        heroImage.alt=site.hero_image_alt||site.name||'';
      }
      const badgeText=$('#badgeText');
      if(badgeText) badgeText.textContent=site.hero_badge||'';
      const footer=$('#footerText');
      if(footer) footer.textContent=`© ${site.year||new Date().getFullYear()} ${site.name||''} of the South. ${site.footer||''}`;
      const palette=site.paint_palette||[];
      const swatches=$('#swatches');
      if(swatches){
        swatches.innerHTML=palette.map((p,i)=>`<button style="--c:${esc(p.color)}" data-c="${esc(p.color)}" aria-label="${esc(p.name)}" title="${esc(p.name)}" aria-pressed="${i===palette.length-1}"></button>`).join('');
      }
    }

    const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    renderSiteContent();
    let tag='All',list=A.slice(),cur=0,lastCard=null;
    const rail=$('#rail'),viewer=$('#viewer');

    /* Images: try the path from the data first, then the same name with other extensions, then a placeholder */
    const EXTS=['.jpg','.jpeg','.png','.HEIC','.heic'];
    const srcs=a=>{const o=[],add=p=>{if(p&&!o.includes(p))o.push(p)};
      [a.artwork_image,a.hero_image].forEach(add);
      [a.artwork_image,a.hero_image].forEach(p=>{if(p){const b=p.replace(/\.[a-z0-9]+$/i,'');EXTS.forEach(x=>add(b+x))}});return o};
    function loadImg(img,list,sel){
      const c=list.map(encodeURI),box=img.closest(sel)||img.parentElement;let i=0;
      img.onerror=()=>{if(++i<c.length)img.src=c[i];else{img.onerror=null;img.removeAttribute('src');box.classList.add('noimg')}};
      img.removeAttribute('src');box.classList.remove('noimg');img.src=c[0];
    }
    const hydrate=r=>$$('img[data-a]',r).forEach(im=>{im.draggable=false;loadImg(im,srcs(A[+im.dataset.a]),'.arch')});

    /* Type categories, detected automatically from each artwork's art_type.
       Add a new artwork with a new type and its filter pill appears by itself.
       (Optional: give an artwork a "category" field to override the detection.) */
    const tidy=s=>String(s??'').replace(/\s+/g,' ').trim();
    const RULES=[[/oil/i,'Oil on Canvas'],[/acrylic/i,'Acrylic'],[/water\s?colou?r/i,'Watercolor'],[/sculpt/i,'Sculpture'],[/architect/i,'Architecture'],[/mural/i,'Mural'],[/intarsia|inlay/i,'Wood Inlay'],[/illustrat/i,'Illustration'],[/photograph/i,'Photography'],[/applied|industrial/i,'Applied Art'],[/mixed/i,'Mixed Media'],[/digital/i,'Digital Art']];
    const catOf=a=>{if(a.category)return tidy(a.category);const t=tidy(a.art_type);for(const[r,n]of RULES)if(r.test(t))return n;const f=tidy(t.split(/[\/(]/)[0]);return f?f.replace(/\b\w/g,c=>c.toUpperCase()):'Other'};
    A.forEach(a=>{a._cat=catOf(a)});
    const CATS=(()=>{const m={};A.forEach(a=>m[a._cat]=(m[a._cat]||0)+1);return Object.keys(m).sort((x,y)=>m[y]-m[x]||x.localeCompare(y)).map(n=>({n,c:m[n]}))})();
    /* Writers: every unique name in "written_by" becomes a team card, A-Z by surname.
       Names work best as "Last, First M." and multiple authors joined with " & ". */
    const strip=s=>tidy(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const nameParts=s=>{s=tidy(s);let last,given;
      if(s.includes(',')){const i=s.indexOf(',');last=tidy(s.slice(0,i));given=tidy(s.slice(i+1))}
      else{const w=s.split(' ');last=w.pop()||'';given=w.join(' ')}
      return{last,given,pretty:tidy(given+' '+last),key:strip(last+'|'+(given.split(' ')[0]||'')).toLowerCase()}};
    const AUTH=new Map();
    A.forEach(a=>{a._by=[];tidy(a.written_by).split(/\s*(?:&|;|\band\b)\s*/i).map(tidy).filter(Boolean).forEach(n=>{
      const p=nameParts(n);let m=AUTH.get(p.key);
      if(!m){m={...p,n:0,id:'member-'+p.key.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')};AUTH.set(p.key,m)}
      if(!a._by.includes(m)){a._by.push(m);m.n++}})});
    const MEMBERS=[...AUTH.values()].sort((x,y)=>x.last.localeCompare(y.last,'en',{sensitivity:'base'})||x.given.localeCompare(y.given,'en',{sensitivity:'base'}));
    /* "Written by" line: each name links to that person's team card (it never filters the gallery) */
    const by=a=>{const n=a._by.map(m=>`<a class="by-link" href="#${m.id}" data-m="${m.id}">${esc(m.pretty)}</a>`);return n.length?'Written by '+(n.length>1?n.slice(0,-1).join(', ')+' &amp; '+n[n.length-1]:n[0]):''};
    /* Location: opens the place in Google Maps (new tab). The location text itself is shown exactly as written in the data. */
    const mapUrl=a=>{const l=tidy(a.location);return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(l)};
    const PIN='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
    const locLink=a=>tidy(a.location)?`<a class="loc-link" href="${esc(mapUrl(a))}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps" aria-label="Location: ${esc(a.location)}. Open in Google Maps">${PIN}<span>${esc(a.location)}</span></a>`:'';
    const loc=a=>{const l=locLink(a);return l?`<p class="loc">${l}</p>`:''};
    const byline=a=>[a.artist_name,a.artwork_year].filter(Boolean).map(esc).join(' &middot; ');

    /* Hero ticker + pills (one filter state, shared by the gallery rail and the Hang wall) */
    $('#mq').innerHTML=(A.map(a=>esc(a.artwork_title)).join('<i>✦</i>')+'<i>✦</i>').repeat(2);
    const drawPills=()=>{const html=[{n:'All',c:A.length},...CATS].map(t=>`<button class="pill${t.n===tag?' on':''}" data-t="${esc(t.n)}" aria-pressed="${t.n===tag}">${esc(t.n)}<span class="ct">${t.c}</span></button>`).join('');$$('.pills').forEach(g=>g.innerHTML=html)};
    drawPills();
    document.addEventListener('click',e=>{
      const p=e.target.closest('.pills .pill');if(!p||p.dataset.t===tag)return;
      tag=p.dataset.t;drawPills();
      rail.classList.add('out');wallIn.classList.add('out');
      setTimeout(()=>{renderRail();rail.classList.remove('out');wallIn.classList.remove('out')},280);
    });

    /* Draggable rail */
    function renderRail(){
      list=A.filter(a=>tag==='All'||a._cat===tag);
      $('#count').textContent=(tag==='All'?'':tag+' · ')+`${list.length} ${list.length===1?'work':'works'} on view`;
      rail.innerHTML=list.map((a,i)=>`<article class="card" data-i="${i}" style="--d:${i*70}ms"><div class="arch" tabindex="0" role="button" aria-label="Open ${esc(a.artwork_title)}"><img data-a="${A.indexOf(a)}" alt="${esc(a.artwork_title)}"><span class="ph">${esc(a.artwork_title)}</span></div><div class="cap"><div><span class="no">${pad(A.indexOf(a)+1)} &middot; ${esc(a._cat)}</span><h3>${esc(a.artwork_title)}</h3><p>${byline(a)}</p><p class="by">${by(a)}</p></div><button class="zoom" type="button" data-i="${i}" title="Zoom / Inspect brushwork" aria-label="Inspect brushwork: ${esc(a.artwork_title)}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>Zoom</button></div></article>`).join('');
      hydrate(rail);rail.scrollLeft=0;prog();if(hangOn)renderHang();
    }
    let down=false,sx=0,sl=0,moved=0;
    rail.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')return;down=true;moved=0;sx=e.clientX;sl=rail.scrollLeft;rail.classList.add('drag')});
    addEventListener('pointermove',e=>{if(!down)return;const d=e.clientX-sx;moved=Math.max(moved,Math.abs(d));rail.scrollLeft=sl-d});
    addEventListener('pointerup',()=>{down=false;rail.classList.remove('drag')});
    rail.addEventListener('click',e=>{if(moved>6){moved=0;return}if(e.target.closest('.by-link'))return;const z=e.target.closest('.zoom');if(z){openLens(+z.dataset.i,z);return}const c=e.target.closest('.card');if(c)openViewer(+c.dataset.i,c)});
    rail.addEventListener('keydown',e=>{const c=e.target.closest('.card');if(c&&e.target.classList.contains('arch')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openViewer(+c.dataset.i,c)}});
    const prog=()=>{const m=rail.scrollWidth-rail.clientWidth,w=rail.clientWidth/rail.scrollWidth*100;$('#thumb').style.width=w+'%';$('#thumb').style.left=(m>0?rail.scrollLeft/m*(100-w):0)+'%'};
    rail.addEventListener('scroll',prog,{passive:true});addEventListener('resize',prog);
    $('#rPrev').onclick=()=>rail.scrollBy({left:-rail.clientWidth*.7,behavior:'smooth'});
    $('#rNext').onclick=()=>rail.scrollBy({left:rail.clientWidth*.7,behavior:'smooth'});

    /* Artwork details: floating modal (blurred backdrop, Esc / outside-click / close button to dismiss) */
    const SECTIONS=[['What We See','what_we_see'],['Personal Analysis','personal_analysis'],['Our Interpretation','our_interpretation'],['Our Judgement','our_judgement']];
    function fill(i){
      const a=list[i];cur=i;
      loadImg($('#vImg'),srcs(a),'.arch');$('#vImg').alt=a.artwork_title;$('#vPh').textContent=a.artwork_title;
      const type=tidy(a.art_type).toLowerCase()!==a._cat.toLowerCase()?a.art_type:'';
      $('#vTxt').innerHTML=`<p class="eyebrow">${pad(A.indexOf(a)+1)} / ${pad(A.length)}</p><h2 id="vT">${esc(a.artwork_title)}</h2><span class="m-tag">${esc(a._cat)}</span><p class="meta">${[a.artist_name,a.artwork_year,type].filter(Boolean).map(esc).join(' &middot; ')}</p><p class="by">${by(a)}</p>${loc(a)}`+
        SECTIONS.filter(([h,k])=>tidy(a[k])).map(([h,k],n)=>`<section style="animation-delay:${.15+n*.08}s"><h3>${h}</h3><p>${esc(a[k])}</p></section>`).join('');
      $('#vCount').textContent=`${i+1} / ${list.length}`;
      $('.m-txt').scrollTop=0;$('.m-scroll').scrollTop=0;
    }
    function openViewer(i,card){
      lastCard=card;fill(i);
      viewer.classList.add('open');viewer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
      $('#vX').focus({preventScroll:true});
    }
    function closeViewer(silent){
      if(!viewer.classList.contains('open'))return;
      viewer.classList.remove('open');viewer.setAttribute('aria-hidden','true');document.body.style.overflow='';
      if(silent===true)return;
      const c=(lastCard&&lastCard.classList.contains('hf')?$$('.hf',wallIn):[...rail.children])[cur];if(c){if(c.classList.contains('card'))c.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});(c.matches('[tabindex]')?c:$('.arch',c)).focus({preventScroll:true})}
    }
    const step=d=>fill((cur+d+list.length)%list.length);
    $('#vX').onclick=closeViewer;$('#vPrev').onclick=()=>step(-1);$('#vNext').onclick=()=>step(1);
    viewer.addEventListener('click',e=>{if(e.target===viewer)closeViewer()});
    addEventListener('keydown',e=>{if(!viewer.classList.contains('open'))return;if(e.key==='Escape')closeViewer();if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1)});
    /* keep Tab inside whichever dialog is open */
    addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;const m=[viewer,$('#lens')].find(x=>x.classList.contains('open'));if(!m)return;
      const f=$$('button,a[href]',m).filter(x=>!x.disabled&&x.getClientRects().length);if(!f.length)return;
      const a=f[0],z=f[f.length-1];
      if(e.shiftKey&&(document.activeElement===a||!m.contains(document.activeElement))){e.preventDefault();z.focus()}
      else if(!e.shiftKey&&(document.activeElement===z||!m.contains(document.activeElement))){e.preventDefault();a.focus()}
    });
    /* Clicking a writer's name (anywhere) jumps to their card in About Us. It does NOT filter the gallery. */
    function goMember(id){
      closeViewer(true);closeLens(true);
      const el=document.getElementById(id);if(!el)return;
      el.classList.add('in','flash');
      el.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'});
      setTimeout(()=>el.focus({preventScroll:true}),RM?0:650);
      setTimeout(()=>el.classList.remove('flash'),2300);
    }
    document.addEventListener('click',e=>{const l=e.target.closest('a.by-link');if(!l)return;e.preventDefault();goMember(l.dataset.m)});

    /* About */
    const ICONS={gmail:'<path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5v-13Zm2.2.5 7.8 6.2L19.8 6H4.2Zm-.2 1.6V18h16V7.6l-7.5 6-.5.4-.5-.4-7.5-6Z"/>',facebook:'<path d="M14 9.5V7.8c0-.8.2-1.3 1.3-1.3H16V3.2C15.7 3.1 14.7 3 13.5 3 11 3 9.3 4.5 9.3 7.4v2.1H6.5V13h2.8v8h3.4v-8h2.7l.4-3.5H12.7v-1.8c0-1 .3-1.7 1.3-1.7Z"/>',linkedin:'<path d="M4.98 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3.5 9h3v11.5h-3V9Zm6 0h2.9v1.6h.04c.4-.75 1.4-1.55 2.9-1.55 3.1 0 3.66 2 3.66 4.7v6.75h-3V14.4c0-1.2-.02-2.75-1.68-2.75-1.68 0-1.94 1.3-1.94 2.65v6.2h-3V9Z"/>'};
    const ab=DATA.about;
    $('#intro').textContent=ab.group_introduction;$('#course').textContent=ab.course_section;$('#why').textContent=ab.why_we_created_statement;
    /* Team cards are built from the "written_by" names. Optional extras (role, photo, socials) are
       matched by name from about.team_members in the data. */
    const TM=new Map((ab.team_members||[]).map(m=>[nameParts(m.name||'').key,m]));
    const realLink=(k,v)=>{v=tidy(v);if(!v||v==='#')return'';return k==='gmail'&&v.includes('@')&&!/^(mailto:|https?:)/i.test(v)?'mailto:'+v:v};
    $('#team').innerHTML=MEMBERS.map((m,i)=>{
      const t=TM.get(m.key)||{},role=tidy(t.role),ini=((m.given[0]||'')+(m.last[0]||'')).toUpperCase();
      const soc=Object.keys(ICONS).map(k=>{const u=realLink(k,(t.socials||{})[k]);return u?`<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${esc(m.pretty)} on ${k}"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">${ICONS[k]}</svg></a>`:''}).join('');
      return `<div class="tm rv" id="${m.id}" tabindex="-1" style="transition-delay:${i%3*90}ms"><div class="arch"><img data-p="${esc(t.photo||'')}" alt="${esc(m.pretty)}"><span class="ph">${esc(ini)}</span></div><h4>${esc(m.pretty)}</h4>${role?`<p>${esc(role)}</p>`:''}<p class="wc">${m.n} write-up${m.n>1?'s':''}</p>${soc?`<div class="soc">${soc}</div>`:''}</div>`}).join('');
    $$('#team img').forEach(im=>{im.draggable=false;const p=im.dataset.p;if(p)loadImg(im,[p],'.arch');else im.closest('.arch').classList.add('noimg')});

    /* ===== Concept 1: Wet Paint ===== */
    const hero=$('#home'),cv=$('#paint'),cx=cv.getContext('2d'),RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
    const PALETTE=(DATA.site&&DATA.site.paint_palette||[]).map(p=>p.color).filter(Boolean);
    let W=0,H=0,dirty=false,run=0,col=PALETTE[PALETTE.length-1]||'',pd=null;
    function fit(init){
      const r=hero.getBoundingClientRect(),w=Math.round(r.width),h=Math.round(r.height);
      if(w===W&&Math.abs(h-H)<80)return;
      const d=Math.min(devicePixelRatio||1,2);let sn=null;
      if(dirty&&W){sn=document.createElement('canvas');sn.width=cv.width;sn.height=cv.height;sn.getContext('2d').drawImage(cv,0,0)}
      W=w;H=h;cv.width=w*d;cv.height=h*d;cx.setTransform(d,0,0,d,0,0);
      if(sn)cx.drawImage(sn,0,0,sn.width/d,sn.height/d);else if(!init)scene(true);
    }
    function brush(c,size,thick){
      const n=Math.round(size/2.4),[r,g,b]=c.match(/\w\w/g).map(h=>parseInt(h,16));
      return{size,bs:Array.from({length:n},(_,i)=>{const j=(Math.random()-.5)*34;return{o:i/(n-1||1)-.5+(Math.random()-.5)*.03,w:(.8+Math.random()*1.8)*thick,a:.55+Math.random()*.4,p:Math.random()*9,c:`rgb(${r+j|0},${g+j|0},${b+j|0})`}})};
    }
    function seg(B,x0,y0,x1,y1,t){
      const dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy);if(!l)return;
      const nx=-dy/l*B.size,ny=dx/l*B.size;cx.lineCap='round';
      for(const k of B.bs){cx.globalAlpha=k.a*(.72+.28*Math.sin(t*.06+k.p));cx.strokeStyle=k.c;cx.lineWidth=k.w;cx.beginPath();cx.moveTo(x0+nx*k.o,y0+ny*k.o);cx.lineTo(x1+nx*k.o,y1+ny*k.o);cx.stroke()}
      cx.globalAlpha=1;
    }
    function scene(instant){
      const id=++run,S=Math.max(54,Math.min(110,H*.11)),hz=H*.56,st=S*.5,P=[];
      const sweep=(y0,y1,amp,color,dur)=>{const pts=[];let k=0;for(let y=y0;y<=y1;y+=st,k++){const row=[];for(let x=-30;x<=W+30;x+=40)row.push([x,y+Math.sin(x*.005+k)*amp]);pts.push(...(k%2?row.reverse():row))}P.push({pts,color,dur,S})};
      sweep(S*.3,hz,S*.12,PALETTE[0]||col,2.2);
      sweep(hz-S*.2,H*.8,S*.15,PALETTE[1]||col,1.1);
      sweep(H*.78,H+S*.3,S*.3,PALETTE[2]||col,1.2);
      const sx=W*.74,sy=H*.3,r=Math.max(46,Math.min(120,Math.min(W,H)*.11)),ss=r*.5,sp=[];
      for(let a=0;;a+=.18){const q=Math.min(r-ss/2,a*ss*.16);sp.push([sx+q*Math.cos(a),sy+q*Math.sin(a)]);if(q>=r-ss/2)break}
      P.push({pts:sp,color:PALETTE[3]||col,dur:.9,S:ss});
      const B=P.map(p=>brush(p.color,p.S,2.2)),at=(p,q)=>{const a=p.pts[q|0],b=p.pts[Math.min((q|0)+1,p.pts.length-1)],f=q%1;return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]};
      if(instant){P.forEach((p,i)=>{for(let j=1;j<p.pts.length;j++)seg(B[i],...p.pts[j-1],...p.pts[j],j*40)});return}
      let i=0,pos=0,last=performance.now()+250;
      const tick=now=>{
        if(id!==run)return;
        if(now<last){requestAnimationFrame(tick);return}
        const p=P[i],n=p.pts.length-1,to=Math.min(n,pos+n*(now-last)/(p.dur*1e3));last=now;
        for(let q=pos;q<to;){const nq=Math.min(to,q+.25);seg(B[i],...at(p,q),...at(p,nq),q*40);q=nq}
        pos=to;if(pos>=n){i++;pos=0}
        if(i<P.length)requestAnimationFrame(tick)};
      requestAnimationFrame(tick);
    }
    const xy=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
    cv.onpointerdown=e=>{if(e.button)return;cv.setPointerCapture(e.pointerId);const[x,y]=xy(e);pd={B:brush(col,e.pointerType==='touch'?30:38,1),x,y,t:0,m:0};dirty=true;$('#hint').classList.add('gone')};
    cv.onpointermove=e=>{if(!pd)return;for(const q of e.getCoalescedEvents?.()||[e]){const[x,y]=xy(q),d=Math.hypot(x-pd.x,y-pd.y);if(d<2)continue;seg(pd.B,pd.x,pd.y,x,y,pd.t+=d);pd.x=x;pd.y=y;pd.m=1}};
    cv.onpointerup=cv.onpointercancel=()=>{if(pd&&!pd.m)seg(pd.B,pd.x,pd.y,pd.x+2,pd.y+1,1);pd=null};
    $$('.sw button').forEach(b=>b.onclick=()=>{col=b.dataset.c;$$('.sw button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    $('#reset').onclick=()=>{run++;cx.clearRect(0,0,W,H);dirty=false;$('#hint').classList.remove('gone');scene(RM)};
    fit(true);scene(RM);new ResizeObserver(()=>fit()).observe(hero);

    /* ===== Concept 3: Come Closer ===== */
    const lens=$('#lens'),lw=$('#lWrap'),ls=$('#lStage'),lb=$('#lBlocks'),ll=$('#lLens');
    let li=0,lTok=0,lImg=null,lTrig=null,LW=0,LH=0,LZ=2.5,LL=160,lx=0,ly=0,tx=0,ty=0,lAuto=true,lRaf=0,lOff=0;
    const loadArt=a=>new Promise(res=>{const c=srcs(a).map(encodeURI),im=new Image();let n=0;im.onload=()=>res(im);im.onerror=()=>{if(++n<c.length)im.src=c[n];else res(null)};im.src=c[0]});
    function fillLens(i){
      const a=list[i],tok=++lTok;li=i;
      $('#lEye').textContent=`${pad(A.indexOf(a)+1)} / ${pad(A.length)}`;$('#lT').textContent=a.artwork_title;
      $('#lMeta').textContent=[a.artist_name,a.artwork_year,a.art_type].filter(Boolean).join(' · ');$('#lBy').innerHTML=by(a);$('#lLoc').innerHTML=loc(a);$('#lCount').textContent=`${i+1} / ${list.length}`;
      $('#lPh').textContent=a.artwork_title;ls.className='';ll.classList.remove('on');
      loadArt(a).then(im=>{
        if(tok!==lTok)return;lImg=im;
        if(!im){ls.className='noimg';ls.style.width='min(100%,420px)';ls.style.height='min(60vh,520px)';return}
        layoutLens();
      });
    }
    function layoutLens(){
      if(!lImg)return;
      const R=lw.getBoundingClientRect(),k=lImg.naturalWidth/lImg.naturalHeight,d=Math.min(devicePixelRatio||1,2);
      LW=Math.min(R.width,R.height*k);LH=LW/k;ls.style.width=LW+'px';ls.style.height=LH+'px';lb.width=LW*d;lb.height=LH*d;
      const c=Math.max(40,Math.min(LW,LH)/6),cw=Math.ceil(LW/c),ch=Math.ceil(LH/c),sm=document.createElement('canvas');
      let s=lImg,w=lImg.naturalWidth,h=lImg.naturalHeight;
      while(w>cw*4&&h>ch*4){const t=document.createElement('canvas');t.width=w=Math.ceil(w/2);t.height=h=Math.ceil(h/2);t.getContext('2d').drawImage(s,0,0,w,h);s=t}
      sm.width=cw;sm.height=ch;sm.getContext('2d').drawImage(s,0,0,cw,ch);
      const g=lb.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(sm,0,0,lb.width,lb.height);
      g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=d;
      for(let i=1;i<cw;i++){g.beginPath();g.moveTo(i*lb.width/cw,0);g.lineTo(i*lb.width/cw,lb.height);g.stroke()}
      for(let i=1;i<ch;i++){g.beginPath();g.moveTo(0,i*lb.height/ch);g.lineTo(lb.width,i*lb.height/ch);g.stroke()}
      LL=Math.round(Math.max(120,Math.min(230,Math.min(LW,LH)*.42)));LZ=Math.max(2.2,Math.min(4,lImg.naturalWidth/LW));
      Object.assign(ll.style,{width:LL+'px',height:LL+'px',backgroundImage:`url("${lImg.src}")`,backgroundSize:`${LW*LZ}px ${LH*LZ}px`});
      if(lAuto)lx=tx=LW/2,ly=ty=LH/2;
      ll.classList.add('on');if(!lRaf)lRaf=requestAnimationFrame(lTick);
    }
    function lTick(now){
      lRaf=lens.classList.contains('open')?requestAnimationFrame(lTick):0;
      if(lAuto&&!RM){tx=LW*(.5+.34*Math.sin(now*6e-4));ty=LH*(.5+.32*Math.sin(now*9e-4+1))}
      lx+=(tx-lx)*.14;ly+=(ty-ly)*.14;
      ll.style.transform=`translate(${lx-LL/2}px,${ly-LL/2-lOff}px)`;
      ll.style.backgroundPosition=`${LL/2-lx*LZ}px ${LL/2-ly*LZ}px`;
    }
    const lm=e=>{const r=ls.getBoundingClientRect();lAuto=false;lOff=e.pointerType==='touch'?LL*.7:0;tx=Math.max(0,Math.min(LW,e.clientX-r.left));ty=Math.max(0,Math.min(LH,e.clientY-r.top))};
    ls.onpointermove=lm;ls.onpointerdown=lm;
    function openLens(i,trig){lTrig=trig;lAuto=true;lOff=0;lens.classList.add('open');lens.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';fillLens(i);$('#lX').focus({preventScroll:true})}
    function closeLens(silent){if(!lens.classList.contains('open'))return;lens.classList.remove('open');lens.setAttribute('aria-hidden','true');document.body.style.overflow='';if(silent===true)return;if(lTrig&&lTrig.isConnected)lTrig.focus({preventScroll:true})}
    const lStep=d=>{lAuto=true;fillLens((li+d+list.length)%list.length)};
    $('#lX').onclick=closeLens;$('#lPrev').onclick=()=>lStep(-1);$('#lNext').onclick=()=>lStep(1);
    addEventListener('keydown',e=>{if(!lens.classList.contains('open'))return;if(e.key==='Escape')closeLens();if(e.key==='ArrowRight')lStep(1);if(e.key==='ArrowLeft')lStep(-1)});
    addEventListener('resize',()=>{if(lens.classList.contains('open'))layoutLens()});

    /* ===== Concept 2: The Hang ===== */
    const hs=$('#hang'),wall=$('#wall'),wallIn=$('#wallIn'),lab=$('#label'),tg=$('#hangBtn');
    let hangOn=false,act=-1,was=-2;
    const WD=['24%','16%','27%','15%','21%','25%','17%','22%','14%'],RT=[-2.4,1.8,-1.2,2.6,-1.9,1.3,-2.8,1.6,-1],YO=[0,26,-16,34,-8,20,-24,10,30];
    const note=a=>{const t=(a.what_we_see||'').trim(),m=t.match(/^[\s\S]*?[.!?](?=\s|$)/),s=m?m[0]:t;return s.length>150?s.slice(0,147).trimEnd()+'…':s};
    function showLabel(i){
      const a=list[i];
      lab.innerHTML=a?`<p><b>${esc(a.artist_name)}</b></p><p><i>${esc(a.artwork_title)}</i>${a.artwork_year?', '+esc(a.artwork_year):''}</p><p>${esc(a.art_type)}</p>${a.written_by?`<p class="by">${by(a)}</p>`:''}${loc(a)}<p class="n">${esc(note(a))}</p>`:'<p class="n">Hover, tap or tab to a frame to read its label. Open it again to see the full story.</p>';
    }
    function setAct(i){act=i;wall.classList.toggle('act',i>=0);$$('.hf',wallIn).forEach((f,k)=>f.classList.toggle('on',k===i));showLabel(i)}
    function renderHang(){
      wallIn.innerHTML=`<div class="plaque"><p class="eyebrow">${tag==='All'?'Featured view':esc(tag)} &middot; ${list.length} ${list.length===1?'work':'works'}</p><h3>The Hang</h3></div>`+list.map((a,i)=>`<div class="hf" data-i="${i}" tabindex="0" role="button" aria-label="${esc(a.artwork_title)}, ${esc(a.artist_name)}. Open details" style="--r:${RT[i%9]}deg;--w:${WD[i%9]};--y:${YO[i%9]}px;--d:${i*110+200}ms"><div class="mat"><img data-a="${A.indexOf(a)}" alt="${esc(a.artwork_title)}"><span class="ph">${esc(a.artwork_title)}</span></div></div>`).join('');
      $$('img[data-a]',wallIn).forEach(im=>{im.draggable=false;loadImg(im,srcs(A[+im.dataset.a]),'.mat')});
      setAct(-1);
    }
    tg.onclick=()=>{
      hangOn=!hangOn;tg.setAttribute('aria-expanded',hangOn);hs.classList.toggle('open',hangOn);
      $('#hangWrap').hidden=!hangOn;$('#hangLbl').textContent=hangOn?'Close Gallery Wall':'View in Gallery Wall';$('#hangArr').innerHTML=hangOn?'&uarr;':'&rarr;';
      if(hangOn){renderHang();$('#hangWrap').scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})}
    };
    let clr=0,hi=0;const later=()=>{clearTimeout(hi);clearTimeout(clr);clr=setTimeout(()=>setAct(-1),450)},keep=()=>clearTimeout(clr);
    wallIn.addEventListener('pointerover',e=>{const f=e.target.closest('.hf');if(f&&e.pointerType==='mouse'){keep();clearTimeout(hi);const i=+f.dataset.i;hi=setTimeout(()=>setAct(i),130)}});
    wallIn.addEventListener('pointerout',e=>{if(e.pointerType==='mouse')later()});
    lab.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')keep()});lab.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')later()});
    wallIn.addEventListener('focusin',e=>{const f=e.target.closest('.hf');if(f)setAct(+f.dataset.i)});
    wallIn.addEventListener('focusout',e=>{if(!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest('.hf,.label')))setAct(-1)});
    wallIn.addEventListener('pointerdown',e=>{was=e.target.closest('.hf')?act:-2});
    wallIn.addEventListener('click',e=>{const f=e.target.closest('.hf');if(!f)return;const i=+f.dataset.i;if(e.detail===0||was===i||e.pointerType==='mouse')openViewer(i,f);else setAct(i);was=-2});
    wall.addEventListener('click',e=>{if(!e.target.closest('.hf,.label'))setAct(-1)});
    let px=0,py=0,gx=0,gy=0,raf=0;
    const drift=()=>{px+=(gx-px)*.08;py+=(gy-py)*.08;wallIn.style.transform=`translate(${px.toFixed(2)}px,${py.toFixed(2)}px)`;raf=Math.abs(gx-px)>.05||Math.abs(gy-py)>.05?requestAnimationFrame(drift):0};
    wall.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||RM)return;const r=wall.getBoundingClientRect();gx=((e.clientX-r.left)/r.width-.5)*-26;gy=((e.clientY-r.top)/r.height-.5)*-18;if(!raf)raf=requestAnimationFrame(drift)});
    wall.addEventListener('pointerleave',()=>{gx=gy=0;if(!raf)raf=requestAnimationFrame(drift)});

    /* Theme, nav, scroll reveal */
    const th=$('#theme'),setTheme=t=>{document.documentElement.dataset.theme=t;th.textContent=t==='dark'?'☀':'☾';try{localStorage.setItem('shexhibit-theme',t)}catch(e){}};
    let saved=null;try{saved=localStorage.getItem('shexhibit-theme')}catch(e){}
    setTheme(saved||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
    th.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
    const nav=$('#nav'),bg=$('#burger');
    bg.onclick=()=>bg.setAttribute('aria-expanded',nav.classList.toggle('open'));
    $$('nav a').forEach(a=>a.onclick=()=>{nav.classList.remove('open');bg.setAttribute('aria-expanded','false')});
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
    renderRail();$$('.rv').forEach(el=>io.observe(el));

    /* ===== Artwork Map: data-driven Leaflet map ===== */
    function createArtworkStar(){
      return L.divIcon({
        className:"artwork-star",
        html:'<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 5 L61.5 36.5 L95 38 L68.5 59.5 L77.5 94 L50 74 L22.5 94 L31.5 59.5 L5 38 L38.5 36.5 Z"></path></svg>',
        iconSize:[40,40], iconAnchor:[20,20], popupAnchor:[0,-22]
      });
    }
    function createLocationPopup(artworks,locationName){
      const heading=artworks.length===1?'1 artwork at this location':`${artworks.length} artworks at this location`;
      const items=artworks.map(art=>{
        const idx=A.indexOf(art);
        return `<button type="button" class="artwork-map-item" data-artwork-id="${esc(art.artwork_id)}" data-artwork-index="${idx}" aria-label="Open details for ${esc(art.artwork_title)}">
          <span class="artwork-map-thumb"><img alt="${esc(art.artwork_title)}"><span class="ph">Image unavailable</span></span>
          <span class="artwork-map-item-info"><span class="artwork-map-item-title">${esc(art.artwork_title)}</span>
          <span class="artwork-map-item-by">written by <strong>${esc(art.written_by||'Unknown author')}</strong></span></span>
        </button>`;
      }).join('');
      return `<div class="artwork-map-popup"><div class="artwork-map-popup-heading">${esc(locationName)}</div>
        <div class="artwork-map-popup-heading" style="font:italic .8rem/1.3 var(--sans);color:var(--mute);margin-top:-5px">${heading}</div>
        <div class="artwork-map-popup-list">${items}</div></div>`;
    }
    function initArtworkMap(){
      const mapElement=$('#artworkMap');
      if(!mapElement||typeof L==='undefined')return;
      const artworkMap=L.map(mapElement,{scrollWheelZoom:true,zoomControl:true});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
        maxZoom:19,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
      }).addTo(artworkMap);

      const locations=new Map();
      A.forEach(art=>{
        const point=art.map_location;
        if(!point||!Number.isFinite(Number(point.latitude))||!Number.isFinite(Number(point.longitude)))return;
        const key=`${point.latitude},${point.longitude}`;
        if(!locations.has(key))locations.set(key,{lat:Number(point.latitude),lng:Number(point.longitude),address:point.address||art.location,artworks:[]});
        locations.get(key).artworks.push(art);
      });

      const bounds=[];
      locations.forEach(location=>{
        const latlng=[location.lat,location.lng]; bounds.push(latlng);
        const marker=L.marker(latlng,{icon:createArtworkStar(),title:`${location.artworks.length} artwork${location.artworks.length===1?'':'s'} at ${location.address}`}).addTo(artworkMap);
        marker.bindPopup(createLocationPopup(location.artworks,location.address),{maxWidth:320,minWidth:230,className:'artwork-location-popup'});
        marker.on("popupopen",function(e){
          const popup=e.popup.getElement(); if(!popup)return;
          popup.querySelectorAll('.artwork-map-item').forEach(item=>{
            const idx=Number(item.dataset.artworkIndex),thumb=item.querySelector('.artwork-map-thumb'),img=item.querySelector('img');
            if(Number.isInteger(idx)&&A[idx]&&img&&thumb){img.draggable=false;loadImg(img,srcs(A[idx]),'.artwork-map-thumb');}
            item.addEventListener('click',function(){
              const art=A.find(a=>String(a.artwork_id)===String(item.dataset.artworkId));
              if(!art)return;
              let i=list.indexOf(art);
              if(i<0){tag='All';drawPills();renderRail();i=list.indexOf(art);}
              openViewer(i);
              marker.closePopup();
            });
          });
        });
      });
      if(bounds.length)artworkMap.fitBounds(bounds,{padding:[40,40],maxZoom:15});
      addEventListener("resize",()=>artworkMap.invalidateSize());
    }
    initArtworkMap();
  }catch(error){
    console.error('SHExhibit could not load data.json:',error);
    const rail=document.getElementById('rail');
    if(rail) rail.innerHTML='<p class="load-error">Could not load the exhibition data. Run the project through a local web server and try again.</p>';
  }
})();
