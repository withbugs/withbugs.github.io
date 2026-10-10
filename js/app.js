import * as THREE from '/js/threejs/three.module.js';
import { RoomEnvironment } from '/js/threejs/environments/RoomEnvironment.js';
import { PUBLIC_SITES, addPublicSiteLogos } from './public-sites.js';
import { createSceneNavigation } from './scene-navigation.js';


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
    texture.colorSpace = THREE.SRGBColorSpace;
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
    texture.colorSpace = THREE.SRGBColorSpace;
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
    texture.colorSpace = THREE.SRGBColorSpace;
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
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

function addPastureEnvironment(scene) {
    var sky = new THREE.Mesh(
        new THREE.SphereGeometry(45, 48, 24),
        new THREE.MeshBasicMaterial({
            map: createSkyTexture(),
            side: THREE.BackSide,
            fog: false
        })
    );
    sky.position.set(0, 3, 0);
    scene.add(sky);

    var ground = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 90, 1, 1),
        new THREE.MeshBasicMaterial({
            map: createGrassTexture()
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.04, 0);
    scene.add(ground);

    function addHill(z, y, scale, texture) {
        var hill = new THREE.Mesh(
            new THREE.PlaneGeometry(44 * scale, 14 * scale, 1, 1),
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

function createTrackedTextTexture(text) {
    var canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '84px Georgia, "Times New Roman", serif';
    ctx.textBaseline = 'middle';

    var tracking = 48;
    var widths = [];
    var textWidth = 0;

    for (var i = 0; i < text.length; i++) {
        var width = ctx.measureText(text[i]).width;
        widths.push(width);
        textWidth += width;
    }

    textWidth += tracking * Math.max(0, text.length - 1);

    var x = (canvas.width - textWidth) / 2;
    for (var j = 0; j < text.length; j++) {
        ctx.fillText(text[j], x, canvas.height / 2);
        x += widths[j] + tracking;
    }

    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

function createKotatsuLogo(model) {
    var tabletopSize = 0.82;
    var tabletopThickness = 0.07;
    var tabletopHeight = 0.38;
    var tabletopGeometry = new THREE.BoxGeometry(
        tabletopSize,
        tabletopThickness,
        tabletopSize
    );
    var tabletopMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a1a,
        roughness: 0.32,
        metalness: 0.06,
        clearcoat: 0.48,
        clearcoatRoughness: 0.26
    });
    var edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x777777,
        transparent: true,
        opacity: 0.28
    });
    var legMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.52,
        metalness: 0.04
    });

    var logo = new THREE.Group();
    logo.name = 'Kotatsu';
    logo.userData.clickName = 'Kotatsu';

    var youtube = model.getObjectByName('YouTube');
    var youtubeCenter = new THREE.Vector3(0.03, 0.68, 0);
    if (youtube && youtube.geometry) {
        youtube.geometry.computeBoundingBox();
        youtubeCenter.copy(youtube.geometry.boundingBox.getCenter(new THREE.Vector3()));
        youtubeCenter.applyMatrix4(youtube.matrix);
    }
    logo.position.set(youtubeCenter.x, -0.03, youtubeCenter.z + 1.45);

    var table = new THREE.Group();
    table.rotation.y = -Math.PI / 4;
    logo.add(table);

    function addLeg(x, z) {
        var leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.345, 0.045),
            legMaterial
        );
        leg.position.set(x, 0.1725, z);
        table.add(leg);
    }

    addLeg(-0.28, -0.28);
    addLeg(0.28, -0.28);
    addLeg(-0.28, 0.28);
    addLeg(0.28, 0.28);

    var tabletop = new THREE.Mesh(tabletopGeometry, tabletopMaterial);
    tabletop.position.y = tabletopHeight;
    table.add(tabletop);

    var tabletopOutline = new THREE.LineSegments(
        new THREE.EdgesGeometry(tabletopGeometry, 24),
        edgeMaterial
    );
    tabletopOutline.position.copy(tabletop.position);
    table.add(tabletopOutline);

    var text = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 0.1),
        new THREE.MeshBasicMaterial({
            map: createTrackedTextTexture('KOTATSU'),
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    text.rotation.x = -Math.PI / 2;
    text.position.y = tabletopHeight + tabletopThickness / 2 + 0.004;

    var textAlongDiagonal = new THREE.Group();
    textAlongDiagonal.rotation.y = Math.PI / 4;
    textAlongDiagonal.add(text);
    table.add(textAlongDiagonal);

    return logo;
}

function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}

