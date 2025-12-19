
import React, { useState, useEffect, useCallback } from 'react';
import MicroCanvas from './components/MicroCanvas';
import Dashboard from './components/Dashboard';
import { SimulationState, DrugType, DemoState, DemoStep, DEMO_STEP_INFO } from './types';
import { getDramaticNarrative } from './geminiService';
import { PSORIASIS_STAGES } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<SimulationState>({
    cytokineLevel: 10,
    aggressionLevel: 0,
    stressLevel: 0,
    isAlertActive: false,
    damageReport: ["Сканирование слоев кожи...", "Система стабильна."],
  });

  const [narrative, setNarrative] = useState("Гомеостаз кожи активен. Защитный барьер не поврежден.");
  const [damageCount, setDamageCount] = useState(0);
  const [stats, setStats] = useState({ killed: 0, saved: 0 });
  const [drugTrigger, setDrugTrigger] = useState(0);
  const [selectedDrug, setSelectedDrug] = useState<DrugType>(DrugType.OINTMENT);
  const [timeState, setTimeState] = useState({ day: 1, timeScale: 1.0, isPaused: false });

  // Demo Mode State
  const [demoState, setDemoState] = useState<DemoState>({
    isActive: false,
    currentStep: DemoStep.IDLE,
    stepProgress: 0,
    autoPlay: true,
    focusTarget: null
  });

  // Demo Mode Step Progression
  const DEMO_STEP_ORDER: DemoStep[] = [
    DemoStep.ANTIGEN_APPEARS,
    DemoStep.DENDRITIC_CAPTURES,
    DemoStep.THELPER_ACTIVATES,
    DemoStep.CYTOKINE_RELEASE,
    DemoStep.TKILLER_ACTIVATES,
    DemoStep.SKIN_ATTACK,
    DemoStep.COMPLETE
  ];

  // Demo Mode Control Functions
  const startDemo = useCallback(() => {
    setDemoState({
      isActive: true,
      currentStep: DemoStep.ANTIGEN_APPEARS,
      stepProgress: 0,
      autoPlay: true,
      focusTarget: null
    });
    // Pause normal simulation
    setTimeState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const stopDemo = useCallback(() => {
    setDemoState({
      isActive: false,
      currentStep: DemoStep.IDLE,
      stepProgress: 0,
      autoPlay: true,
      focusTarget: null
    });
    setTimeState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const nextDemoStep = useCallback(() => {
    setDemoState(prev => {
      const currentIndex = DEMO_STEP_ORDER.indexOf(prev.currentStep);
      if (currentIndex < DEMO_STEP_ORDER.length - 1) {
        return {
          ...prev,
          currentStep: DEMO_STEP_ORDER[currentIndex + 1],
          stepProgress: 0
        };
      }
      return prev;
    });
  }, []);

  const prevDemoStep = useCallback(() => {
    setDemoState(prev => {
      const currentIndex = DEMO_STEP_ORDER.indexOf(prev.currentStep);
      if (currentIndex > 0) {
        return {
          ...prev,
          currentStep: DEMO_STEP_ORDER[currentIndex - 1],
          stepProgress: 0
        };
      }
      return prev;
    });
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setDemoState(prev => ({ ...prev, autoPlay: !prev.autoPlay }));
  }, []);

  // Auto-advance demo steps
  useEffect(() => {
    if (!demoState.isActive || !demoState.autoPlay) return;
    if (demoState.currentStep === DemoStep.COMPLETE || demoState.currentStep === DemoStep.IDLE) return;

    const stepInfo = DEMO_STEP_INFO[demoState.currentStep];
    const progressInterval = 50; // Update every 50ms
    const progressIncrement = (progressInterval / stepInfo.duration) * 100;

    const timer = setInterval(() => {
      setDemoState(prev => {
        const newProgress = prev.stepProgress + progressIncrement;
        if (newProgress >= 100) {
          // Move to next step
          const currentIndex = DEMO_STEP_ORDER.indexOf(prev.currentStep);
          if (currentIndex < DEMO_STEP_ORDER.length - 1) {
            return {
              ...prev,
              currentStep: DEMO_STEP_ORDER[currentIndex + 1],
              stepProgress: 0
            };
          } else {
            return { ...prev, stepProgress: 100 };
          }
        }
        return { ...prev, stepProgress: newProgress };
      });
    }, progressInterval);

    return () => clearInterval(timer);
  }, [demoState.isActive, demoState.autoPlay, demoState.currentStep]);

  // Time progression and Stress effect
  useEffect(() => {
    let interval: number;
    if (!timeState.isPaused && !demoState.isActive) {
      const dayDurationMs = 5000 / timeState.timeScale;

      interval = window.setInterval(() => {
        setTimeState(prev => ({ ...prev, day: prev.day + 1 }));

        // Stress Logic: High stress increases cytokines slowly
        setState(prev => {
          let newCytokine = prev.cytokineLevel;
          if (prev.stressLevel > 30) {
            newCytokine += Math.floor((prev.stressLevel - 30) / 20); // Slow increase
          }
          if (newCytokine > 100) newCytokine = 100;

          // Auto-trigger alert if stress gets too high
          let alert = prev.isAlertActive;
          if (prev.stressLevel > 80 && !prev.isAlertActive && Math.random() < 0.3) {
            alert = true;
          }

          return { ...prev, cytokineLevel: newCytokine, isAlertActive: alert };
        });

      }, dayDurationMs);
    }
    return () => clearInterval(interval);
  }, [timeState.timeScale, timeState.isPaused, demoState.isActive]);

  const updateNarrative = useCallback(async () => {
    let phase = "Гомеостаз";
    if (state.isAlertActive) phase = "Аутоиммунная инфильтрация";
    if (state.cytokineLevel > 70) phase = "Цитокиновый шторм";
    if (state.stressLevel > 70) phase += " (Высокий стресс)";

    const text = await getDramaticNarrative({
      cytokineLevel: state.cytokineLevel,
      damageCount,
      phase
    });
    setNarrative(text);
  }, [state.isAlertActive, state.cytokineLevel, state.stressLevel, damageCount]);

  useEffect(() => {
    updateNarrative();
  }, [updateNarrative]);

  useEffect(() => {
    if (stats.killed > 0 && stats.killed % 5 === 0) {
      setState(prev => ({
        ...prev,
        damageReport: [
          `Внимание: День ${timeState.day}. ${stats.killed} клеток разрушены.`,
          ...prev.damageReport.slice(0, 10)
        ]
      }));
      updateNarrative();
    }
  }, [stats.killed, updateNarrative]);

  const handleToggleAlert = () => {
    setState(prev => {
      const active = !prev.isAlertActive;
      return {
        ...prev,
        isAlertActive: active,
        aggressionLevel: active ? 85 : 0,
        cytokineLevel: active ? 45 : 10,
        damageReport: [
          active ? `ДЕНЬ ${timeState.day}: ТРЕВОГА. Обнаружен ложный патоген.` : `ДЕНЬ ${timeState.day}: Тревога отменена.`,
          ...prev.damageReport.slice(0, 10)
        ]
      };
    });
    setTimeout(updateNarrative, 500);
  };

  const handleStageSelect = (stageId: keyof typeof PSORIASIS_STAGES) => {
    const stage = PSORIASIS_STAGES[stageId];
    setState(prev => ({
      ...prev,
      cytokineLevel: stage.cytokine,
      aggressionLevel: stage.aggression,
      isAlertActive: stage.alert,
      damageReport: [
        `ДЕНЬ ${timeState.day}: Смена фазы -> ${stage.label}`,
        ...prev.damageReport.slice(0, 10)
      ]
    }));
    setTimeout(updateNarrative, 500);
  };

  const handleInjectDrug = () => {
    setDrugTrigger(prev => prev + 1);
    const drugNames = {
      [DrugType.OINTMENT]: "Местная мазь",
      [DrugType.PILL]: "Иммуносупрессор",
      [DrugType.INJECTION]: "Био-инъекция"
    };
    setState(prev => ({
      ...prev,
      damageReport: [`ДЕНЬ ${timeState.day}: Применено: ${drugNames[selectedDrug]}.`, ...prev.damageReport.slice(0, 10)]
    }));
  };

  const handleReset = () => {
    window.location.reload();
  };

  const handleStatsUpdate = (newStats: { killed: number, saved: number }) => {
    setStats(newStats);
    setDamageCount(newStats.killed);
  };

  const handleDemoFocusUpdate = (target: { x: number; y: number } | null) => {
    setDemoState(prev => ({ ...prev, focusTarget: target }));
  };

  return (
    <div className="relative w-screen h-screen bg-[#050505] text-white overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient from-[#1a1c2c] to-[#050505] opacity-50" />

      <MicroCanvas
        isAlertActive={state.isAlertActive}
        cytokineLevel={state.cytokineLevel}
        onDamageUpdate={(val) => { }}
        onStatsUpdate={handleStatsUpdate}
        drugTrigger={drugTrigger}
        selectedDrug={selectedDrug}
        timeScale={timeState.timeScale}
        isPaused={timeState.isPaused}
        demoState={demoState}
        onDemoFocusUpdate={handleDemoFocusUpdate}
      />

      <Dashboard
        state={state}
        stats={stats}
        timeState={timeState}
        narrative={narrative}
        selectedDrug={selectedDrug}
        demoState={demoState}
        onToggleAlert={handleToggleAlert}
        onReset={handleReset}
        onSetCytokine={(val) => setState(prev => ({ ...prev, cytokineLevel: val }))}
        onSetStress={(val) => setState(prev => ({ ...prev, stressLevel: val }))}
        onInjectDrug={handleInjectDrug}
        onSelectDrug={setSelectedDrug}
        onTimeChange={(newTimeState) => setTimeState(prev => ({ ...prev, ...newTimeState }))}
        onStageSelect={handleStageSelect}
        onStartDemo={startDemo}
        onStopDemo={stopDemo}
        onNextDemoStep={nextDemoStep}
        onPrevDemoStep={prevDemoStep}
        onToggleAutoPlay={toggleAutoPlay}
      />

      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />
    </div>
  );
};

export default App;
