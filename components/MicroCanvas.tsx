import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CellType, Particle, DrugType, DemoState, DemoStep } from '../types';
import { CELL_CONFIGS } from '../constants';
import { soundManager } from '../utils/audio';

interface MicroCanvasProps {
    isAlertActive: boolean;
    cytokineLevel: number;
    onDamageUpdate: (count: number) => void;
    onStatsUpdate: (stats: { killed: number, saved: number }) => void;
    drugTrigger: number;
    selectedDrug: DrugType;
    timeScale: number;
    isPaused: boolean;
    demoState: DemoState;
    onDemoFocusUpdate: (target: { x: number; y: number } | null) => void;
}

interface EffectParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

const MicroCanvas: React.FC<MicroCanvasProps> = ({
    isAlertActive,
    cytokineLevel,
    onDamageUpdate,
    onStatsUpdate,
    drugTrigger,
    selectedDrug,
    timeScale,
    isPaused,
    demoState,
    onDemoFocusUpdate
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const effectsRef = useRef<EffectParticle[]>([]);
    const requestRef = useRef<number>();

    const [zoom, setZoom] = useState(1.0);
    const zoomRef = useRef(1.0);
    const statsRef = useRef({ killed: 0, saved: 0 });
    const prevStatsRef = useRef({ killed: 0, saved: 0 });

    useEffect(() => {
        if (drugTrigger > 0) {
            spawnDrugs();
        }
    }, [drugTrigger]);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            let newZoom = zoomRef.current + delta;
            if (newZoom < 0.5) newZoom = 0.5;
            if (newZoom > 3.0) newZoom = 3.0;
            zoomRef.current = newZoom;
            setZoom(newZoom);
        };
        const canvas = canvasRef.current;
        if (canvas) canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => { if (canvas) canvas.removeEventListener('wheel', handleWheel); };
    }, []);

    const createParticle = useCallback((type: CellType, width: number, height: number, drugType?: DrugType): Particle => {
        const config = CELL_CONFIGS[type] || { radius: 10, color: '#fff', glow: '#fff', speed: 1, health: 100 };
        let speed = config.speed;
        let radius = config.radius;
        let color = config.color;

        if (type === CellType.DRUG && drugType) {
            switch (drugType) {
                case DrugType.OINTMENT: speed = 1.0; radius = 8; color = '#ffffff'; break;
                case DrugType.PILL: speed = 2.5; radius = 6; color = '#60a5fa'; break;
                case DrugType.INJECTION: speed = 4.0; radius = 4; color = '#34d399'; break;
            }
        }

        const points = type === CellType.MACROPHAGE ? Array.from({ length: 12 }, (_, i) => ({
            x: Math.cos((i / 12) * Math.PI * 2) * radius,
            y: Math.sin((i / 12) * Math.PI * 2) * radius,
        })) : undefined;

        return {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * speed,
            vy: (Math.random() - 0.5) * speed,
            radius,
            health: config.health,
            maxHealth: config.health,
            glowColor: color,
            pulse: Math.random() * Math.PI * 2,
            points,
            rotation: Math.random() * Math.PI * 2,
            drugType,
            isActive: false,
            hasAntigen: false
        };
    }, []);

    const spawnDrugs = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const count = selectedDrug === DrugType.INJECTION ? 30 : (selectedDrug === DrugType.OINTMENT ? 15 : 20);
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            newParticles.push(createParticle(CellType.DRUG, width, height, selectedDrug));
        }
        particlesRef.current = [...particlesRef.current, ...newParticles];
    };

    const createExplosion = (x: number, y: number, color: string, count: number = 10) => {
        for (let i = 0; i < count; i++) {
            effectsRef.current.push({
                x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 1.0, color, size: Math.random() * 3 + 1
            });
        }
    };

    const initSimulation = useCallback(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const particles: Particle[] = [];

        // Initial Population
        for (let i = 0; i < 40; i++) particles.push(createParticle(CellType.SKIN, width, height));
        for (let i = 0; i < 5; i++) particles.push(createParticle(CellType.DENDRITIC, width, height));
        for (let i = 0; i < 8; i++) particles.push(createParticle(CellType.T_CD4, width, height));
        for (let i = 0; i < 6; i++) particles.push(createParticle(CellType.T_CD8, width, height));

        particlesRef.current = particles;
    }, [createParticle]);

    // Demo Mode Refs
    const demoParticlesRef = useRef<{
        antigen: Particle | null;
        dendritic: Particle | null;
        tHelper: Particle | null;
        cytokine: Particle | null;
        tKiller: Particle | null;
        targetSkin: Particle | null;
    }>({
        antigen: null,
        dendritic: null,
        tHelper: null,
        cytokine: null,
        tKiller: null,
        targetSkin: null
    });
    const lastDemoStepRef = useRef<DemoStep>(DemoStep.IDLE);

    // Demo Mode Logic
    useEffect(() => {
        if (!demoState.isActive) {
            lastDemoStepRef.current = DemoStep.IDLE;
            demoParticlesRef.current = {
                antigen: null, dendritic: null, tHelper: null, cytokine: null, tKiller: null, targetSkin: null
            };
            return;
        }

        // Only run when step changes
        if (demoState.currentStep === lastDemoStepRef.current) return;
        lastDemoStepRef.current = demoState.currentStep;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const centerX = width / 2;
        const centerY = height / 2;

        switch (demoState.currentStep) {
            case DemoStep.ANTIGEN_APPEARS: {
                // Clear active states and spawn antigen at center
                particlesRef.current.forEach(p => {
                    p.isActive = false;
                    p.hasAntigen = false;
                });

                const antigen = createParticle(CellType.ANTIGEN, width, height);
                antigen.x = centerX;
                antigen.y = centerY - 100;
                antigen.vx = 0;
                antigen.vy = 0;
                antigen.radius = 22; // Larger for visibility
                particlesRef.current.push(antigen);
                demoParticlesRef.current.antigen = antigen;

                onDemoFocusUpdate({ x: antigen.x, y: antigen.y });
                createExplosion(antigen.x, antigen.y, '#ef4444', 20);
                soundManager.playAlert();
                break;
            }

            case DemoStep.DENDRITIC_CAPTURES: {
                // Find nearest dendritic cell and make it capture the antigen
                const dendritic = particlesRef.current.find(p => p.type === CellType.DENDRITIC);
                const antigen = demoParticlesRef.current.antigen;

                if (dendritic && antigen) {
                    // Move dendritic towards antigen - slower movement
                    dendritic.x = antigen.x - 80;
                    dendritic.y = antigen.y;
                    dendritic.vx = 0.15; // Much slower
                    dendritic.vy = 0;
                    dendritic.radius = 16; // Larger for visibility

                    // After a longer delay, capture antigen
                    setTimeout(() => {
                        if (antigen.health > 0) {
                            antigen.health = 0;
                            dendritic.hasAntigen = true;
                            createExplosion(dendritic.x, dendritic.y, '#fbbf24', 15);
                            soundManager.playActivation();
                        }
                    }, 4000); // Increased from 1500

                    demoParticlesRef.current.dendritic = dendritic;
                    onDemoFocusUpdate({ x: dendritic.x, y: dendritic.y });
                }
                break;
            }

            case DemoStep.THELPER_ACTIVATES: {
                const dendritic = demoParticlesRef.current.dendritic;
                const tHelper = particlesRef.current.find(p => p.type === CellType.T_CD4 && !p.isActive);

                if (dendritic && tHelper) {
                    // Move T-Helper near dendritic - slower
                    tHelper.x = dendritic.x + 100;
                    tHelper.y = dendritic.y;
                    tHelper.vx = -0.1; // Much slower
                    tHelper.vy = 0;
                    tHelper.radius = 14;

                    // Activate after longer contact time
                    setTimeout(() => {
                        tHelper.isActive = true;
                        dendritic.hasAntigen = false;
                        createExplosion(tHelper.x, tHelper.y, '#3b82f6', 18);
                        soundManager.playActivation();
                    }, 4500); // Increased from 1800

                    demoParticlesRef.current.tHelper = tHelper;
                    onDemoFocusUpdate({ x: (dendritic.x + tHelper.x) / 2, y: tHelper.y });
                }
                break;
            }

            case DemoStep.CYTOKINE_RELEASE: {
                const tHelper = demoParticlesRef.current.tHelper;

                if (tHelper && tHelper.isActive) {
                    // Spawn multiple cytokines from T-Helper - slower spawn
                    for (let i = 0; i < 6; i++) {
                        setTimeout(() => {
                            const cytokine = createParticle(CellType.CYTOKINE, width, height);
                            cytokine.x = tHelper.x;
                            cytokine.y = tHelper.y;
                            cytokine.vx = (Math.random() - 0.5) * 1.5; // Slower
                            cytokine.vy = (Math.random() - 0.5) * 1.5;
                            cytokine.radius = 7; // Larger
                            particlesRef.current.push(cytokine);

                            if (i === 0) {
                                demoParticlesRef.current.cytokine = cytokine;
                            }
                            createExplosion(cytokine.x, cytokine.y, '#fbbf24', 5);
                        }, i * 800); // Increased from 400
                    }

                    onDemoFocusUpdate({ x: tHelper.x, y: tHelper.y });
                    soundManager.playActivation();
                }
                break;
            }

            case DemoStep.TKILLER_ACTIVATES: {
                const tKiller = particlesRef.current.find(p => p.type === CellType.T_CD8 && !p.isActive);
                const cytokine = demoParticlesRef.current.cytokine;

                if (tKiller && cytokine) {
                    // Move cytokine towards T-Killer
                    tKiller.x = centerX + 100;
                    tKiller.y = centerY;
                    tKiller.radius = 14;

                    setTimeout(() => {
                        tKiller.isActive = true;
                        // Remove cytokine
                        const cytoIndex = particlesRef.current.findIndex(p => p === cytokine);
                        if (cytoIndex > -1) {
                            particlesRef.current[cytoIndex].health = 0;
                        }
                        createExplosion(tKiller.x, tKiller.y, '#ef4444', 22);
                        soundManager.playActivation();
                    }, 4000); // Increased from 1500

                    demoParticlesRef.current.tKiller = tKiller;
                    onDemoFocusUpdate({ x: tKiller.x, y: tKiller.y });
                }
                break;
            }

            case DemoStep.SKIN_ATTACK: {
                const tKiller = demoParticlesRef.current.tKiller;
                const targetSkin = particlesRef.current.find(p => p.type === CellType.SKIN && p.health > 0);

                if (tKiller && targetSkin) {
                    // Move T-Killer towards skin cell - slower
                    tKiller.x = targetSkin.x - 70;
                    tKiller.y = targetSkin.y;
                    tKiller.vx = 0.2; // Much slower
                    tKiller.vy = 0;

                    // Make target skin visible
                    targetSkin.radius = 16;

                    setTimeout(() => {
                        targetSkin.health = 0;
                        createExplosion(targetSkin.x, targetSkin.y, '#ef4444', 30);
                        soundManager.playExplosion();
                        statsRef.current.killed++;
                    }, 5000); // Increased from 2000

                    demoParticlesRef.current.targetSkin = targetSkin;
                    onDemoFocusUpdate({ x: targetSkin.x, y: targetSkin.y });
                }
                break;
            }

            case DemoStep.COMPLETE: {
                onDemoFocusUpdate(null);
                break;
            }
        }
    }, [demoState.isActive, demoState.currentStep, createParticle, onDemoFocusUpdate]);

    const drawOrganicCell = (ctx: CanvasRenderingContext2D, p: Particle) => {
        const r = p.radius + Math.sin(p.pulse) * 2;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.isActive || p.hasAntigen) {
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
        } else {
            ctx.shadowBlur = 10; ctx.shadowColor = p.glowColor;
        }

        if (p.type === CellType.ANTIGEN) {
            ctx.fillStyle = '#000'; ctx.strokeStyle = '#ef4444';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos(i * 1.2) * r, Math.sin(i * 1.2) * r);
            }
            ctx.fill(); ctx.stroke();
        }
        else if (p.type === CellType.DENDRITIC) {
            ctx.fillStyle = p.hasAntigen ? '#ef4444' : CELL_CONFIGS[p.type].color;
            ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5, Math.cos(a) * r * 2.5, Math.sin(a) * r * 2.5);
                ctx.strokeStyle = p.hasAntigen ? '#ff0000' : p.glowColor; ctx.stroke();
            }
        }
        else if (p.type === CellType.T_CD4 || p.type === CellType.T_CD8) {
            ctx.fillStyle = p.isActive ? '#ef4444' : CELL_CONFIGS[p.type].color;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        else if (p.type === CellType.CYTOKINE) {
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 0, r / 2, 0, Math.PI * 2); ctx.fill();
        }
        else if (p.type === CellType.SKIN) {
            ctx.fillStyle = p.health / p.maxHealth < 0.5 ? '#7f1d1d' : CELL_CONFIGS[p.type].color;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        else if (p.type === CellType.DRUG) {
            ctx.fillStyle = p.glowColor;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        else {
            ctx.fillStyle = CELL_CONFIGS[p.type]?.color || '#fff';
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // --- ENHANCED LABELS & STATUS ---
        ctx.save();
        ctx.textAlign = 'center';

        // 1. Cell Name with improved badge
        if (CELL_CONFIGS[p.type]?.label && (p.type !== CellType.SKIN || isAlertActive)) {
            const label = CELL_CONFIGS[p.type].label;
            ctx.font = 'bold 11px "Segoe UI", Arial';
            const textWidth = ctx.measureText(label).width;
            const badgeWidth = textWidth + 12;
            const badgeHeight = 18;
            const badgeX = p.x - badgeWidth / 2;
            const badgeY = p.y + p.radius + 6;

            // Gradient background for badge
            const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeHeight);
            badgeGrad.addColorStop(0, 'rgba(30, 30, 40, 0.9)');
            badgeGrad.addColorStop(1, 'rgba(10, 10, 15, 0.95)');

            // Rounded rectangle badge
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
            ctx.fillStyle = badgeGrad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#e0e0e0';
            ctx.fillText(label, p.x, badgeY + 13);
        }

        // 2. Enhanced Status Effects with animated badges
        const pulseIntensity = Math.sin(p.pulse * 2) * 0.3 + 0.7;

        if (p.isActive) {
            const statusText = '⚠️ АКТИВЕН';
            ctx.font = 'bold 13px "Segoe UI", Arial';
            const textWidth = ctx.measureText(statusText).width;
            const badgeWidth = textWidth + 16;
            const badgeHeight = 22;
            const badgeX = p.x - badgeWidth / 2;
            const badgeY = p.y - p.radius - 30;

            // Glowing red background
            ctx.shadowBlur = 15 * pulseIntensity;
            ctx.shadowColor = '#ef4444';

            const activeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeHeight);
            activeGrad.addColorStop(0, `rgba(239, 68, 68, ${0.9 * pulseIntensity})`);
            activeGrad.addColorStop(1, `rgba(185, 28, 28, ${0.95 * pulseIntensity})`);

            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
            ctx.fillStyle = activeGrad;
            ctx.fill();

            // Border glow
            ctx.strokeStyle = `rgba(255, 150, 150, ${pulseIntensity})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(statusText, p.x, badgeY + 16);
        }

        if (p.hasAntigen) {
            const statusText = '⚡ СИГНАЛ';
            ctx.font = 'bold 13px "Segoe UI", Arial';
            const textWidth = ctx.measureText(statusText).width;
            const badgeWidth = textWidth + 16;
            const badgeHeight = 22;
            const badgeX = p.x - badgeWidth / 2;
            const badgeY = p.y - p.radius - 30;

            // Glowing amber/yellow background
            ctx.shadowBlur = 15 * pulseIntensity;
            ctx.shadowColor = '#fbbf24';

            const signalGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeHeight);
            signalGrad.addColorStop(0, `rgba(251, 191, 36, ${0.9 * pulseIntensity})`);
            signalGrad.addColorStop(1, `rgba(217, 119, 6, ${0.95 * pulseIntensity})`);

            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
            ctx.fillStyle = signalGrad;
            ctx.fill();

            // Border glow
            ctx.strokeStyle = `rgba(255, 230, 150, ${pulseIntensity})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#1a1a1a';
            ctx.font = 'bold 13px "Segoe UI", Arial';
            ctx.fillText(statusText, p.x, badgeY + 16);
        }
        ctx.restore();
    };

    // Helper function to draw an arrow
    const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, label?: string) => {
        const headLength = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        // Animated dash
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -Date.now() * 0.02;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Draw arrowhead
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        // Draw label if provided
        if (label) {
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2 - 15;
            ctx.font = 'bold 12px "Segoe UI", Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 5;
            ctx.fillText(label, midX, midY);
        }

        ctx.restore();
    };

    // Helper to draw text box on canvas
    const drawTextBox = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string = '#a855f7') => {
        ctx.save();
        ctx.font = 'bold 16px "Segoe UI", Arial';
        const lines = text.split('\n');
        const lineHeight = 22;
        const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
        const boxWidth = maxWidth + 30;
        const boxHeight = lines.length * lineHeight + 20;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.roundRect(x - boxWidth / 2, y, boxWidth, boxHeight, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        lines.forEach((line, i) => {
            ctx.fillText(line, x, y + 25 + i * lineHeight);
        });

        ctx.restore();
    };

    // Draw function for paused state and demo mode
    const draw = () => {
        if (!canvasRef.current) return;
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        const ctx = canvasRef.current.getContext('2d')!;
        let z = zoomRef.current;

        // In demo mode, zoom in more on focus target
        let offsetX = 0;
        let offsetY = 0;
        if (demoState.isActive && demoState.focusTarget) {
            z = 2.2; // More zoom for better visibility
            offsetX = width / 2 - demoState.focusTarget.x * z;
            offsetY = height / 2 - demoState.focusTarget.y * z;
        }

        ctx.clearRect(0, 0, width, height);
        const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        grad.addColorStop(0, demoState.isActive ? '#0f0a1a' : '#0a0a0f');
        grad.addColorStop(1, '#050505');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.save();

        if (demoState.isActive && demoState.focusTarget) {
            ctx.translate(offsetX, offsetY);
            ctx.scale(z, z);
        } else {
            ctx.translate(width / 2, height / 2);
            ctx.scale(z, z);
            ctx.translate(-width / 2, -height / 2);
        }

        // Draw spotlight effect on demo focus target
        if (demoState.isActive && demoState.focusTarget) {
            const spotlightGrad = ctx.createRadialGradient(
                demoState.focusTarget.x, demoState.focusTarget.y, 0,
                demoState.focusTarget.x, demoState.focusTarget.y, 250
            );
            spotlightGrad.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
            spotlightGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
            spotlightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = spotlightGrad;
            ctx.fillRect(demoState.focusTarget.x - 300, demoState.focusTarget.y - 300, 600, 600);

            // Pulsing ring around focus
            const pulseSize = 80 + Math.sin(Date.now() * 0.003) * 20;
            ctx.beginPath();
            ctx.arc(demoState.focusTarget.x, demoState.focusTarget.y, pulseSize, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.5 + Math.sin(Date.now() * 0.003) * 0.2})`;
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 8]);
            ctx.lineDashOffset = -Date.now() * 0.01;
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw particles
        particlesRef.current.forEach(p => drawOrganicCell(ctx, p));

        // Demo mode arrows and labels
        if (demoState.isActive) {
            const demo = demoParticlesRef.current;

            switch (demoState.currentStep) {
                case DemoStep.ANTIGEN_APPEARS: {
                    if (demo.antigen) {
                        // Arrow pointing to antigen
                        drawArrow(ctx, demo.antigen.x - 100, demo.antigen.y - 80, demo.antigen.x - 25, demo.antigen.y - 25, '#ef4444');
                        drawTextBox(ctx, demo.antigen.x, demo.antigen.y - 130,
                            '🦠 АНТИГЕН\n━━━━━━━━━━━━━━━\nЭто чужеродный объект\n(бактерия, вирус или\n"ложный враг" при псориазе)', '#ef4444');
                    }
                    break;
                }

                case DemoStep.DENDRITIC_CAPTURES: {
                    if (demo.dendritic && demo.antigen) {
                        // Arrow from antigen to dendritic
                        if (demo.antigen.health > 0) {
                            drawArrow(ctx, demo.antigen.x, demo.antigen.y, demo.dendritic.x + 30, demo.dendritic.y, '#fbbf24', '→ ЗАХВАТ');
                        }
                        drawTextBox(ctx, demo.dendritic.x, demo.dendritic.y - 140,
                            '🔬 ДЕНДРИТНАЯ КЛЕТКА\n━━━━━━━━━━━━━━━━━━━\nЭто "разведчик" иммунной\nсистемы. Она находит антиген\nи поглощает его.', '#fbbf24');
                    }
                    break;
                }

                case DemoStep.THELPER_ACTIVATES: {
                    if (demo.dendritic && demo.tHelper) {
                        // Arrow from dendritic to T-Helper
                        drawArrow(ctx, demo.dendritic.x + 20, demo.dendritic.y, demo.tHelper.x - 20, demo.tHelper.y, '#3b82f6', '→ СИГНАЛ');
                        drawTextBox(ctx, (demo.dendritic.x + demo.tHelper.x) / 2, demo.dendritic.y - 140,
                            '🛡️ T-ХЕЛПЕР (CD4+)\n━━━━━━━━━━━━━━━━━━\nДендритная клетка передаёт\nсигнал T-хелперу. Он становится\n"командиром" иммунного ответа.', '#3b82f6');
                    }
                    break;
                }

                case DemoStep.CYTOKINE_RELEASE: {
                    if (demo.tHelper) {
                        // Arrows radiating from T-Helper
                        for (let i = 0; i < 4; i++) {
                            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
                            const endX = demo.tHelper.x + Math.cos(angle) * 70;
                            const endY = demo.tHelper.y + Math.sin(angle) * 70;
                            drawArrow(ctx, demo.tHelper.x, demo.tHelper.y, endX, endY, '#fbbf24');
                        }
                        drawTextBox(ctx, demo.tHelper.x, demo.tHelper.y - 150,
                            '📡 ЦИТОКИНЫ\n━━━━━━━━━━━━━━━━━━━\nT-хелпер выделяет цитокины —\nмолекулы-"посыльные", которые\nпередают сигнал тревоги\nдругим клеткам иммунитета.', '#fbbf24');
                    }
                    break;
                }

                case DemoStep.TKILLER_ACTIVATES: {
                    if (demo.tKiller && demo.cytokine) {
                        // Arrow from cytokine to T-Killer
                        drawArrow(ctx, demo.cytokine.x, demo.cytokine.y, demo.tKiller.x - 20, demo.tKiller.y, '#ef4444', '→ АКТИВАЦИЯ');
                        drawTextBox(ctx, demo.tKiller.x, demo.tKiller.y - 140,
                            '⚔️ T-КИЛЛЕР (CD8+)\n━━━━━━━━━━━━━━━━━━━\nЦитокины достигают T-киллера.\nЭта клетка — "убийца" иммунной\nсистемы. Она готова атаковать!', '#ef4444');
                    }
                    break;
                }

                case DemoStep.SKIN_ATTACK: {
                    if (demo.tKiller && demo.targetSkin) {
                        // Arrow from T-Killer to skin
                        drawArrow(ctx, demo.tKiller.x + 20, demo.tKiller.y, demo.targetSkin.x - 20, demo.targetSkin.y, '#dc2626', '→ АТАКА!');
                        drawTextBox(ctx, (demo.tKiller.x + demo.targetSkin.x) / 2, demo.tKiller.y - 150,
                            '💥 ОШИБОЧНАЯ АТАКА!\n━━━━━━━━━━━━━━━━━━━━━\nПри псориазе T-киллер ошибочно\nатакует ЗДОРОВЫЕ клетки кожи.\nЭто вызывает воспаление и\nхарактерные бляшки на коже.', '#dc2626');
                    }
                    break;
                }
            }
        }

        ctx.restore();

        // Demo mode overlay UI (outside canvas transform)
        if (demoState.isActive) {
            // Top banner with step info
            const stepInfo = {
                [DemoStep.ANTIGEN_APPEARS]: {
                    num: 1,
                    title: 'ПОЯВЛЕНИЕ АНТИГЕНА',
                    desc: 'В зоне кожи обнаружен чужеродный объект — потенциальная угроза'
                },
                [DemoStep.DENDRITIC_CAPTURES]: {
                    num: 2,
                    title: 'ДЕНДРИТНАЯ КЛЕТКА ЗАХВАТЫВАЕТ',
                    desc: 'Клетка-разведчик находит антиген и поглощает его для анализа'
                },
                [DemoStep.THELPER_ACTIVATES]: {
                    num: 3,
                    title: 'АКТИВАЦИЯ T-ХЕЛПЕРА',
                    desc: 'Дендритная клетка передаёт сигнал тревоги T-хелперу (CD4+)'
                },
                [DemoStep.CYTOKINE_RELEASE]: {
                    num: 4,
                    title: 'ВЫБРОС ЦИТОКИНОВ',
                    desc: 'T-хелпер выделяет молекулы-посыльные для мобилизации иммунитета'
                },
                [DemoStep.TKILLER_ACTIVATES]: {
                    num: 5,
                    title: 'АКТИВАЦИЯ T-КИЛЛЕРА',
                    desc: 'Цитокины достигают T-киллера (CD8+) — клетки-убийцы иммунной системы'
                },
                [DemoStep.SKIN_ATTACK]: {
                    num: 6,
                    title: '⚠️ АТАКА НА КОЖУ',
                    desc: 'При псориазе T-киллер ошибочно атакует здоровые клетки кожи!'
                },
                [DemoStep.COMPLETE]: {
                    num: 7,
                    title: 'ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА',
                    desc: 'Вы увидели полный цикл аутоиммунной реакции при псориазе'
                },
                [DemoStep.IDLE]: { num: 0, title: '', desc: '' }
            };

            const info = stepInfo[demoState.currentStep];
            if (info && info.num > 0) {
                // Large step indicator
                ctx.save();

                // Background banner
                ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.fillRect(0, 60, width, 110);

                // Purple gradient line
                const lineGrad = ctx.createLinearGradient(0, 60, width, 60);
                lineGrad.addColorStop(0, 'rgba(168, 85, 247, 0)');
                lineGrad.addColorStop(0.5, 'rgba(168, 85, 247, 1)');
                lineGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
                ctx.fillStyle = lineGrad;
                ctx.fillRect(0, 60, width, 3);
                ctx.fillRect(0, 167, width, 3);

                // Step number circle
                ctx.beginPath();
                ctx.arc(80, 115, 40, 0, Math.PI * 2);
                ctx.fillStyle = '#a855f7';
                ctx.shadowBlur = 25;
                ctx.shadowColor = '#a855f7';
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 36px "Segoe UI", Arial';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 0;
                ctx.fillText(info.num.toString(), 80, 128);

                // Step label
                ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
                ctx.font = 'bold 12px "Segoe UI", Arial';
                ctx.fillText('ШАГ', 80, 90);

                // Title
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 26px "Segoe UI", Arial';
                ctx.textAlign = 'left';
                ctx.fillText(info.title, 140, 105);

                // Description
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.font = '16px "Segoe UI", Arial';
                ctx.fillText(info.desc, 140, 135);

                // Progress dots
                const totalSteps = 6;
                const dotY = 155;
                const dotStartX = 140;
                for (let i = 0; i < totalSteps; i++) {
                    ctx.beginPath();
                    ctx.arc(dotStartX + i * 25, dotY, 6, 0, Math.PI * 2);
                    if (i < info.num) {
                        ctx.fillStyle = '#a855f7';
                    } else {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    }
                    ctx.fill();
                }

                ctx.restore();
            }

            // Bottom status
            ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`🎓 ОБУЧАЮЩИЙ РЕЖИМ | МАСШТАБ: ${z.toFixed(1)}x`, 10, height - 10);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`ZOOM: ${z.toFixed(1)}x | ⏸ PAUSED`, 10, height - 10);
        }
    };

    const update = () => {
        if (!canvasRef.current) return;

        // In demo mode or paused, use the controlled draw function
        if (isPaused || demoState.isActive) {
            draw();
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        const simWidth = window.innerWidth;
        const simHeight = window.innerHeight;
        let particles = particlesRef.current;

        // Store connections to draw lines
        const connections: { x1: number, y1: number, x2: number, y2: number, color: string }[] = [];

        // 1. Spawn Antigens
        if ((isAlertActive || cytokineLevel > 50) && Math.random() < 0.03 * timeScale && particles.length < 150) {
            particles.push(createParticle(CellType.ANTIGEN, simWidth, simHeight));
        }

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (p.health <= 0) continue;

            p.x += p.vx * timeScale; p.y += p.vy * timeScale;
            p.pulse += 0.05 * timeScale; p.rotation += 0.01 * timeScale;
            if (p.x < 0 || p.x > simWidth) p.vx *= -1;
            if (p.y < 0 || p.y > simHeight) p.vy *= -1;

            if (p.type === CellType.DENDRITIC) {
                // Limit maximum velocity
                const maxVel = 0.8;
                if (Math.abs(p.vx) > maxVel) p.vx = Math.sign(p.vx) * maxVel;
                if (Math.abs(p.vy) > maxVel) p.vy = Math.sign(p.vy) * maxVel;

                if (!p.hasAntigen) {
                    const antigen = particles.find(t => t.type === CellType.ANTIGEN && t.health > 0);
                    if (antigen) {
                        const dist = Math.sqrt((p.x - antigen.x) ** 2 + (p.y - antigen.y) ** 2);
                        if (dist < 150) {
                            // Much slower acceleration: 0.5 -> 0.08
                            p.vx += ((antigen.x - p.x) / dist) * 0.08 * timeScale;
                            p.vy += ((antigen.y - p.y) / dist) * 0.08 * timeScale;
                            connections.push({ x1: p.x, y1: p.y, x2: antigen.x, y2: antigen.y, color: '#fbbf24' });
                        }
                        if (dist < p.radius + antigen.radius) {
                            antigen.health = 0; p.hasAntigen = true;
                            createExplosion(p.x, p.y, '#fbbf24', 5);
                            soundManager.playActivation();
                        }
                    }
                } else {
                    const helper = particles.find(t => t.type === CellType.T_CD4 && !t.isActive);
                    if (helper) {
                        const dist = Math.sqrt((p.x - helper.x) ** 2 + (p.y - helper.y) ** 2);
                        connections.push({ x1: p.x, y1: p.y, x2: helper.x, y2: helper.y, color: '#ef4444' });
                        // Much slower acceleration: 0.5 -> 0.08
                        p.vx += ((helper.x - p.x) / dist) * 0.08 * timeScale;
                        p.vy += ((helper.y - p.y) / dist) * 0.08 * timeScale;
                        if (dist < p.radius + helper.radius + 10) {
                            helper.isActive = true; p.hasAntigen = false;
                            createExplosion(helper.x, helper.y, '#3b82f6', 10);
                            soundManager.playActivation();
                        }
                    }
                }
            }
            else if (p.type === CellType.T_CD4 && p.isActive) {
                // Limit velocity
                const maxVel = 0.6;
                if (Math.abs(p.vx) > maxVel) p.vx = Math.sign(p.vx) * maxVel;
                if (Math.abs(p.vy) > maxVel) p.vy = Math.sign(p.vy) * maxVel;

                if (Math.random() < 0.015 * timeScale) { // Spawn less frequently
                    const cyto = createParticle(CellType.CYTOKINE, simWidth, simHeight);
                    cyto.x = p.x; cyto.y = p.y;
                    cyto.vx = (Math.random() - 0.5) * 1.5; // Slower: 4 -> 1.5
                    cyto.vy = (Math.random() - 0.5) * 1.5;
                    particles.push(cyto);
                }
            }
            else if (p.type === CellType.CYTOKINE) {
                // Limit velocity
                const maxVel = 1.0;
                if (Math.abs(p.vx) > maxVel) p.vx = Math.sign(p.vx) * maxVel;
                if (Math.abs(p.vy) > maxVel) p.vy = Math.sign(p.vy) * maxVel;

                const killer = particles.find(t => t.type === CellType.T_CD8 && !t.isActive);
                if (killer) {
                    const dist = Math.sqrt((p.x - killer.x) ** 2 + (p.y - killer.y) ** 2);
                    if (dist < 200) {
                        // Slower: 0.8 -> 0.12
                        p.vx += ((killer.x - p.x) / dist) * 0.12 * timeScale;
                        p.vy += ((killer.y - p.y) / dist) * 0.12 * timeScale;
                    }
                    if (dist < killer.radius + p.radius) {
                        p.health = 0; killer.isActive = true;
                        createExplosion(killer.x, killer.y, '#ef4444', 10);
                        soundManager.playActivation();
                    }
                } else p.health -= 0.02;
            }
            else if (p.type === CellType.T_CD8 && p.isActive) {
                // Limit velocity
                const maxVel = 0.7;
                if (Math.abs(p.vx) > maxVel) p.vx = Math.sign(p.vx) * maxVel;
                if (Math.abs(p.vy) > maxVel) p.vy = Math.sign(p.vy) * maxVel;

                const skin = particles.find(t => t.type === CellType.SKIN && t.health > 0);
                if (skin) {
                    const dist = Math.sqrt((p.x - skin.x) ** 2 + (p.y - skin.y) ** 2);
                    if (dist < 200) {
                        connections.push({ x1: p.x, y1: p.y, x2: skin.x, y2: skin.y, color: '#7f1d1d' });
                        // Slower: 0.5 -> 0.1
                        p.vx += ((skin.x - p.x) / dist) * 0.1 * timeScale;
                        p.vy += ((skin.y - p.y) / dist) * 0.1 * timeScale;
                    }
                    if (dist < p.radius + skin.radius + 5) {
                        skin.health -= 5 * timeScale;
                        if (skin.health <= 0) {
                            createExplosion(skin.x, skin.y, '#ef4444', 20);
                            statsRef.current.killed++;
                            soundManager.playExplosion();
                        }
                    }
                }
            }
            else if (p.type === CellType.DRUG) {
                // Limit velocity
                const maxVel = 1.0;
                if (Math.abs(p.vx) > maxVel) p.vx = Math.sign(p.vx) * maxVel;
                if (Math.abs(p.vy) > maxVel) p.vy = Math.sign(p.vy) * maxVel;

                const target = particles.find(t =>
                    t.health > 0 &&
                    ((t.type === CellType.ANTIGEN) || (t.isActive && [CellType.T_CD4, CellType.T_CD8, CellType.DENDRITIC].includes(t.type)))
                );
                if (target) {
                    const dist = Math.sqrt((p.x - target.x) ** 2 + (p.y - target.y) ** 2);
                    // Slower: 0.5 -> 0.15
                    p.vx += ((target.x - p.x) / dist) * 0.15 * timeScale;
                    p.vy += ((target.y - p.y) / dist) * 0.15 * timeScale;
                    if (dist < p.radius + target.radius) {
                        p.health = 0;
                        if (target.type === CellType.ANTIGEN) target.health = 0;
                        else { target.isActive = false; target.hasAntigen = false; }
                        createExplosion(target.x, target.y, '#34d399', 15);
                        statsRef.current.saved++;
                        soundManager.playHeal();
                    }
                }
            }
        }

        particlesRef.current = particles.filter(p => p.health > 0);
        effectsRef.current.forEach(e => { e.x += e.vx * timeScale; e.y += e.vy * timeScale; e.life -= 0.03 * timeScale; });
        effectsRef.current = effectsRef.current.filter(e => e.life > 0);

        if (statsRef.current.killed !== prevStatsRef.current.killed || statsRef.current.saved !== prevStatsRef.current.saved) {
            onStatsUpdate({ ...statsRef.current });
            prevStatsRef.current = { ...statsRef.current };
        }

        // DRAW
        if (canvasRef.current) {
            const width = canvasRef.current.width;
            const height = canvasRef.current.height;
            const ctx = canvasRef.current.getContext('2d')!;
            const z = zoomRef.current;

            ctx.clearRect(0, 0, width, height);
            const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
            grad.addColorStop(0, '#0a0a0f'); grad.addColorStop(1, '#050505');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(width / 2, height / 2); ctx.scale(z, z); ctx.translate(-width / 2, -height / 2);

            // Enhanced Connection Lines with Glow
            const time = Date.now() * 0.003;
            connections.forEach(l => {
                const dist = Math.sqrt((l.x2 - l.x1) ** 2 + (l.y2 - l.y1) ** 2);

                // Outer glow
                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = l.color;
                ctx.beginPath();
                ctx.moveTo(l.x1, l.y1);
                ctx.lineTo(l.x2, l.y2);
                ctx.strokeStyle = l.color;
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.4;
                ctx.stroke();
                ctx.restore();

                // Main line with animated dash
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([8, 4]);
                ctx.lineDashOffset = -time * 20;
                ctx.moveTo(l.x1, l.y1);
                ctx.lineTo(l.x2, l.y2);
                ctx.strokeStyle = l.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.9;
                ctx.stroke();
                ctx.restore();

                // Animated particle along the line
                const particlePos = ((time * 0.5) % 1);
                const px = l.x1 + (l.x2 - l.x1) * particlePos;
                const py = l.y1 + (l.y2 - l.y1) * particlePos;

                ctx.save();
                ctx.shadowBlur = 8;
                ctx.shadowColor = l.color;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            particlesRef.current.forEach(p => drawOrganicCell(ctx, p));
            effectsRef.current.forEach(e => {
                ctx.globalAlpha = e.life; ctx.fillStyle = e.color;
                ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.restore();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.font = '10px monospace';
            ctx.fillText(`ZOOM: ${z.toFixed(1)}x`, 10, height - 10);
        }

        requestRef.current = requestAnimationFrame(update);
    };

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        initSimulation();
        requestRef.current = requestAnimationFrame(update);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [initSimulation]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-auto" style={{ filter: 'blur(0.3px) contrast(1.1)' }} />;
};

export default MicroCanvas;