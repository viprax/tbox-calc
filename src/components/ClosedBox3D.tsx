import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildSpeakerModel } from "./speakerModel";
import type { DriverInstallation } from "../core/driverInstallation";
import { MATERIALS, type Dims, type MaterialKey } from "../core/boxDimensions";

interface ClosedBox3DProps {
    outerCm: Dims;
    material: MaterialKey;
    installation: DriverInstallation;
    magnetDiameterMm: number;
    magnetDepthMm: number;
}

function woodTexture(kind: MaterialKey, edge: boolean): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось создать текстуру материала");

    if (kind === "plywood" && edge) {
        context.fillStyle = "#ad8051";
        context.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 8) {
            context.fillStyle = y % 16 === 0 ? "#e0bd88" : "#795337";
            context.fillRect(0, y, 512, 3);
        }
    } else if (kind === "chipboard" && edge) {
        context.fillStyle = "#94734f";
        context.fillRect(0, 0, 512, 512);
        let seed = 11;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        for (let i = 0; i < 1700; i += 1) {
            const size = 1 + random() * 5;
            context.fillStyle = random() > 0.52 ? "#c7a477" : "#654d37";
            context.fillRect(random() * 512, random() * 512, size, size * (0.4 + random()));
        }
    } else {
        const base = kind === "plywood" ? "#c79c69" : "#8f765b";
        const light = kind === "plywood" ? "#e0bc88" : "#b39a78";
        const dark = kind === "plywood" ? "#956b43" : "#705a43";
        context.fillStyle = base;
        context.fillRect(0, 0, 512, 512);
        let seed = 23;
        const random = () => {
            seed = (seed * 48271) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        for (let i = 0; i < 260; i += 1) {
            const y = random() * 512;
            context.beginPath();
            context.moveTo(0, y);
            context.bezierCurveTo(120, y - 8 + random() * 16, 360, y - 8 + random() * 16, 512, y + random() * 10 - 5);
            context.strokeStyle = random() > 0.48 ? light : dark;
            context.globalAlpha = 0.08 + random() * 0.15;
            context.lineWidth = 0.5 + random() * 2;
            context.stroke();
        }
        context.globalAlpha = 1;
        if (kind === "chipboard") {
            for (let i = 0; i < 500; i += 1) {
                context.fillStyle = random() > 0.5 ? "#c3aa85" : "#6c5842";
                context.globalAlpha = 0.07;
                context.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 3);
            }
            context.globalAlpha = 1;
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function disposeObject(root: THREE.Object3D) {
    root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
    });
}

export function ClosedBox3D(props: ClosedBox3DProps) {
    const wallCm = MATERIALS[props.material].thicknessMm / 10;
    if (Object.values(props.outerCm).some(value => !Number.isFinite(value) || value <= 2 * wallCm)) return <p role="alert" className="p-4 text-sm text-amber-300">Для 3D нужны положительные размеры полости с учётом толщины стенок.</p>;
    return <ClosedBoxScene {...props} />;
}

