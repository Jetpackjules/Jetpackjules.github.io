export function inclineFailureMessage(code){
 if(code==='webgpu-unavailable'||code==='gpu-adapter-unavailable')return 'Walls detected · this browser cannot run photo inclines';
 if(code==='canvas-unavailable')return 'Walls detected · update your browser for photo inclines';
 if(code==='incline-timeout')return 'Incline scan stalled · reopen Wall angles to retry';
 return 'Inclines could not load · reopen Wall angles to retry';
}
