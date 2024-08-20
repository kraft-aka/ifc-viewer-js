import "./style.css";
import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
  Raycaster,
  Vector2,
  Box3,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { IFCLoader } from "web-ifc-three/IFCLoader";

// Creates the Three.js scene
const scene = new Scene();

// Init raycaster and mouse to store mouse position
const raycaster = new Raycaster();
const mouse = new Vector2();

// Object to store the size of the viewport
const size = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Creates the camera (point of view of the user)---> Default camera
const aspect = size.width / size.height;
const camera = new PerspectiveCamera(75, aspect);
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;

// Orthographic Camera
const frustumSize = 10;
const orthographicCamera = new OrthographicCamera(
  (-frustumSize * aspect) / 2,
  (frustumSize * aspect) / 2, // left, right
  frustumSize / 2,
  -frustumSize / 2, // top, bottom
  0.1,
  1000 // near, far
);
orthographicCamera.position.set(0, 1.6, 5);
orthographicCamera.lookAt(new Vector3(0, 1.6, 0));

// Set deafault camera perspective
let activeCamera = camera;

// Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.target.position.set(-5, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

// Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({
  canvas: threeCanvas,
  alpha: true,
  antialias:true
});

renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Creates grids and axes in the scene
const grid = new GridHelper(50, 20);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 15;
scene.add(axes);

// Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);

// Animation loop
const animate = () => {
  controls.update();
  renderer.render(scene, activeCamera);
  requestAnimationFrame(animate);
};

// Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
  size.width = window.innerWidth;
  size.height = window.innerHeight;
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();
  renderer.setSize(size.width, size.height);
});

// Sets up the IFC loading
let ifcModel = null;
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setWasmPath("../wasm/");

const input = document.getElementById("file-input");
input.addEventListener(
  "change",
  (changed) => {
    const file = changed.target.files[0];
    var ifcURL = URL.createObjectURL(file);
    ifcLoader.load(ifcURL, (model) => {
      ifcModel = model;
      scene.add(ifcModel);
      console.log("IFC Model is successfully loaded");
    });
  },
  false
);

threeCanvas.addEventListener("click", (e) => {
  if (!ifcModel) return;

  // Convert the mouse click position to normalized device coordinates
  mouse.x = (e.clientX / size.width) * 2 - 1;
  mouse.y = -(e.clientY / size.height) * 2 + 1;

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersected by the ray
  const intersects = raycaster.intersectObjects([ifcModel], true);

  // Check if an object was intersected
  if (intersects.length > 0) {
    const selectedObject = intersects[0].object;
    console.log("Selected object:", selectedObject);

    // Check if the material supports color changes
    if (selectedObject.material && selectedObject.material.color) {
      // Optionally, change the material color of the selected object to highlight it
      selectedObject.material.color.set(0xffcc00);
    }
  }
  getObjectDimensions(ifcModel);
});

// Gets the dimensions of the IFC Model
function getObjectDimensions(ifcModel) {
  const boundingBox = new Box3().setFromObject(ifcModel);

  const size = new Vector3();
  boundingBox.getSize(size);

  const parameters = {
    width: Math.round(size.x),
    height: Math.round(size.y),
    depth: Math.round(size.z),
  };
  console.log(parameters);
  return parameters;
}

// Sets the camera back to perspective
const perspectiveBtn = document.getElementById("perspective-view");
if (perspectiveBtn) {
  perspectiveBtn.addEventListener("click", () => {
    activeCamera = camera;
    controls.object = camera;
    controls.update();
  });
}

// Set a front view and swith the camera to orthogonal
const axonometricViewBtn = document.getElementById("front-view");
axonometricViewBtn.addEventListener("click", () => {
  activeCamera = orthographicCamera;
  controls.object = activeCamera;
  controls.update();
  setFrontView();
});

function setFrontView() {
  const box = new Box3().setFromObject(ifcModel);
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 1.5;

  const aspect = window.innerWidth / window.innerHeight;
  orthographicCamera.left = (-distance * aspect) / 2;
  orthographicCamera.right = (distance * aspect) / 2;
  orthographicCamera.top = distance / 2;
  orthographicCamera.bottom = -distance / 2;

  orthographicCamera.updateProjectionMatrix();

  orthographicCamera.position.set(center.x, center.y, center.z + distance);
  orthographicCamera.lookAt(center);
}

// Saves the image of the canvas
function saveImage() {
  renderer.render(scene, activeCamera);
  let imgData = renderer.domElement.toDataURL("image/png", 1.0);
  const link = document.createElement("a");
  link.setAttribute("href", imgData);
  link.setAttribute("target", "_blank");
  link.setAttribute("download", "scene.jpeg");
  link.click()
}

// on keydown 's' image is downloaded
window.addEventListener("keydown", (e) => {
  if (e.key === "s") {
    saveImage();
  }
});

animate();
