/* ───────── 开场 · 粒子之月（canvas，高级星空版）
   纯净夜空 + 星芒亮星 + 淡星座 → 全屏 sprite 流星雨 →
   点击弯月 → 由远及近，暗面星火点亮成满月 → 月尘落下，揭开结缘
   地址带 ?intro=1 或 #intro 时强制重播（忽略“只播一次”记忆） */
(function intro(){
  var intro=document.getElementById("intro");
  if(!intro) return;
  var force=location.search.indexOf("intro=1")>=0||location.hash.replace("#","")==="intro";
  var seen=false;
  try{ seen=sessionStorage.getItem("yy_intro")==="1"; }catch(e){}
  if(seen&&!force){ if(intro.parentNode) intro.parentNode.removeChild(intro); return; }
  document.body.classList.add("lock");

  var cv=document.getElementById("introCanvas");
  var ctx=cv?cv.getContext("2d"):null;
  if(!ctx){ intro.style.display="none"; document.body.classList.remove("lock"); return; }

  var W=0,H=0,DPR=1,haloCv=null,haloR=0;
  function fit(){
    DPR=Math.min(window.devicePixelRatio||1,1.5);
    W=window.innerWidth;H=window.innerHeight;
    cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
    buildMoon();
  }

  var PAL=["#f2ead6","#ece2c4","#e8d6a6","#d6bc80"];
  var SIN=new Float32Array(256);
  for(var si=0;si<256;si++)SIN[si]=Math.sin(si/256*6.2832);
  function fsin(x){return SIN[((x*40.743664)>>0)&255];}

  /* ── 贴图工厂：光点 / 蓝色星点 / 十字星芒 / 流星 ── */
  var SPR=[],SBLUE=null,FLARE=null,METSPR=null;
  function buildSprites(){
    SPR=PAL.map(function(col){
      var s2=document.createElement("canvas");s2.width=s2.height=48;
      var g2=s2.getContext("2d");
      var rg=g2.createRadialGradient(24,24,0,24,24,24);
      rg.addColorStop(0,"rgba(255,250,238,0.95)");
      rg.addColorStop(0.3,col);
      rg.addColorStop(1,"rgba(214,188,128,0)");
      g2.fillStyle=rg;g2.beginPath();g2.arc(24,24,24,0,6.2832);g2.fill();
      return s2;
    });
    // 冷蓝星点（夜空里的一点冷色，衬出月亮的暖）
    SBLUE=document.createElement("canvas");SBLUE.width=SBLUE.height=48;
    var gb=SBLUE.getContext("2d");
    var rb=gb.createRadialGradient(24,24,0,24,24,24);
    rb.addColorStop(0,"rgba(244,248,255,0.95)");
    rb.addColorStop(0.35,"#a9c1ff");
    rb.addColorStop(1,"rgba(120,150,220,0)");
    gb.fillStyle=rb;gb.beginPath();gb.arc(24,24,24,0,6.2832);gb.fill();
    // 十字星芒（给最亮的几颗星星用）
    FLARE=document.createElement("canvas");FLARE.width=FLARE.height=64;
    var f=FLARE.getContext("2d");
    var fg=f.createRadialGradient(32,32,0,32,32,32);
    fg.addColorStop(0,"rgba(255,250,238,0.85)");
    fg.addColorStop(0.22,"rgba(232,214,166,0.30)");
    fg.addColorStop(1,"rgba(214,188,128,0)");
    f.fillStyle=fg;f.beginPath();f.arc(32,32,32,0,6.2832);f.fill();
    f.globalCompositeOperation="lighter";
    f.strokeStyle="rgba(255,248,230,0.75)";f.lineWidth=1;
    f.beginPath();f.moveTo(32,3);f.lineTo(32,61);f.moveTo(3,32);f.lineTo(61,32);f.stroke();
    // 流星 sprite：头部亮核在右端，尾迹向左渐隐
    METSPR=document.createElement("canvas");METSPR.width=240;METSPR.height=20;
    var m2=METSPR.getContext("2d");
    var lg=m2.createLinearGradient(0,0,240,0);
    lg.addColorStop(0,"rgba(232,214,166,0)");
    lg.addColorStop(0.5,"rgba(232,214,166,0.20)");
    lg.addColorStop(0.82,"rgba(240,230,200,0.65)");
    lg.addColorStop(1,"rgba(255,250,238,1)");
    m2.fillStyle=lg;m2.fillRect(0,8,240,4);
    var hg=m2.createRadialGradient(234,10,0,234,10,10);
    hg.addColorStop(0,"rgba(255,252,240,1)");
    hg.addColorStop(0.45,"rgba(240,228,190,0.55)");
    hg.addColorStop(1,"rgba(214,188,128,0)");
    m2.fillStyle=hg;m2.beginPath();m2.arc(234,10,10,0,6.2832);m2.fill();
  }
  buildSprites();

  var dust=[],stars=[],heroes=[],conStars=[],conLines=[],lit=[],term=[],shade=[],halo=[],mets=[];
  var R=180;

  function mk(u,v,a){
    return {u:u,v:v,a:a,sz:Math.random()*1.6+0.6,tw:Math.random()*256,
            tws:0.6+Math.random()*1.6,z:0.45+Math.random()*0.55,
            delay:Math.random()*0.5,col:(Math.random()*PAL.length)|0};
  }
  function buildMoon(){
    R=Math.min(W,H)*0.225;
    dust.length=0;lit.length=0;term.length=0;shade.length=0;halo.length=0;
    stars.length=0;heroes.length=0;conStars.length=0;conLines.length=0;
    var i,tries;
    // 背景星尘（极细微尘，慢漂浮）
    var ND=Math.round(Math.min(90,Math.max(50,(W*H)/22000)));
    for(i=0;i<ND;i++) dust.push({x:Math.random()*W,y:Math.random()*H,
      sz:Math.random()*1.2+0.4,a:Math.random()*0.10+0.04,
      tw:Math.random()*256,tws:0.4+Math.random()*0.9,
      vx:(Math.random()-0.5)*0.05,vy:-(Math.random()*0.06+0.02)});
    // 星星层：暖金为主、冷蓝点缀，大小不一，各自闪烁
    var NS=Math.round(Math.min(210,Math.max(110,(W*H)/9000)));
    for(i=0;i<NS;i++){
      var big=Math.random()<0.15;
      stars.push({x:Math.random()*W,y:Math.random()*H,
        sz:big?(Math.random()*2.4+1.8):(Math.random()*1.1+0.5),
        a:(big?0.5:0.3)+Math.random()*0.4,
        tw:Math.random()*256,tws:0.5+Math.random()*1.4,
        col:Math.random()<0.1?4:((Math.random()*4)|0),big:big});
    }
    // 星芒亮星：夜空中最亮的几颗，带十字星芒
    var NH=6+((Math.random()*4)|0);
    for(i=0;i<NH;i++) heroes.push({x:Math.random()*W,y:Math.random()*H*0.85,
      sz:Math.random()*16+18,tw:Math.random()*256,tws:0.3+Math.random()*0.5,
      a:0.45+Math.random()*0.35});
    // 一小组淡淡星座（左上角，金线相连）
    var bx=W*0.13,by=H*0.17,sc=Math.min(W,H)/900;
    var pts=[[0,0],[52,-38],[118,-24],[150,22],[96,58],[30,44]];
    for(i=0;i<pts.length;i++) conStars.push({x:bx+pts[i][0]*sc,y:by+pts[i][1]*sc,tw:Math.random()*256});
    for(i=0;i<pts.length-1;i++) conLines.push([i,i+1]);
    conLines.push([2,4]);conLines.push([0,5]);
    // 月亮粒子
    var cutx=-0.34,cuty=0.05,cutr=1.06;
    function inD(u,v){return u*u+v*v<=1;}
    function isLit(u,v){var dx=u-cutx,dy=v-cuty;return dx*dx+dy*dy>cutr*cutr;}
    var base=Math.round(Math.min(2000,Math.max(900,(W*H)/1300)));
    tries=0;
    while(lit.length<base&&tries<30000){tries++;
      var u=Math.random()*2-1,v=Math.random()*2-1;
      if(inD(u,v)&&isLit(u,v)) lit.push(mk(u,v,0.5+Math.random()*0.6));}
    for(i=0;i<Math.round(base*0.35);i++){
      var ang=Math.random()*6.2832;
      var u2=cutx+Math.cos(ang)*cutr,v2=cuty+Math.sin(ang)*cutr;
      if(inD(u2,v2)) term.push(mk(u2,v2,0.72+Math.random()*0.5));}
    tries=0;
    while(shade.length<Math.round(base*0.85)&&tries<40000){tries++;
      var u3=Math.random()*2-1,v3=Math.random()*2-1;
      if(!inD(u3,v3)) continue;
      var dx3=u3-cutx,dy3=v3-cuty;
      if(dx3*dx3+dy3*dy3<=cutr*cutr) shade.push(mk(u3,v3,0.42+Math.random()*0.45));}
    for(i=0;i<130;i++){
      var ang2=Math.random()*6.2832,rr2=1.04+Math.random()*0.55;
      halo.push({u:Math.cos(ang2)*rr2,v:Math.sin(ang2)*rr2,a:Math.random()*0.15+0.05,
        sz:Math.random()*1+0.4,tw:Math.random()*256,tws:0.5+Math.random(),
        z:0.4+Math.random()*0.6,col:(Math.random()*PAL.length)|0});}
    // 紧贴月缘的细光环（取代原来整片灰白雾气）
    haloR=Math.round(R*1.7);
    haloCv=document.createElement("canvas");
    haloCv.width=haloCv.height=haloR*2;
    var hx=haloCv.getContext("2d");
    var hg2=hx.createRadialGradient(haloR,haloR,R*0.55,haloR,haloR,haloR);
    hg2.addColorStop(0,"rgba(240,232,208,0)");
    hg2.addColorStop(0.6,"rgba(240,232,208,0.05)");
    hg2.addColorStop(0.82,"rgba(232,214,166,0.13)");
    hg2.addColorStop(1,"rgba(214,188,128,0)");
    hx.fillStyle=hg2;hx.fillRect(0,0,haloR*2,haloR*2);
  }
  fit();
  window.addEventListener("resize",function(){ fit(); });

  var mx=0.5,my=0.42;
  intro.addEventListener("mousemove",function(e){mx=e.clientX/Math.max(1,W);my=e.clientY/Math.max(1,H);});

  var state="idle",t0=0,ripple=0,done=false,raf=0,lastMet=0,ftAvg=16.7,skipN=1;
  var Z0=0.52,Z1=1.14;
  function clamp01(x){return x<0?0:x>1?1:x;}
  function easeIO(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}

  function spawnMeteor(){
    if(mets.length>=18)return;
    var big=Math.random()<0.18;
    var dir=Math.random()<0.5?1:-1;
    var sp=(3.1+Math.random()*2.4)*(big?1.5:1);
    var ang3=0.32+Math.random()*0.22; // 向下偏 18~32 度
    mets.push({x:(Math.random()*0.92+0.04)*W,y:(Math.random()*0.45+0.02)*H,
      vx:dir*Math.cos(ang3)*sp,vy:Math.sin(ang3)*sp,
      len:(Math.random()*70+60)*(big?1.6:1),
      life:1,decay:(0.0075+Math.random()*0.004)/(big?0.8:1),
      big:big});
  }

  var AUTO_MS=4500;
  function draw(now){
    raf=requestAnimationFrame(draw);
    // 自适应降载：帧耗时偏高时自动降低月亮粒子密度，保证不卡
    var dt=now-(draw.last||now);draw.last=now;
    ftAvg+=(Math.min(50,Math.max(4,dt))-ftAvg)*0.08;
    skipN=ftAvg>27?3:ftAvg>21?2:1;
    if(state==="idle"&&now>=AUTO_MS) play();
    ctx.clearRect(0,0,W,H);

    var i;
    /* 星尘（普通混合，极淡） */
    ctx.globalCompositeOperation="source-over";
    for(i=0;i<dust.length;i++){
      var d=dust[i];
      d.x+=d.vx;d.y+=d.vy;
      if(d.y<-4)d.y=H+4;else if(d.x<-4)d.x=W+4;else if(d.x>W+4)d.x=-4;
      ctx.globalAlpha=d.a*(0.55+0.45*fsin(now*0.001*d.tws+d.tw));
      ctx.fillStyle="#efe6cd";
      ctx.fillRect(d.x,d.y,d.sz,d.sz);
    }

    /* 星空层（加色发光） */
    ctx.globalCompositeOperation="lighter";
    for(i=0;i<stars.length;i++){
      var s2=stars[i];
      var sa=s2.a*(0.4+0.6*fsin(now*0.0009*s2.tws+s2.tw));
      if(sa<=0.02)continue;
      ctx.globalAlpha=Math.min(1,sa);
      var sw=s2.sz*(s2.big?3.2:2.3);
      ctx.drawImage(s2.col<4?SPR[s2.col]:SBLUE,s2.x-sw/2,s2.y-sw/2,sw,sw);
    }
    // 星芒亮星
    for(i=0;i<heroes.length;i++){
      var h2=heroes[i];
      var ha=h2.a*(0.55+0.45*fsin(now*0.0007*h2.tws+h2.tw));
      ctx.globalAlpha=ha;
      var hw=h2.sz*(0.9+0.25*fsin(now*0.0007*h2.tws+h2.tw));
      ctx.drawImage(FLARE,h2.x-hw/2,h2.y-hw/2,hw,hw);
    }
    // 淡星座
    var ca=0.09+0.05*fsin(now*0.0005);
    ctx.globalAlpha=ca;ctx.strokeStyle="#d6bc80";ctx.lineWidth=0.6;
    ctx.beginPath();
    for(i=0;i<conLines.length;i++){
      var p1=conStars[conLines[i][0]],p2=conStars[conLines[i][1]];
      ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);
    }
    ctx.stroke();
    for(i=0;i<conStars.length;i++){
      var cs=conStars[i];
      ctx.globalAlpha=0.35+0.3*fsin(now*0.001+cs.tw);
      ctx.drawImage(SPR[2],cs.x-3,cs.y-3,6,6);
    }

    /* 流星雨：全屏 sprite 流星，渐变尾迹 + 发光头 */
    var metGap=state==="idle"?150:110;
    if(now-lastMet>metGap){lastMet=now;spawnMeteor();if(Math.random()<(state==="idle"?0.5:0.7))spawnMeteor();}
    for(i=mets.length-1;i>=0;i--){
      var m=mets[i];
      m.x+=m.vx;m.y+=m.vy;m.life-=m.decay;
      if(m.life<=0||m.x<-260||m.x>W+260||m.y>H+80){mets.splice(i,1);continue;}
      var ma=m.life*Math.min(1,(1-m.life)*6);
      var ang4=Math.atan2(m.vy,m.vx);
      ctx.save();
      ctx.translate(m.x,m.y);
      ctx.rotate(ang4);
      ctx.globalAlpha=ma*(m.big?1:0.85);
      var tl=m.len;
      ctx.drawImage(METSPR,-tl,-5,tl,10);
      ctx.restore();
    }

    /* 状态推进：zoom(1.25s) → morph(1.1s) → release(0.9s) */
    if(state==="zoom"&&now-t0>=1250) state="morph";
    if(state==="morph"&&now-t0>=2350) state="release";
    var zoom=Z0*(1+0.012*fsin(now*0.00042)),morph=0,rel=0;
    if(state!=="idle"){
      zoom=Z0+(Z1-Z0)*easeIO(clamp01((now-t0)/1400));
      morph=clamp01((now-t0-1250)/1100);
      rel=clamp01((now-t0-2350)/900);
    }

    var cx=W/2+(mx-0.5)*30,cy=H*0.42+(my-0.5)*20;
    var rr=R*zoom;

    // 月缘细光环（低亮度，只在点亮时增强，不再是灰雾）
    ctx.globalAlpha=0.55+0.45*morph;
    var hsize=haloR*2*zoom;
    ctx.drawImage(haloCv,cx-hsize/2,cy-hsize/2,hsize,hsize);

    function set(list,mode){
      for(var i2=0;i2<list.length;i2++){
        if(skipN>1&&mode!=="term"&&(i2%skipN))continue;
        var q=list[i2];
        var wob=fsin(now*0.00055+q.tw)*0.007;
        var px=cx+(q.u+wob)*rr+(mx-0.5)*20*q.z;
        var py=cy+(q.v+wob*0.6)*rr+(my-0.5)*14*q.z;
        var a=q.a*(0.45+0.55*fsin(now*0.0011*q.tws+q.tw));
        if(mode==="term")a*=1-0.72*morph;
        else if(mode==="shade"){var e2=clamp01((morph-q.delay)/0.45);a*=e2*e2;}
        if(rel>0){a*=1-rel;py+=rel*rel*(80+140*q.z);}
        if(a<=0.012)continue;
        ctx.globalAlpha=Math.min(1,a);
        var spr=SPR[q.col];
        var w=q.sz*(2.1+1.5*zoom);
        ctx.drawImage(spr,px-w/2,py-w/2,w,w);
      }
    }
    set(halo,"plain");set(lit,"plain");set(term,"term");set(shade,"shade");

    if(ripple){
      var rt=(now-ripple)/900;
      if(rt<1){
        ctx.globalAlpha=(1-rt)*0.3;ctx.strokeStyle="#e8d6a6";ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(cx,cy,rr*(0.92+1.7*rt),0,6.2832);ctx.stroke();
        if(rt>0.16){ctx.globalAlpha=(1-rt)*0.18;
          ctx.beginPath();ctx.arc(cx,cy,rr*(0.92+1.7*(rt-0.16)),0,6.2832);ctx.stroke();}
      }else ripple=0;
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation="source-over";

    if(state==="release"&&rel>=1&&!done) finish();
  }
  raf=requestAnimationFrame(draw);

  function finish(){
    if(done) return; done=true;
    cancelAnimationFrame(raf);
    intro.classList.add("gone");
    setTimeout(function(){
      try{ sessionStorage.setItem("yy_intro","1"); }catch(e){}
      document.body.classList.remove("lock");
      if(intro.parentNode) intro.parentNode.removeChild(intro);
      spawnMeteor();setTimeout(spawnMeteor,220);setTimeout(spawnMeteor,480);
    },900);
  }
  function play(){
    if(done||state!=="idle") return;
    intro.classList.add("playing");
    state="zoom";t0=performance.now();ripple=t0+150;
  }
  intro.addEventListener("click",function(){ play(); });
  document.getElementById("introSkip").addEventListener("click",finish);
  document.addEventListener("keydown",function(e){
    if(done) return;
    if(e.key==="Enter"||e.key===" "){ play(); }
    else if(e.key==="Escape"){ finish(); }
  });
})();

