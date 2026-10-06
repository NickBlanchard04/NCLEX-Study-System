import type Phaser from 'phaser'

/** Patient feedback is presentation only; animated dots never drive call state. */
export class PatientThoughtBubble {
  private readonly container: Phaser.GameObjects.Container
  private readonly dots: Phaser.GameObjects.Arc[]
  private readonly body: Phaser.GameObjects.Graphics
  private readonly label: Phaser.GameObjects.Text
  private previous = ''

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.dots = [
      scene.add.circle(-14, 9, 5, 0xffedb8).setStrokeStyle(1, 0xe9ac35),
      scene.add.circle(-21, 20, 3, 0xffedb8).setStrokeStyle(1, 0xe9ac35),
    ]
    this.body = scene.add.graphics()
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '12px', fontStyle: 'bold',
      color: '#28343e', align: 'left', wordWrap: { width: 142 },
      resolution: 2,
    })
    this.container = scene.add.container(x, y, [this.body, ...this.dots, this.label])
      .setDepth(1300).setVisible(false)
  }

  get visible() { return this.container.visible }

  setVisible(visible: boolean) { this.container.setVisible(visible); return this }

  setText(text: string) {
    if (text === this.previous) return this
    this.previous = text
    this.label.setText(text)
    const width = Math.max(126, this.label.width + 52)
    const height = Math.max(42, this.label.height + 20)
    const left = -width / 2, top = -height
    this.label.setPosition(left + 40, top + (height - this.label.height) / 2)
    this.body.clear().fillStyle(0x342614, .16)
      .fillRoundedRect(left, top + 3, width, height, 20)
      .fillStyle(0xffedb8).fillRoundedRect(left, top, width, height, 20)
      .lineStyle(2, 0xe9ac35).strokeRoundedRect(left, top, width, height, 20)
      .lineStyle(1, 0xfffcdf).strokeRoundedRect(left + 2, top + 2, width - 4, height - 4, 18)
    const bx = left + 21, by = top + height / 2
    this.body.fillStyle(0xd58d15).fillRoundedRect(bx - 7, by - 7, 14, 13, 6)
      .fillRect(bx - 9, by + 4, 18, 3).fillCircle(bx, by + 10, 2.5)
      .fillCircle(bx, by - 9, 2).lineStyle(1, 0xffd66e)
      .lineBetween(bx - 4, by - 5, bx - 4, by + 2)
    return this
  }

  animate(elapsed: number, reduced: boolean) {
    if (!this.visible) return
    // A staggered rise travels from the small dot toward the bubble. The text
    // and body stay still; no tweens, redraws, or allocations on each frame.
    for (let i = 0; i < this.dots.length; i++) {
      const phase = (elapsed / 1500 + i * .22) % 1
      const lift = reduced ? 0 : Math.max(0, Math.sin(phase * Math.PI * 2))
      this.dots[i].setY((i === 0 ? 9 : 20) - lift * 3)
        .setScale(1 + lift * .16)
    }
  }
}