function easeInOutCubic(value) {
    var t = clamp01(value);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(value) {
    return 1 - Math.pow(1 - clamp01(value), 3);
}

function prepareObjectForFade(object) {
    object.traverse(function (child) {
        if (!child.material) {
            return;
        }

        if (Array.isArray(child.material)) {
            child.material = child.material.map(function (material) {
                return material.clone();
            });
        } else {
            child.material = child.material.clone();
        }
    });
}

function setMaterialOpacity(material, opacity) {
    if (!material) {
        return;
    }

    if (Array.isArray(material)) {
        material.forEach(function (item) {
            setMaterialOpacity(item, opacity);
        });
        return;
    }

    if (!material.userData) {
        material.userData = {};
    }

    if (material.userData.baseOpacity === undefined) {
        material.userData.baseOpacity = material.opacity === undefined ? 1 : material.opacity;
    }

    material.transparent = true;
    material.opacity = material.userData.baseOpacity * opacity;
    material.depthWrite = opacity > 0.98;
}

function setObjectOpacity(object, opacity) {
    object.traverse(function (child) {
        setMaterialOpacity(child.material, opacity);
    });
}

function createXLogoMesh(sourceMesh) {
    sourceMesh.geometry.computeBoundingBox();

    var box = sourceMesh.geometry.boundingBox;
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    var sourcePoints = [
        [18.244, 2.25],
        [21.552, 2.25],
        [14.325, 10.51],
        [22.827, 21.75],
        [16.17, 21.75],
        [10.956, 14.933],
        [4.99, 21.75],
        [1.68, 21.75],
        [9.41, 12.915],
        [1.254, 2.25],
        [8.08, 2.25],
        [12.793, 8.481]
    ];
    var holePoints = [
        [5.117, 4.126],
        [7.084, 4.126],
        [18.916, 19.77],
        [17.083, 19.77]
    ];
    var sourceBounds = {
        minX: 1.254,
        maxX: 22.827,
        minY: 2.25,
        maxY: 21.75
    };
    var sourceWidth = sourceBounds.maxX - sourceBounds.minX;
    var sourceHeight = sourceBounds.maxY - sourceBounds.minY;
    var targetWidth = size.x * 0.72;
    var targetHeight = size.y * 0.86;
    var shapeScale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    var visualCenter = center.clone();
    visualCenter.y -= size.y * 0.02;

    function toLogoPoint(point) {
        return new THREE.Vector2(
            visualCenter.x + (point[0] - sourceBounds.minX - sourceWidth / 2) * shapeScale,
            visualCenter.y - (point[1] - sourceBounds.minY - sourceHeight / 2) * shapeScale
        );
    }

    function addPathPoints(path, points) {
        var first = toLogoPoint(points[0]);
        path.moveTo(first.x, first.y);

        for (var i = 1; i < points.length; i++) {
            var point = toLogoPoint(points[i]);
            path.lineTo(point.x, point.y);
        }

        path.lineTo(first.x, first.y);
    }

    var xShape = new THREE.Shape();
    addPathPoints(xShape, sourcePoints);

    var xHole = new THREE.Path();
    addPathPoints(xHole, holePoints);
    xShape.holes.push(xHole);

    var logoDepth = Math.max(size.z * 1.05, 0.075);
    var logoGeometry = new THREE.ExtrudeGeometry(xShape, {
        depth: logoDepth,
        bevelEnabled: true,
        bevelThickness: logoDepth * 0.12,
        bevelSize: Math.min(targetWidth, targetHeight) * 0.018,
        bevelSegments: 2,
        curveSegments: 1,
        steps: 1
    });
    logoGeometry.translate(0, 0, center.z - logoDepth / 2);
    logoGeometry.computeVertexNormals();

    var edgeGeometry = new THREE.EdgesGeometry(logoGeometry, 24);
    var logoMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x050505,
        roughness: 0.34,
        metalness: 0.1,
        clearcoat: 0.55,
        clearcoatRoughness: 0.28,
        transparent: true,
        opacity: 0
    });
    var edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x7c7c7c,
        transparent: true,
        opacity: 0
    });
    logoMaterial.userData.baseOpacity = 1;
    edgeMaterial.userData.baseOpacity = 0.2;

    var logo = new THREE.Group();
    logo.name = 'X';
    logo.userData.clickName = 'X';
    logo.visible = false;
    logo.position.copy(sourceMesh.position);
    logo.position.x += 0.14;
    logo.quaternion.copy(sourceMesh.quaternion);
    logo.scale.copy(sourceMesh.scale);

    var mesh = new THREE.Mesh(logoGeometry, logoMaterial);
    mesh.name = 'X';
    mesh.userData.clickName = 'X';
    logo.add(mesh);

    var edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edge.name = 'XOutline';
    logo.add(edge);

    return logo;
}
function createTransitionSparkles(sourceMesh) {
    sourceMesh.geometry.computeBoundingBox();

    var box = sourceMesh.geometry.boundingBox;
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    var count = 72;
    var positions = new Float32Array(count * 3);
    var basePositions = new Float32Array(count * 3);
    var velocities = new Float32Array(count * 3);

    for (var i = 0; i < count; i++) {
        var angle = i * 2.399963229728653;
        var ring = 0.18 + ((i * 17) % 37) / 100;
        var zJitter = (((i * 29) % 100) / 100 - 0.5) * size.z * 2.3;
        var x = center.x + Math.cos(angle) * size.x * ring;
        var y = center.y + Math.sin(angle) * size.y * ring;
        var z = center.z + zJitter;
        var index = i * 3;

        positions[index] = x;
        positions[index + 1] = y;
        positions[index + 2] = z;
        basePositions[index] = x;
        basePositions[index + 1] = y;
        basePositions[index + 2] = z;
        velocities[index] = Math.cos(angle) * size.x * (0.45 + ring);
        velocities[index + 1] = Math.sin(angle) * size.y * (0.45 + ring);
        velocities[index + 2] = zJitter * 1.6;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.045,
        transparent: true,
        opacity: 0,
        depthWrite: false
    });
    material.userData.baseOpacity = 0.95;

    var sparkles = new THREE.Points(geometry, material);
    sparkles.visible = false;
    sparkles.position.copy(sourceMesh.position);
    sparkles.quaternion.copy(sourceMesh.quaternion);
    sparkles.scale.copy(sourceMesh.scale);
    sparkles.userData.basePositions = basePositions;
    sparkles.userData.velocities = velocities;

    return sparkles;
}

