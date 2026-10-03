import ohm from './ohm.js';
import divider from './divider.js';
import rc from './rc.js';
import filter from './filter.js';
import diode from './diode.js';
import bjt from './bjt.js';

// 課程順序：每一課都建立在前一課之上。
export const lessons = [ohm, divider, rc, filter, diode, bjt];
export const byId = Object.fromEntries(lessons.map(l => [l.id, l]));
