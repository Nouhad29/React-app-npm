
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default function PlanetScene() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log("Init Main three.js scene");

    const scene = new THREE.Scene();

    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const camera = new THREE.PerspectiveCamera(
      60,
      sizes.width / sizes.height,
      0.1,
      1000
    );

    camera.position.set(3, 1, 5);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(sizes.width, sizes.height),
      1.5,
      0.4,
      0.6
    );

    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    const rotationSceneSpeed = 0.2;
    const clock = new THREE.Clock();

    let mixer = null;
    let lightPosition = null;

    function onSceneLoaded(model) {
      scene.add(model);

      model.traverse((child) => {
        if (child.name.toLowerCase().includes("light")) {
          lightPosition = child.position.clone();
        }

        if (child.isMesh) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          for (const material of materials) {
            if (material.name.startsWith("sun")) {
              const texture = material.map;

              const emissiveMaterial = new THREE.MeshStandardMaterial({
                color: 0x111111,
                emissive: 0xffffff,
                emissiveIntensity: 2,
                emissiveMap: texture,
                roughness: 0.4,
                metalness: 0.7,
              });

              child.material = emissiveMaterial;
            }
          }
        }
      });
    }

    function createLights() {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambientLight);

      if (lightPosition) {
        const directionalLight = new THREE.DirectionalLight(
          0xffffff,
          1
        );

        directionalLight.position.copy(lightPosition);
        scene.add(directionalLight);
        scene.add(directionalLight.target);
      }
    }

    function resize() {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.width / sizes.height;

      camera.position.set(3, 1, 5);

      if (sizes.width < 1225 && sizes.width >= 1000) {
        camera.position.set(2, 1, 6);
      } else if (sizes.width < 1000) {
        camera.position.set(1.5, 1, 7);
      }

      camera.updateProjectionMatrix();

      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      composer.setSize(sizes.width, sizes.height);
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    window.addEventListener("resize", resize);
    const loader = new GLTFLoader();

    const relativePath = '/EscenaMain-Rig.glb';


    loader.load(
      relativePath,

      (gltf) => {
        mixer = new THREE.AnimationMixer(gltf.scene);

        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip);
          action.play();
        });

        onSceneLoaded(gltf.scene);
        createLights();
        resize();
      },

      undefined,

      (error) => {
        console.error("Error cargando el modelo GLB:", error);
      }
    );

    function animate() {
      const deltaTime = clock.getDelta();

      if (mixer) {
        mixer.update(deltaTime);
      }

      scene.rotation.y -= rotationSceneSpeed * deltaTime;

      composer.render(deltaTime);
    }

    renderer.setAnimationLoop(animate);

    return () => {
      window.removeEventListener("resize", resize);

      renderer.setAnimationLoop(null);
      renderer.dispose();
      composer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="webgl"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        outline: 'none',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
