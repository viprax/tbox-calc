import * as THREE from "three";
import { assertPositive } from "../core/assert";

interface SpeakerShape {
    diameterMm: number;
    mountingDepthMm?: number | null;
    magnetDiameterMm?: number;
    magnetDepthMm?: number;
}

/** Schematic surface model in mm, front mounting plane z=0, back in negative z. */
export function buildSpeakerModel(input: SpeakerShape): THREE.Group {
    const radius = assertPositive("diameterMm", input.diameterMm) / 2;
    // Unknown visual details are illustrative and never feed installation calculations.
    const depth = input.mountingDepthMm ? assertPositive("mountingDepthMm", input.mountingDepthMm) : radius * 1.1;
    const magnetDepth = Math.min(input.magnetDepthMm || depth * 0.32, depth * 0.75);
    const magnetRadius = Math.min((input.magnetDiameterMm || radius * 1.1) / 2, radius * 0.8);
    const basketEndZ = -depth + magnetDepth;
    const group = new THREE.Group();
    group.name = "speaker";
    const material = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide });
    const add = (name: string, geometry: THREE.BufferGeometry, mat: THREE.Material) => {
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.name = name;
        group.add(mesh);
        return mesh;
    };
    const lathe = (name: string, points: number[][], mat: THREE.Material) => {
        const mesh = add(name, new THREE.LatheGeometry(points.map(([r, z]) => new THREE.Vector2(r, z)), 96), mat);
        mesh.rotation.x = Math.PI / 2;
        return mesh;
    };
    lathe("frame", [[radius * 0.87, -radius * 0.02], [radius, -radius * 0.02], [radius, radius * 0.018], [radius * 0.9, radius * 0.025], [radius * 0.87, -radius * 0.02]], material("#27292d", 0.52, 0.4));
    const surround = add("surround", new THREE.TorusGeometry(radius * 0.78, radius * 0.115, 32, 96), material("#202124", 0.65));
    surround.position.z = radius * 0.024;
    surround.scale.z = 0.8;
    const coneDepth = Math.min(radius * 0.20, depth * 0.4);
    lathe("cone", [[radius * 0.29, -coneDepth], [radius * 0.37, -coneDepth * 0.98], [radius * 0.51, -coneDepth * 0.60], [radius * 0.67, radius * 0.015]], material("#232428", 0.88));
    const cap = add("dust-cap", new THREE.SphereGeometry(radius * 0.335, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), material("#17181b", 0.48));
    cap.scale.y = 0.40;
    cap.rotation.x = Math.PI / 2;
    cap.position.z = -coneDepth;
    // One tapered shell connects the flange to the front of the magnet. No isolated rods.
    lathe("basket", [[magnetRadius, basketEndZ], [magnetRadius * 1.04, basketEndZ + Math.min(3, depth * 0.02)], [radius * 0.86, -radius * 0.04], [radius * 0.91, -radius * 0.02]], material("#373a3f", 0.6, 0.5));
    const magnet = add("magnet", new THREE.CylinderGeometry(magnetRadius, magnetRadius, magnetDepth, 64), material("#45494f", 0.48, 0.65));
    magnet.rotation.x = Math.PI / 2;
    magnet.position.z = -depth + magnetDepth / 2;
    return group;
}
