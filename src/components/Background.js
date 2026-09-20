'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Interactive3DBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Detect mobile to reduce workload
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 60 : 140; // 50% fewer particles on mobile
    const maxDistance = isMobile ? 30 : 42;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 180;

    // Hard-cap pixel ratio at 1.5 to prevent massive GPU overhead on high-res screens
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const bounds = { x: 220, y: 140, z: 120 };
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * bounds.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * bounds.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.z;

      velocities.push({
        x: (Math.random() - 0.5) * 0.22,
        y: (Math.random() - 0.5) * 0.22,
        z: (Math.random() - 0.5) * 0.22,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 16; 
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const radGrad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    radGrad.addColorStop(0, 'rgba(56, 189, 248, 1)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 16, 16);
    const pointTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 3.2,
      map: pointTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const maxLines = (particleCount * (particleCount - 1)) / 2;
    const linePositions = new Float32Array(maxLines * 6);
    const lineColors = new Float32Array(maxLines * 6);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX - window.innerWidth / 2);
      mouseY = (e.clientY - window.innerHeight / 2);
    };
    
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      targetX += (mouseX * 0.15 - targetX) * 0.05;
      targetY += (-mouseY * 0.15 - targetY) * 0.05;
      camera.position.x = targetX;
      camera.position.y = targetY;
      camera.lookAt(0, 0, 0);

      const pos = particleGeometry.attributes.position.array;
      let lineIdx = 0;
      let colorIdx = 0;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        pos[i3] += velocities[i].x;
        pos[i3 + 1] += velocities[i].y;
        pos[i3 + 2] += velocities[i].z;

        if (pos[i3] < -bounds.x / 2 || pos[i3] > bounds.x / 2) velocities[i].x *= -1;
        if (pos[i3 + 1] < -bounds.y / 2 || pos[i3 + 1] > bounds.y / 2) velocities[i].y *= -1;
        if (pos[i3 + 2] < -bounds.z / 2 || pos[i3 + 2] > bounds.z / 2) velocities[i].z *= -1;

        if (!isMobile) {
          const dx = targetX - pos[i3];
          const dy = targetY - pos[i3 + 1];
          if (Math.hypot(dx, dy) < 60) {
            pos[i3] += dx * 0.01;
            pos[i3 + 1] += dy * 0.01;
          }
        }

        for (let j = i + 1; j < particleCount; j++) {
          const j3 = j * 3;
          const dist = Math.hypot(pos[i3] - pos[j3], pos[i3 + 1] - pos[j3 + 1], pos[i3 + 2] - pos[j3 + 2]);

          if (dist < maxDistance) {
            const alpha = (1.0 - dist / maxDistance) * 0.35;
            linePositions[lineIdx++] = pos[i3];
            linePositions[lineIdx++] = pos[i3 + 1];
            linePositions[lineIdx++] = pos[i3 + 2];
            linePositions[lineIdx++] = pos[j3];
            linePositions[lineIdx++] = pos[j3 + 1];
            linePositions[lineIdx++] = pos[j3 + 2];

            lineColors[colorIdx++] = 0.05 * alpha;
            lineColors[colorIdx++] = 0.65 * alpha;
            lineColors[colorIdx++] = 0.95 * alpha;
            lineColors[colorIdx++] = 0.05 * alpha;
            lineColors[colorIdx++] = 0.65 * alpha;
            lineColors[colorIdx++] = 0.95 * alpha;
          }
        }
      }

      particleGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
      lineGeometry.setDrawRange(0, lineIdx / 3);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
      particleGeometry.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      pointTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0 opacity-80" />;
}