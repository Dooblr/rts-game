import Phaser from 'phaser';
import { Tree } from '../entities/Tree';
import { Home } from '../entities/Home';

export class GameScene extends Phaser.Scene {
  private workers: Phaser.GameObjects.Arc[] = [];
  private selected: Phaser.GameObjects.Arc | Home | null = null;
  private targetPosition: Phaser.Math.Vector2 | null = null;
  private tree: Tree | null = null;
  private home: Home | null = null;
  private isHarvesting: boolean = false;
  private harvestProgress: number = 0;
  private woodCarried: { [key: number]: number } = {};
  private readonly maxWoodCapacity: number = 5;
  private readonly harvestRange: number = 40;
  private isReturningHome: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // Create home building
    this.home = new Home(this, centerX - 200, centerY);
    this.home.setUnitProductionCallback((x, y) => this.createWorker(x, y));
    
    // Set home building input priority
    this.home.building.setInteractive();
    this.home.building.input.priorityID = 1;
    
    this.home.building.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        pointer.event.stopPropagation();
        this.selectEntity(this.home!);
      }
    });

    // Create initial worker
    this.createWorker(centerX, centerY);

    // Create a tree
    this.tree = new Tree(this, centerX + 200, centerY);

    // Prevent default right-click behavior
    this.input.mouse.disableContextMenu();

    // Handle background clicks for deselection with lower priority
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const clickedObject = this.game.input.manager.hitTest(pointer, this.children.list);
        if (!clickedObject) {
          this.deselectAll();
        }
      }
    }, this);

    // Handle right click movement and interaction
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() && this.selected instanceof Phaser.GameObjects.Arc) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        // Check if clicking near the tree
        if (this.tree && this.distanceTo(worldPoint, this.tree) < 50) {
          const distanceToTree = this.distanceTo(this.selected, this.tree);
          if (distanceToTree > this.harvestRange) {
            this.moveToHarvest(this.selected, this.tree);
          } else {
            this.startHarvesting(this.selected);
          }
        }
        // Check if clicking near the home building
        else if (this.home && this.distanceTo(worldPoint, this.home) < 50) {
          this.moveToDeposit(this.selected);
        }
        // Otherwise move
        else {
          this.stopHarvesting(this.selected);
          this.isReturningHome = false;
          this.moveUnit(this.selected, worldPoint.x, worldPoint.y);
        }
      }
    });
  }

  private createWorker(x: number, y: number) {
    const worker = this.add.circle(x, y, 20, 0x0000ff);
    
    // Make the hit area slightly larger than the visual circle for easier selection
    const hitArea = new Phaser.Geom.Circle(0, 0, 25);
    worker.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    
    // Set input priority higher to ensure clicks are captured
    worker.input.priorityID = 1;
    
    // Initialize wood carried for this worker
    this.woodCarried[worker.id] = 0;
    
    // Add selection handling with improved hit detection
    worker.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        pointer.event.stopPropagation();
        this.selectEntity(worker);
      }
    });

    // Add subtle hover effects
    worker.on('pointerover', () => {
      if (this.selected !== worker) {
        // Subtle white glow effect
        worker.setStrokeStyle(1, 0xffffff, 0.3);
        this.tweens.add({
          targets: worker,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100,
          ease: 'Quad.easeOut'
        });
      }
    });

    worker.on('pointerout', () => {
      if (this.selected !== worker) {
        worker.setStrokeStyle(0);
        this.tweens.add({
          targets: worker,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: 'Quad.easeOut'
        });
      }
    });

    this.workers.push(worker);
    return worker;
  }

  private selectEntity(entity: Phaser.GameObjects.Arc | Home) {
    // If clicking the same entity that's already selected, do nothing
    if (this.selected === entity) {
      return;
    }

    // Deselect previous entity
    this.deselectAll();
    
    // Select new entity
    this.selected = entity;
    
    if (entity instanceof Home) {
      entity.setSelected(true);
    } else {
      // Clear any existing tweens
      this.tweens.killTweensOf(entity);
      
      // Add selection effects
      entity.setStrokeStyle(2, 0xffffff, 0.8);
      
      // Quick pop effect on selection
      this.tweens.add({
        targets: entity,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Subtle pulsing effect while selected
          this.tweens.add({
            targets: entity,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });
    }
  }

  private deselectAll() {
    if (this.selected instanceof Home) {
      this.selected.setSelected(false);
    } else if (this.selected instanceof Phaser.GameObjects.Arc) {
      // Clear any existing tweens
      this.tweens.killTweensOf(this.selected);
      
      // Reset appearance
      this.selected.setStrokeStyle(0);
      this.selected.setScale(1);
      
      this.stopHarvesting(this.selected);
    }
    this.selected = null;
  }

  private moveUnit(unit: Phaser.GameObjects.Arc, x: number, y: number) {
    // Add a visual click indicator
    const clickMarker = this.add.circle(x, y, 5, 0xffffff, 0.5);
    this.tweens.add({
      targets: clickMarker,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      onComplete: () => {
        clickMarker.destroy();
      }
    });

    this.targetPosition = new Phaser.Math.Vector2(x, y);
  }

  private moveToHarvest(worker: Phaser.GameObjects.Arc, tree: Tree) {
    if (!worker) return;

    const angle = Phaser.Math.Angle.Between(tree.x, tree.y, worker.x, worker.y);
    const harvestX = tree.x + Math.cos(angle) * this.harvestRange;
    const harvestY = tree.y + Math.sin(angle) * this.harvestRange;
    
    this.moveUnit(worker, harvestX, harvestY);
    this.isReturningHome = false;
  }

  private moveToDeposit(worker: Phaser.GameObjects.Arc) {
    if (!worker || !this.home) return;

    const angle = Phaser.Math.Angle.Between(this.home.x, this.home.y, worker.x, worker.y);
    const depositX = this.home.x + Math.cos(angle) * 35;
    const depositY = this.home.y + Math.sin(angle) * 35;
    
    this.moveUnit(worker, depositX, depositY);
    this.isReturningHome = true;
  }

  private distanceTo(point: { x: number; y: number }, target: { x: number; y: number }) {
    return Phaser.Math.Distance.Between(point.x, point.y, target.x, target.y);
  }

  private startHarvesting(worker: Phaser.GameObjects.Arc) {
    if (this.woodCarried[worker.id] >= this.maxWoodCapacity) {
      this.moveToDeposit(worker);
      return;
    }

    this.isHarvesting = true;
    this.harvestProgress = 0;
    this.targetPosition = null;
    this.isReturningHome = false;
  }

  private stopHarvesting(worker: Phaser.GameObjects.Arc) {
    this.isHarvesting = false;
    this.tree?.hideProgressBar();
  }

  private depositResources(worker: Phaser.GameObjects.Arc) {
    if (this.woodCarried[worker.id] > 0 && this.home) {
      this.home.depositWood(this.woodCarried[worker.id]);
      this.woodCarried[worker.id] = 0;
      
      if (this.tree && this.tree.isHarvestable()) {
        this.moveToHarvest(worker, this.tree);
      }
    }
  }

  update(time: number, delta: number) {
    if (this.selected instanceof Phaser.GameObjects.Arc && this.targetPosition) {
      const speed = 3;
      const distance = Phaser.Math.Distance.Between(
        this.selected.x, 
        this.selected.y, 
        this.targetPosition.x, 
        this.targetPosition.y
      );

      if (distance < speed) {
        this.selected.x = this.targetPosition.x;
        this.selected.y = this.targetPosition.y;
        this.targetPosition = null;

        if (this.tree && !this.isReturningHome && this.distanceTo(this.selected, this.tree) <= this.harvestRange) {
          this.startHarvesting(this.selected);
        }
        else if (this.isReturningHome && this.home && this.distanceTo(this.selected, this.home) <= 40) {
          this.depositResources(this.selected);
        }
      } else {
        const angle = Phaser.Math.Angle.Between(
          this.selected.x, 
          this.selected.y, 
          this.targetPosition.x, 
          this.targetPosition.y
        );

        this.selected.x += Math.cos(angle) * speed;
        this.selected.y += Math.sin(angle) * speed;
      }
    }

    // Check if selected worker is in range for harvesting
    if (this.isHarvesting && this.selected instanceof Phaser.GameObjects.Arc && this.tree) {
      const distanceToTree = this.distanceTo(this.selected, this.tree);
      if (distanceToTree > this.harvestRange) {
        this.stopHarvesting(this.selected);
        return;
      }
    }

    // Handle harvesting
    if (this.isHarvesting && this.selected instanceof Phaser.GameObjects.Arc && this.tree && this.tree.isHarvestable() && 
        this.woodCarried[this.selected.id] < this.maxWoodCapacity) {
      this.harvestProgress += delta / 1000;
      this.tree.showProgressBar(this.harvestProgress % 1);
      
      if (this.harvestProgress >= 1) {
        this.harvestProgress = 0;
        this.woodCarried[this.selected.id]++;
        this.tree.harvest(1);
        
        if (this.woodCarried[this.selected.id] >= this.maxWoodCapacity) {
          this.stopHarvesting(this.selected);
          this.moveToDeposit(this.selected);
        }
      }
    }
  }
} 