export interface ViewBounds {left:number;top:number;width:number;height:number}
export function cameraWorldBounds(camera:{scrollX:number;scrollY:number;width:number;height:number;zoom:number}):ViewBounds {
  const width=camera.width/camera.zoom,height=camera.height/camera.zoom
  return {left:camera.scrollX+(camera.width-width)/2,top:camera.scrollY+(camera.height-height)/2,width,height}
}
/** Keep antialiased edge pixels; only exclude geometry completely outside view. */
export function cropIntersectsView(crop:ViewBounds,view:ViewBounds,y=crop.top) {
  return crop.left+crop.width>=view.left-2 && crop.left<=view.left+view.width+2 && y+crop.height>=view.top-2 && y<=view.top+view.height+2
}
