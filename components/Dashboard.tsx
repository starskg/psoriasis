
import React, { useState } from 'react';
import { SimulationState, CellType, DrugType, DemoState, DemoStep, DEMO_STEP_INFO, CELL_INFO } from '../types';
import { CELL_CONFIGS, PSORIASIS_STAGES } from '../constants';
import { soundManager } from '../utils/audio';

interface DashboardProps {
    state: SimulationState;
    stats: { killed: number, saved: number };
    timeState: { day: number, timeScale: number, isPaused: boolean };
    narrative: string;
    selectedDrug: DrugType;
    demoState: DemoState;
    onToggleAlert: () => void;
    onReset: () => void;
    onSetCytokine: (val: number) => void;
    onSetStress: (val: number) => void;
    onInjectDrug: () => void;
    onSelectDrug: (drug: DrugType) => void;
    onTimeChange: (newState: Partial<{ day: number, timeScale: number, isPaused: boolean }>) => void;
    onStageSelect: (stageId: keyof typeof PSORIASIS_STAGES) => void;
    onStartDemo: () => void;
    onStopDemo: () => void;
    onNextDemoStep: () => void;
    onPrevDemoStep: () => void;
    onToggleAutoPlay: () => void;
    selectedCell: CellType | null;
    cytokineHistory: number[];
    isVisible: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
    state,
    stats,
    timeState,
    narrative,
    selectedDrug,
    demoState,
    onToggleAlert,
    onReset,
    onSetCytokine,
    onSetStress,
    onInjectDrug,
    onSelectDrug,
    onTimeChange,
    onStageSelect,
    onStartDemo,
    onStopDemo,
    onNextDemoStep,
    onPrevDemoStep,
    onToggleAutoPlay,
    selectedCell,
    cytokineHistory,
    isVisible
}) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'stats' | 'controls' | 'demo'>('controls');

    // Cells to show in legend
    const legendCells = [
        CellType.SKIN,
        CellType.T_CD8,
        CellType.T_TH17,
        CellType.NEUTROPHIL,
        CellType.MACROPHAGE,
        CellType.DRUG,
        CellType.DENDRITIC
    ];

    const drugOptions = [
        { type: DrugType.OINTMENT, label: 'Мазь', color: 'border-white text-white' },
        { type: DrugType.PILL, label: 'Таблетки', color: 'border-blue-400 text-blue-400' },
        { type: DrugType.INJECTION, label: 'Инъекция', color: 'border-emerald-400 text-emerald-400' }
    ];

    // Demo Step Order for progress display
    const DEMO_STEP_ORDER: DemoStep[] = [
        DemoStep.ANTIGEN_APPEARS,
        DemoStep.DENDRITIC_CAPTURES,
        DemoStep.THELPER_ACTIVATES,
        DemoStep.CYTOKINE_RELEASE,
        DemoStep.TKILLER_ACTIVATES,
        DemoStep.SKIN_ATTACK,
    ];

    const currentStepIndex = DEMO_STEP_ORDER.indexOf(demoState.currentStep);
    const stepInfo = DEMO_STEP_INFO[demoState.currentStep];

    // Demo Mode Panel Component
    const DemoPanel = () => (
        <div className="space-y-4">
            {!demoState.isActive ? (
                // Demo Start Screen
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                        <span className="text-2xl">🎓</span>
                    </div>
                    <h4 className="font-orbitron text-sm text-purple-400 uppercase tracking-tighter">Обучающий режим</h4>
                    <p className="text-[10px] text-slate-400 leading-tight">
                        Пошаговая демонстрация иммунной реакции.
                    </p>
                    <button
                        onClick={() => {
                            onStartDemo();
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full py-2.5 rounded-lg font-orbitron font-bold text-xs tracking-wider transition-all bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-400 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] active:scale-95"
                    >
                        🚀 НАЧАТЬ ДЕМО
                    </button>
                </div>
            ) : (
                // Demo Active Screen
                <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Прогресс</span>
                            <span>{currentStepIndex + 1} / {DEMO_STEP_ORDER.length}</span>
                        </div>
                        <div className="flex gap-1">
                            {DEMO_STEP_ORDER.map((step, index) => (
                                <div
                                    key={step}
                                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${index < currentStepIndex
                                        ? 'bg-purple-500'
                                        : index === currentStepIndex
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                                            : 'bg-slate-700'
                                        }`}
                                    style={index === currentStepIndex ? {
                                        background: `linear-gradient(90deg, #a855f7 ${demoState.stepProgress}%, #374151 ${demoState.stepProgress}%)`
                                    } : {}}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Current Step Info */}
                    <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center text-2xl animate-pulse">
                                {demoState.currentStep === DemoStep.ANTIGEN_APPEARS && '🦠'}
                                {demoState.currentStep === DemoStep.DENDRITIC_CAPTURES && '🔬'}
                                {demoState.currentStep === DemoStep.THELPER_ACTIVATES && '🛡️'}
                                {demoState.currentStep === DemoStep.CYTOKINE_RELEASE && '📡'}
                                {demoState.currentStep === DemoStep.TKILLER_ACTIVATES && '⚔️'}
                                {demoState.currentStep === DemoStep.SKIN_ATTACK && '💥'}
                                {demoState.currentStep === DemoStep.COMPLETE && '✅'}
                            </div>
                            <div>
                                <h4 className="font-orbitron text-lg text-purple-300">{stepInfo.title}</h4>
                            </div>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">
                            {stepInfo.description}
                        </p>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onPrevDemoStep}
                            disabled={currentStepIndex <= 0}
                            className="flex-1 py-3 rounded-lg font-bold text-sm transition-all bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ← Назад
                        </button>
                        <button
                            onClick={onToggleAutoPlay}
                            className={`px-4 py-3 rounded-lg font-bold text-sm transition-all border ${demoState.autoPlay
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                                : 'bg-slate-700 text-slate-300 border-slate-600'
                                }`}
                        >
                            {demoState.autoPlay ? '⏸' : '▶'}
                        </button>
                        <button
                            onClick={onNextDemoStep}
                            disabled={demoState.currentStep === DemoStep.COMPLETE}
                            className="flex-1 py-3 rounded-lg font-bold text-sm transition-all bg-purple-600 text-white border border-purple-400 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Далее →
                        </button>
                    </div>

                    {/* Stop Demo Button */}
                    <button
                        onClick={onStopDemo}
                        className="w-full py-3 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all bg-red-500/20 text-red-400 border border-red-500 hover:bg-red-500/30"
                    >
                        ✕ ЗАВЕРШИТЬ ДЕМО
                    </button>

                    {demoState.currentStep === DemoStep.COMPLETE && (
                        <button
                            onClick={() => {
                                onStartDemo();
                                setIsMobileMenuOpen(false);
                            }}
                            className="w-full py-3 rounded-lg font-orbitron font-bold text-sm tracking-wider transition-all bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-400 hover:from-purple-500 hover:to-pink-500"
                        >
                            🔄 ПОВТОРИТЬ
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    // Helper for Stats Content (Shared between Desktop & Mobile)
    const StatsContent = () => (
        <div className="space-y-4">
            {/* Stage Selectors */}
            <div className="grid grid-cols-2 gap-2">
                {Object.values(PSORIASIS_STAGES).map((stage: any) => (
                    <button
                        key={stage.id}
                        onClick={() => onStageSelect(stage.id)}
                        className={`px-2 py-2 rounded border text-[10px] font-orbitron uppercase transition-all hover:scale-105 active:scale-95 ${`bg-opacity-10 hover:bg-opacity-20 ${stage.color} ${stage.borderColor}`
                            }`}
                        style={{ borderColor: 'currentColor' }}
                    >
                        {stage.label}
                    </button>
                ))}
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-center">
                    <div className="text-2xl font-orbitron text-red-400">{stats.killed}</div>
                    <div className="text-[9px] uppercase text-red-300/70">Потери клеток</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 p-2 rounded text-center">
                    <div className="text-2xl font-orbitron text-green-400">{stats.saved}</div>
                    <div className="text-[9px] uppercase text-green-300/70">Нейтрализовано</div>
                </div>
            </div>

            <div>
                <div className="flex justify-between text-xs mb-1 font-semibold uppercase text-slate-400">
                    <span>Концентрация цитокинов</span>
                    <span>{state.cytokineLevel}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${state.cytokineLevel}%` }}
                    />
                </div>
            </div>

            <div>
                <div className="flex justify-between text-xs mb-1 font-semibold uppercase text-slate-400">
                    <span>Психо-эмоциональный стресс</span>
                    <span>{state.stressLevel}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${state.stressLevel}%` }}
                    />
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={state.stressLevel}
                    onChange={(e) => onSetStress(parseInt(e.target.value))}
                    className="w-full mt-2 accent-purple-500 h-1"
                />
            </div>

            <CytokineChart />

            <div className="pt-3 border-t border-white/5">
                <h3 className="text-[15px] font-bold text-slate-500 uppercase mb-1.5">Логи системы</h3>
                <div className="space-y-1 max-h-28 overflow-y-auto font-mono text-[15px] text-blue-300 scrollbar-hide">
                    {state.damageReport.map((log, i) => (
                        <div key={i} className="animate-in fade-in slide-in-from-left duration-300 leading-tight">
                            [{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // New Helper: Cytokine Chart
    const CytokineChart = () => (
        <div className="mt-3 p-2 bg-black/40 border border-white/5 rounded-lg">
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[13px] font-orbitron text-slate-400 uppercase tracking-widest">Динамика цитокинов</span>
                <span className="text-[13px] text-red-400 font-bold">{state.cytokineLevel}%</span>
            </div>
            <div className="h-12 flex items-end gap-[2px]">
                {cytokineHistory.map((val, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-red-500/50 hover:bg-red-400 transition-all rounded-t-sm"
                        style={{ height: `${val}%` }}
                        title={`День ${i}: ${val}%`}
                    />
                ))}
                {cytokineHistory.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-600 italic">
                        Сбор данных...
                    </div>
                )}
            </div>
        </div>
    );

    // New Helper: Wiki Panel
    const WikiPanel = () => {
        if (!selectedCell) return (
            <div className="p-2 border border-dashed border-white/10 rounded-lg text-center text-slate-500 text-[9px] italic">
                Кликните на клетку для справки
            </div>
        );
        const info = CELL_INFO[selectedCell];
        const config = CELL_CONFIGS[selectedCell];
        return (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-2 mb-1.5">
                    <div
                        className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
                        style={{ backgroundColor: config.color, color: config.color }}
                    />
                    <h4 className="font-orbitron text-xs text-blue-300 uppercase">{info.title}</h4>
                </div>
                <div className="inline-block px-1.5 py-0.5 bg-blue-500/20 rounded text-[8px] font-bold text-blue-400 mb-1.5 uppercase tracking-tighter">
                    Роль: {info.role}
                </div>
                <p className="text-[10px] text-slate-300 leading-snug">
                    {info.description}
                </p>
            </div>
        );
    };

    // New Helper: Exogenous Triggers
    const ExogenousTriggers = () => (
        <div className="space-y-2">
            <span className="text-[10px] font-orbitron text-slate-400 uppercase tracking-widest">Внешние факторы</span>
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: '☀️ УФ', val: 15, color: 'hover:border-yellow-400 text-yellow-500' },
                    { label: '🦠 Инф.', val: 25, color: 'hover:border-red-400 text-red-500' },
                    { label: '❄️ Холод', val: 10, color: 'hover:border-cyan-400 text-cyan-500' }
                ].map(t => (
                    <button
                        key={t.label}
                        onClick={() => {
                            const newStress = Math.min(100, state.stressLevel + t.val);
                            onSetStress(newStress);
                            soundManager.playAlert();
                        }}
                        className={`py-2 rounded border border-white/10 bg-white/5 text-[10px] font-bold transition-all active:scale-95 ${t.color}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
        </div>
    );

    // Helper for Controls Content
    const ControlsContent = () => (
        <div className="flex flex-col gap-2">
            <ExogenousTriggers />

            {/* Drug Selection Header */}
            <div className="flex justify-between items-center -mb-1">
                <span className="text-[9px] font-orbitron text-slate-500 uppercase tracking-widest">Терапия</span>
                <span className={`text-[9px] font-orbitron font-bold uppercase ${selectedDrug === DrugType.INJECTION ? 'text-emerald-400' :
                    selectedDrug === DrugType.PILL ? 'text-blue-400' : 'text-white'
                    }`}>
                    {drugOptions.find(d => d.type === selectedDrug)?.label}
                </span>
            </div>

            {/* Drug Selection Buttons */}
            <div className="flex gap-1 p-0.5 bg-white/5 rounded-md">
                {drugOptions.map(opt => (
                    <button
                        key={opt.type}
                        onClick={() => onSelectDrug(opt.type)}
                        className={`flex-1 py-1.5 text-[9px] font-orbitron font-bold uppercase rounded transition-all ${selectedDrug === opt.type
                            ? `${opt.color} bg-white/10`
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <button
                onClick={() => {
                    onInjectDrug();
                    setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 rounded-lg font-orbitron font-bold text-sm tracking-widest transition-all bg-emerald-500/20 text-emerald-400 border border-emerald-500 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.3)] active:scale-95"
            >
                ПРИМЕНИТЬ ТЕРАПИЮ
            </button>

            <button
                onClick={() => {
                    onToggleAlert();
                    if (!state.isAlertActive) {
                        soundManager.playAlert();
                        setIsMobileMenuOpen(false);
                    }
                }}
                className={`w-full py-2 rounded-lg font-orbitron font-bold text-[10px] lg:text-[11px] tracking-widest transition-all ${state.isAlertActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                    : 'bg-green-500/20 text-green-400 border border-green-500'
                    }`}
            >
                {state.isAlertActive ? 'ОСТАНОВИТЬ КАСКАД' : 'ЗАПУСТИТЬ РЕАКЦИЮ'}
            </button>

            <div className="flex gap-1.5">
                <button
                    onClick={onReset}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 text-emerald-400 text-[10px] font-bold border border-slate-700 hover:bg-slate-700 uppercase tracking-tighter"
                >
                    СБРОС
                </button>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={state.cytokineLevel}
                    onChange={(e) => onSetCytokine(parseInt(e.target.value))}
                    className="w-1/2 accent-red-500 h-1 mt-auto mb-auto"
                />
            </div>
        </div>
    );

    return (
        <div className={`fixed top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            {/* Dashboard and Control UI Container */}

            {/* Top Bar: Legend & Time Control (Responsive) */}
            <div className="absolute top-4 left-0 w-full flex justify-center pointer-events-auto z-50 px-2 sm:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 bg-black/70 backdrop-blur-xl border border-white/10 px-4 py-2 lg:py-3 rounded-2xl lg:rounded-full shadow-2xl max-w-[98vw] lg:max-w-none">
                    {/* Time Controls */}
                    <div className="flex items-center gap-2 lg:gap-3 border-b lg:border-b-0 lg:border-r border-white/20 pb-2 lg:pb-0 lg:pr-4 lg:mr-2 w-full lg:w-auto justify-between lg:justify-start">
                        <span className="font-orbitron text-sm lg:text-xl font-bold text-amber-400 whitespace-nowrap">ДЕНЬ {timeState.day}</span>
                        <div className="flex bg-white/10 rounded-lg p-0.5 lg:p-1 gap-1">
                            <button
                                onClick={() => onTimeChange({ isPaused: !timeState.isPaused })}
                                className={`w-7 h-7 lg:w-9 lg:h-9 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${timeState.isPaused ? 'text-yellow-400' : 'text-white'}`}
                            >
                                {timeState.isPaused ? '▶' : '⏸'}
                            </button>
                            <div className="flex gap-1">
                                <button onClick={() => onTimeChange({ timeScale: 0.5 })} className={`px-1.5 lg:px-2 h-7 lg:h-9 rounded text-[10px] font-bold hover:bg-white/10 ${timeState.timeScale === 0.5 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>0.5x</button>
                                <button onClick={() => onTimeChange({ timeScale: 1.0 })} className={`px-1.5 lg:px-2 h-7 lg:h-9 rounded text-[10px] font-bold hover:bg-white/10 ${timeState.timeScale === 1.0 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>1x</button>
                                <button onClick={() => onTimeChange({ timeScale: 2.0 })} className={`px-1.5 lg:px-2 h-7 lg:h-9 rounded text-[10px] font-bold hover:bg-white/10 ${timeState.timeScale === 2.0 ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>2x</button>
                            </div>
                        </div>
                    </div>

                    {/* Legend (Hidden on very small screens, scrollable or simplified) */}
                    <div className="flex flex-wrap justify-center gap-2 lg:gap-4 overflow-x-auto max-w-full pb-1 lg:pb-0 scrollbar-hide">
                        {legendCells.map(type => (
                            <div key={type} className="flex items-center gap-1 lg:gap-2 shrink-0">
                                <div
                                    className="w-2 h-2 lg:w-3 lg:h-3 rounded-full shadow-[0_0_8px_currentColor]"
                                    style={{ backgroundColor: CELL_CONFIGS[type].color, color: CELL_CONFIGS[type].color }}
                                />
                                <span className="text-[8px] lg:text-[10px] font-orbitron text-slate-300 uppercase tracking-widest whitespace-nowrap">
                                    {CELL_CONFIGS[type].label || type}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* DESKTOP LAYOUT (Hidden on Mobile) */}
            <div className="hidden md:flex justify-between w-full h-full p-4 lg:p-6 mt-20 lg:mt-24">
                {/* Left Panel: Stats - Hidden during demo steps */}
                {!demoState.isActive ? (
                    <div className="w-72 lg:w-80 max-h-[calc(100vh-140px)] overflow-y-auto bg-black/40 backdrop-blur-xl border border-white/10 p-3 lg:p-4 rounded-xl pointer-events-auto scrollbar-hide">
                        <h2 className="font-orbitron text-md lg:text-lg text-blue-400 mb-3 tracking-wider flex items-center gap-2 underline underline-offset-8 decoration-blue-500/30">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            СТАТУС_СИСТЕМЫ
                        </h2>
                        <StatsContent />
                    </div>
                ) : <div className="w-72 lg:w-80" />}

                {/* Right Panel: Controls, Demo & Narrative */}
                <div className="flex flex-col items-end gap-1.5 lg:gap-2 w-[300px] lg:w-[350px] max-h-[calc(100vh-140px)] overflow-y-auto pointer-events-auto scrollbar-hide pr-1">
                    {/* Demo Panel - Always visible during demo */}
                    <div className="bg-black/60 backdrop-blur-xl border border-purple-500/50 p-2.5 lg:p-4 rounded-xl w-full shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        <h3 className="font-orbitron text-[11px] lg:text-xs text-purple-400 mb-1.5 tracking-wider flex items-center gap-2">
                            <span className="text-base">🎓</span>
                            ИНСТРУКЦИЯ ДЕМО
                        </h3>
                        <DemoPanel />
                    </div>

                    {!demoState.isActive && (
                        <>
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-2 lg:p-2.5 rounded-lg w-full">
                                <h2 className="font-orbitron text-[9px] lg:text-[10px] text-blue-400 mb-1 tracking-wider uppercase">БИБЛИОТЕКА</h2>
                                <WikiPanel />
                            </div>
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-2 lg:p-2.5 rounded-lg w-full">
                                <h2 className="font-orbitron text-[9px] lg:text-[10px] text-amber-400 mb-0.5 tracking-wider uppercase">НАРРАТИВ</h2>
                                <p className="text-[9px] lg:text-[11px] text-slate-300 leading-snug italic line-clamp-2">
                                    "{narrative}"
                                </p>
                            </div>
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-2 lg:p-3 rounded-lg w-full">
                                <ControlsContent />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MOBILE LAYOUT (Visible only on small screens) */}
            <div className="md:hidden flex flex-col justify-end h-full pb-6 px-4 pointer-events-none">
                {/* Narrative Toast (Always visible at bottom) */}
                {!isMobileMenuOpen && (
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl pointer-events-auto mb-20 animate-in slide-in-from-bottom fade-in duration-500">
                        <h2 className="font-orbitron text-xs text-amber-400 mb-1">МИКРО_НАРРАТИВ</h2>
                        <p className="text-xs text-slate-200 italic line-clamp-2">
                            "{narrative}"
                        </p>
                    </div>
                )}

                {/* Mobile Menu Trigger */}
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto z-50">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-orbitron font-bold shadow-lg border transition-all ${isMobileMenuOpen
                            ? 'bg-red-500 text-white border-red-400'
                            : 'bg-blue-600 text-white border-blue-400 animate-bounce-slow'
                            }`}
                    >
                        {isMobileMenuOpen ? 'ЗАКРЫТЬ' : 'ПАНЕЛЬ УПРАВЛЕНИЯ'}
                    </button>
                </div>

                {/* Mobile Fullscreen Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-40 pointer-events-auto flex flex-col pt-24 pb-20 px-6 overflow-y-auto">
                        <div className="flex gap-2 mb-6 p-1 bg-white/10 rounded-lg shrink-0">
                            <button
                                onClick={() => setActiveTab('controls')}
                                className={`flex-1 py-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'controls' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                            >
                                УПРАВЛЕНИЕ
                            </button>
                            <button
                                onClick={() => setActiveTab('demo')}
                                className={`flex-1 py-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'demo' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                            >
                                🎓 ДЕМО
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`flex-1 py-3 text-sm font-bold rounded-md transition-colors ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                            >
                                СТАТИСТИКА
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pb-10">
                            {activeTab === 'controls' ? (
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <ControlsContent />
                                    </div>
                                </div>
                            ) : activeTab === 'demo' ? (
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <DemoPanel />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <StatsContent />
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl">
                                        <h2 className="font-orbitron text-xs text-blue-400 mb-2 uppercase">БИБЛИОТЕКА</h2>
                                        <WikiPanel />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Dashboard;
