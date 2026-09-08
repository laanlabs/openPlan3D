<script lang="ts">
  import { onMount } from 'svelte';
  import { dev } from '$app/environment';
  import type { createViewer, LabStatus } from '$lib/renderLab/viewer';
  let { startupModel = '' }: { startupModel?: string } = $props();
  let host: HTMLDivElement;
  let viewer: Awaited<ReturnType<typeof createViewer>> | undefined;
  let status = $state<LabStatus>({ samples: 0, triangles: 0, mode: 'Starting' });
  let loading = $state(true), loaded = $state(false), quality = $state(true), paused = $state(false);
  let error = $state(''), name = $state('Local floorplan'), exposure = $state(1);
  let selectedView = $state('isometric');
  async function load(buffer: ArrayBuffer, title: string) {
    loading = true; error = '';
    try { if (!viewer) throw new Error('The renderer is unavailable. Reload using a browser with WebGL 2 support.'); await viewer.load(buffer); loaded = true; name = title; selectedView = 'isometric'; }
    catch (e) { error = e instanceof Error ? e.message : String(e); }
    finally { loading = false; }
  }
  async function fileChanged(event: Event) {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0];
    if (!file) return;
    if (file.size > 128 * 1024 * 1024) { error = 'Choose a GLB smaller than 128 MB.'; input.value = ''; return; }
    await load(await file.arrayBuffer(), file.name.replace(/\.glb$/i, '')); input.value = '';
  }
  function setView(view: string) { selectedView = view; viewer?.preset(view); }
  onMount(() => {
    let canceled = false;
    void (async () => {
      try {
        const module = await import('$lib/renderLab/viewer');
        if (canceled) return;
        viewer = await module.createViewer(host, s => { status = s; if (s.error) error = s.error; });
        if (canceled) { viewer.dispose(); return; }
        if (dev || startupModel) {
          const response = await fetch(startupModel || '/__render-lab/scene.glb');
          if (response.ok && (startupModel || response.headers.get('content-type')?.includes('model/gltf-binary'))) {
            await load(await response.arrayBuffer(), 'Capture study');
          }
        }
      } catch (e) { error = e instanceof Error ? e.message : String(e); }
      finally { loading = false; }
    })();
    return () => { canceled = true; viewer?.dispose(); };
  });
</script>

