(()=>{
  const simulationLayout=window.matchMedia('(max-width:760px)');
  simulationLayout.addEventListener('change',()=>document.querySelectorAll('#simulation-video,.simulation-single').forEach(video=>video.pause()));
  const main=document.getElementById('operator-video');
  const other=document.getElementById('physical-video');
  if(!main||!other)return;
  const pair=[main,other];
  const configure=()=>pair.forEach(video=>{
    video.muted=true;
    video.defaultPlaybackRate=1.3;
    video.playbackRate=1.3;
  });
  const synchronize=()=>{
    if(other.readyState>0&&Math.abs(other.currentTime-main.currentTime)>.12){
      other.currentTime=main.currentTime;
    }
  };
  const start=()=>{
    if(document.hidden)return;
    configure();
    synchronize();
    for(const video of pair)if(video.paused)void video.play().catch(()=>{});
  };
  configure();
  for(const video of pair){
    video.addEventListener('loadedmetadata',configure);
    video.addEventListener('canplay',start);
  }
  main.addEventListener('timeupdate',()=>{if(!main.paused)synchronize();});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)pair.forEach(video=>video.pause());
    else start();
  });
  start();
})();
