import { describe, expect, it } from 'vitest'
import { migrateTycoonMap } from '../tycoon-map-migration'
import { createInitialTycoonState, startTycoonShiftForUnit } from '../tycoon-engine'
import { STATION_POSITION, ROOM_STOPS, roomPoint } from '../../game/tycoon-ward-layout'
import type { TycoonWorldJob } from '../../app/types'

describe('compact map save migration',()=>{
  it('rebases active checkpoints once without paying rewards or changing care',()=>{
    const initial=startTycoonShiftForUnit({...createInitialTycoonState(),upgrades:{'extra-bed':3}},'fundamentals-clinic',{simulation:true,paced:true,physicalInteractions:true})
    const taskId=initial.activeShift!.tasks.at(-1)!.id,index=initial.activeShift!.tasks.length-1
    const jobs:TycoonWorldJob[]=[
      {id:'chart',taskId,kind:'chart',phase:'working',anchor:{u:2.4,v:4.2}},
      {id:'scanner',taskId,kind:'scanner',phase:'working',anchor:{u:35.05,v:1.85}},
      {id:'return',taskId,kind:'lab',phase:'to-station',anchor:{u:33.9,v:1.85}},
      {id:'finished',taskId,kind:'support',phase:'complete',anchor:{u:2.4,v:4.2}},
    ]
    const old={...initial,mapVersion:undefined,activeShift:{...initial.activeShift!,worldJobs:jobs}}
    const migrated=migrateTycoonMap(old)
    expect(migrated.mapVersion).toBe(7)
    expect(migrated.money).toBe(old.money);expect(migrated.xp).toBe(old.xp)
    expect(migrated.activeShift!.tasks).toBe(old.activeShift.tasks)
    expect(migrated.activeShift!.worldJobs!.map(j=>j.id)).toEqual(jobs.map(j=>j.id))
    expect(migrated.activeShift!.worldJobs![0].anchor).toEqual(STATION_POSITION)
    expect(migrated.activeShift!.worldJobs![1].anchor).toEqual(roomPoint(index,ROOM_STOPS.safety))
    expect(migrated.activeShift!.worldJobs![2].anchor).toEqual(roomPoint(index,ROOM_STOPS.patient))
    expect(migrated.activeShift!.worldJobs![3]).toBe(jobs[3])
    expect(migrateTycoonMap(migrated)).toBe(migrated)
  })
  it('does not modify already migrated or future-version saves',()=>{
    for(const version of [7,8]){const state={...createInitialTycoonState(),mapVersion:version};expect(migrateTycoonMap(state)).toBe(state)}
  })
  it('rebases the previous six-room map without altering pending job progress or the shift clock',()=>{
    const initial=startTycoonShiftForUnit({...createInitialTycoonState(),upgrades:{'extra-bed':3}},'fundamentals-clinic',{simulation:true,paced:true,physicalInteractions:true})
    const task=initial.activeShift!.tasks[4]
    const job:TycoonWorldJob={id:'prior-map-job',taskId:task.id,kind:'support',phase:'working',anchor:{u:11.9,v:10.05}}
    const prior={...initial,mapVersion:6,activeShift:{...initial.activeShift!,worldJobs:[job]}}
    const migrated=migrateTycoonMap(prior)
    expect(migrated.activeShift!.worldJobs![0]).toEqual({...job,anchor:roomPoint(4,ROOM_STOPS.patient)})
    expect(migrated.activeShift).toEqual({...prior.activeShift,worldJobs:migrated.activeShift!.worldJobs})
    expect(migrated.money).toBe(prior.money)
    expect(migrated.xp).toBe(prior.xp)
  })
  it('rebases version-two Room 101 jobs without duplicating or resetting work',()=>{
    const initial=startTycoonShiftForUnit(createInitialTycoonState(),'fundamentals-clinic',{simulation:true,paced:true,physicalInteractions:true})
    const taskId=initial.activeShift!.tasks[0].id
    const job:TycoonWorldJob={id:'existing-care',taskId,kind:'support',phase:'working',anchor:{u:6.4,v:1.85}}
    const old={...initial,mapVersion:2,activeShift:{...initial.activeShift!,worldJobs:[job]}}
    const migrated=migrateTycoonMap(old)
    expect(migrated.activeShift!.worldJobs).toHaveLength(1)
    expect(migrated.activeShift!.worldJobs![0]).toEqual({...job,anchor:roomPoint(0,ROOM_STOPS.patient)})
    expect(migrated.money).toBe(old.money)
    expect(migrated.xp).toBe(old.xp)
    expect(migrated.activeShift!.tasks).toBe(old.activeShift.tasks)
    expect(migrateTycoonMap(migrated)).toBe(migrated)
  })
})
