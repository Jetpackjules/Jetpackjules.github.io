export const DEFAULT_HEIGHT_CM=175;
export function climberProfile(heightCm=DEFAULT_HEIGHT_CM){
 const bodyHeight=Number(heightCm||DEFAULT_HEIGHT_CM)/100;
 return {bodyHeight,reach:1.1*bodyHeight/1.7,referenceReach:1.1};
}
