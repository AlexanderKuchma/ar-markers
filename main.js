import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.133.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.133.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.133.1/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.133.1/examples/jsm/loaders/RGBELoader.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.133.1/examples/jsm/webxr/ARButton.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.133.1/examples/jsm/webxr/VRButton.js';

let container, camera, scene, renderer, controls, reticle, currentObject, isAR = false, hitTestSource = null, hitTestSourceRequested = false;

init();
animate();

function init() {
  container = document.createElement('div');
  document.getElementById("container").appendChild(container);
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.001, 200);
  scene.add(camera);

  let directionalLight = new THREE.DirectionalLight(0xdddddd, 1);
  directionalLight.position.set(0, 0, 1).normalize();
  scene.add(directionalLight);

  let ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  document.body.appendChild(VRButton.createButton(renderer));

  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.getElementById('content') }
  });
  document.body.appendChild(arButton);

  reticle = new THREE.Mesh(
    new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener('resize', onWindowResize, false);
  renderer.domElement.addEventListener('touchstart', onTouchStart, false);
  renderer.domElement.addEventListener('touchend', onTouchEnd, false);
  renderer.domElement.addEventListener('touchmove', onTouchMove, false);

  $(".ar-object").click(function () {
    if (currentObject != null) {
      scene.remove(currentObject);
    }
    loadModel($(this).attr("id"));
  });

  $("#place-button").click(function () {
    arPlace();
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadModel(model) {
  new RGBELoader()
    .setDataType(THREE.UnsignedByteType)
    .setPath('textures/')
    .load('photo_studio_01_1k.hdr', function (texture) {
      const envmap = pmremGenerator.fromEquirectangular(texture).texture;
      scene.environment = envmap;
      texture.dispose();
      pmremGenerator.dispose();
      render();

      const loader = new GLTFLoader().setPath('models/');
      loader.load(model + ".glb", function (glb) {
        currentObject = glb.scene;
        scene.add(currentObject);
        arPlace();
        const box = new THREE.Box3();
        box.setFromObject(currentObject);
        box.center(controls.target);
        controls.update();
        render();
      });
    });
}

function arPlace() {
  if (currentObject) {
    const reticleMatrix = new THREE.Matrix4().fromArray(reticle.matrix.elements);
    currentObject.position.setFromMatrixPosition(reticleMatrix);
    currentObject.visible = true;
  }
}

function onTouchStart(event) {
  // Обработка начала касания
}

function onTouchEnd(event) {
  // Обработка окончания касания
}

function onTouchMove(event) {
  // Обработка движения касания
}

function animate() {
  renderer.setAnimationLoop(render);
  requestAnimationFrame(animate);
  controls.update();
}

function render(timestamp, frame) {
  if (frame && isAR) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then(function (referenceSpace) {
        session.requestHitTestSource({ space: referenceSpace }).then(function (source) {
          hitTestSource = source;
        });
      });
      session.addEventListener('end', function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }
    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}
