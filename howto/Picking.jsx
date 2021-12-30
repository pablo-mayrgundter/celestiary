import React from 'react';
import { PointLight, Object3D, Raycaster, Vector3 } from 'three';
import ThreeUi from './js/ThreeUI.js';
import { sphere } from './js/shapes.js';


export default function Picking() {
  React.useEffect(() => { setup() }, [])
  return (
    <>
      <div id="ui"></div>
      <h1>Picking</h1>
      Click on the sphere to change its colors.
    </>)
}

function setup() {
  const ui = new ThreeUi('ui');
  const light = new PointLight;
  light.position.set(10, 10, 10);
  ui.scene.add(light);

  // Test a complex scene graph to show that picking is compatible with
  // object and camera offsets.
  const a = new Object3D, b = new Object3D, c = new Object3D;
  const s = sphere();
  c.add(s);
  c.position.set(3,2,1);
  b.add(c);
  b.position.set(3,2,1);
  a.add(b);
  a.position.set(3,2,1);
  ui.scene.add(a);

  ui.camera.platform.position.z = 4;
  ui.camera.position.z = 1;

  // I think lookAt just works, unless camera is controlled, in which
  // case controls.target needs to be set to worldMatrix position of target
  // obj.
  ui.scene.updateMatrixWorld();
  const sPos = new Vector3;
  sPos.setFromMatrixPosition(s.matrixWorld);
  ui.camera.lookAt(sPos);
  ui.controls.update();
  ui.controls.target = sPos;

  const raycaster = new Raycaster;
  const colorAlts = [0xff0000, 0x00ff00];
  let colorNdx = 0;
  ui.addClickCb((mouse) => {
    if (ui.clicked) {
      ui.clicked = false;
      raycaster.setFromCamera(mouse, ui.camera);
      const intersects = raycaster.intersectObjects(ui.scene.children, true);
      for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        obj.material.color.set(colorAlts[colorNdx]);
        colorNdx = (colorNdx + 1) % 2;
      }
    }
  });
}
