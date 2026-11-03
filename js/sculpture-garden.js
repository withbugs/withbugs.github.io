import * as THREE from '/js/threejs/three.module.js';

// A quiet, sunlit clearing. All textures are deterministic and generated locally.
function mossTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#748168';
    ctx.fillRect(0, 0, 512, 512);
    var seed = 71;
    function random() {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    }
    // Very fine grain rather than repeating, high-contrast grass blades or stripes.
    for (var i = 0; i < 11000; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(231,238,210,.045)' : 'rgba(38,59,36,.035)';
        ctx.fillRect(random() * 512, random() * 512, 1 + random(), 1 + random());
    }
    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    texture.anisotropy = 4;
    return texture;
}

function softDisc() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,.65)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,.15)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    var texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function groundDisc(texture, color, opacity, width, depth) {
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({
        map: texture, color: color, transparent: true, opacity: opacity,
        depthWrite: false, toneMapped: false
    }));
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
}

export function createSculptureGarden(scene, renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    scene.background = new THREE.Color('#d8e2d2');
    scene.fog = new THREE.Fog('#d8e2d2', 18, 50);
    scene.environmentIntensity = 0.65;

    scene.add(new THREE.HemisphereLight('#f2f0df', '#64745b', 2));
    var sunlight = new THREE.DirectionalLight('#fff0d9', 2.8);
    sunlight.position.set(-5, 10, -4);
    sunlight.target.position.set(0, 0, 1.5);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1536, 1536);
    sunlight.shadow.camera.left = sunlight.shadow.camera.bottom = -9;
    sunlight.shadow.camera.right = sunlight.shadow.camera.top = 9;
    sunlight.shadow.camera.near = 0.5;
    sunlight.shadow.camera.far = 32;
    sunlight.shadow.normalBias = 0.025;
    sunlight.shadow.bias = -0.00012;
    sunlight.shadow.radius = 3.5;
    scene.add(sunlight, sunlight.target);

    var ground = new THREE.Mesh(new THREE.PlaneGeometry(128, 128), new THREE.MeshStandardMaterial({
        map: mossTexture(), roughness: 1, metalness: 0
    }));
    ground.name = 'GardenGround';
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    scene.add(ground);

    var disc = softDisc();
    var clearing = groundDisc(disc, '#dedfc0', 0.12, 15, 18);
    clearing.position.set(0, -0.035, 1.5);
    scene.add(clearing);

    // Soft topography stays outside the sculptures and fades into the distance.
    var hillGeometry = new THREE.SphereGeometry(1, 48, 24);
    [[-13, -0.7, 15, 10, 1.1, 8, '#788970'],
        [14, -1.1, 22, 13, 1.6, 9, '#8b9b7e'],
        [-8, -0.9, 35, 15, 1.7, 10, '#93a58a']].forEach(function (hill) {
        var mesh = new THREE.Mesh(hillGeometry, new THREE.MeshStandardMaterial({
            color: hill[6], roughness: 1
        }));
        mesh.position.set(hill[0], hill[1], hill[2]);
        mesh.scale.set(hill[3], hill[4], hill[5]);
        mesh.receiveShadow = true;
        scene.add(mesh);
    });

    var stoneGeometry = new THREE.IcosahedronGeometry(1, 3);
    [[-6.5, 0.09, 7, 0.65, 0.25, 0.43], [-7.1, 0.035, 7.5, 0.32, 0.14, 0.28],
        [7.5, 0.07, 11, 0.7, 0.22, 0.47]].forEach(function (stone, index) {
        var mesh = new THREE.Mesh(stoneGeometry, new THREE.MeshStandardMaterial({
            color: index === 1 ? '#90978a' : '#a7ac9d', roughness: 0.95
        }));
        mesh.position.set(stone[0], stone[1], stone[2]);
        mesh.scale.set(stone[3], stone[4], stone[5]);
        mesh.rotation.y = index * 1.3;
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
    });

    return { disc: disc, sunlight: sunlight };
}

export function finishSculptures(model, scene, garden) {
    // A small outward stagger reveals the rear silhouettes from the front.
    var house = model.getObjectByName('LittleResidents');
    var puzzle = model.getObjectByName('PhotoSlide');
    if (house) house.position.x -= 0.24;
    if (puzzle) puzzle.position.x += 0.24;

    model.traverse(function (object) {
        if (!object.isMesh) return;
        object.castShadow = object.receiveShadow = true;
        var materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(function (material) {
            // The original model's self-illumination hid its shape and lighting.
            if (!material.isMeshStandardMaterial) return;
            material.emissiveIntensity = 0.025;
            material.roughness = 0.38;
            material.metalness = 0.04;
            material.envMapIntensity = 0.85;
            if (material.isMeshPhysicalMaterial) {
                material.clearcoat = 0.28;
                material.clearcoatRoughness = 0.32;
            }
        });
    });

    model.updateMatrixWorld(true);
    var shadows = new THREE.Group();
    shadows.name = 'SculptureContactShadows';
    model.children.forEach(function (object) {
        // X and Twitter share one location during the existing rebrand animation.
        if (object.name === 'X' || !object.isMesh && !object.userData.clickName) return;
        var box = new THREE.Box3().setFromObject(object);
        if (box.isEmpty()) return;
        var size = box.getSize(new THREE.Vector3());
        var center = box.getCenter(new THREE.Vector3());
        var shadow = groundDisc(garden.disc, '#243e2c', 0.23, size.x * 1.35, Math.max(0.65, size.z * 1.3));
        shadow.position.set(center.x, -0.026, center.z);
        shadows.add(shadow);
    });
    scene.add(shadows);
}

export function createSculptureHover(model, scene, container, garden) {
    var label = document.createElement('div');
    label.className = 'scene-logo-label';
    label.setAttribute('role', 'tooltip');
    label.hidden = true;
    container.appendChild(label);
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var selected = null;
    var targets = model.children.filter(function (object) {
        return object.isMesh || object.userData.clickName;
    }).map(function (object) { return { object: object, baseY: object.position.y, lift: 0 }; });
    var glow = groundDisc(garden.disc, '#f2e1ac', 0, 2.1, 1.5);
    glow.position.y = -0.018;
    scene.add(glow);
    var glowOpacity = 0;

    return {
        select: function (name, title, event) {
            selected = name ? targets.find(function (target) { return target.object.name === name; }) : null;
            label.hidden = !selected;
            if (!selected) return;
            label.textContent = title;
            var bounds = container.getBoundingClientRect();
            var half = Math.min(150, container.clientWidth / 2 - 12);
            label.style.left = THREE.MathUtils.clamp(event.clientX - bounds.left, half + 12, container.clientWidth - half - 12) + 'px';
            label.style.top = Math.max(58, event.clientY - bounds.top - 20) + 'px';
            model.updateMatrixWorld(true);
            var center = new THREE.Box3().setFromObject(selected.object).getCenter(new THREE.Vector3());
            glow.position.set(center.x, -0.018, center.z);
        },
        update: function (delta) {
            var blend = 1 - Math.exp(-delta * 12);
            targets.forEach(function (target) {
                var desired = selected === target && !reduceMotion.matches ? 0.055 : 0;
                target.lift = THREE.MathUtils.lerp(target.lift, desired, blend);
                target.object.position.y = target.baseY + target.lift;
            });
            glowOpacity = THREE.MathUtils.lerp(glowOpacity, selected ? 0.26 : 0, blend);
            glow.material.opacity = glowOpacity;
            glow.visible = glowOpacity > 0.001;
        },
        dispose: function () {
            targets.forEach(function (target) { target.object.position.y = target.baseY; });
            label.remove();
        }
    };
}
