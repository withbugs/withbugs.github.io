import * as THREE from '/js/threejs/three.module.js';
import { WB_OUTLINE } from './wb-outline.js';

// Fashion, residents and puzzle marks come from the public sites themselves.
// The adventure mark is an original book/wayfinder for every future chapter.
export const PUBLIC_SITES = [
    { name: 'Withbugstagram', title: 'withbugstagram', url: 'https://withbugstagram.withbugs.chatgpt.site/', color: 0xe9eadd },
    { name: 'LittleResidents', title: 'ちいさな住人たち', url: 'https://little-residents.withbugs.chatgpt.site/', color: 0x173e38 },
    { name: 'ResidentsAdventure', title: 'ちいさな住人たちの冒険', url: 'https://little-residents-adventure.withbugs.chatgpt.site/', color: 0x1d4d4d },
    { name: 'PhotoSlide', title: '写真で15パズル', url: 'https://photo-slide.withbugs.chatgpt.site/', color: 0x152f2e }
];

export function roundedRectangle(width, height, radius) {
    var x = -width / 2;
    var y = -height / 2;
    var shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
}

function material(color) {
    return new THREE.MeshPhysicalMaterial({ color: color, roughness: 0.28, metalness: 0.06,
        clearcoat: 0.5, clearcoatRoughness: 0.22 });
}

function relief(shape, depth, color, z) {
    var geometry = new THREE.ExtrudeGeometry(shape, {
        depth: depth, bevelEnabled: true, bevelSize: 0.02,
        bevelThickness: 0.02, bevelSegments: 4, curveSegments: 24, steps: 1
    });
    geometry.translate(0, 0, -depth / 2);
    var mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.z = z || 0;
    return mesh;
}

function polygon(points) {
    var shape = new THREE.Shape();
    points.forEach(function (point, index) {
        if (index === 0) shape.moveTo(point[0], point[1]);
        else shape.lineTo(point[0], point[1]);
    });
    shape.closePath();
    return shape;
}

function fashionMark() {
    var group = new THREE.Group();
    var disk = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.15, 64), material(0xe9eadd));
    disk.rotation.x = Math.PI / 2;
    group.add(disk);
    // Georgia italic w/b outlines preserve the page's overlapping monogram.
    var outline = new THREE.ShapePath();
    WB_OUTLINE.forEach(function (command) {
        if (command[0] === 'M') outline.moveTo(command[1], command[2]);
        if (command[0] === 'L') outline.lineTo(command[1], command[2]);
        if (command[0] === 'C') outline.bezierCurveTo.apply(outline, command.slice(1));
        if (command[0] === 'Z') outline.currentPath.closePath();
    });
    outline.toShapes(false).forEach(function (shape) {
        group.add(relief(shape, 0.065, 0x505740, 0.125));
    });
    return group;
}

function residentsMark() {
    var group = new THREE.Group();
    // The favicon's house and smile, enlarged without its square background.
    var points = [[9, 23], [9, 13], [13, 7], [23, 13], [23, 23]].map(function (p) {
        return [(p[0] - 16) / 16 * 1.15, (15 - p[1]) / 16 * 1.15];
    });
    group.add(relief(polygon(points), 0.15, 0xddd98f));
    var smile = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.28, -0.21, 0.101),
        new THREE.Vector3(0, -0.5, 0.101),
        new THREE.Vector3(0.28, -0.21, 0.101));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(smile, 32, 0.047, 12, false), material(0x173e38)));
    return group;
}

function puzzleMark() {
    var group = new THREE.Group();
    var frame = roundedRectangle(1.2, 1.2, 0.22);
    frame.holes.push(roundedRectangle(1.04, 1.04, 0.15));
    group.add(relief(frame, 0.15, 0x152f2e));
    // No backplate: tile gaps and the lower-right cell are actual openings.
    [[-0.245, 0.245], [0.245, 0.245], [-0.245, -0.245]].forEach(function (position) {
        var tile = relief(roundedRectangle(0.425, 0.425, 0.035), 0.15, 0xdcf98c);
        tile.position.x = position[0];
        tile.position.y = position[1];
        group.add(tile);
    });
    return group;
}

function adventureMark() {
    var group = new THREE.Group();
    var cover = [[-0.63, 0.47], [0, 0.32], [0, -0.51], [-0.63, -0.34]];
    var page = [[-0.56, 0.39], [-0.045, 0.27], [-0.045, -0.42], [-0.56, -0.28]];
    [1, -1].forEach(function (side) {
        group.add(relief(polygon(cover.map(function (p) { return [p[0] * side, p[1]]; })), 0.15, 0x1d4d4d));
        group.add(relief(polygon(page.map(function (p) { return [p[0] * side, p[1]]; })), 0.08,
            side === 1 ? 0xf4f0e4 : 0xe6d6a1, 0.11));
    });
    var wayfinder = polygon([[0, 0.47], [0.085, 0.12], [0.29, 0.02], [0.085, -0.065], [0, -0.41], [-0.085, -0.065], [-0.29, 0.02], [-0.085, 0.12]]);
    group.add(relief(wayfinder, 0.07, 0x173e38, 0.19));
    group.add(relief(polygon([[0, 0.36], [0.056, 0.13], [-0.056, 0.13]]), 0.025, 0xd49a5c, 0.245));
    return group;
}

function originalLogoCenter(model, name, fallback) {
    var center = new THREE.Vector3().fromArray(fallback);
    var object = model.getObjectByName(name);
    if (object && object.geometry) {
        object.geometry.computeBoundingBox();
        object.geometry.boundingBox.getCenter(center).applyMatrix4(object.matrix);
    }
    return center;
}

export function addPublicSiteLogos(model) {
    var creators = [fashionMark, residentsMark, adventureMark, puzzleMark];
    var fashionPosition = originalLogoCenter(model, 'Bot', [1.26, 0.73, -2.12]);
    fashionPosition.y = 0.73;
    var positions = [fashionPosition];
    // Align the three remaining sites with the actual centers of the front row.
    [['Twitter', -1.984], ['YouTube', 0.024], ['Instagram', 1.93]].forEach(function (column) {
        var center = originalLogoCenter(model, column[0], [column[1], 0.73, 0]);
        positions.push(new THREE.Vector3(center.x, 0.73, -5.8));
    });
    // Retire the unavailable Bot before the imported model enters the scene.
    var bot = model.getObjectByName('Bot');
    if (bot) bot.removeFromParent();
    PUBLIC_SITES.forEach(function (site, index) {
        var logo = new THREE.Group();
        logo.name = site.name;
        logo.userData.clickName = site.name;
        logo.userData.title = site.title;
        logo.userData.url = site.url;
        logo.position.copy(positions[index]);
        logo.add(creators[index]());
        model.add(logo);
    });
}
