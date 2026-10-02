import { InputBuffer } from './InputBuffer';

export type PlayerAction = 'left' | 'right' | 'jump' | 'slide';

export const Input = new InputBuffer();