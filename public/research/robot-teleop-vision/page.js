(()=>{
  const simulationLayout=window.matchMedia('(max-width:760px)');
  simulationLayout.addEventListener('change',()=>document.querySelectorAll('#simulation-video,.simulation-single').forEach(video=>video.pause()));
  const main=document.getElementById('operator-video');
  const other=document.getElementById('physical-video');
  const play=document.getElementById('pair-play');
  const restart=document.getElementById('pair-restart');
  const seek=document.getElementById('pair-seek');
  const time=document.getElementById('pair-time');
  const status=document.getElementById('pair-status');
  const controls=document.querySelector('.pair-controls');
  if(!main||!other)return;
  controls.hidden=false;main.controls=false;other.controls=false;
  let duration=17.2;let scrubbing=false;
  const stamp=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const update=()=>{const playing=!main.paused;play.textContent=playing?'Pause both views':'Play both views';play.setAttribute('aria-pressed',String(playing));time.textContent=`${stamp(main.currentTime)} / ${stamp(duration)}`;if(!scrubbing)seek.value=main.currentTime;};
  const pause=()=>{main.pause();other.pause();update();};
  const jump=value=>{main.currentTime=value;other.currentTime=value;update();};
  const start=async()=>{
    if(main.currentTime>=duration-.1)jump(0);
    other.currentTime=main.currentTime;
    const results=await Promise.allSettled([main.play(),other.play()]);
    if(results.some(r=>r.status==='rejected')){pause();main.controls=true;other.controls=true;status.textContent='Use the controls on either video if paired playback is unavailable.';}
    else status.textContent='Recorded live. The two recordings are aligned for viewing.';
    update();
  };
  play.addEventListener('click',()=>main.paused?start():pause());
  restart.addEventListener('click',()=>{pause();jump(0);});
  seek.addEventListener('input',()=>{scrubbing=true;jump(Number(seek.value));});
  seek.addEventListener('change',()=>{scrubbing=false;update();});
  main.addEventListener('loadedmetadata',()=>{if(Number.isFinite(main.duration)){duration=Math.min(17.2,main.duration);seek.max=duration;}update();});
  main.addEventListener('timeupdate',()=>{if(!main.paused&&Math.abs(other.currentTime-main.currentTime)>.18)other.currentTime=main.currentTime;update();});
  main.addEventListener('ended',pause);
  main.addEventListener('pause',()=>{other.pause();update();});
  for(const video of [main,other])video.addEventListener('error',()=>{pause();status.textContent='This clip could not load. The full demonstration below is available separately.';});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
})();
