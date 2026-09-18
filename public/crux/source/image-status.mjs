// One image-local status for concurrent detection and route work.
export function createImageStatus(render,{setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const active=new Map(),priority={holds:3,walls:2,plan:1};let notice=null,timer;
 const refresh=()=>{
  const work=[...active].sort((a,b)=>(priority[b[0]]||0)-(priority[a[0]]||0))[0];
  const current=work&&(priority[work[0]]||0)>1?{text:work[1],busy:true}:notice?{text:notice.text,busy:false}:work?{text:work[1],busy:true}:null;
  render(current||{text:'',busy:false});
 };
 return {
  start(key,text){active.set(key,text);refresh();},
  clear(key){active.delete(key);if(notice?.key===key){notice=null;clearTimer(timer);}refresh();},
  complete(key,text){active.delete(key);clearTimer(timer);notice=text?{key,text}:null;refresh();if(notice)timer=setTimer(()=>{notice=null;refresh();},2600);},
  reset(){active.clear();notice=null;clearTimer(timer);refresh();}
 };
}
