import * as THREE from '/js/threejs/three.module.js';
import { OrbitControls } from '/js/threejs/controls/OrbitControls.js';
import { RoomEnvironment } from '/js/threejs/environments/RoomEnvironment.js';

var stopAnimation;
var resizeHandler;

function createSkyTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;

    var ctx = canvas.getContext('2d');
    var sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#1b75d0');
    sky.addColorStop(0.55, '#6cb7ff');
    sky.addColorStop(1, '#d9f4ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var sunGlow = ctx.createRadialGradient(1540, 230, 60, 1540, 230, 460);
    sunGlow.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
    sunGlow.addColorStop(0.35, 'rgba(255, 255, 255, 0.24)');
    sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
}

function createGrassTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;

    var ctx = canvas.getContext('2d');
    var grass = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grass.addColorStop(0, '#9bdc4f');
    grass.addColorStop(0.45, '#55a629');
    grass.addColorStop(1, '#1d701d');
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < 780; i++) {
        var x = (i * 73) % canvas.width;
        var y = (i * 151) % canvas.height;
        var bladeHeight = 10 + ((i * 17) % 22);
        var sway = ((i % 9) - 4) * 0.8;

        ctx.globalAlpha = 0.24 + ((i % 5) * 0.035);
        ctx.strokeStyle = i % 3 === 0 ? '#e6ffc0' : '#2e821f';
        ctx.lineWidth = i % 4 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y + bladeHeight);
        ctx.quadraticCurveTo(x + sway, y + bladeHeight * 0.35, x + sway * 1.5, y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(7, 7);
    texture.anisotropy = 8;
    return texture;
}

