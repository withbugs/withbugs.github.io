import * as THREE from '/js/threejs/three.module.js';
import { OrbitControls } from '/js/threejs/controls/OrbitControls.js';
import { RoomEnvironment } from '/js/threejs/environments/RoomEnvironment.js';

window.appJsFunctions = {

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
        camera.position.set(1, 1, - 4);

        var controls = new OrbitControls(camera, container);
        controls.target.set(0, 0.5, 0);
        controls.update();

        var environment = new RoomEnvironment();
        var pmremGenerator = new THREE.PMREMGenerator(renderer);

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeeeeee);
        scene.environment = pmremGenerator.fromScene(environment).texture;
        scene.fog = new THREE.Fog(0xeeeeee, 10, 50);

        var grid = new THREE.GridHelper(100, 40, 0x000000, 0x000000);
        grid.material.opacity = 0.1;
        grid.material.depthWrite = false;
        grid.material.transparent = true;
        scene.add(grid);

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
                }

                if (url) {
                    window.open(url);
                }
            }
        }

        container.addEventListener('click', handler);
        container.addEventListener('touchend', handler);
        

        var animate = function () {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        window.addEventListener('resize', () => {
            var newWidth = container.clientWidth;
            var newHeight = container.clientHeight;

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        });

        animate();
    }
};