function createTwitterRebrandTransition(model) {
    var twitterMesh = model.getObjectByName('Twitter');

    if (!twitterMesh) {
        return null;
    }

    prepareObjectForFade(twitterMesh);

    var xLogo = createXLogoMesh(twitterMesh);
    var sparkles = createTransitionSparkles(twitterMesh);
    model.add(xLogo);
    model.add(sparkles);

    return {
        startTime: performance.now() + 1600,
        duration: 2600,
        started: false,
        completed: false,
        twitterMesh: twitterMesh,
        twitterStartScale: twitterMesh.scale.clone(),
        twitterStartRotation: twitterMesh.rotation.clone(),
        xLogo: xLogo,
        xStartScale: xLogo.scale.clone(),
        xStartRotation: xLogo.rotation.clone(),
        sparkles: sparkles
    };
}

function updateSparkles(sparkles, progress) {
    if (!sparkles) {
        return;
    }

    var positions = sparkles.geometry.attributes.position.array;
    var basePositions = sparkles.userData.basePositions;
    var velocities = sparkles.userData.velocities;
    var expansion = easeOutCubic(progress);

    for (var i = 0; i < positions.length; i += 3) {
        positions[i] = basePositions[i] + velocities[i] * expansion;
        positions[i + 1] = basePositions[i + 1] + velocities[i + 1] * expansion;
        positions[i + 2] = basePositions[i + 2] + velocities[i + 2] * expansion;
    }

    sparkles.geometry.attributes.position.needsUpdate = true;
    sparkles.visible = progress > 0 && progress < 1;
    setObjectOpacity(sparkles, Math.sin(progress * Math.PI));
}

