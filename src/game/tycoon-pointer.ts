import type Phaser from 'phaser'

/** Phaser also observes window releases. DOM HUD releases must not activate map objects. */
export const wardCanvasPointer = (pointer: Phaser.Input.Pointer, scene: Phaser.Scene) => pointer.event?.target === scene.game.canvas
