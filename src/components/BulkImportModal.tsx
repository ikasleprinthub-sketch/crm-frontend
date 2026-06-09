'use client';
import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Download, CheckCircle, XCircle, AlertCircle, Loader, FileSpreadsheet, ChevronRight, RotateCcw, LayoutList } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Modal } from './Modals';
import api from '@/lib/api';
import styles from './BulkImportModal.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  rowIndex: number;
  leadName: string;
  contactName: string;
  contactNumber: string;
  email: string;
  sourceName: string;
  departmentName: string;
  taskTypeName: string;
  remarks: string;
  sourceId: string | null;
  departmentId: string | null;
  taskTypeId: string | null;
  errors: string[];
}

interface ImportResult {
  row: number;
  leadName: string;
  status: 'success' | 'error';
  leadNo?: string;
  error?: string;
}

type Step = 'upload' | 'preview' | 'result';

// ─── Template ─────────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'LEAD NAME', 'CONTACT PERSON NAME', 'PHONE NUMBER',
  'MAIL ID', 'SOURCE', 'DEPARTMENT', 'TASK TYPE', 'REMARKS',
];

const SAMPLE_ROWS = [
  ['COMPANY A', 'AAA', '9876543210', 'example1@gmail.com', 'REGULAR WORK', 'GST TEAM', 'GSTR1 FILING', 'MAY MONTH GST 1 FILING'],
  ['COMPANY B', 'BBB', '9876543210', 'example2@gmail.com', 'REGULAR WORK', 'INCOME TAX TEAM', 'INCOME TAX FILING', 'FY 2024-25 FILING'],
];

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...SAMPLE_ROWS]);
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads Import');
  XLSX.writeFile(wb, 'bulk_leads_template.xlsx');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportModal({
  isOpen, onClose, onDone,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { sources, departments, taskTypes } = useApp();

  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // normalise strips ALL whitespace variants (non-breaking spaces, zero-width, etc.)
  const norm = (s: string) =>
    s.replace(/[ ​﻿\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  // ── Lookup helpers ────────────────────────────────────────────────────────
  const findSource = useCallback((name: string) =>
    sources.find(s => norm(s.name) === norm(name)) ?? null,
    [sources]);

  const findDept = useCallback((name: string) =>
    departments.find(d => norm(d.name) === norm(name)) ?? null,
    [departments]);

  const findTaskType = useCallback((name: string, deptId: string | null) =>
    taskTypes.find(t => norm(t.name) === norm(name) && (!deptId || t.departmentId === deptId))
    ?? taskTypes.find(t => norm(t.name) === norm(name))
    ?? null,
    [taskTypes]);

  // ── Parse Excel ────────────────────────────────────────────────────────────
  function parseFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const headerRowIdx = raw.findIndex(r =>
          r.some((c: any) => String(c).toUpperCase().includes('LEAD NAME'))
        );
        if (headerRowIdx === -1) {
          alert('Could not find header row. Make sure the file has a "LEAD NAME" column.');
          return;
        }

        const headers: string[] = raw[headerRowIdx].map((h: any) =>
          String(h).replace(/\s+/g, ' ').trim().toUpperCase()
        );
        const col = (name: string) => headers.indexOf(name);
        const dataRows = raw.slice(headerRowIdx + 1).filter(r => r.some((c: any) => String(c).trim() !== ''));

        const parsed: ParsedRow[] = dataRows.map((r, idx) => {
          const get = (colName: string) =>
            String(r[col(colName)] ?? '').replace(/\s+/g, ' ').trim();

          const leadName      = get('LEAD NAME');
          const contactName   = get('CONTACT PERSON NAME');
          const contactNumber = get('PHONE NUMBER');
          const email         = get('MAIL ID').toLowerCase();
          const sourceName    = get('SOURCE');
          const departmentName = get('DEPARTMENT');
          const taskTypeName  = get('TASK TYPE');
          const remarks       = get('REMARKS');

          const srcObj  = findSource(sourceName);
          const deptObj = findDept(departmentName);
          const ttObj   = findTaskType(taskTypeName, deptObj?.id ?? null);

          const errors: string[] = [];
          if (!leadName) errors.push('Lead name is required');
          if (!srcObj)   errors.push(`Source "${sourceName}" not found`);
          if (!deptObj)  errors.push(`Department "${departmentName}" not found`);
          if (!ttObj)    errors.push(`Task type "${taskTypeName}" not found`);
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email');

          return {
            rowIndex: idx + 1,
            leadName, contactName, contactNumber, email,
            sourceName, departmentName, taskTypeName, remarks,
            sourceId: srcObj?.id ?? null,
            departmentId: deptObj?.id ?? null,
            taskTypeId: ttObj?.id ?? null,
            errors,
          };
        });

        setRows(parsed);
        setStep('preview');
      } catch {
        alert('Failed to parse file. Please use the provided template.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }

  const hasErrors = rows.some(r => r.errors.length > 0);
  const canImport = rows.length > 0 && !hasErrors;

  // ── Import ─────────────────────────────────────────────────────────────────
  async function handleImport() {
    setImporting(true);
    try {
      const payload = rows.map(r => ({
        leadName:      r.leadName,
        contactName:   r.contactName   || undefined,
        contactNumber: r.contactNumber || undefined,
        email:         r.email         || undefined,
        sourceId:      r.sourceId!,
        departmentId:  r.departmentId!,
        taskTypeId:    r.taskTypeId!,
        remarks:       r.remarks       || undefined,
      }));
      const res = await api.post('/leads/bulk-import', { rows: payload });
      setResults(res.data.data.results);
      setSummary(res.data.data.summary);
      setStep('result');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setStep('upload');
    setRows([]);
    setResults([]);
    setSummary(null);
    setFileName('');
    onClose();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Lead Import" size="lg">

      {/* Step Bar */}
      <div className={styles.stepBar}>
        {(['upload', 'preview', 'result'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`${styles.stepDot} ${step === s ? styles.active : stepsDone(step, s) ? styles.done : ''}`}>
              {stepsDone(step, s) ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${step === s ? styles.active : ''}`}>
              {s === 'upload' ? 'Upload File' : s === 'preview' ? 'Preview' : 'Results'}
            </span>
            {i < 2 && <div className={`${styles.stepLine} ${stepsDone(step, s) ? styles.done : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <div className={styles.uploadStep}>
          <button className={styles.templateBtn} onClick={downloadTemplate}>
            <Download size={15} /> Download Template
          </button>

          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet size={40} className={styles.dropIcon} />
            <p className={styles.dropTitle}>Drop your Excel file here</p>
            <p className={styles.dropSub}>or click to browse &nbsp;·&nbsp; .xlsx / .xls files only</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileInput} />
          </div>

          <div className={styles.uploadHints}>
            <p><strong>Required columns:</strong> {TEMPLATE_HEADERS.join(', ')}</p>
            <p>SOURCE, DEPARTMENT, and TASK TYPE must match the names configured in System Settings.</p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === 'preview' && (
        <div className={styles.previewStep}>
          <div className={styles.previewHeader}>
            <div className={styles.previewMeta}>
              <FileSpreadsheet size={16} />
              <span>{fileName}</span>
              <span className={styles.rowCount}>{rows.length} rows</span>
              {hasErrors && (
                <span className={styles.errorCount}>
                  <AlertCircle size={13} /> {rows.filter(r => r.errors.length > 0).length} with errors
                </span>
              )}
            </div>
            <button className={styles.resetBtn} onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}>
              <RotateCcw size={13} /> Change File
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lead Name</th>
                  <th>Source</th>
                  <th>Department</th>
                  <th>Task Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.rowIndex} className={row.errors.length > 0 ? styles.errorRow : ''}>
                    <td className={styles.rowNum}>{row.rowIndex}</td>
                    <td>
                      <span className={styles.leadName}>{row.leadName}</span>
                      {row.contactName && <span className={styles.sub}>{row.contactName}</span>}
                      {row.email && <span className={styles.sub}>{row.email}</span>}
                    </td>
                    <td className={!row.sourceId ? styles.missing : ''}>{row.sourceName}</td>
                    <td className={!row.departmentId ? styles.missing : ''}>{row.departmentName}</td>
                    <td className={!row.taskTypeId ? styles.missing : ''}>{row.taskTypeName}</td>
                    <td>
                      {row.errors.length > 0 ? (
                        <div className={styles.errorBadge}>
                          <XCircle size={12} />
                          <span>{row.errors[0]}{row.errors.length > 1 ? ` +${row.errors.length - 1}` : ''}</span>
                        </div>
                      ) : (
                        <span className={styles.okBadge}><CheckCircle size={12} /> Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.previewFooter}>
            {hasErrors && <p className={styles.blockMsg}>Fix errors above before importing.</p>}
            <button className={styles.importBtn} onClick={handleImport} disabled={!canImport || importing}>
              {importing
                ? <><Loader size={15} className={styles.spin} /> Importing…</>
                : <><ChevronRight size={15} /> Import {rows.length} Leads</>}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Results ── */}
      {step === 'result' && summary && (
        <div className={styles.resultStep}>
          <div className={styles.summaryCards}>
            <div className={`${styles.summaryCard} ${styles.total}`}>
              <LayoutList size={18} />
              <span className={styles.summaryNum}>{summary.total}</span>
              <span>Total</span>
            </div>
            <div className={`${styles.summaryCard} ${styles.success}`}>
              <CheckCircle size={18} />
              <span className={styles.summaryNum}>{summary.success}</span>
              <span>Imported</span>
            </div>
            <div className={`${styles.summaryCard} ${styles.failed}`}>
              <XCircle size={18} />
              <span className={styles.summaryNum}>{summary.failed}</span>
              <span>Failed</span>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lead Name</th>
                  <th>Lead No</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.row} className={r.status === 'error' ? styles.errorRow : styles.successRow}>
                    <td className={styles.rowNum}>{r.row}</td>
                    <td>{r.leadName}</td>
                    <td>{r.leadNo || '—'}</td>
                    <td>
                      {r.status === 'success'
                        ? <span className={styles.okBadge}><CheckCircle size={12} /> Success</span>
                        : <span className={styles.errorBadge}><XCircle size={12} /> {r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.previewFooter}>
            <button className={styles.importBtn} onClick={() => { handleClose(); onDone(); }}>
              <CheckCircle size={15} /> Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function stepsDone(current: Step, check: Step): boolean {
  const order: Step[] = ['upload', 'preview', 'result'];
  return order.indexOf(current) > order.indexOf(check);
}