function updateTwitterRebrandTransition(transition) {
    if (!transition || transition.completed) {
        return;
    }

    var progress = (performance.now() - transition.startTime) / transition.duration;

    if (progress < 0) {
        return;
    }

    progress = clamp01(progress);

    if (!transition.started) {
        transition.started = true;
        transition.xLogo.visible = true;
        transition.sparkles.visible = true;
    }

    var twitterMesh = transition.twitterMesh;
    var twitterExit = easeInOutCubic(clamp01((progress - 0.18) / 0.58));
    var twitterFlash = Math.sin(clamp01(progress / 0.45) * Math.PI);
    var twitterScale = 1 + twitterFlash * 0.22 - twitterExit * 0.88;

    twitterMesh.visible = twitterExit < 1;
    twitterMesh.scale.copy(transition.twitterStartScale).multiplyScalar(Math.max(0.08, twitterScale));
    twitterMesh.rotation.copy(transition.twitterStartRotation);
    twitterMesh.rotation.z += easeOutCubic(progress) * Math.PI * 2.25;
    twitterMesh.rotation.y += twitterExit * Math.PI * 0.55;
    setObjectOpacity(twitterMesh, 1 - twitterExit);

    var xEnter = easeInOutCubic(clamp01((progress - 0.36) / 0.54));
    var xOvershoot = Math.sin(xEnter * Math.PI) * 0.1;
    transition.xLogo.scale.copy(transition.xStartScale).multiplyScalar(0.18 + (0.82 + xOvershoot) * xEnter);
    transition.xLogo.rotation.copy(transition.xStartRotation);
    transition.xLogo.rotation.y -= (1 - xEnter) * Math.PI;
    transition.xLogo.rotation.z += (1 - xEnter) * 0.18;
    setObjectOpacity(transition.xLogo, xEnter);

    updateSparkles(transition.sparkles, progress);

    if (progress >= 1) {
        twitterMesh.visible = false;
        transition.xLogo.visible = true;
        transition.xLogo.scale.copy(transition.xStartScale);
        transition.xLogo.rotation.copy(transition.xStartRotation);
        setObjectOpacity(transition.xLogo, 1);
        transition.sparkles.visible = false;
        transition.completed = true;
    }
}

function getClickableName(object, root) {
    var current = object;

    while (current && current !== root) {
        if (current.userData && current.userData.clickName) {
            return current.userData.clickName;
        }

        if (current.name) {
            return current.name;
        }

        current = current.parent;
    }

    return null;
}
var disposeScene;

function disposeGraph(root) {
    var geometries = new Set();
    var materials = new Set();
    var textures = new Set();
    root.traverse(function (object) {
        if (object.geometry) geometries.add(object.geometry);
        var list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach(function (material) {
            if (!material) return;
            materials.add(material);
            Object.values(material).forEach(function (value) { if (value && value.isTexture) textures.add(value); });
        });
    });
    geometries.forEach(function (geometry) { geometry.dispose(); });
    materials.forEach(function (material) { material.dispose(); });
    textures.forEach(function (texture) { texture.dispose(); });
}

