import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);

const loader = new GLTFLoader();
loader.load(
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf',
  gltf => {
    scene.add(gltf.scene);
  },
  undefined,
  error => {
    console.error('Error loading model:', error);
  }
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Chat interface logic
const messagesDiv = document.getElementById('messages');
const inputEl = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');

function addMessage(sender, text) {
  const div = document.createElement('div');
  div.className = sender;
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const socket = new WebSocket(`${wsProtocol}://${window.location.host}/client-ws`);

socket.addEventListener('open', () => {
  addMessage('system', 'WebSocket connected');
});

socket.addEventListener('message', event => {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'full-text') {
      addMessage('ai', data.text);
    } else if (data.type === 'error') {
      addMessage('error', data.message);
    }
  } catch (e) {
    console.error('Invalid message', e);
  }
});

socket.addEventListener('close', () => {
  addMessage('system', 'WebSocket disconnected');
});

function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: 'text-input', text }));
  addMessage('user', text);
  inputEl.value = '';
}

sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
