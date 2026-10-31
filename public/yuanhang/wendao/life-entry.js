import {createLifeJournal} from './life-journal.js';
import './life-projection.js';
import {createLifePresentation} from './life-presentation.js';
const root=typeof window!=='undefined'?window:globalThis;
root.WendaoEngine.installLifeJournal(createLifeJournal(root.WendaoEngine));
root.WendaoLifePresentation=Object.freeze({create:createLifePresentation});