window.appJsFunctions = {
    cleanup: function () {
        if (disposeScene) { disposeScene(); disposeScene = null; }
    },

    loadScene: function () {
        window.appJsFunctions.cleanup();
        var container = document.getElementById('index-3d-viewer');
        if (!container) return;
        var disposed = false;
        var animationId;
        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        var camera = new THREE.PerspectiveCamera(container.clientWidth < 600 ? 52 : 40,
            container.clientWidth / container.clientHeight, 0.1, 120);
        var navigation = createSceneNavigation(container, renderer.domElement, camera);
        var environment = new RoomEnvironment();
        var pmremGenerator = new THREE.PMREMGenerator(renderer);
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xd9f4ff);
        scene.environment = pmremGenerator.fromScene(environment).texture;
        scene.fog = new THREE.Fog(0xd9f4ff, 42, 72);
        environment.dispose();
        pmremGenerator.dispose();
        addPastureEnvironment(scene);

        var model;
        var twitterRebrandTransition;
        var loadError;
        var loader = new THREE.ObjectLoader();
        loader.load('/3d/model.json', function (object) {
            if (disposed) { disposeGraph(object); return; }
            model = object;
            model.add(createKotatsuLogo(model));
            addPublicSiteLogos(model);
            scene.add(model);
            twitterRebrandTransition = createTwitterRebrandTransition(model);
        }, undefined, function () {
            if (disposed) return;
            loadError = document.createElement('p');
            loadError.className = 'scene-help';
            loadError.setAttribute('role', 'alert');
            loadError.textContent = '3Dモデルを読み込めませんでした。ページを再読み込みしてください。';
            container.appendChild(loadError);
        });

        var destinations = {
            X: { title: 'X', url: 'https://x.com/with_bugs' },
            Twitter: { title: 'Twitter', url: 'https://twitter.com/with_bugs' },
            YouTube: { title: 'YouTube', url: 'https://www.youtube.com/channel/UCJZeq1xYxpLn_SlOUnQ8XOA' },
            Instagram: { title: 'Instagram', url: 'https://www.instagram.com/withbugs/' },
            Kotatsu: { title: 'KOTATSU', url: 'https://withbugs.github.io/kotatsu/' },
            GitHub: { title: 'GitHub', url: 'https://github.com/withbugs' }
        };
        PUBLIC_SITES.forEach(function (site) { destinations[site.name] = site; });
        var mouse = new THREE.Vector2();
        var raycaster = new THREE.Raycaster();
        function pick(event) {
            if (!model) return null;
            var bounds = renderer.domElement.getBoundingClientRect();
            mouse.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
                -(event.clientY - bounds.top) / bounds.height * 2 + 1);
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(model.children, true);
            for (var index = 0; index < intersects.length; index++) {
                var object = intersects[index].object;
                if (!object.isMesh) continue;
                var ancestor = object;
                var visible = true;
                while (ancestor) {
                    if (!ancestor.visible) { visible = false; break; }
                    ancestor = ancestor.parent;
                }
                if (!visible) continue;
                var name = getClickableName(object, model);
                if (destinations[name]) return destinations[name];
            }
            return null;
        }

        function openLink(event) {
            if (event.button !== 0 || !navigation.canOpenLink()) return;
            var destination = pick(event);
            if (destination) window.open(destination.url, '_blank', 'noopener,noreferrer');
            else navigation.moveToGround(event);
        }
        function showHover(event) {
            var destination = pick(event);
            renderer.domElement.style.cursor = navigation.isDragging() ? 'grabbing' : destination ? 'pointer' : 'grab';
            renderer.domElement.title = destination ? destination.title : '';
        }
        renderer.domElement.addEventListener('click', openLink);
        renderer.domElement.addEventListener('pointermove', showHover);

        function resize() {
            if (disposed || !container.clientWidth || !container.clientHeight) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.fov = container.clientWidth < 600 ? 52 : 40;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
            navigation.resize();
        }
        var observer = new ResizeObserver(resize);
        observer.observe(container);
        function animate(now) {
            if (disposed) return;
            animationId = requestAnimationFrame(animate);
            navigation.update(now);
            updateTwitterRebrandTransition(twitterRebrandTransition);
            renderer.render(scene, camera);
        }
        animationId = requestAnimationFrame(animate);
        disposeScene = function () {
            if (disposed) return;
            disposed = true;
            cancelAnimationFrame(animationId);
            observer.disconnect();
            renderer.domElement.removeEventListener('click', openLink);
            renderer.domElement.removeEventListener('pointermove', showHover);
            navigation.dispose();
            disposeGraph(scene);
            if (scene.environment) scene.environment.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            if (loadError) loadError.remove();
        };
    }
};
