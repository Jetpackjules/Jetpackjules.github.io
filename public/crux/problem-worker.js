import {generateProblems,analyzeColorProblem} from './problem-engine.mjs?v=24';
self.onmessage=({data})=>{
 try{
  const {id,kind,holds,setup,target,style,seed}=data;
  const result=kind==='analyze'?analyzeColorProblem(holds,setup,null):generateProblems(holds,setup,target,style,seed);
  self.postMessage({id,result});
 }catch(error){self.postMessage({id:data.id,error:error.message||'Could not find a supported problem.'});}
};
