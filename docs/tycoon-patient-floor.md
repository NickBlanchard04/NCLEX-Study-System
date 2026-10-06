# Patient floor and future expansion

Floor 1 is the six patient rooms (101–106), one clinical spine, and its handoff desk. Room sizes, clinical anchors, door geometry, room unlocks, jobs, saved upgrades, rewards, and the clock retain their existing contracts.

The north and south hallway elevators are permanently locked presentation targets for Floor 2. Walking to either target or interacting nearby shows a locked notice. They do not change floors, spend money, award rewards, or spawn a nurse. Their occupied footprints are blocked by the same geometry used for pathfinding.

Floor 2 reserves ward, entry, WC, waiting, medication, clean, linen, treatment, dirty, and staff rooms. There are no playable paths, visible furnishings, or ambient actors in these future spaces on Floor 1. Legacy zone definitions remain for saved-upgrade compatibility; they do not grant navigation access. Existing simulation-room purchases retain their XP benefit, while their physical practice bay is reserved for expansion.

The revealed floor silhouette fades into black through a static canvas texture with a blur baked at creation. No per-frame blur or offscreen wing rendering is needed. End-row patient walls close independently rather than relying on the removed lobby partition.

Before adding Floor 2, introduce an explicit floor identifier for navigation and job anchors, a floor transition lifecycle, and server/store-authoritative unlock requirements. Elevators must stay locked until those systems and the destination map exist.
