
export enum CellType {
  SKIN = 'SKIN',
  T_CD4 = 'T_CD4',
  T_CD8 = 'T_CD8',
  T_REG = 'T_REG',
  T_TH17 = 'T_TH17',
  B_PLASMA = 'B_PLASMA',
  B_MEMORY = 'B_MEMORY',
  MACROPHAGE = 'MACROPHAGE',
  DENDRITIC = 'DENDRITIC',
  NK_CELL = 'NK_CELL',
  NEUTROPHIL = 'NEUTROPHIL',
  ANTIGEN = 'ANTIGEN', // New Trigger
  ANTIBODY = 'ANTIBODY',
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

export const CELL_INFO: Record<CellType, { title: string; description: string; role: string }> = {
  [CellType.SKIN]: {
    title: 'Клетка кожи (Кератиноцит)',
    description: 'Основная клетка эпидермиса. При псориазе они начинают делиться слишком быстро, не успевая созревать.',
    role: 'Защитный барьер'
  },
  [CellType.DENDRITIC]: {
    title: 'Дендритная клетка',
    description: 'Антигенпрезентирующая клетка. Она собирает информацию о патогенах и "представляет" её Т-лимфоцитам.',
    role: 'Разведчик'
  },
  [CellType.T_CD4]: {
    title: 'Т-хелпер',
    description: 'Главный регулятор иммунного ответа. Координирует работу других клеток через выделение цитокинов.',
    role: 'Командир'
  },
  [CellType.T_CD8]: {
    title: 'Т-киллер',
    description: 'Цитотоксический лимфоцит. Его задача — уничтожать зараженные или мутировавшие клетки.',
    role: 'Спецназ'
  },
  [CellType.ANTIBODY]: {
    title: 'Антитело',
    description: 'Белки, вырабатываемые B-клетками для нейтрализации антигенов.',
    role: 'Нейтрализатор'
  },
  [CellType.CYTOKINE]: {
    title: 'Цитокин',
    description: 'Информационная молекула. С её помощью клетки "общаются" и передают сигнал тревоги на расстоянии.',
    role: 'Сообщение'
  },
  [CellType.ANTIGEN]: {
    title: 'Антиген',
    description: 'Любое вещество, которое организм рассматривает как чужеродное и против которого начинает борьбу.',
    role: 'Мишень'
  },
  [CellType.DRUG]: {
    title: 'Лекарство',
    description: 'Медикаментозное средство, предназначенное для блокировки воспаления или регуляции иммунитета.',
    role: 'Терапия'
  },
  [CellType.T_REG]: { title: 'Т-регулятор', description: 'Подавляет иммунный ответ.', role: 'Миротворец' },
  [CellType.B_PLASMA]: { title: 'Плазмоцит', description: 'Производит антитела.', role: 'Завод' },
  [CellType.B_MEMORY]: { title: 'Клетка памяти', description: 'Запоминает врага.', role: 'Архив' },
  [CellType.MACROPHAGE]: { title: 'Макрофаг', description: 'Пожирает мусор.', role: 'Утилизатор' },
  [CellType.NK_CELL]: { title: 'NK-клетка', description: 'Естественный убийца.', role: 'Охотник' },
  [CellType.T_TH17]: {
    title: 'Т-хелпер 17 (Th17)',
    description: 'Особый тип Т-клеток, играющий ключевую роль в развитии псориаза, выделяя ИЛ-17.',
    role: 'Провокатор'
  },
  [CellType.NEUTROPHIL]: {
    title: 'Нейтрофил',
    description: 'Клетки, которые первыми прибывают в очаг воспаления. При псориазе образуют микроабсцессы Мунро.',
    role: 'Пехота'
  }
};

export interface SimulationState {
  cytokineLevel: number;
  aggressionLevel: number;
  stressLevel: number; // New Stress Factor
  isAlertActive: boolean;
  damageReport: string[];
}