<svelte:head><title>Render lab · OpenPlan3D</title><meta name="robots" content="noindex" /></svelte:head>
<div class="lab">
  <header>
    <a href="/" class="brand"><span class="mark">◈</span> OpenPlan3D <span class="divider">/</span> <span class="light">Render lab</span></a>
    <div class="private"><span></span> {startupModel ? 'Browser rendering' : 'Local workspace'}</div>
  </header>
  <main>
    <aside>
      <div class="eyebrow">RENDER STUDY / 01</div>
      <h1>A different<br />point of view.</h1>
      <p class="intro">Explore your captured space with natural light, real materials, and a little more detail.</p>
      <section>
        <div class="section-title">Rendering <span class="tag">THREE.JS</span></div>
        <div class="modes">
          <button class:active={!quality} disabled={!loaded || loading} onclick={() => { quality = false; paused = false; viewer?.setQuality(false); }}>Interactive</button>
          <button class:active={quality} disabled={!loaded || loading} onclick={() => { quality = true; paused = false; viewer?.setQuality(true); }}>Path traced</button>
        </div>
        <p class="hint">{quality ? 'Light refines while you hold the view still. Moving the camera restarts the render.' : 'A fast preview for exploring the space. Switch to path tracing for softer light and reflections.'}</p>
        <div class="progress-label"><span>{status.mode}</span><strong>{quality ? `${status.samples} / 512` : 'Live'}</strong></div>
        <div class="progress"><div style={`width:${quality ? status.samples / 512 * 100 : 100}%`}></div></div>
        <button class="text-button" disabled={!loaded || !quality} onclick={() => { paused = !paused; viewer?.setPaused(paused); }}>{paused ? 'Resume refinement' : 'Pause refinement'}</button>
      </section>
      <section>
        <div class="section-title">Camera</div>
        <div class="views">
          {#each [['isometric', 'Overview'], ['top', 'Top down'], ['reverse', 'Reverse']] as [value, label]}
            <button class:chosen={selectedView === value} disabled={!loaded} onclick={() => setView(value)}>{label}</button>
          {/each}
        </div>
        <label class="exposure" for="exposure">Exposure <span>{exposure.toFixed(2)}</span></label>
        <input id="exposure" type="range" min="0.4" max="2" step="0.05" bind:value={exposure} oninput={() => viewer?.setExposure(exposure)} />
      </section>
      <section class="files">
        <button class="export" disabled={!loaded || loading} onclick={() => viewer?.exportPNG()}>Save this view <span>↗</span></button>
        <label class="open-file">Open a local GLB<input type="file" accept=".glb" disabled={loading} onchange={fileChanged} /></label>
        <p class="hint">Files stay in your browser. No uploads, accounts, or cloud rendering.</p>
      </section>
      <div class="footnote">EXPERIMENTAL PREVIEW<br /><span>Photo-informed materials. Modeled furniture. Not a measured reconstruction.</span></div>
    </aside>
    <div class="viewport">
      <div class="canvas-host" bind:this={host}></div>
      <div class="scene-label"><span class="dot"></span>{name}<span class="model-count">{loaded ? `${Math.round(status.triangles / 1000)}k triangles` : 'No model loaded'}</span></div>
      {#if loading}<div class="message" role="status"><span class="spinner"></span>Preparing your scene…</div>{/if}
      {#if !loaded && !loading && !error}<div class="message">Open a local GLB to start exploring.</div>{/if}
      {#if error}<div class="error" role="alert">{error}</div>{/if}
      <div class="gesture">Drag to orbit <i>·</i> Scroll to zoom <i>·</i> Right-drag to pan</div>
      <div class="corner">01 <span>/</span> SPATIAL STUDY</div>
    </div>
  </main>
</div>
<style>
  :global(body){margin:0}.lab{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f8f7f4;color:#292b27;height:100dvh;display:flex;flex-direction:column}header{height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;border-bottom:1px solid #dedfd8;flex-shrink:0}.brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit;font-size:17px;font-weight:650;letter-spacing:-.4px}.mark{font-size:29px;color:#6b775a}.divider{margin:0 9px;color:#babdb1;font-weight:300}.light{font-weight:400;color:#7c8074}.private{font-size:12px;display:flex;gap:8px;align-items:center;color:#6f7866}.private span,.dot{width:6px;height:6px;background:#7d8c65;border-radius:50%;display:inline-block}main{display:flex;flex:1;min-height:0}aside{width:306px;flex-shrink:0;padding:34px 26px 22px;border-right:1px solid #dedfd8;overflow:auto}.eyebrow{font-size:10px;font-weight:600;letter-spacing:2.1px;color:#7c826e}h1{font-family:Georgia,serif;font-size:37px;font-weight:400;letter-spacing:-1.4px;line-height:1.13;margin:20px 0 16px}.intro{font-size:12px;line-height:1.7;color:#7d8077;margin:0 0 28px}section{padding:21px 0;border-top:1px solid #e2e3dc}.section-title{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;margin-bottom:14px}.tag{font-size:9px;letter-spacing:1px;color:#8b907f}.modes{display:flex;background:#ebece5;padding:3px;border-radius:7px}.modes button{width:50%;font-size:11px;padding:10px 4px;border:0;background:none;border-radius:5px;color:#7b8172}.modes button.active{background:#fff;color:#38422b;box-shadow:0 1px 5px #0000000c}.hint{font-size:10px;line-height:1.65;color:#8b8e84;margin:12px 0}.progress-label{display:flex;justify-content:space-between;font-size:10px;color:#7b8172;margin-top:19px}.progress-label strong{font-weight:500}.progress{height:3px;background:#e2e5da;margin-top:8px;overflow:hidden}.progress div{height:100%;background:#7b8963;transition:width .2s}.text-button{background:none;border:0;padding:10px 0 0;font-size:10px;color:#6e795e}.views{display:flex;gap:6px}.views button{flex:1;background:transparent;border:1px solid #dfe2d6;padding:9px 2px;border-radius:5px;font-size:10px;color:#7b8172}.views button.chosen{border-color:#82916d;color:#455335;background:#eef0e7}.exposure{display:flex;justify-content:space-between;font-size:11px;margin-top:22px;color:#7b8172}input[type=range]{width:100%;accent-color:#778763;height:18px;margin-top:8px}.export{display:flex;justify-content:space-between;align-items:center;background:#566348;color:white;border:0;border-radius:6px;padding:13px 15px;width:100%;font-size:12px}.export span{font-size:19px}.open-file{display:block;text-align:center;border:1px solid #dce0d3;border-radius:6px;padding:11px;font-size:11px;color:#6b745e;margin-top:9px;cursor:pointer}.open-file{position:relative}.open-file input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}.footnote{font-size:9px;letter-spacing:1.2px;line-height:1.7;color:#8d9284;margin-top:10px}.footnote span{letter-spacing:0;display:block;margin-top:5px}button{cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,a:focus-visible,label:focus-within{outline:2px solid #61764b;outline-offset:3px}.viewport{position:relative;flex:1;min-width:0;background:#e8e5df;overflow:hidden}.canvas-host{position:absolute;inset:0}.canvas-host :global(canvas){display:block;width:100%;height:100%}.scene-label{position:absolute;left:30px;top:26px;display:flex;align-items:center;gap:9px;font-size:12px;color:#696e60;pointer-events:none}.model-count{font-size:10px;color:#9b9e93;margin-left:5px}.gesture{position:absolute;bottom:27px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;color:#898d81;pointer-events:none}.gesture i{font-style:normal;margin:0 9px;color:#b8bbae}.corner{position:absolute;bottom:26px;right:28px;font-size:9px;letter-spacing:1.3px;color:#909684;pointer-events:none}.corner span{color:#afb5a2;margin:0 7px}.message{position:absolute;top:45%;left:50%;transform:translate(-50%,-50%);background:#f8f7f4ed;padding:20px 25px;border-radius:8px;box-shadow:0 8px 40px #00000008;font-size:13px;color:#657052;display:flex;align-items:center;gap:13px}.spinner{width:15px;height:15px;border:2px solid #d4dac9;border-top-color:#71865c;border-radius:50%;animation:spin 1s linear infinite}.error{position:absolute;left:25px;right:25px;top:60px;padding:15px;background:#fff6ee;color:#935538;border-radius:6px;font-size:12px}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:800px){header{height:58px;padding:0 18px}.brand{font-size:14px}.private{font-size:10px}aside{width:220px;padding:25px 18px}h1{font-size:30px}.corner{display:none}.scene-label{left:16px;top:16px}.model-count{display:none}.gesture{font-size:9px}}@media(max-width:560px){main{flex-direction:column-reverse}.viewport{flex:none;height:55dvh}aside{width:auto;border-right:0;padding:20px;flex:1}.eyebrow,h1,.intro,.footnote{display:none}section{padding:14px 0}.private{display:none}.gesture{bottom:14px}.brand .divider{margin:0 4px}}
</style>
