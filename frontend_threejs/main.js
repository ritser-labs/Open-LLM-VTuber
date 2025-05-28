import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('renderArea');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize(canvas.clientWidth, canvas.clientHeight);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);

const geometry = new THREE.BoxGeometry(1, 2, 1);
const material = new THREE.MeshStandardMaterial({color: 0x44aa88});
const avatar = new THREE.Mesh(geometry, material);
scene.add(avatar);

function animate() {
    requestAnimationFrame(animate);
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
}

function playAudio(base64Audio, actions) {
    const audio = new Audio('data:audio/wav;base64,' + base64Audio);
    audio.play();
    if (actions && actions.expressions && actions.expressions.length) {
        const expr = actions.expressions[0];
        const colors = [0x44aa88, 0xff5555, 0x5555ff, 0xffff55];
        avatar.material.color.setHex(colors[expr % colors.length]);
    }
    audio.onended = () => {
        ws.send(JSON.stringify({type: 'frontend-playback-complete'}));
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