function ClosedBoxScene({ outerCm, material, installation, magnetDiameterMm, magnetDepthMm }: ClosedBox3DProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const renderRef = useRef<(() => void) | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const [showDriver, setShowDriver] = useState(true);
    const [showInterior, setShowInterior] = useState(false);
    const [webglError, setWebglError] = useState(false);
    const driverVisible = showDriver && installation.frameDiameterMm !== null
        && installation.frameFits !== false && installation.cutoutFits !== false
        && (showInterior || installation.cutoutFits === true);

    const boxSize = [outerCm.w, outerCm.h, outerCm.d].map((value) => Math.round(value * 10));
    const [widthMm, heightMm, depthMm] = boxSize;
    const maxCm = Math.max(outerCm.w, outerCm.h, outerCm.d);
    const scale = 4 / maxCm;
    const width = outerCm.w * scale;
    const height = outerCm.h * scale;
    const depth = outerCm.d * scale;
    const wall = (MATERIALS[material].thicknessMm / 10) * scale;

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        } catch {
            const errorTimer = window.setTimeout(() => setWebglError(true), 0);
            return () => window.clearTimeout(errorTimer);
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.setClearColor("#111316", 1);
        renderer.domElement.setAttribute("aria-label", "Интерактивная 3D-модель закрытого ящика");
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.tabIndex = 0;
        viewport.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#111316");
        scene.fog = new THREE.Fog("#111316", 10, 24);
        scene.add(new THREE.HemisphereLight("#f2eadb", "#272b32", 2.1));

        const keyLight = new THREE.DirectionalLight("#ffe2bb", 3.1);
        keyLight.position.set(-4, 7, 6);
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight("#99b8d0", 1.4);
        fillLight.position.set(5, 3, -5);
        scene.add(fillLight);

        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        const initialDistance = 8.2;
        camera.position.set(initialDistance * 0.82, initialDistance * 0.61, initialDistance);
        camera.lookAt(0, 0, 0);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.minDistance = 3.2;
        controls.maxDistance = 15;
        controls.target.set(0, 0, 0);
        controls.saveState();
        controls.listenToKeyEvents(renderer.domElement);

        const grid = new THREE.GridHelper(10, 20, "#47505a", "#292e35");
        grid.position.y = -1.92;
        scene.add(grid);

        const render = () => renderer.render(scene, camera);
        renderRef.current = render;
        sceneRef.current = scene;
        controlsRef.current = controls;
        cameraRef.current = camera;
        controls.addEventListener("change", render);

        const resizeObserver = new ResizeObserver(() => {
            const { width: viewportWidth, height: viewportHeight } = viewport.getBoundingClientRect();
            if (viewportWidth <= 0 || viewportHeight <= 0) return;
            renderer.setSize(viewportWidth, viewportHeight, false);
            camera.aspect = viewportWidth / viewportHeight;
            camera.updateProjectionMatrix();
            render();
        });
        resizeObserver.observe(viewport);
        render();

        return () => {
            resizeObserver.disconnect();
            controls.removeEventListener("change", render);
            controls.stopListenToKeyEvents();
            controls.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            sceneRef.current = null;
            controlsRef.current = null;
            cameraRef.current = null;
            renderRef.current = null;
        };
    }, []);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        const previous = scene.getObjectByName("closed-box-model");
        if (previous) {
            scene.remove(previous);
            disposeObject(previous);
        }

        const model = new THREE.Group();
        model.name = "closed-box-model";
        const faceTexture = woodTexture(material, false);
        const edgeTexture = woodTexture(material, true);
        const face = new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.78, metalness: 0.02 });
        const edge = new THREE.MeshStandardMaterial({ map: edgeTexture, roughness: 0.9 });
        const sidePanelMaterials = [face, face, edge, edge, face, face];
        const horizontalPanelMaterials = [edge, edge, face, face, edge, edge];
        const frontPanelMaterials = [edge, edge, edge, edge, face, face];
        const addPanel = (w: number, h: number, d: number, x: number, y: number, z: number, materials: THREE.Material[]) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), materials);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            model.add(mesh);
        };

        // Same butt-joint assembly as the dimensioned panel plan; panels do not overlap.
        addPanel(wall, height, depth - 2 * wall, -width / 2 + wall / 2, 0, 0, sidePanelMaterials);
        addPanel(wall, height, depth - 2 * wall, width / 2 - wall / 2, 0, 0, sidePanelMaterials);
        addPanel(width - 2 * wall, wall, depth - 2 * wall, 0, -height / 2 + wall / 2, 0, horizontalPanelMaterials);
        addPanel(width - 2 * wall, wall, depth - 2 * wall, 0, height / 2 - wall / 2, 0, horizontalPanelMaterials);
        const driverX = (installation.centerMm.x - widthMm / 2) / 10 * scale;
        const driverY = (heightMm / 2 - installation.centerMm.y) / 10 * scale;
        if (!showInterior) {
            if (installation.cutoutFits === true && installation.cutoutDiameterMm !== null) {
                const front = new THREE.Shape();
                front.moveTo(-width / 2, -height / 2);
                front.lineTo(width / 2, -height / 2);
                front.lineTo(width / 2, height / 2);
                front.lineTo(-width / 2, height / 2);
                front.closePath();
                const opening = new THREE.Path();
                opening.absarc(driverX, driverY, installation.cutoutDiameterMm / 20 * scale, 0, Math.PI * 2, true);
                front.holes.push(opening);
                const baffle = new THREE.Mesh(new THREE.ExtrudeGeometry(front, { depth: wall, bevelEnabled: false, curveSegments: 96 }), [face, edge]);
                baffle.position.z = depth / 2 - wall;
                model.add(baffle);
            } else addPanel(width, height, wall, 0, 0, depth / 2 - wall / 2, frontPanelMaterials);
        }
        addPanel(width, height, wall, 0, 0, -depth / 2 + wall / 2, frontPanelMaterials);

        const outline = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
            new THREE.LineBasicMaterial({ color: "#3d3125", transparent: true, opacity: 0.8 }),
        );
        model.add(outline);

        if (driverVisible && installation.frameDiameterMm !== null) {
            const speaker = buildSpeakerModel({ diameterMm: installation.frameDiameterMm, mountingDepthMm: installation.mountingDepthMm, magnetDiameterMm, magnetDepthMm });
            speaker.scale.setScalar(scale / 10);
            speaker.position.set(driverX, driverY, depth / 2);
            model.add(speaker);
        }

        scene.add(model);
        renderRef.current?.();
        return () => {
            scene.remove(model);
            disposeObject(model);
            faceTexture.dispose();
            edgeTexture.dispose();
        };
    }, [depth, height, heightMm, installation, magnetDepthMm, magnetDiameterMm, material, scale, driverVisible, showInterior, wall, width, widthMm]);

    const resetView = () => controlsRef.current?.reset();
    const zoom = (factor: number) => {
        const controls = controlsRef.current;
        const camera = cameraRef.current;
        if (!controls || !camera) return;
        const offset = camera.position.clone().sub(controls.target);
        offset.multiplyScalar(factor);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        renderRef.current?.();
    };

    return (
        <section className="grid gap-3 p-3 sm:p-4" aria-label="3D-модель закрытого ящика">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-zinc-100">Объёмный вид короба</h2>
                    <p className="mt-1 text-xs text-zinc-500">Потяни, чтобы вращать · колесо или жест — масштаб</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setShowDriver((value) => !value)} aria-pressed={showDriver} className={`rounded-md border px-3 py-1.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${showDriver ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 text-zinc-400 hover:text-zinc-100"}`}>
                        {showDriver ? "Скрыть динамик" : "Показать динамик"}
                    </button>
                    <button type="button" onClick={() => setShowInterior((value) => !value)} aria-pressed={showInterior} className={`rounded-md border px-3 py-1.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 ${showInterior ? "border-orange-500/60 bg-orange-500/10 text-orange-200" : "border-zinc-700 text-zinc-300 hover:border-orange-400 hover:text-white"}`}>
                        {showInterior ? "Вернуть переднюю стенку" : "Снять переднюю стенку"}
                    </button>
                    <button type="button" onClick={resetView} className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-orange-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">
                        Сбросить вид
                    </button>
                </div>
            </div>

            <div className="relative h-[360px] overflow-hidden rounded-lg border border-zinc-800 bg-[#111316] sm:h-[470px]">
                <div ref={viewportRef} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" />
                {webglError && <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-zinc-300">Браузер не смог запустить WebGL для 3D-сцены. Проверь аппаратное ускорение и попробуй открыть страницу ещё раз.</div>}
                <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-white/10 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-200 backdrop-blur">
                    Снаружи · {widthMm} × {heightMm} × {depthMm} мм
                </div>
                <div className="absolute bottom-3 right-3 flex gap-1 rounded-md border border-white/10 bg-zinc-950/85 p-1 shadow-lg">
                    <button type="button" onClick={() => zoom(0.82)} aria-label="Приблизить модель" className="grid size-8 place-items-center rounded text-lg text-zinc-200 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">+</button>
                    <button type="button" onClick={() => zoom(1.22)} aria-label="Отдалить модель" className="grid size-8 place-items-center rounded text-lg text-zinc-200 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">−</button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>{MATERIALS[material].label} · стенки {MATERIALS[material].thicknessMm} мм · {showInterior ? "вид изнутри" : "корпус закрыт"}</span>
                <span>{driverVisible ? `Динамик схематичный${installation.frameEstimated ? " · диаметр оценён по номиналу" : ""}` : "Показан только корпус"}</span>
            </div>
            {showDriver && (installation.frameFits === false || installation.cutoutFits === false) && <p role="status" className="text-xs text-amber-300">Динамик не показан: заданный монтажный контур не помещается. Исправьте размеры корпуса или положение центра.</p>}
            {showDriver && installation.frameDiameterMm === null && <p className="text-xs text-amber-300">Динамик не показан: задайте внешний или номинальный диаметр.</p>}
            {showDriver && !showInterior && installation.frameDiameterMm !== null && installation.cutoutDiameterMm === null && <p role="status" className="text-xs text-amber-300">Динамик не показан: задайте диаметр выреза или снимите переднюю стенку для схематического вида.</p>}
            {driverVisible && installation.mountingDepthMm === null && <p className="text-xs text-amber-300">Глубина динамика на 3D-виде условная. Для проверки посадки задайте глубину установки.</p>}
        </section>
    );
}
