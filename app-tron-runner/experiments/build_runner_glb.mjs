import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRTextureTransform } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, dequantize, meshopt, resample, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('assets/Superhero_Male_FullBody.gltf');
const root = doc.getRoot();
// 1. keep only the body mesh (drop eyes/eyebrows/hair; the game uses a helmet)
for (const n of root.listNodes()) { const m = n.getMesh(); if (m && n.getName() !== 'SuperHero_Male') { n.setMesh(null); n.setSkin(null); } }
// body material: drop base colour texture (the game paints a black Tron suit), keep normal + roughness
const bodyMat = root.listMaterials().find(m => m.getName() === 'MI_Superhero_Male');
bodyMat.setBaseColorTexture(null);
// 2. bring in animations from the two libraries, re-targeted by joint name
const want = {
  'assets/UAL1.glb': ['Sprint_Loop','Jog_Fwd_Loop','Idle_Loop','Jump_Start','Jump_Loop','Jump_Land','Hit_Chest','Death01','Dance_Loop','Roll'],
  'assets/UAL2.glb': ['Slide_Start','Slide_Loop','Slide_Exit','Hit_Knockback','NinjaJump_Idle_Loop'],
};
const byName = new Map(); root.listNodes().forEach(n => byName.set(n.getName(), n));
for (const [file, names] of Object.entries(want)) {
  const src = await io.read(file);
  const srcNodes = new Map(); src.getRoot().listNodes().forEach(n => srcNodes.set(n.getName(), n));
  for (const an of src.getRoot().listAnimations()) {
    if (!names.includes(an.getName())) continue;
    const out = doc.createAnimation(an.getName());
    let skipped = 0;
    for (const ch of an.listChannels()) {
      const tn = byName.get(ch.getTargetNode().getName());
      if (!tn) { skipped++; continue; }
      const sm = ch.getSampler();
      const input = doc.createAccessor().setType('SCALAR').setArray(sm.getInput().getArray().slice());
      const outAcc = doc.createAccessor().setType(sm.getOutput().getType()).setArray(sm.getOutput().getArray().slice());
      const nsm = doc.createAnimationSampler().setInput(input).setOutput(outAcc).setInterpolation(sm.getInterpolation());
      const nch = doc.createAnimationChannel().setTargetNode(tn).setTargetPath(ch.getTargetPath()).setSampler(nsm);
      out.addSampler(nsm); out.addChannel(nch);
    }
    console.log(file.split('/').pop(), an.getName(), 'channels', out.listChannels().length, 'skipped', skipped);
  }
}
// 3. optimise
await doc.transform(
  dequantize(), prune(), dedup(), weld(),
  resample({ tolerance: 0.0008 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
);
await io.write('runner.glb', doc);
