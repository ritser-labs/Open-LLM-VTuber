import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('renderArea');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100,
);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.update();

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
hemiLight.position.set(0, 2, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(2, 4, 2);
scene.add(dirLight);

let avatar;
new GLTFLoader().load(
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/RobotExpressive/glTF/RobotExpressive.glb',
    (gltf) => {
        avatar = gltf.scene;
        avatar.position.set(0, 0, 0);
        scene.add(avatar);
    },
    undefined,
    (err) => console.error('Avatar load error', err),
);

let audioPlaying = false;

function animate() {
    requestAnimationFrame(animate);
    if (audioPlaying && avatar) {
        avatar.rotation.y += 0.01;
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
});

const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
let ws;

function appendMessage(text, from='system') {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.color = from === 'user' ? '#0f0' : '#fff';
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${window.location.host}/client-ws`);
    ws.onopen = () => appendMessage('Connected to server');
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'full-text' && msg.text) {
            appendMessage(msg.text);
        } else if (msg.type === 'audio' && msg.audio) {
            playAudio(msg.audio, msg.actions);
        }
    };
    ws.onclose = () => {
        appendMessage('Connection closed, retrying...');
        setTimeout(connect, 1000);
    };
}

function setExpression(expr) {
    const colors = [0x44aa88, 0xff5555, 0x5555ff, 0xffff55];
    if (avatar) {
        avatar.traverse((o) => {
            if (o.isMesh && o.material && o.material.color) {
                o.material.color.setHex(colors[expr % colors.length]);
            }
        });
    }
}

function playAudio(base64Audio, actions) {
    const audio = new Audio('data:audio/wav;base64,' + base64Audio);
    audioPlaying = true;
    audio.play();
    if (actions && actions.expressions && actions.expressions.length) {
        setExpression(actions.expressions[0]);
    }
    audio.onended = () => {
        audioPlaying = false;
        ws.send(JSON.stringify({ type: 'frontend-playback-complete' }));
    };
}

sendBtn.addEventListener('click', () => {
    const text = userInput.value.trim();
    if (!text) return;
    ws.send(JSON.stringify({type: 'text-input', text}));
    appendMessage(text, 'user');
    userInput.value = '';
});

connect();
