
import { CellType } from './types';

export const CELL_CONFIGS: Record<any, any> = {
  [CellType.SKIN]: {
    radius: 22,
    color: 'rgba(74, 222, 128, 0.6)',
    glow: 'rgba(74, 222, 128, 0.3)',
    speed: 0.05,  // Жуда секин
    health: 100,
  },
  [CellType.T_CD4]: {
    radius: 12,
    color: '#f87171',
    glow: 'rgba(248, 113, 113, 0.8)',
    speed: 0.5,   // 1.2 -> 0.5
    health: 150,
    label: 'T-хелпер (CD4+)'
  },
  [CellType.T_CD8]: {
    radius: 12,
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.9)',
    speed: 0.6,   // 1.6 -> 0.6
    health: 150,
    label: 'T-киллер (CD8+)'
  },
  [CellType.T_REG]: {
    radius: 11,
    color: '#fca5a5',
    glow: 'rgba(252, 165, 165, 0.6)',
    speed: 0.4,   // 1.0 -> 0.4
    health: 150,
    label: 'T-регулятор'
  },
  [CellType.B_PLASMA]: {
    radius: 15,
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.8)',
    speed: 0.25,  // 0.6 -> 0.25
    health: 120,
    label: 'Плазмоцит'
  },
  [CellType.B_MEMORY]: {
    radius: 13,
    color: '#60a5fa',
    glow: 'rgba(96, 165, 250, 0.6)',
    speed: 0.3,   // 0.8 -> 0.3
    health: 120,
    label: 'B-клетка памяти'
  },
  [CellType.MACROPHAGE]: {
    radius: 35,
    color: 'rgba(168, 85, 247, 0.5)',
    glow: 'rgba(168, 85, 247, 0.4)',
    speed: 0.15,  // 0.3 -> 0.15
    health: 400,
    label: 'Макрофаг'
  },
  [CellType.DENDRITIC]: {
    radius: 18,
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.8)',
    speed: 0.35,  // 0.9 -> 0.35
    health: 100,
    label: 'Дендритная клетка'
  },
  [CellType.NK_CELL]: {
    radius: 14,
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.8)',
    speed: 0.7,   // 1.8 -> 0.7
    health: 130,
    label: 'NK-киллер'
  },
  [CellType.ANTIBODY]: {
    radius: 4,
    color: '#ffffff',
    glow: '#3b82f6',
    speed: 1.0,   // 2.5 -> 1.0
    health: 1,
  },
  [CellType.ANTIGEN]: {
    radius: 5,
    color: '#000000',
    glow: '#ef4444',
    speed: 0.2,   // 0.5 -> 0.2
    health: 1,
    label: 'Патоген'
  },
  [CellType.DRUG]: {
    radius: 6,
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.9)',
    speed: 0.8,   // 2.0 -> 0.8
    health: 1,
    label: 'Лекарство'
  }
};

export const PSORIASIS_STAGES = {
  HEALTHY: {
    id: 'HEALTHY',
    label: 'Здоровая кожа',
    cytokine: 5,
    aggression: 0,
    alert: false,
    color: 'text-green-400',
    borderColor: 'border-green-500'
  },
  PRODROMAL: {
    id: 'PRODROMAL',
    label: 'Начальная стадия',
    cytokine: 35,
    aggression: 25,
    alert: false,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500'
  },
  ACUTE: {
    id: 'ACUTE',
    label: 'Обострение',
    cytokine: 90,
    aggression: 95,
    alert: true,
    color: 'text-red-500',
    borderColor: 'border-red-500'
  },
  REMISSION: {
    id: 'REMISSION',
    label: 'Ремиссия',
    cytokine: 20,
    aggression: 10,
    alert: false,
    color: 'text-blue-400',
    borderColor: 'border-blue-500'
  }
};
