const LinesToolName = 'lines-tool';
const LinesOverlayName = 'lines-overlay';

class LinesTool extends Autodesk.Viewing.ToolInterface {
  constructor(viewer, options) {
    super();
    this.viewer = viewer;
    this.names = [LinesToolName];
    this.active = false;
    this.points = []; // Points of the current line
    this.linesMeshes = []; // Mesh representing the currently drawn area
    this.faceNormal = null;
    this.material = new THREE.MeshBasicMaterial({ color: 0x000, specular: 0xffffff });
    this.lineMaterial = new THREE.LineBasicMaterial({
      linewidth: 3,
      color: 0x000,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NoBlending
    });
    this.lines = [];
    this.lineThickness = 0.05;
    // Hack: delete functions defined on the *instance* of a ToolInterface (we want the tool controller to call our class methods instead)
    delete this.register;
    delete this.deregister;
    delete this.activate;
    delete this.deactivate;
    delete this.getPriority;
    delete this.handleMouseMove;
    delete this.handleSingleClick;
    delete this.handleKeyUp;
  }

  register() {
    console.log('LinesTool registered.');
  }

  deregister() {
    console.log('LinesTool unregistered.');
  }

  activate(name, viewer) {
    if (!this.active) {
      this.viewer.overlays.addScene(LinesOverlayName);
      console.log('LinesTool activated.');
      this.active = true;
    }
  }

  deactivate(name) {
    if (this.active) {
      this.viewer.overlays.removeScene(LinesOverlayName);
      console.log('LinesTool deactivated.');
      this.active = false;
      this.lines = [];
      this._reset();
    }
  }

  getPriority() {
    return 13; // Feel free to use any number higher than 0 (which is the priority of all the default viewer tools)
  }

  handleMouseMove(event) {
    if (!this.active) {
      return false;
    }

    this.viewer.clearSelection();
    const currentPoint = this.viewer.clientToWorld(event.canvasX, event.canvasY, true);
    if (!!currentPoint && this.points.length == 1) {
      this._update(currentPoint.point);
    }
    return false;
  }

  handleSingleClick(event, button) {
    if (!this.active) {
      return false;
    }

    if (button === 0) {
      let newPoint = this.viewer.clientToWorld(event.canvasX, event.canvasY, true)
      this.points.push(newPoint);
      if (this.points.length == 2) {
        this.lines.push({
          firstPoint: this.points[0],
          secondPoint: this.points[1]
        })
        this._update();
        this._reset();
        return true; // Stop the event from going to other tools in the stack
      }
    }
    return false;
  }

  handleKeyUp(event, keyCode) {
    if (this.active) {
      if (keyCode === 27) {
        // Finalize the extrude mesh and initialie a new one
        this.points = [];
        this.mesh = null;
        return true;
      }
    }
    return false;
  }

  _update(currentPoint = null) {
    try{
      let firstPoint = this.points[0].point;
      let lastPoint = currentPoint? currentPoint : this.points[1].point;
      this._updateLine(firstPoint, lastPoint);
    }
    catch(ex){
      console.log(ex)
    }
  }

  _updateLine(firstPoint, lastPoint) {
    this._removeLine();
    this._drawLine(firstPoint, lastPoint);
  }

  _removeLine() {
    for (let i = 0; i < this.linesMeshes.length; i++) {
      this.viewer.overlays.removeMesh(this.linesMeshes[i], LinesOverlayName);
      this.viewer.impl.sceneUpdated(true);
    }
  }

  _drawLine(firstPoint, lastPoint) {
    let auxDir1 = lastPoint.clone().sub(firstPoint);
    let auxDown = (new THREE.Vector3(0,0,1)).cross(auxDir1).normalize();
    let auxUp = (new THREE.Vector3(0,0,-1)).cross(auxDir1).normalize();

    let firstPoints = [];
    let firstLineP1 = firstPoint.clone().add(auxUp.clone().multiplyScalar((this.lineThickness) * 0.5));
    firstPoints.push(firstLineP1);
    let firstLineP2 = firstLineP1.clone().add(auxDir1.clone().normalize().multiplyScalar(auxDir1.length()));
    firstPoints.push(firstLineP2);
    let firstLineP3 = firstLineP2.clone().add(auxDown.clone().multiplyScalar(this.lineThickness));
    firstPoints.push(firstLineP3);
    firstPoints.push(firstLineP3);
    firstPoints.push(firstLineP1.clone().add(auxDown.clone().multiplyScalar(this.lineThickness)));
    firstPoints.push(firstLineP1);

    let firstGeometry = new THREE.BufferGeometry();
    let firstBufferPoints = [];

    for (let i = 0; i < firstPoints.length; i++) {
      firstBufferPoints.push(firstPoints[i].x, firstPoints[i].y, firstPoints[i].z);
    }

    firstGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(firstBufferPoints), 3));

    let line = new THREE.Mesh(firstGeometry, this.lineMaterial);

    this.linesMeshes.push(line);

    if (!this.viewer.overlays.hasScene(LinesOverlayName)) {
      this.viewer.overlays.addScene(LinesOverlayName);
    }
    this.viewer.overlays.addMesh(line, LinesOverlayName);
  }

  _reset() {
    this.points = [];
    this.linesMeshes = [];
  }
}

class LinesToolExtension extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.tool = new LinesTool(viewer);
    this.button = null;
  }

  async load() {
    this.viewer.toolController.registerTool(this.tool);
    console.log('LinesToolExtension has been loaded.');
    return true;
  }

  async unload() {
    this.viewer.toolController.deregisterTool(this.tool);
    console.log('LinesToolExtension has been unloaded.');
    return true;
  }

  onToolbarCreated(toolbar) {
    const controller = this.viewer.toolController;
    this.button = new Autodesk.Viewing.UI.Button('lines-tool-button');
    this.button.onClick = (ev) => {
      if (controller.isToolActivated(LinesToolName)) {
        controller.deactivateTool(LinesToolName);
        this.button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
      } else {
        controller.activateTool(LinesToolName);
        this.button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
      }
    };
    this.button.setToolTip('Lines Tool');
    this.group = new Autodesk.Viewing.UI.ControlGroup('lines-tool-group');
    this.group.addControl(this.button);
    const icon = this.button.container.querySelector('.adsk-button-icon');
    let buttonIconUrl = 'https://img.icons8.com/ios/30/line--v1.png';
    if (icon) {
      icon.style.backgroundImage = `url(${buttonIconUrl})`;
      icon.style.backgroundSize = `24px`;
      icon.style.backgroundRepeat = `no-repeat`;
      icon.style.backgroundPosition = `center`;
    }
    toolbar.addControl(this.group);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension('LinesToolExtension', LinesToolExtension);