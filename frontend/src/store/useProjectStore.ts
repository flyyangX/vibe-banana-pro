import { create, StateCreator } from 'zustand';
import {
  createProjectSlice,
  ProjectSlice,
  createTaskSlice,
  TaskSlice,
  createGenerationSlice,
  GenerationSlice,
  createExportSlice,
  ExportSlice,
} from './slices';

// Combined store state type
export type StoreState = ProjectSlice & TaskSlice & GenerationSlice & ExportSlice;

// Re-export the interface for backward compatibility
export interface ProjectState extends StoreState {}

export const useProjectStore = create<StoreState>()((...a) => ({
  ...createProjectSlice(...(a as Parameters<StateCreator<ProjectSlice>>)),
  ...createTaskSlice(...(a as Parameters<StateCreator<StoreState>>)),
  ...createGenerationSlice(...(a as Parameters<StateCreator<StoreState>>)),
  ...createExportSlice(...(a as Parameters<StateCreator<StoreState>>)),
}));
