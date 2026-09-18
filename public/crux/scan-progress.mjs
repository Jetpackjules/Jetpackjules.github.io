// Live milestones have no playback clock: only actual results advance the scan.
// The separate Replay reveal control owns the optional timed presentation.
export function identifyHoldBoxes(boxes){
 const ids=new Map([...boxes].sort((a,b)=>b.y-a.y||a.x-b.x).map((h,i)=>[h,h.id||'h'+(i+1)]));
 // Preserve detector order for the existing contour/color pipeline.
 return boxes.map(h=>({...h,id:ids.get(h)}));
}
export function createLiveScan(render){
 let generation=0,current=null;
 const emit=()=>{
  const s=current;
  render(s?{...s,active:true,phase:!s.boxesReady?'finding':!s.holdsReady?'outlining':!s.wallsReady?'walls':'planning',showHolds:s.boxesReady,showFacets:s.wallsReady&&s.hasFacets}:{active:false,phase:'idle',showHolds:false,showFacets:false,holdsReady:false});
 };
 return {
  begin(){const id=++generation;current={id,boxesReady:false,holdsReady:false,wallsReady:false,hasFacets:false};emit();return id;},
  isCurrent(id){return current?.id===id;},
  update(id,patch){if(current?.id!==id)return false;for(const key of ['boxesReady','holdsReady','wallsReady','hasFacets'])if(patch[key]!==undefined)current[key]=!!patch[key];emit();return true;},
  finish(id){if(current?.id!==id)return false;current=null;emit();return true;},
  cancel(){generation++;current=null;emit();}
 };
}
