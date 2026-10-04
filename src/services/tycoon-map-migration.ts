import type { TycoonGameState } from '../app/types'
import { ROOM_STOPS, STATION_POSITION, roomPoint } from '../game/tycoon-ward-layout'
/** Rebase persisted checkpoints once; never award progress or recreate jobs. */
export function migrateTycoonMap(state: TycoonGameState): TycoonGameState {
  if((state.mapVersion ?? 1)>=7) return state
  const shift=state.activeShift
  if(!shift) return {...state,mapVersion:7}
  const worldJobs=shift.worldJobs?.map(job=>{
    if(job.phase==='complete'||job.phase==='cancelled') return job
    const i=shift.tasks.findIndex(t=>t.id===job.taskId)
    if(i<0||i>=6) return job
    const atStation=job.kind==='chart'||job.phase==='to-patient'||job.phase==='reporting'
    const anchor=atStation?STATION_POSITION:roomPoint(i,job.kind==='scanner'?ROOM_STOPS.safety:ROOM_STOPS.patient)
    return {...job,anchor:{...anchor}}
  })
  return {...state,mapVersion:7,activeShift:{...shift,worldJobs}}
}
