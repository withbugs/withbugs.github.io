import * as THREE from '/js/threejs/three.module.js';

    // One camera; a small disclosure contains the optional instructions.
export function createSceneNavigation(container, canvas, camera) {
    var listeners = [], keys = new Set(), pointers = new Map();
    var previousTime = performance.now(), suppressClickUntil = 0;
    var interacted = false, yaw = 0, pitch = 0, journey = null, gesture = null;
    var forward = new THREE.Vector3(), right = new THREE.Vector3(), movement = new THREE.Vector3();
    var up = new THREE.Vector3(0, 1, 0);
    var raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
    var ground = new THREE.Plane(up, 0.04), groundPoint = new THREE.Vector3();
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var clickStep = 1.25;
    var clickStandOff = 1.5;

    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3Dリンク集。ロゴをクリックするとサイトへ。地面をクリックすると移動。ドラッグで見回す、右ドラッグで平行移動、ホイールで前後に移動。WASD・矢印キーで移動、QとEで上下に移動。タッチは1本指で見回す、2本指で移動とピンチ。');

    var instructions = document.createElement('details');
    instructions.className = 'scene-instructions';
    var summary = document.createElement('summary');
    summary.textContent = 'i';
    summary.setAttribute('aria-label', '操作方法');
    summary.title = '操作方法';
    var panel = document.createElement('div');
    panel.className = 'scene-instructions-panel';
    var heading = document.createElement('h2');
    heading.textContent = '3D画面の操作';
    panel.appendChild(heading);
    var guide = document.createElement('dl');
    [
        ['ロゴをクリック / タップ', 'サイトを開く'],
        ['地面をクリック / タップ', 'その方向へ少しずつ移動'],
        ['左ドラッグ', 'その場で見回す'],
        ['右ドラッグ / Shift＋ドラッグ', '平行移動'],
        ['ホイール', '前後へ移動（Shiftで左右）'],
        ['WASD / 矢印キー', '前後左右へ移動'],
        ['Q / E', '下へ / 上へ移動'],
        ['タッチ操作', '1本指で見回す。2本指で移動、ピンチで前後']
    ].forEach(function (entry) {
        var key = document.createElement('dt');
        key.textContent = entry[0];
        var description = document.createElement('dd');
        description.textContent = entry[1];
        guide.append(key, description);
    });
    var note = document.createElement('p');
    note.textContent = 'キー操作は3D画面を一度クリックしてから。最初の全体表示へはページの再読み込みで戻れます。';
    panel.append(guide, note);
    instructions.append(summary, panel);
    container.appendChild(instructions);

    function listen(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        listeners.push(function () { target.removeEventListener(event, handler, options); });
    }
    function cancelJourney() { journey = null; }
    function stopInput() { keys.clear(); pointers.clear(); gesture = null; cancelJourney(); }
    function clampPosition() {
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -22, 22);
        camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.45, 32);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -38, 15);
    }
    function initialView() {
        var halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        // Keep the frontal review angle and fit the front logos to the width. The rear
        // row remains behind them, so narrow screens can start closer.
        var distance = Math.max(3.5, 2.6 / (Math.tan(halfFov) * camera.aspect));
        camera.position.set(0, distance * 0.54, -distance);
        camera.lookAt(0, 0.4, -0.1);
        camera.rotation.order = 'YXZ';
        camera.getWorldDirection(forward);
        yaw = Math.atan2(-forward.x, -forward.z);
        pitch = Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1));
    }
    function directions() {
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, up).normalize();
    }
    function look(dx, dy) {
        yaw -= dx * 0.004;
        pitch = THREE.MathUtils.clamp(pitch - dy * 0.004, -1.35, 1.35);
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
    function pan(dx, dy) {
        directions();
        var scale = Math.max(6, camera.position.y * 2.8) / canvas.clientHeight;
        camera.position.addScaledVector(right, -dx * scale).addScaledVector(forward, dy * scale);
        clampPosition();
    }
    function moveForward(distance) {
        directions();
        camera.position.addScaledVector(forward, distance);
        clampPosition();
    }
    function touchGesture() {
        var touches = Array.from(pointers.values());
        if (touches.length < 2) return null;
        return { x: (touches[0].x + touches[1].x) / 2, y: (touches[0].y + touches[1].y) / 2,
            distance: Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y) };
    }
    listen(canvas, 'contextmenu', function (event) { event.preventDefault(); });
    listen(window, 'pointerdown', function (event) {
        if (instructions.open && !instructions.contains(event.target)) instructions.open = false;
    });
    listen(window, 'keydown', function (event) {
        if (event.key === 'Escape') instructions.open = false;
    });
    listen(canvas, 'pointerdown', function (event) {
        if (event.pointerType !== 'touch' && event.button !== 0 && event.button !== 2) return;
        cancelJourney();
        canvas.focus({ preventScroll: true });
        canvas.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY,
            startX: event.clientX, startY: event.clientY, dragged: false,
            pan: event.button === 2 || event.shiftKey });
        if (pointers.size > 1) {
            pointers.forEach(function (pointer) { pointer.dragged = true; });
            suppressClickUntil = performance.now() + 400;
        }
        gesture = touchGesture();
    });
    listen(canvas, 'pointermove', function (event) {
        var pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        var dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (!pointer.dragged) {
            if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) < 7) return;
            pointer.dragged = true;
            dx = pointer.x - pointer.startX;
            dy = pointer.y - pointer.startY;
        }
        interacted = true;
        if (pointers.size > 1) {
            var next = touchGesture();
            if (gesture) {
                pan(next.x - gesture.x, next.y - gesture.y);
                moveForward((next.distance - gesture.distance) * 0.025);
            }
            gesture = next;
        } else if (pointer.pan) pan(dx, dy);
        else look(dx, dy);
    });
    function release(event) {
        var pointer = pointers.get(event.pointerId);
        if (!pointer) return;
        if (pointer.dragged || event.type === 'pointercancel') suppressClickUntil = performance.now() + 400;
        pointers.delete(event.pointerId);
        gesture = touchGesture();
    }
    listen(canvas, 'pointerup', release);
    listen(canvas, 'pointercancel', release);
    listen(canvas, 'lostpointercapture', release);
    listen(canvas, 'wheel', function (event) {
        event.preventDefault();
        cancelJourney();
        interacted = true;
        var unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
        if (event.shiftKey) pan(event.deltaY * unit, 0);
        else moveForward(-THREE.MathUtils.clamp(event.deltaY * unit, -250, 250) * 0.015);
    }, { passive: false });
    var movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'KeyQ', 'KeyE'];
    listen(window, 'keydown', function (event) {
        if (document.activeElement !== canvas || movementKeys.indexOf(event.code) === -1 || event.ctrlKey || event.altKey || event.metaKey) return;
        event.preventDefault();
        cancelJourney();
        interacted = true;
        keys.add(event.code);
    });
    listen(window, 'keyup', function (event) { keys.delete(event.code); });
    listen(canvas, 'blur', stopInput);
    listen(window, 'blur', stopInput);
    listen(document, 'visibilitychange', function () { if (document.hidden) stopInput(); });
    initialView();
    return {
        update: function (now) {
            var delta = Math.min((now - previousTime) / 1000, 0.05);
            previousTime = now;
            if (journey) {
                journey.elapsed += delta;
                var progress = Math.min(1, journey.elapsed / journey.duration);
                camera.position.lerpVectors(journey.start, journey.end, progress * progress * (3 - 2 * progress));
                if (progress === 1) journey = null;
            }
            var ahead = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
            var sideways = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
            var vertical = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'));
            if (!ahead && !sideways && !vertical) return;
            directions();
            movement.copy(forward).multiplyScalar(ahead).addScaledVector(right, sideways).addScaledVector(up, vertical).normalize();
            camera.position.addScaledVector(movement, delta * 4.8);
            clampPosition();
        },
        moveToGround: function (event) {
            var bounds = canvas.getBoundingClientRect();
            mouse.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
                -(event.clientY - bounds.top) / bounds.height * 2 + 1);
            raycaster.setFromCamera(mouse, camera);
            if (!raycaster.ray.intersectPlane(ground, groundPoint)) return;
            // A ground point is below the camera. Moving directly above it
            // makes the view look past the spot the visitor meant to approach.
            movement.copy(groundPoint).sub(camera.position);
            movement.y = 0;
            var distance = movement.length();
            var step = Math.min(clickStep, Math.max(0, distance - clickStandOff));
            if (step < 0.02) { cancelJourney(); return; }
            var end = camera.position.clone().addScaledVector(movement.normalize(), step);
            end.x = THREE.MathUtils.clamp(end.x, -22, 22);
            end.z = THREE.MathUtils.clamp(end.z, -38, 15);
            interacted = true;
            if (reduceMotion.matches) { camera.position.copy(end); cancelJourney(); }
            else journey = { start: camera.position.clone(), end: end, elapsed: 0,
                duration: 0.45 };
        },
        resize: function () { if (!interacted) initialView(); },
        canOpenLink: function () { return performance.now() >= suppressClickUntil && !Array.from(pointers.values()).some(function (pointer) { return pointer.dragged; }); },
        isDragging: function () { return Array.from(pointers.values()).some(function (pointer) { return pointer.dragged; }); },
        dispose: function () { stopInput(); listeners.forEach(function (remove) { remove(); }); instructions.remove(); }
    };
}
