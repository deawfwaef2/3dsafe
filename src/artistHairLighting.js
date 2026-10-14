import { BufferAttribute } from 'three';

// Derive a smooth area-weighted per-vertex hair flow tangent from the artist UVs.
export function updateArtistHairFlow(geometry, horizontal = false) {
  const p = geometry.attributes.position, uv = geometry.attributes.uv;
  if (!p || !uv) return;
  const values = new Float32Array(p.count * 3), indices = geometry.index;
  const count = indices ? indices.count : p.count;
  for (let f = 0; f + 2 < count; f += 3) {
    const ids = [0, 1, 2].map(k => indices ? indices.getX(f + k) : f + k);
    const [a, b, c] = ids;
    const du1 = uv.getX(b) - uv.getX(a), dv1 = uv.getY(b) - uv.getY(a);
    const du2 = uv.getX(c) - uv.getX(a), dv2 = uv.getY(c) - uv.getY(a);
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-12) continue;
    const e1 = [p.getX(b) - p.getX(a), p.getY(b) - p.getY(a), p.getZ(b) - p.getZ(a)];
    const e2 = [p.getX(c) - p.getX(a), p.getY(c) - p.getY(a), p.getZ(c) - p.getZ(a)];
    const flow = e1.map((v, k) => (horizontal ? v * dv2 - e2[k] * dv1 : e2[k] * du1 - v * du2) / det);
    const len = Math.hypot(...flow);
    if (len < 1e-12) continue;
    const area = Math.hypot(
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0]
    );
    for (const i of ids) {
      for (let k = 0; k < 3; k++) values[i * 3 + k] += (flow[k] / len) * area;
    }
  }
  for (let i = 0; i < p.count; i++) {
    const k = i * 3, length = Math.hypot(values[k], values[k + 1], values[k + 2]);
    if (length > 1e-12) {
      for (let j = 0; j < 3; j++) values[k + j] /= length;
    }
  }
  geometry.setAttribute('artistHairFlow', new BufferAttribute(values, 3));
  geometry.userData.hairFlowHorizontal = horizontal;
}

export function injectArtistHairLighting(shader) {
  shader.vertexShader = 'attribute vec3 artistHairFlow;\nvarying vec3 vArtistHairFlow;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\nvArtistHairFlow = mat3(modelViewMatrix) * artistHairFlow;'
  );
  shader.fragmentShader = 'varying vec3 vArtistHairFlow;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', `
    #include <lights_physical_pars_fragment>
    vec3 hairFlowT;
    float hairFlowValid;
    float hairAtlasValue;
    float hairLobe(float th, float exponent) {
      return pow(max(1.0 - th * th, 0.0), exponent * 0.5);
    }
    void RE_Direct_ArtistHair(const in IncidentLight incident,
      const in vec3 geometryPosition, const in vec3 N, const in vec3 V,
      const in vec3 clearcoatNormal, const in PhysicalMaterial material,
      inout ReflectedLight reflectedLight) {
      ReflectedLight ordinary;
      ordinary.directDiffuse = vec3(0.0);
      ordinary.directSpecular = vec3(0.0);
      ordinary.indirectDiffuse = vec3(0.0);
      ordinary.indirectSpecular = vec3(0.0);
      RE_Direct_Physical(incident, geometryPosition, N, V, clearcoatNormal, material, ordinary);

      // Wrap diffuse slightly around cylindrical hair fibers so dark hair cards don't crush to flat black
      float ndl = dot(N, incident.direction);
      float wrapDiffuse = max((ndl + 0.32) / 1.32, 0.0);
      vec3 strandDiffuse = incident.color * material.diffuseColor * (wrapDiffuse * 0.42);
      reflectedLight.directDiffuse += mix(ordinary.directDiffuse, max(ordinary.directDiffuse, strandDiffuse), hairFlowValid);

      vec3 H = normalize(incident.direction + V + vec3(1e-7));
      // Dual-lobe Marschner / Kajiya-Kay cuticle shift: R lobe (-3.5 deg), TRT lobe (+7.5 deg)
      vec3 T1 = normalize(hairFlowT + N * 0.08);
      vec3 T2 = normalize(hairFlowT - N * 0.18);
      float gloss = clamp(1.0 - material.roughness, 0.0, 1.0);
      float exponent1 = mix(36.0, 128.0, gloss);
      float exponent2 = mix(14.0, 46.0, gloss);
      float primary = hairLobe(clamp(dot(T1, H), -1.0, 1.0), exponent1);
      float secondary = hairLobe(clamp(dot(T2, H), -1.0, 1.0), exponent2);

      // Keratin fiber Fresnel + strand ridge modulation
      float cosVH = max(dot(V, H), 0.0);
      float keratinF = 0.055 + 0.22 * pow(1.0 - cosVH, 4.0);
      float strandWeight = mix(0.28, 1.28, hairAtlasValue);
      vec3 azimuthH = H - hairFlowT * dot(H, hairFlowT);
      float azimuthLength = max(length(azimuthH), 1e-5);
      float azimuth = 0.28 + 0.72 * pow(max(dot(N, azimuthH / azimuthLength), 0.0), 1.6);
      float visibility = smoothstep(-0.18, 0.35, ndl);

      // Primary R lobe has subtle hair-tone warmth; Secondary TRT lobe carries warm melanin internal tint
      vec3 rColor = mix(vec3(0.76, 0.75, 0.78), clamp(material.diffuseColor * 3.2 + vec3(0.28), vec3(0.25), vec3(0.85)), 0.45);
      vec3 trtColor = clamp(material.diffuseColor * 3.6 + vec3(0.16, 0.11, 0.08), vec3(0.10), vec3(0.78));
      vec3 fiber = incident.color * visibility * keratinF * strandWeight * azimuth
                 * (rColor * primary * 0.92 + trtColor * secondary * 0.68);
      reflectedLight.directSpecular += mix(ordinary.directSpecular, fiber, hairFlowValid);
    }
    #undef RE_Direct
    #define RE_Direct RE_Direct_ArtistHair
  `);
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_fragment>', `
    hairFlowValid = 0.0;
    hairAtlasValue = 0.5;
    hairFlowT = normalize(cross(normal, abs(normal.y) < 0.99 ? vec3(0, 1, 0) : vec3(1, 0, 0)));
    #ifdef USE_MAP
      vec3 flow = vArtistHairFlow - normal * dot(normal, vArtistHairFlow);
      float flowLength2 = dot(flow, flow);
      if (flowLength2 > 1e-12) {
        hairFlowT = flow * inversesqrt(flowLength2);
        hairFlowValid = 1.0;
      }
      hairAtlasValue = sqrt(clamp(dot(texture2D(map, vMapUv).rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0));
    #endif
    #include <lights_physical_fragment>
  `);
}
