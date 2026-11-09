import * as THREE from './vendor/three.module.min.js';

export function mountChessScene(host) {
  const canvas=host.querySelector('canvas'), poster=host.querySelector('img');
  let renderer;
  try {renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});} catch (_) {host.dataset.scene='fallback';return null;}
  const scene=new THREE.Scene();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  const camera=new THREE.PerspectiveCamera(35,1,.1,80);
  const ambient=new THREE.HemisphereLight(0xddeeff,0x30221a,2.4);scene.add(ambient);
  const key=new THREE.DirectionalLight(0xffedcf,4.2);key.position.set(-5,12,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:35});key.shadow.bias=-.001;key.shadow.normalBias=.035;scene.add(key);
  const rim=new THREE.DirectionalLight(0x6ce8da,2.3);rim.position.set(7,6,-6);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xb9d6ff,1.5);fill.position.set(2,4,8);scene.add(fill);
  function grain(base,seed=1){
    const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);
    let rand=seed;const random=()=>{rand=(rand*16807)%2147483647;return rand/2147483647;};
    for(let i=0;i<160;i++){const y=random()*256;ctx.strokeStyle=`rgba(${random()>.5?'255,228,175':'23,9,2'},${.015+random()*.045})`;ctx.lineWidth=.3+random()*1.6;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(80,y+random()*10,160,y-random()*10,256,y+random()*4);ctx.stroke();}
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
  }
  const lightTile=new THREE.MeshStandardMaterial({map:grain('#dfcba6',2),roughness:.38});
  const darkTile=new THREE.MeshStandardMaterial({map:grain('#493125',4),roughness:.34});
  const edge=new THREE.MeshStandardMaterial({map:grain('#251b17',6),roughness:.3});
  const brass=new THREE.MeshStandardMaterial({color:0xb99451,metalness:.65,roughness:.28});
  const ivory=new THREE.MeshStandardMaterial({color:0xf1dfbb,roughness:.27,metalness:.05});
  const ebony=new THREE.MeshStandardMaterial({color:0x241c19,roughness:.28,metalness:.1});
  const eyeMaterial=new THREE.MeshStandardMaterial({color:0x110d0b,roughness:.35});
  function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function slab(width,depth,thickness,bevel,material,y){
    const shape=new THREE.Shape();shape.moveTo(-width/2,-depth/2);shape.lineTo(width/2,-depth/2);shape.lineTo(width/2,depth/2);shape.lineTo(-width/2,depth/2);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel});geometry.rotateX(-Math.PI/2);
    return mesh(geometry,material,scene,0,y,0);
  }
  slab(8.9,8.9,.25,.1,edge,-.39);slab(8.65,8.65,.025,.02,brass,-.12);slab(8.55,8.55,.08,.035,edge,-.095);
  const tileGeometry=new THREE.BoxGeometry(.996,.08,.996);
  for(let rank=0;rank<8;rank++)for(let file=0;file<8;file++)mesh(tileGeometry,(file+rank)%2?darkTile:lightTile,scene,file-3.5,.015,rank-3.5);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(35,35),new THREE.ShadowMaterial({opacity:.22}));floor.rotation.x=-Math.PI/2;floor.position.y=-.53;floor.receiveShadow=true;scene.add(floor);
  const models={};
  const foot=[[0,0],[.30,0],[.35,.05],[.35,.10],[.32,.15],[.29,.18],[.29,.22],[.26,.25],[.22,.28]];
  function lathe(points,material,parent){return mesh(new THREE.LatheGeometry(points.map(([x,y])=>new THREE.Vector2(x,y)),32),material,parent);}
  function sphere(radius,material,parent,x,y,z=0){return mesh(new THREE.SphereGeometry(radius,20,14),material,parent,x,y,z);}
  function model(type,material){
    const group=new THREE.Group();
    const heights={pawn:.79,rook:.95,knight:.42,bishop:1.10,queen:1.35,king:1.45};const stem=heights[type];
    lathe([...foot,[.16,.34],[.12,stem-.11],[.22,stem-.05],[.23,stem],[.18,stem+.05],[0,stem+.05]],material,group);
    if(type==='pawn')sphere(.225,material,group,0,1.03);
    if(type==='rook'){
      mesh(new THREE.CylinderGeometry(.30,.24,.28,32),material,group,0,1.13);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;const tooth=mesh(new THREE.BoxGeometry(.16,.19,.16),material,group,Math.cos(a)*.235,1.34,Math.sin(a)*.235);tooth.rotation.y=-a;}
    }
    if(type==='bishop'){
      lathe([[0,1.12],[.14,1.12],[.24,1.28],[.18,1.47],[.08,1.65],[0,1.72]],material,group);
      sphere(.065,material,group,0,1.73);
      const cut=mesh(new THREE.BoxGeometry(.024,.27,.30),material===ivory?ebony:ivory,group,.035,1.52,0);cut.rotation.z=-.4;
    }
    if(type==='queen'){
      lathe([[0,1.36],[.20,1.36],[.27,1.51],[.24,1.58],[0,1.58]],material,group);
      for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(.065,material,group,Math.cos(a)*.235,1.66,Math.sin(a)*.235);}
      sphere(.10,material,group,0,1.78);
    }
    if(type==='king'){
      lathe([[0,1.43],[.20,1.43],[.26,1.51],[.19,1.61],[.1,1.67],[0,1.67]],material,group);
      mesh(new THREE.BoxGeometry(.105,.39,.105),material,group,0,1.85);mesh(new THREE.BoxGeometry(.32,.095,.105),material,group,0,1.9);
    }
    if(type==='knight'){
      const points=[[-.26,.43],[-.37,.72],[-.35,1.04],[-.23,1.34],[-.11,1.54],[-.09,1.76],[.04,1.64],[.18,1.64],[.4,1.36],[.45,1.20],[.34,1.1],[.12,1.18],[.05,.99],[.24,.68],[.28,.43]];
      const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:true,bevelSegments:3,bevelSize:.045,bevelThickness:.04,steps:1});geometry.translate(0,0,-.1);mesh(geometry,material,group);
      for(const side of [-1,1])sphere(.025,eyeMaterial,group,.16,1.43,side*.145);
      for(let i=0;i<5;i++)mesh(new THREE.BoxGeometry(.07,.085,.27),material,group,-.285+i*.025,1.05+i*.085);
    }
    return group;
  }
  const order=['rook','knight','bishop','queen','king','bishop','knight','rook'];let knight;
  for(const [side,material] of [['white',ivory],['black',ebony]]){
    for(const type of new Set([...order,'pawn']))models[side+type]=model(type,material);
    for(let file=0;file<8;file++)for(const row of [0,1]){
      const type=row===1?'pawn':order[file],piece=models[side+type].clone();piece.position.set(file-3.5,.06,side==='white'?(row===0?3.5:2.5):(row===0?-3.5:-2.5));
      if(type==='knight')piece.rotation.y=side==='white'?Math.PI/2:-Math.PI/2;
      scene.add(piece);if(side==='white'&&file===6&&row===0)knight=piece;
    }
  }
  const accent=new THREE.MeshStandardMaterial({color:0x28c9a5,emissive:0x0c5541,emissiveIntensity:.35,transparent:true,opacity:.35,roughness:.4});
  const destination=mesh(new THREE.TorusGeometry(.39,.018,6,40),accent,scene,1.5,.07,1.5);destination.rotation.x=Math.PI/2;destination.castShadow=false;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');let widthCache=0,heightCache=0,contextLost=false,priorMovement=-1;let reduced=reduce.matches,visible=true,paused=false,elapsed=0,last=0,frame=0,disposed=false;
  let pointerX=0,pointerY=0,currentX=0,currentY=0;
  const ease=t=>t*t*(3-2*t);
  function draw(){
    if(disposed||contextLost)return;
    const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
    if(width!==widthCache||height!==heightCache){renderer.setSize(width,height,false);widthCache=width;heightCache=height;}camera.aspect=width/height;
    const progress=reduced?1:ease(Math.min(elapsed/1900,1));
    currentX+=(pointerX-currentX)*.065;currentY+=(pointerY-currentY)*.065;
    const distance=camera.aspect<.9?1.32:1.16;
    camera.position.set((11.8-2.2*progress+currentX*.45)*distance,(12.5-3.1*progress+currentY*.25)*distance,(14.2-2*progress)*distance);camera.lookAt(0,.5,0);camera.updateProjectionMatrix();
    const movement=reduced?1:Math.max(0,Math.min(1,(elapsed-1800)/1450));const travel=ease(movement);
    knight.position.set(2.5-travel,.06+(movement<1?Math.sin(movement*Math.PI)*1.8:0),3.5-2*travel);
    if(movement!==priorMovement){renderer.shadowMap.needsUpdate=true;priorMovement=movement;}
    renderer.render(scene,camera);host.dataset.move=movement===1?'g1-f3':'animating';
    if(host.dataset.scene!=='ready'){host.dataset.scene='ready';if(reduced)poster.hidden=true;else setTimeout(()=>{if(host.dataset.scene==='ready')poster.hidden=true;},450);}
  }
  function tick(time){frame=0;if(!visible||document.hidden||disposed||paused)return;const delta=last?Math.min(time-last,1000):0;last=time;if(!reduced)elapsed+=delta;draw();
    if(!reduced&&(elapsed<4200||Math.abs(currentX-pointerX)>.003||Math.abs(currentY-pointerY)>.003))frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&!paused&&visible&&!document.hidden&&!disposed&&!contextLost){last=0;frame=requestAnimationFrame(tick);}}
  function halt(){cancelAnimationFrame(frame);frame=0;last=0;}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else halt();},{threshold:.05});observer.observe(host);
  const resize=new ResizeObserver(()=>{draw();start();});resize.observe(host);
  const onVisibility=()=>{if(document.hidden)halt();else start();};document.addEventListener('visibilitychange',onVisibility);
  const onPointer=event=>{if(reduced||paused||event.pointerType==='touch')return;const bounds=host.getBoundingClientRect();pointerX=(event.clientX-bounds.left)/bounds.width-.5;pointerY=(event.clientY-bounds.top)/bounds.height-.5;start();};host.addEventListener('pointermove',onPointer);
  host.addEventListener('pointerleave',()=>{pointerX=pointerY=0;start();});
  const onReduce=()=>{reduced=reduce.matches;pointerX=pointerY=currentX=currentY=0;halt();draw();if(!reduced)start();};reduce.addEventListener('change',onReduce);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;halt();poster.hidden=false;host.dataset.scene='fallback';host.parentElement.querySelector('.mauro-scene-controls').hidden=true;});
  const api={snapshot(){draw();return canvas.toDataURL('image/png');},replay(){elapsed=0;paused=false;draw();start();},pause(){paused=true;halt();},resume(){paused=false;start();},get reduced(){return reduced;},get animating(){return frame!==0;},dispose(){disposed=true;halt();observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',onVisibility);reduce.removeEventListener('change',onReduce);scene.traverse(node=>{if(node.geometry)node.geometry.dispose();});new Set([lightTile,darkTile,edge,brass,ivory,ebony,eyeMaterial,accent]).forEach(material=>{material.map?.dispose();material.dispose();});renderer.dispose();}};
  draw();start();return api;
}
