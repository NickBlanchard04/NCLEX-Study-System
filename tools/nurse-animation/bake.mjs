import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// Offline asset baker. The game loads PNGs; Three/model/rig never enter its loop.
const loader=new GLTFLoader()
loader.manager.setURLModifier(url=>url.replace('T_Eye_Normal_png.png','T_Eye_Normal.png'))
const [body,library,hair]=await Promise.all([
  loader.loadAsync('./models/Superhero_Female_FullBody.gltf'),
  loader.loadAsync('./models/UAL1_Standard.glb'),
  loader.loadAsync('./models/Hair_Buns.gltf'),
])
const scene=new THREE.Scene(),figure=new THREE.Group()
figure.add(body.scene);scene.add(figure)
scene.add(new THREE.HemisphereLight(0xfff2dc,0x68778c,2))
const key=new THREE.DirectionalLight(0xffeddb,3);key.position.set(-3,6,5);scene.add(key)
const fill=new THREE.DirectionalLight(0xcbdff5,.7);fill.position.set(4,2,-3);scene.add(fill)
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true})
renderer.setSize(220,233);renderer.setPixelRatio(1);renderer.setClearColor(0,0)
renderer.outputColorSpace=THREE.SRGBColorSpace
document.body.append(renderer.domElement)
const elevation=Math.atan(44/72),distance=6
const camera=new THREE.OrthographicCamera(-.975*220/233,.975*220/233,.975,-.975,.1,30)
camera.position.set(Math.cos(elevation)*distance/Math.sqrt(2),Math.sin(elevation)*distance+.82,Math.cos(elevation)*distance/Math.sqrt(2))
camera.lookAt(0,.82,0);camera.updateMatrixWorld()
const lightSkin=await new THREE.TextureLoader().loadAsync('./models/T_Superhero_Female_Light_BaseColor.png')
lightSkin.colorSpace=THREE.SRGBColorSpace;lightSkin.flipY=false
body.scene.traverse(mesh=>{
  if(!mesh.isMesh)return
  mesh.frustumCulled=false
  if(mesh.name!=='Superhero_Female')return
  const g=mesh.geometry.clone(),p=g.attributes.position,colors=[]
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i)
    const sleeve=Math.abs(x)<.52,neck=y>1.52 || (Math.abs(x)<.10&&y>1.46) || (z>.03&&Math.abs(x)<.075&&y>1.4)
    const clothed=y<1.52&&y>.12&&(y<1.1||sleeve)&&!neck
    const shoe=y<=.12
    colors.push(clothed?.075:shoe?.025:0,clothed?.23:shoe?.032:0,clothed?.52:shoe?.043:0,clothed||shoe?1:0)
    if(clothed&&Math.abs(x)<.28&&y>.76&&y<1.43) {
      // Loose scrub fabric over the body, rather than a painted skin silhouette.
      p.setX(i,x*1.10);p.setZ(i,z+Math.sign(z)*.016)
    }
  }
  g.setAttribute('scrubColor',new THREE.Float32BufferAttribute(colors,4));g.computeVertexNormals();mesh.geometry=g
  const material=mesh.material.clone();material.map=lightSkin;material.normalMap=null;material.roughnessMap=null;material.roughness=.84
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec4 scrubColor; varying vec4 vScrubColor;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvScrubColor=scrubColor;')
    shader.fragmentShader='varying vec4 vScrubColor;\n'+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vScrubColor.rgb,vScrubColor.a);')
  }
  mesh.material=material
})
body.scene.updateMatrixWorld(true)
const head=body.scene.getObjectByName('Head')
const hairObject=hair.scene
const hbox=new THREE.Box3().setFromObject(hairObject)
const hpos=new THREE.Vector3();head.getWorldPosition(hpos)
figure.add(hairObject);head.attach(hairObject)
hairObject.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.color.set(0x503024);m.material.roughness=.8}})
const badge=new THREE.Mesh(new THREE.BoxGeometry(.045,.065,.009),new THREE.MeshStandardMaterial({color:0xe9e5d8,roughness:.9}))
badge.position.set(-.095,1.265,.16);figure.add(badge);body.scene.getObjectByName('spine_03').attach(badge)
const clipboard=new THREE.Group()
clipboard.add(new THREE.Mesh(new THREE.BoxGeometry(.25,.018,.16),new THREE.MeshStandardMaterial({color:0x214562,roughness:.85})))
const paper=new THREE.Mesh(new THREE.BoxGeometry(.21,.003,.13),new THREE.MeshStandardMaterial({color:0xf5f1e5,roughness:.95}));paper.position.y=.011;clipboard.add(paper)
for(let n=0;n<3;n++){const line=new THREE.Mesh(new THREE.BoxGeometry(.13,.002,.004),new THREE.MeshStandardMaterial({color:0x566d7b}));line.position.set(0,.014,-.035+n*.025);clipboard.add(line)}
figure.add(clipboard);clipboard.visible=false
const mixer=new THREE.AnimationMixer(body.scene)
const clips=Object.fromEntries(library.animations.map(c=>[c.name,c]))
const sourcePelvis=library.scene.getObjectByName('pelvis'),targetPelvis=body.scene.getObjectByName('pelvis')
// Keep target bind translations. Shared humanoid bone names transfer rotation
// tracks directly; source pelvis displacement is rebased onto the nurse rig.
for(const clip of Object.values(clips))for(const track of clip.tracks) {
  if(!track.name.endsWith('.position'))continue
  const name=track.name.slice(0,-9),source=library.scene.getObjectByName(name),target=body.scene.getObjectByName(name)
  if(!source||!target)continue
  for(let i=0;i<track.values.length;i+=3)for(let axis=0;axis<3;axis++) {
    const k=['x','y','z'][axis]
    track.values[i+axis]+=target.position[k]-source.position[k]
  }
}
const directions={se:Math.PI/2,sw:0,nw:-Math.PI/2,ne:Math.PI}
function pose(direction,clipName,time,workKind) {
  mixer.stopAllAction()
  const action=mixer.clipAction(clips[clipName]);action.play();mixer.setTime(time)
  if(clipName==='Push_Loop') {
    // A heavy-object push bends the source rig too far for a hospital cart.
    // Retain its holding arms, with the upright walk supplying legs and spine.
    const armNames=['upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r']
    body.scene.updateMatrixWorld(true)
    const rotations=armNames.map(name=>body.scene.getObjectByName(name).getWorldQuaternion(new THREE.Quaternion()))
    mixer.stopAllAction();mixer.clipAction(clips.Walk_Loop).play();mixer.setTime(time*clips.Walk_Loop.duration/clips.Push_Loop.duration)
    body.scene.updateMatrixWorld(true)
    armNames.forEach((name,i)=>{const bone=body.scene.getObjectByName(name);bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotations[i]));bone.updateMatrixWorld(true)})
  }
  if(workKind==='chart') {
    // Transfer only the typing-height arms; retain standing legs and planted feet.
    const armNames=['upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','hand_l','hand_r']
    body.scene.updateMatrixWorld(true)
    const rotations=armNames.map(name=>body.scene.getObjectByName(name).getWorldQuaternion(new THREE.Quaternion()))
    mixer.stopAllAction();mixer.clipAction(clips.Idle_Loop).play();mixer.setTime(0)
    body.scene.updateMatrixWorld(true)
    armNames.forEach((name,i)=>{const bone=body.scene.getObjectByName(name);bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotations[i]));bone.updateMatrixWorld(true)})
    body.scene.getObjectByName('hand_r').rotateX(Math.sin(time*14)*.08)
  }
  clipboard.visible=workKind==='chart'
  if(clipboard.visible){
    body.scene.updateMatrixWorld(true)
    const left=body.scene.getObjectByName('hand_l').getWorldPosition(new THREE.Vector3()),right=body.scene.getObjectByName('hand_r').getWorldPosition(new THREE.Vector3())
    clipboard.position.copy(figure.worldToLocal(left.add(right).multiplyScalar(.5)));clipboard.position.y-=.025
  }
  figure.rotation.y=directions[direction]
  scene.updateMatrixWorld(true);renderer.render(scene,camera)
}
window.nurseBake={
  info:{clips:Object.keys(clips),bodyBounds:new THREE.Box3().setFromObject(body.scene).getSize(new THREE.Vector3()).toArray(),hairBounds:hbox.getSize(new THREE.Vector3()).toArray(),pelvis:[sourcePelvis.position.toArray(),targetPelvis.position.toArray()]},
  pose,
  bake(){
    const width=220,height=233,count=16,rows=20,columns=16
    const output=document.createElement('canvas');output.width=columns*width;output.height=rows*height
    const ctx=output.getContext('2d'),frames={},pivots={},diagnostics=[]
    const foot=new THREE.Vector3(0,0,0).project(camera)
    const pivotX=(foot.x+1)/2,pivotY=(1-foot.y)/2
    for(const [directionIndex,direction] of Object.keys(directions).entries())for(let n=0;n<59;n++) {
      const walk=n<count,push=n>=16&&n<32
      const workKind=n>=35&&n<43?'assess':n>=43&&n<51?'treat':n>=51?'chart':null
      const workFrame=workKind?(n-35)%8:0
      const clipName=walk?'Walk_Loop':push?'Push_Loop':n===32?'Idle_Loop':workKind==='treat'?'PickUp_Table':workKind==='chart'?'Driving_Loop':'Interact'
      const time=workKind ? workKind==='chart'?clips[clipName].duration*workFrame/8 : clips[clipName].duration*(.18+.42*(.5-.5*Math.cos(workFrame/8*Math.PI*2))) : walk?clips[clipName].duration*n/count:push?clips[clipName].duration*(n-16)/count:n===32?0:n===33?.35:.55
      const row=directionIndex+(walk?0:push?4:workKind?workKind==='assess'?12:workKind==='treat'?16:8:8),column=walk?n:push?n-16:workKind?workFrame+ (workKind==='chart'?4:0):n-32
      pose(direction,clipName,time,workKind)
      ctx.drawImage(renderer.domElement,column*width,row*height)
      const name=`${direction}-${walk?'walk-'+column:push?'push-'+column:n===32?'idle-0':workKind?workKind+'-'+workFrame:'care-'+(n-33)}`
      frames[name]={frame:{x:column*width,y:row*height,w:width,h:height},rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:width,h:height},sourceSize:{w:width,h:height}}
      pivots[name]={pivotX,pivotY}
      if(walk) {
        const a=new THREE.Vector3(),b=new THREE.Vector3()
        body.scene.getObjectByName('foot_l').getWorldPosition(a);body.scene.getObjectByName('foot_r').getWorldPosition(b)
        diagnostics.push({direction,frame:column,left:a.toArray(),right:b.toArray()})
      }
    }
    // Trim transparent padding while retaining the common source rectangle and
    // ground origin. Phaser restores these offsets; no pose-specific shoe pivot.
    const bounds=Object.values(frames).map(({frame:f})=>{
      const pixels=ctx.getImageData(f.x,f.y,width,height).data
      let minX=width,minY=height,maxX=0,maxY=0
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]) {
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)
      }
      return {x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}
    })
    const cellW=Math.max(...bounds.map(b=>b.w))+4,cellH=Math.max(...bounds.map(b=>b.h))+4
    const packed=document.createElement('canvas');packed.width=cellW*16;packed.height=cellH*Math.ceil(bounds.length/16)
    const target=packed.getContext('2d')
    Object.values(frames).forEach((entry,i)=>{
      const crop=bounds[i],x=(i%16)*cellW+2,y=Math.floor(i/16)*cellH+2
      target.drawImage(output,entry.frame.x+crop.x,entry.frame.y+crop.y,crop.w,crop.h,x,y,crop.w,crop.h)
      entry.frame={x,y,w:crop.w,h:crop.h};entry.trimmed=true;entry.spriteSourceSize=crop
    })
    return {png:packed.toDataURL('image/png'),atlas:{frames,meta:{image:'rigged-nurse-sheet.png',size:{w:packed.width,h:packed.height},scale:'1'}},pivots:{frames:pivots},diagnostics}
  },
}
pose('se','Walk_Loop',0)