function createHillTexture(colors, ridgeOffset) {
    var canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 640;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var hill = ctx.createLinearGradient(0, 0, 0, canvas.height);
    hill.addColorStop(0, colors[0]);
    hill.addColorStop(0.45, colors[1]);
    hill.addColorStop(1, colors[2]);
    ctx.fillStyle = hill;

    ctx.beginPath();
    ctx.moveTo(0, 300 + ridgeOffset);
    ctx.bezierCurveTo(360, 120 + ridgeOffset, 690, 250 + ridgeOffset, 1030, 170 + ridgeOffset);
    ctx.bezierCurveTo(1380, 82 + ridgeOffset, 1620, 190 + ridgeOffset, 2048, 105 + ridgeOffset);
    ctx.lineTo(2048, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#f5ffd8';
    ctx.lineWidth = 3;
    for (var i = 0; i < 70; i++) {
        var x = (i * 91) % canvas.width;
        var y = 300 + ridgeOffset + ((i * 37) % 250);
        ctx.beginPath();
        ctx.moveTo(x, y + 18);
        ctx.quadraticCurveTo(x + 34, y - 22, x + 84, y + 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    var texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
}

function createCloudTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    function puff(x, y, width, height, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    puff(250, 105, 168, 43, 0.58);
    puff(150, 112, 92, 33, 0.62);
    puff(334, 98, 112, 35, 0.5);
    puff(224, 78, 96, 42, 0.5);

    var texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
}

function addPastureEnvironment(scene) {
    var sky = new THREE.Mesh(
        new THREE.SphereBufferGeometry(45, 48, 24),
        new THREE.MeshBasicMaterial({
            map: createSkyTexture(),
            side: THREE.BackSide,
            fog: false
        })
    );
    sky.position.set(0, 3, 0);
    scene.add(sky);

    var ground = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(90, 90, 1, 1),
        new THREE.MeshBasicMaterial({
            map: createGrassTexture()
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.04, 0);
    scene.add(ground);

    function addHill(z, y, scale, texture) {
        var hill = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(44 * scale, 14 * scale, 1, 1),
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthWrite: false
            })
        );
        hill.position.set(0, y, z);
        scene.add(hill);
    }

    addHill(18, 3.0, 1.0, createHillTexture(['#7fcf58', '#48a330', '#226d21'], 0));
    addHill(28, 4.1, 1.35, createHillTexture(['#a7df68', '#62b93d', '#2d8527'], 70));

    var cloudTexture = createCloudTexture();
    [
        [-12, 10, 17, 6.5],
        [9, 12, 21, 4.5],
        [20, 8, 14, 5.6],
        [-25, 7, 24, 4.2]
    ].forEach(function (cloudInfo) {
        var cloud = new THREE.Sprite(new THREE.SpriteMaterial({
            map: cloudTexture,
            transparent: true,
            depthWrite: false,
            fog: false
        }));
        cloud.position.set(cloudInfo[0], cloudInfo[1], cloudInfo[2]);
        cloud.scale.set(cloudInfo[3], cloudInfo[3] * 0.38, 1);
        scene.add(cloud);
    });
}

window.appJsFunctions = {

    cleanup: function () {
        stopAnimation = true;

        // invoking an event which has references to disposed object(s) looks start GC process.
        if (resizeHandler) {
            // not calling directly but using setTimeout ensures object(s) disposed.
            window.setTimeout(resizeHandler);
        }
    },

    loadScene: function () {

        var container = document.getElementById('index-3d-viewer');
        if (!container) {
            console.log('no container element found.');
            return;
        }

        var viewerWidth = container.clientWidth;
        var viewerHeight = container.clientHeight;

        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(viewerWidth, viewerHeight);
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);

        var camera = new THREE.PerspectiveCamera(40, viewerWidth / viewerHeight, 0.1, 100);
        camera.position.set(1, 1, -4);

        if (viewerWidth < viewerHeight) {
            camera.position.set(1, 1, -12);
        }

        var controls = new OrbitControls(camera, container);
        controls.target.set(0, 0.5, 0);
        controls.update();

        var environment = new RoomEnvironment();
        var pmremGenerator = new THREE.PMREMGenerator(renderer);

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xd9f4ff);
        scene.environment = pmremGenerator.fromScene(environment).texture;
        scene.fog = new THREE.Fog(0xd9f4ff, 14, 55);
        addPastureEnvironment(scene);

        var model;

        var loader = new THREE.ObjectLoader();
        loader.load("/3d/model.json", function (object) {
            model = object;
            scene.add(model);
        });

        var mouse = new THREE.Vector2();

        var handler = function (e) {
            var element = e.currentTarget;
            var x = e.clientX - element.offsetLeft;
            var y = e.clientY - element.offsetTop;
            var w = element.offsetWidth;
            var h = element.offsetHeight;

            // for touch event
            if (!x) {
                var touch = e.changedTouches[0];
                x = touch.clientX - element.offsetLeft;
                y = touch.clientY - element.offsetTop;
            }

            // regularization from -1 to 1
            mouse.x = (x / w) * 2 - 1;
            mouse.y = -(y / h) * 2 + 1;

            var raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            var intersects = raycaster.intersectObjects(model.children);
            if (intersects.length > 0) {
                //console.log(intersects);
                //console.log(intersects[0].object.name);

                var url;
                var objectName = intersects[0].object.name;
                switch (objectName) {
                    case 'Twitter':
                        url = 'https://twitter.com/with_bugs';
                        break;
                    case 'YouTube':
                        url = 'https://www.youtube.com/channel/UCJZeq1xYxpLn_SlOUnQ8XOA';
                        break;
                    case 'Instagram':
                        url = 'https://www.instagram.com/withbugs/';
                        break;
                    case 'GitHub':
                        url = 'https://github.com/withbugs';
                        break;
                    case 'Bot':
                        url = 'http://withbugsbot.azurewebsites.net/';
                        break;
                }

                if (url) {
                    window.open(url);
                }
            }
        }

        container.addEventListener('click', handler);
        container.addEventListener('touchend', handler);
        
        stopAnimation = false;

        var animate = function () {
            if (stopAnimation) {
                console.log('stopping animation');
                return;
            }

            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        // resize event handler is added each time 'loadScene' function is called.
        // to avoid keep adding handlers, remove a handler when referencing disposed object like 'container.clientWidth'.
        // and have a handler reference as 'resizeHandler' to call in cleanup function to remove a handler and kick GC process.
        var f;

        window.addEventListener('resize', f = () => {

            //console.log('resized');

            var newWidth = container.clientWidth;
            var newHeight = container.clientHeight;

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);

            //console.log(newWidth);
            if (newWidth == 0) {
                window.removeEventListener('resize', f);
                console.log('event removed');
                return;
            }
        });

        resizeHandler = f;

        animate();
    }
};
