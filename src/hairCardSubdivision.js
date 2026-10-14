import { BufferGeometry, BufferAttribute } from 'three';

// One standard Loop-subdivision step on the EXISTING artist mesh. No hairstyle
// generation, scalp projection or hand-sculpted offsets. UV seams stay separate;
// non-manifold junctions are pinned rather than tearing or producing NaNs.
// Imported models never enter this function. A budget limits desktop-pet cost.
export function refineArtistHairCards(source) {
  if (!source?.index || !source.attributes.position || !source.attributes.uv ||
      source.morphAttributes.position?.length || source.index.count > 90000) return source;
  const p=source.attributes.position, uv=source.attributes.uv, normal=source.attributes.normal;
  const ids=source.index.array, n=p.count;
  const edges=new Map(), adjacent=Array.from({length:n},()=>new Set());
  const boundary=Array.from({length:n},()=>[]), invalid=new Set();
  const key=(a,b)=>a<b?`${a}/${b}`:`${b}/${a}`;
  const add=(a,b,c)=>{
    const k=key(a,b);let edge=edges.get(k);
    if(!edge){edge={a:Math.min(a,b),b:Math.max(a,b),opposite:[],index:n+edges.size};edges.set(k,edge);}
    edge.opposite.push(c);adjacent[a].add(b);adjacent[b].add(a);
  };
  for(let i=0;i<ids.length;i+=3){const a=ids[i],b=ids[i+1],c=ids[i+2];if(a===b||a===c||b===c)continue;add(a,b,c);add(b,c,a);add(c,a,b);}
  for(const e of edges.values()){
    if(e.opposite.length===1){boundary[e.a].push(e.b);boundary[e.b].push(e.a);}
    else if(e.opposite.length!==2){invalid.add(e.a);invalid.add(e.b);}
  }
  const positions=new Float32Array((n+edges.size)*3), texcoords=new Float32Array((n+edges.size)*2);
  const normals=new Float32Array((n+edges.size)*3);
  const read=(a,k)=>p.array[a*3+k];
  for(let i=0;i<n;i++){
    const neighbors=[...adjacent[i]], border=boundary[i];
    for(let k=0;k<3;k++){
      let v=read(i,k);
      if(!invalid.has(i)){
        if(border.length===2) v=0.75*v+0.125*(read(border[0],k)+read(border[1],k));
        else if(border.length===0&&neighbors.length>=3){const beta=neighbors.length===3?3/16:3/(8*neighbors.length);v=(1-neighbors.length*beta)*v+beta*neighbors.reduce((s,j)=>s+read(j,k),0);}
      }
      positions[i*3+k]=v;normals[i*3+k]=normal?normal.array[i*3+k]:0;
    }
    texcoords[i*2]=uv.getX(i);texcoords[i*2+1]=uv.getY(i);
  }
  for(const e of edges.values()){
    const {a,b,index:i,opposite:o}=e;
    for(let k=0;k<3;k++){
      positions[i*3+k]=o.length===2?(3*(read(a,k)+read(b,k))+read(o[0],k)+read(o[1],k))/8:(read(a,k)+read(b,k))/2;
      normals[i*3+k]=normal?(normal.array[a*3+k]+normal.array[b*3+k])/2:0;
    }
    texcoords[i*2]=(uv.getX(a)+uv.getX(b))/2;texcoords[i*2+1]=(uv.getY(a)+uv.getY(b))/2;
  }
  const indices=[];
  for(let f=0;f<ids.length;f+=3){const a=ids[f],b=ids[f+1],c=ids[f+2];if(a===b||a===c||b===c)continue;const ab=edges.get(key(a,b)).index,bc=edges.get(key(b,c)).index,ca=edges.get(key(c,a)).index;indices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
  const result=new BufferGeometry();
  result.setAttribute('position',new BufferAttribute(positions,3));
  result.setAttribute('uv',new BufferAttribute(texcoords,2));
  result.setAttribute('normal',new BufferAttribute(normals,3));
  // Re-evaluate geometric normals after subdivision rather than carrying the
  // historical "radial skull normal" field into a differently curved hair card.
  result.setIndex(indices);result.computeVertexNormals();
  // Keep the author's orientation. Some old two-sided cards use reversed faces.
  const out=result.attributes.normal.array;
  for(let i=0;i<out.length;i+=3)if(out[i]*normals[i]+out[i+1]*normals[i+1]+out[i+2]*normals[i+2]<0){out[i]*=-1;out[i+1]*=-1;out[i+2]*=-1;}
  result.userData={...source.userData,artistSubdivision:true,sourceTriangles:ids.length/3};
  // Do not carry deformation caches whose array lengths belong to the old mesh.
  delete result.userData.basePositions;delete result.userData.baseHairNormals;delete result.userData.hairShapeSignature;
  for(const group of source.groups) result.addGroup(group.start*4,group.count*4,group.materialIndex);
  result.computeBoundingBox();result.computeBoundingSphere();
  return result;
}
