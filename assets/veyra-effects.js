
(()=> {
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const canvas=document.createElement('canvas');canvas.id='space-canvas';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
 let w=0,h=0,dpr=1,stars=[],shooters=[],raf=0,last=0,nextShower=0;
 function resize(){dpr=Math.min(window.devicePixelRatio||1,1.5);w=window.innerWidth;h=window.innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(125,Math.max(45,Math.round(w*h/11500)));stars=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,r:.35+Math.random()*1.15,a:.18+Math.random()*.6,s:.08+Math.random()*.32,p:Math.random()*6.28,blue:Math.random()>.25}));}
 function draw(t){raf=0;if(document.hidden)return;if(!reduce&&t-last<32){raf=requestAnimationFrame(draw);return}last=t;ctx.clearRect(0,0,w,h);if(!reduce&&t>nextShower){shooters.push({x:Math.random()*w*.75,y:Math.random()*h*.42,vx:3+Math.random()*3,vy:1.3+Math.random()*1.8,life:0,max:35+Math.random()*28});nextShower=t+3500+Math.random()*4500}for(const q of shooters){q.x+=q.vx;q.y+=q.vy;q.life++;const alpha=Math.max(0,1-q.life/q.max);ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x-q.vx*7,q.y-q.vy*7);ctx.strokeStyle='rgba(107,207,255,'+(alpha*.72)+')';ctx.lineWidth=1.4;ctx.stroke()}shooters=shooters.filter(q=>q.life<q.max);for(const s of stars){const twinkle=reduce?1:(.68+.32*Math.sin(t*.0008+s.p));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=s.blue?'rgba(105,184,255,'+(s.a*twinkle)+')':'rgba(222,239,255,'+(s.a*.72*twinkle)+')';ctx.fill();if(s.r>1.15){ctx.strokeStyle='rgba(76,166,255,'+(s.a*.12)+')';ctx.beginPath();ctx.moveTo(s.x-3,s.y);ctx.lineTo(s.x+3,s.y);ctx.moveTo(s.x,s.y-3);ctx.lineTo(s.x,s.y+3);ctx.stroke()}if(!reduce){s.y+=s.s*.22;if(s.y>h+3){s.y=-3;s.x=Math.random()*w}}}if(!reduce)raf=requestAnimationFrame(draw);}
 function start(){if(!raf)raf=requestAnimationFrame(draw)}function stop(){if(raf){cancelAnimationFrame(raf);raf=0}}
 resize();start();window.addEventListener('resize',()=>{resize();start()},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
window.addEventListener('load',function(){
 const loader=document.getElementById('veyraLoader');
 if(!loader)return;
 window.setTimeout(function(){
  loader.classList.add('veyra-loader-exit');
  window.setTimeout(function(){loader.remove()},450);
 },650);
});
})();
