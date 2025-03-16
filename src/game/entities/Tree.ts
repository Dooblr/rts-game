import Phaser from 'phaser';

export class Tree extends Phaser.GameObjects.Container {
  private treeSprite: Phaser.GameObjects.Rectangle;
  private woodAmount: number = 100;
  private progressBar: Phaser.GameObjects.Rectangle | null = null;
  private progressBarBg: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    // Create tree visual (green rectangle)
    this.treeSprite = scene.add.rectangle(0, 0, 30, 40, 0x00aa00);
    this.add(this.treeSprite);
    
    // Make tree interactive
    this.treeSprite.setInteractive();

    // Create progress bar (initially hidden)
    this.progressBarBg = scene.add.rectangle(0, -30, 40, 5, 0x000000);
    this.progressBar = scene.add.rectangle(0, -30, 40, 5, 0xffff00);
    this.add(this.progressBarBg);
    this.add(this.progressBar);
    
    // Hide progress bar initially
    this.hideProgressBar();
  }

  public showProgressBar(progress: number) {
    this.progressBarBg?.setVisible(true);
    this.progressBar?.setVisible(true);
    this.progressBar?.setScale(progress, 1);
  }

  public hideProgressBar() {
    this.progressBarBg?.setVisible(false);
    this.progressBar?.setVisible(false);
  }

  public harvest(amount: number): number {
    if (this.woodAmount <= 0) return 0;
    
    const harvested = Math.min(amount, this.woodAmount);
    this.woodAmount -= harvested;
    
    // Update tree appearance based on remaining wood
    const scale = 0.3 + (this.woodAmount / 100) * 0.7;
    this.treeSprite.setScale(scale);
    
    return harvested;
  }

  public getRemainingWood(): number {
    return this.woodAmount;
  }

  public isHarvestable(): boolean {
    return this.woodAmount > 0;
  }
} 