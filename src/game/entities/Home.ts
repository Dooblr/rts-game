import Phaser from 'phaser';

export class Home extends Phaser.GameObjects.Container {
  private building: Phaser.GameObjects.Polygon;
  private woodStored: number = 0;
  private woodText: Phaser.GameObjects.Text;
  private productionMenu: Phaser.GameObjects.Container | null = null;
  private onUnitProduced: ((x: number, y: number) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    // Create hexagon points
    const size = 30;
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2; // Start from top point
      points.push({
        x: Math.cos(angle) * size,
        y: Math.sin(angle) * size
      });
    }

    // Create home building visual (red hexagon)
    this.building = scene.add.polygon(0, 0, points, 0xff0000);
    this.building.setInteractive();
    this.add(this.building);

    // Create HUD text for wood count (top right)
    this.woodText = scene.add.text(
      scene.cameras.main.width - 150, 
      10, 
      'Wood: 0', 
      { 
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
      }
    );
    this.woodText.setScrollFactor(0);
    this.updateWoodText();
  }

  public setSelected(selected: boolean) {
    if (selected) {
      this.building.setStrokeStyle(2, 0xffffff);
      this.showProductionMenu();
    } else {
      this.building.setStrokeStyle(0);
      this.hideProductionMenu();
    }
  }

  private showProductionMenu() {
    // Remove existing menu if any
    this.hideProductionMenu();

    // Create production menu container (bottom left)
    this.productionMenu = this.scene.add.container(10, this.scene.cameras.main.height - 60);
    this.productionMenu.setScrollFactor(0);

    // Add background
    const bg = this.scene.add.rectangle(0, 0, 200, 50, 0x000000, 0.8);
    this.productionMenu.add(bg);

    // Add "Train Collector" button
    const button = this.scene.add.rectangle(0, 0, 180, 40, 0x333333);
    button.setInteractive();
    this.productionMenu.add(button);

    const text = this.scene.add.text(-80, -15, 'Train Collector\n(10 wood)', {
      color: this.woodStored >= 10 ? '#ffffff' : '#ff6666',
      align: 'center'
    });
    this.productionMenu.add(text);

    // Handle button click
    button.on('pointerdown', () => {
      this.trainUnit();
    });

    // Hover effects
    button.on('pointerover', () => {
      button.setFillStyle(0x444444);
    });
    button.on('pointerout', () => {
      button.setFillStyle(0x333333);
    });
  }

  private hideProductionMenu() {
    if (this.productionMenu) {
      this.productionMenu.destroy();
      this.productionMenu = null;
    }
  }

  private trainUnit() {
    if (this.woodStored >= 10 && this.onUnitProduced) {
      this.woodStored -= 10;
      this.updateWoodText();
      
      // Calculate spawn position (slightly offset from home)
      const angle = Math.random() * Math.PI * 2;
      const spawnDistance = 50;
      const spawnX = this.x + Math.cos(angle) * spawnDistance;
      const spawnY = this.y + Math.sin(angle) * spawnDistance;
      
      this.onUnitProduced(spawnX, spawnY);
      this.showProductionMenu(); // Refresh menu to update button color
    }
  }

  public setUnitProductionCallback(callback: (x: number, y: number) => void) {
    this.onUnitProduced = callback;
  }

  public depositWood(amount: number) {
    this.woodStored += amount;
    this.updateWoodText();
    if (this.productionMenu) {
      this.showProductionMenu(); // Refresh menu to update button color
    }
  }

  private updateWoodText() {
    this.woodText.setText(`Wood: ${this.woodStored}`);
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
} 