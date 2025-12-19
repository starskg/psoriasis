
export enum CellType {
  SKIN = 'SKIN',
  T_CD4 = 'T_CD4',
  T_CD8 = 'T_CD8',
  T_REG = 'T_REG',
  B_PLASMA = 'B_PLASMA',
  B_MEMORY = 'B_MEMORY',
  MACROPHAGE = 'MACROPHAGE',
  DENDRITIC = 'DENDRITIC',
  NK_CELL = 'NK_CELL',
  ANTIGEN = 'ANTIGEN', // New Trigger
  CYTOKINE = 'CYTOKINE',
  DRUG = 'DRUG'
}

export enum DrugType {
  OINTMENT = 'OINTMENT',
  PILL = 'PILL',
  INJECTION = 'INJECTION'
}

// Demo Mode Steps
export enum DemoStep {
  IDLE = 'IDLE',
  ANTIGEN_APPEARS = 'ANTIGEN_APPEARS',
  DENDRITIC_CAPTURES = 'DENDRITIC_CAPTURES',
  THELPER_ACTIVATES = 'THELPER_ACTIVATES',
  CYTOKINE_RELEASE = 'CYTOKINE_RELEASE',
  TKILLER_ACTIVATES = 'TKILLER_ACTIVATES',
  SKIN_ATTACK = 'SKIN_ATTACK',
  COMPLETE = 'COMPLETE'
}

export interface DemoState {
  isActive: boolean;
  currentStep: DemoStep;
  stepProgress: number; // 0-100 progress within current step
  autoPlay: boolean;
  focusTarget: { x: number; y: number } | null;
}

export const DEMO_STEP_INFO: Record<DemoStep, { title: string; description: string; duration: number }> = {
  [DemoStep.IDLE]: {
    title: 'Подготовка',
    description: 'Нажмите "Начать демо" для запуска обучающего режима',
    duration: 0
  },
  [DemoStep.ANTIGEN_APPEARS]: {
    title: '1. Появление антигена',
    description: 'Антиген (красный) появляется возле поверхности кожи. Это может быть бактерия, вирус или "ложный враг" при псориазе.',
    duration: 6000
  },
  [DemoStep.DENDRITIC_CAPTURES]: {
    title: '2. Дендритная клетка захватывает антиген',
    description: 'Дендритная клетка находит антиген и поглощает его. Теперь она несёт "сигнал тревоги".',
    duration: 8000
  },
  [DemoStep.THELPER_ACTIVATES]: {
    title: '3. Активация T-хелпера (CD4+)',
    description: 'Дендритная клетка передаёт сигнал T-хелперу. Он становится активным и начинает координировать атаку.',
    duration: 8000
  },
  [DemoStep.CYTOKINE_RELEASE]: {
    title: '4. Выброс цитокинов',
    description: 'Активированный T-хелпер выделяет цитокины — молекулы-"посыльные", которые передают сигнал другим клеткам.',
    duration: 7000
  },
  [DemoStep.TKILLER_ACTIVATES]: {
    title: '5. Активация T-киллера (CD8+)',
    description: 'Цитокины достигают T-киллера и активируют его. Это "убийца" иммунной системы.',
    duration: 7000
  },
  [DemoStep.SKIN_ATTACK]: {
    title: '6. Атака на клетки кожи',
    description: 'При псориазе активированный T-киллер ошибочно атакует здоровые клетки кожи, вызывая воспаление.',
    duration: 8000
  },
  [DemoStep.COMPLETE]: {
    title: 'Демонстрация завершена',
    description: 'Вы увидели полный цикл аутоиммунной реакции при псориазе. Нажмите "Повторить" для повтора.',
    duration: 0
  }
};

export interface Particle {
  id: string;
  type: CellType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  health: number;
  maxHealth: number;
  targetId?: string | null;
  glowColor: string;
  pulse: number;
  points?: { x: number; y: number }[];
  rotation: number;
  drugType?: DrugType;

  // New State Flags
  isActive?: boolean; // For Immune cells (Activated or Naive)
  hasAntigen?: boolean; // For Dendritic cells (Carrying antigen?)
}

export interface SimulationState {
  cytokineLevel: number;
  aggressionLevel: number;
  stressLevel: number; // New Stress Factor
  isAlertActive: boolean;
  damageReport: string[];
}
