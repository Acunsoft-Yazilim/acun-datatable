// The <script> build: window.AcunDataTable, everything in one file.
import { el, setConfirm } from '@acunsoft/datatable-dom';
import { AcunDataTable } from './acun-datatable';
import { defineAcunDataTableElement } from './element';

// AcunDataTable.el builds safe custom cells without a bundler; AcunDataTable.setConfirm sets the confirmation dialog.
(globalThis as { AcunDataTable?: typeof AcunDataTable }).AcunDataTable = Object.assign(AcunDataTable, { el, setConfirm });
// <acun-datatable> is ready to use with the <script> build.
defineAcunDataTableElement();
