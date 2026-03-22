import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useSettings } from './SettingsContext';
import WeeklyScheduleBoard from './WeeklyScheduleBoard';
import { buildChefPrepDraft, estimateRecipeWeight } from './prepGenerator';
import {
    ChefHat,
    Clock,
    CheckCircle2,
    Check,
    Download,
    FileText,
    Maximize2,
    Minimize2,
    Pencil,
    Printer,
    ArrowUp,
    Trash2,
    RotateCcw,
    Utensils,
    Scale,
    Timer,
    X,
    Zap,
    ClipboardCheck
} from 'lucide-react';

/**
 * CommandBoard Component - Overhauled for Chef Execution
 * Focus: High Readability, Smart Tooling, Grouped Prep Tasks.
 */
const CommandBoard = ({ clientId = 'kabile', onExit, productionTargets = {}, portionTargets = {}, recipes: masterRecipes = [], canEdit = false, onRecipeMethodSync = null }) => {
    const [boardRecords, setBoardRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('board');
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [exportScopes, setExportScopes] = useState(['weekly', 'daily', 'service']);
    const [exportFormat, setExportFormat] = useState('pdf');
    const [exportLayout, setExportLayout] = useState('horizontal');
    const [editingBoxKey, setEditingBoxKey] = useState(null);
    const [editingTaskDrafts, setEditingTaskDrafts] = useState({});
    const [expandedColumn, setExpandedColumn] = useState(null);
    const { language, volumeFocus, translateIngredient } = useSettings();
    const [checkedTasks, setCheckedTasks] = useState(() => {
        const saved = localStorage.getItem(`command_board_checks_${clientId}`);
        return saved ? JSON.parse(saved) : {};
    });

    const normalize = (val) => {
        const s = (val || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
        const noLeadingNum = s.replace(/^[0-9]+[\.\)\s-]+/, '').trim();
        const clean = noLeadingNum.replace(/\s*\(.*?\)\s*/g, '').trim();
        return clean;
    };

    const getTargetPortions = useCallback((recipe) => {
        const direct = parseFloat(portionTargets[recipe.id] || portionTargets[recipe.meta?.id]);
        if (!isNaN(direct) && direct > 0) return direct;
        return 0;
    }, [portionTargets]);

    const getScheduleProfile = useCallback((recipe) => {
        const targetPortions = getTargetPortions(recipe);
        return targetPortions >= 50 ? 'high_volume' : 'regular';
    }, [getTargetPortions]);

    const getScaleFactor = useCallback((recipe) => {
        const raw = parseFloat(productionTargets[recipe.id] || productionTargets[recipe.meta?.id]);
        return !Number.isNaN(raw) && raw > 0 ? raw : 1;
    }, [productionTargets]);

    const getBoardData = useCallback((recipe) => {
        const raw = recipe?.data || {};
        const profile = getScheduleProfile(recipe);
        if (raw && typeof raw === 'object') {
            if (raw[profile]) return raw[profile];
            if (raw.regular) return raw.regular;
        }
        return raw;
    }, [getScheduleProfile]);

    const getMutableBoardData = useCallback((sourceData, recipe) => {
        const nextData = { ...(sourceData || {}) };
        const profile = getScheduleProfile(recipe);
        if (nextData && typeof nextData === 'object' && (nextData.regular || nextData.high_volume)) {
            const fallback = nextData.regular ? { ...nextData.regular } : {};
            nextData[profile] = { ...fallback, ...(nextData[profile] || {}) };
            return { root: nextData[profile], envelope: nextData };
        }
        return { root: nextData, envelope: nextData };
    }, [getScheduleProfile]);

    // ── Data Fetching (Tasks Only) ─────────────────────────────────────────────
    useEffect(() => {
        async function fetchBoardData() {
            if (masterRecipes.length === 0) return;
            setLoading(true);
            try {
                const [presentationRes, boardTasksRes] = await Promise.all([
                    supabase.from('sop_presentations').select('*').eq('client_id', clientId),
                    supabase.from('sop_board_tasks').select('*').eq('client_id', clientId)
                ]);

                const presentationData = presentationRes.data || [];
                const sopBoardTasksData = boardTasksRes.data || [];

                const boardsMap = new Map();

                // 1. Initialize with Master Recipes to ensure catch-all
                masterRecipes.forEach(r => {
                    const norm = normalize(r.name);
                    boardsMap.set(norm, {
                        dish_name: r.name,
                        data: {},
                        hasTasks: false,
                        staff_role: 'js',
                        meta: r
                    });
                });

                const mergeTaskSource = (dish_name, json) => {
                    const data = typeof json === 'string' ? JSON.parse(json) : json;
                    if (!data) return;
                    const norm = normalize(dish_name);
                    const existing = boardsMap.get(norm);
                    const hasTasks = data.weekly || data.morning || data.service || data.pre_service;

                    if (existing) {
                        boardsMap.set(norm, {
                            ...existing,
                            data: { ...existing.data, ...data },
                            hasTasks: !!(existing.hasTasks || hasTasks)
                        });
                    } else if (hasTasks) {
                        boardsMap.set(norm, {
                            dish_name,
                            data,
                            hasTasks: true,
                            staff_role: data.staff || 'js',
                            meta: masterRecipes.find(mr => normalize(mr.name) === norm) || {}
                        });
                    }
                };

                presentationData.forEach(row => {
                    try {
                        mergeTaskSource(row.dish_name, row.presentation_json);
                    } catch (e) {
                        console.error(`Error parsing presentation for ${row.dish_name}:`, e);
                    }
                });
                sopBoardTasksData.forEach(row => {
                    try {
                        mergeTaskSource(row.dish_name, row.tasks_json);
                    } catch (e) {
                        console.error(`Error parsing tasks for ${row.dish_name}:`, e);
                    }
                });

                const recipesMap = new Map();
                masterRecipes.forEach(r => {
                    recipesMap.set(normalize(r.name), r);
                    recipesMap.set(normalize(r.id), r);
                });

                const finalBoardItems = Array.from(boardsMap.values()).map(row => {
                    return {
                        id: row.meta?.id || row.dish_name,
                        dish_name: row.dish_name,
                        staff_role: row.staff_role,
                        data: row.data,
                        meta: row.meta || {},
                        hasTasks: row.hasTasks
                    };
                });

                setBoardRecords(finalBoardItems);
            } catch (err) {
                console.error("Board fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchBoardData();
    }, [clientId, masterRecipes.length]);

    // ── Persistence & Updates ────────────────────────────────────────────────
    const handleUpdateTaskLabel = async (recipe, category, index, newLabel) => {
        // Optimistic local update
        setBoardRecords(prev => prev.map(r => {
            if (r.id !== recipe.id && r.dish_name !== recipe.dish_name) return r;
            const { root: newDataRoot, envelope: newData } = getMutableBoardData(r.data, recipe);
            let targetArray = null;
            if (category === 'weekly') {
                if (!newDataRoot.weekly) newDataRoot.weekly = [];
                if (Array.isArray(newDataRoot.weekly)) targetArray = newDataRoot.weekly;
                else if (newDataRoot.weekly?.batch) targetArray = newDataRoot.weekly.batch;
            } else if (category === 'morning') {
                if (!newDataRoot.morning) newDataRoot.morning = [];
                if (Array.isArray(newDataRoot.morning)) targetArray = newDataRoot.morning;
                else if (newDataRoot.morning?.tasks) targetArray = newDataRoot.morning.tasks;
            } else if (category === 'forward') {
                if (!newDataRoot.morning) newDataRoot.morning = {};
                if (Array.isArray(newDataRoot.morning)) targetArray = [];
                else {
                    if (!newDataRoot.morning.forward) newDataRoot.morning.forward = [];
                    targetArray = newDataRoot.morning.forward;
                }
            } else if (category === 'service' || category.startsWith('test')) {
                if (!newDataRoot.service) newDataRoot.service = [];
                if (Array.isArray(newDataRoot.service)) targetArray = newDataRoot.service;
                else if (newDataRoot.service?.setup) targetArray = newDataRoot.service.setup;
            }

            // If we are editing a fallback (method), initialize the array with the method steps if empty
            if (targetArray && targetArray.length === 0 && recipe.meta?.method) {
                targetArray.push(...recipe.meta.method);
            }

            if (targetArray && targetArray[index] !== undefined) {
                if (typeof targetArray[index] === 'string') targetArray[index] = newLabel;
                else targetArray[index].label = newLabel;
            } else if (targetArray && index === targetArray.length) {
                // Handle appending if needed (though UI usually edits existing)
                targetArray.push(newLabel);
            }

            return { ...r, data: newData };
        }));

        // Quiet background sync to Supabase
        const currentRecord = boardRecords.find(r => r.id === recipe.id || r.dish_name === recipe.dish_name);
        if (currentRecord) {
            const { root: updatedDataRoot, envelope: updatedData } = getMutableBoardData(currentRecord.data, recipe);
            // Ensure the specific label change is reflected in the object being sent
            let targetArray = null;
            if (category === 'weekly') {
                if (!updatedDataRoot.weekly) updatedDataRoot.weekly = [];
                if (Array.isArray(updatedDataRoot.weekly)) targetArray = updatedDataRoot.weekly;
                else if (updatedDataRoot.weekly?.batch) targetArray = updatedDataRoot.weekly.batch;
            } else if (category === 'morning') {
                if (!updatedDataRoot.morning) updatedDataRoot.morning = [];
                if (Array.isArray(updatedDataRoot.morning)) targetArray = updatedDataRoot.morning;
                else if (updatedDataRoot.morning?.tasks) targetArray = updatedDataRoot.morning.tasks;
            } else if (category === 'forward') {
                if (!updatedDataRoot.morning) updatedDataRoot.morning = {};
                if (Array.isArray(updatedDataRoot.morning)) targetArray = [];
                else {
                    if (!updatedDataRoot.morning.forward) updatedDataRoot.morning.forward = [];
                    targetArray = updatedDataRoot.morning.forward;
                }
            } else if (category === 'service' || category.startsWith('test')) {
                if (!updatedDataRoot.service) updatedDataRoot.service = [];
                if (Array.isArray(updatedDataRoot.service)) targetArray = updatedDataRoot.service;
                else if (updatedDataRoot.service?.setup) targetArray = updatedDataRoot.service.setup;
            }

            if (targetArray && targetArray.length === 0 && recipe.meta?.method) {
                targetArray.push(...recipe.meta.method);
            }

            if (targetArray && targetArray[index] !== undefined) {
                if (typeof targetArray[index] === 'string') targetArray[index] = newLabel;
                else targetArray[index].label = newLabel;
            }

            await supabase
                .from('sop_board_tasks')
                .upsert({
                    dish_name: recipe.dish_name,
                    tasks_json: updatedData,
                    client_id: clientId
                }, { onConflict: 'dish_name,client_id' });
        }
    };

    useEffect(() => {
        localStorage.setItem(`command_board_checks_${clientId}`, JSON.stringify(checkedTasks));
    }, [checkedTasks, clientId]);

    const toggleTask = (key) => {
        setCheckedTasks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const resetBoard = () => {
        if (window.confirm('Wipe board for new shift?')) setCheckedTasks({});
    };

    const mapTaskItems = useCallback((items, taskType) => (
        (items || []).map((task, index) => ({
            label: typeof task === 'string' ? task : (task?.label || ''),
            taskType,
            sourceIndex: index
        }))
    ), []);

    const getTaskArray = useCallback((root, taskType, recipeMeta = null) => {
        let targetArray = null;

        if (taskType === 'weekly') {
            if (!root.weekly) root.weekly = [];
            if (Array.isArray(root.weekly)) targetArray = root.weekly;
        } else if (taskType === 'weekly_batch') {
            if (!root.weekly || Array.isArray(root.weekly)) root.weekly = { batch: [], buffer: [] };
            if (!root.weekly.batch) root.weekly.batch = [];
            targetArray = root.weekly.batch;
        } else if (taskType === 'weekly_buffer') {
            if (!root.weekly || Array.isArray(root.weekly)) root.weekly = { batch: [], buffer: [] };
            if (!root.weekly.buffer) root.weekly.buffer = [];
            targetArray = root.weekly.buffer;
        } else if (taskType === 'morning' || taskType === 'morning_tasks') {
            if (!root.morning) root.morning = taskType === 'morning' ? [] : { tasks: [] };
            if (Array.isArray(root.morning)) targetArray = root.morning;
            else {
                if (!root.morning.tasks) root.morning.tasks = [];
                targetArray = root.morning.tasks;
            }
        } else if (taskType === 'forward') {
            if (!root.morning || Array.isArray(root.morning)) root.morning = { tasks: Array.isArray(root.morning) ? root.morning : [], forward: [] };
            if (!root.morning.forward) root.morning.forward = [];
            targetArray = root.morning.forward;
        } else if (taskType === 'service') {
            if (!root.service) root.service = [];
            if (Array.isArray(root.service)) targetArray = root.service;
        } else if (taskType === 'service_prep' || taskType === 'service_setup' || taskType === 'service_garnish') {
            if (!root.service || Array.isArray(root.service)) root.service = { prep: [], setup: [], garnish: [] };
            const key = taskType.replace('service_', '');
            if (!root.service[key]) root.service[key] = [];
            targetArray = root.service[key];
        } else if (taskType === 'pre_service') {
            if (!root.pre_service) root.pre_service = [];
            targetArray = root.pre_service;
        }

        if (targetArray && targetArray.length === 0 && recipeMeta?.method) {
            targetArray.push(...recipeMeta.method);
        }

        return targetArray;
    }, []);

    const mutateTaskAt = useCallback(async (recipe, taskType, index, action, value = '') => {
        setBoardRecords((prev) => prev.map((record) => {
            if (record.id !== recipe.id && record.dish_name !== recipe.dish_name) return record;
            const { root, envelope } = getMutableBoardData(record.data, recipe);
            const targetArray = getTaskArray(root, taskType, recipe.meta);
            if (!targetArray) return record;

            if (action === 'update' && targetArray[index] !== undefined) {
                if (typeof targetArray[index] === 'string') targetArray[index] = value;
                else targetArray[index] = { ...targetArray[index], label: value };
            }

            if (action === 'delete' && targetArray[index] !== undefined) {
                targetArray.splice(index, 1);
            }

            if (action === 'append') {
                targetArray.push(value);
            }

            return { ...record, data: envelope };
        }));

        const currentRecord = boardRecords.find((record) => record.id === recipe.id || record.dish_name === recipe.dish_name);
        if (!currentRecord) return;

        const { root, envelope } = getMutableBoardData(currentRecord.data, recipe);
        const targetArray = getTaskArray(root, taskType, recipe.meta);
        if (!targetArray) return;

        if (action === 'update' && targetArray[index] !== undefined) {
            if (typeof targetArray[index] === 'string') targetArray[index] = value;
            else targetArray[index] = { ...targetArray[index], label: value };
        }

        if (action === 'delete' && targetArray[index] !== undefined) {
            targetArray.splice(index, 1);
        }

        if (action === 'append') {
            targetArray.push(value);
        }

        await supabase
            .from('sop_board_tasks')
            .upsert({
                dish_name: recipe.dish_name,
                tasks_json: envelope,
                client_id: clientId
            }, { onConflict: 'dish_name,client_id' });
    }, [boardRecords, clientId, getMutableBoardData, getTaskArray]);

    const startEditingBox = useCallback((boxKey, tasks) => {
        const nextDrafts = {};
        tasks.forEach((task, idx) => {
            const taskType = typeof task === 'string' ? boxKey : (task.taskType || boxKey);
            const sourceIndex = typeof task === 'string' ? idx : (task.sourceIndex ?? idx);
            const draftKey = `${boxKey}-${taskType}-${sourceIndex}`;
            nextDrafts[draftKey] = typeof task === 'string' ? task : (task.label || '');
        });
        setEditingBoxKey(boxKey);
        setEditingTaskDrafts(nextDrafts);
    }, []);

    const cancelEditingBox = useCallback(() => {
        setEditingBoxKey(null);
        setEditingTaskDrafts({});
    }, []);

    const saveEditingBox = useCallback(async (recipe, boxKey, tasks) => {
        for (let idx = 0; idx < tasks.length; idx += 1) {
            const task = tasks[idx];
            const label = typeof task === 'string' ? task : (task.label || '');
            const taskType = typeof task === 'string' ? boxKey : (task.taskType || boxKey);
            const sourceIndex = typeof task === 'string' ? idx : (task.sourceIndex ?? idx);
            const draftKey = `${boxKey}-${taskType}-${sourceIndex}`;
            const nextLabel = (editingTaskDrafts[draftKey] ?? label).trim();
            if (nextLabel && nextLabel !== label) {
                await mutateTaskAt(recipe, taskType, sourceIndex, 'update', nextLabel);
            }
        }
        cancelEditingBox();
    }, [cancelEditingBox, editingTaskDrafts, mutateTaskAt]);

    const deleteTask = useCallback(async (recipe, taskType, index, boxKey = null) => {
        await mutateTaskAt(recipe, taskType, index, 'delete');
        if (boxKey) {
            setEditingTaskDrafts((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((key) => {
                    if (key.includes(`${boxKey}-${taskType}-${index}`)) delete next[key];
                });
                return next;
            });
        }
    }, [mutateTaskAt]);

    // ── Render Helpers ────────────────────────────────────────────────────────
    const getWeeklyTasks = (data, meta) => {
        if (Array.isArray(data?.weekly) && data.weekly.length > 0) return mapTaskItems(data.weekly, 'weekly');
        if (data?.weekly?.batch?.length > 0 || data?.weekly?.buffer?.length > 0) {
            return [
                ...mapTaskItems(data.weekly.batch || [], 'weekly_batch'),
                ...mapTaskItems(data.weekly.buffer || [], 'weekly_buffer')
            ];
        }
        // Fallback: If it's a foundational prep, use the recipe method
        return [];
    };

    const getMorningTasks = (data, meta) => {
        if (Array.isArray(data?.morning) && data.morning.length > 0) return mapTaskItems(data.morning, 'morning');
        if (data?.morning?.tasks?.length > 0) return mapTaskItems(data.morning.tasks, 'morning_tasks');
        // Fallback: Use recipe method if weekly didn't claim it
        return [];
    };

    const getForwardTasks = (data) => Array.isArray(data?.morning) ? [] : mapTaskItems(data?.morning?.forward || [], 'forward');

    const getServiceTasks = (data, meta) => {
        if (Array.isArray(data?.service) && data.service.length > 0) return mapTaskItems(data.service, 'service');
        if (
            data?.service?.setup?.length > 0 ||
            data?.service?.garnish?.length > 0 ||
            data?.service?.prep?.length > 0 ||
            data?.pre_service?.length > 0
        ) {
            return [
                ...mapTaskItems(data.service?.prep || [], 'service_prep'),
                ...mapTaskItems(data.service?.setup || [], 'service_setup'),
                ...mapTaskItems(data.service?.garnish || [], 'service_garnish'),
                ...mapTaskItems(data.pre_service || [], 'pre_service')
            ];
        }
        return [];
    };

    const filteredRecords = useMemo(() => {
        return boardRecords.filter(r => {
            const isVisible =
            (productionTargets[r.id] || productionTargets[r.meta?.id]) > 0 ||
            r.meta?.show_on_board ||
            r.hasTasks;
            if (!isVisible) return false;
            return true;
        });
    }, [boardRecords, productionTargets]);

    const stats = useMemo(() => {
        let total = 0, done = 0;
        filteredRecords.forEach(r => {
            const p = r.data || {};
            const resolved = getBoardData(r);
            total += getWeeklyTasks(resolved, r.meta).length + getMorningTasks(resolved, r.meta).length + getForwardTasks(resolved).length + getServiceTasks(resolved, r.meta).length;
            Object.keys(checkedTasks).forEach(key => { if (key.startsWith(`${r.id}-`) && checkedTasks[key]) done++; });
        });
        return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
    }, [filteredRecords, checkedTasks, getBoardData]);

    const renderSmartTooling = (recipe) => {
        const yieldVal = productionTargets[recipe.id] || productionTargets[recipe.meta?.id] || 0;
        if (yieldVal === 0) return null;
        return (
            <div className="tooling-box">
                <div className="tooling-title"><Utensils size={10} className="mr-1" /> RECOMMENDED TOOLS:</div>
                <div className="tooling-items">
                    <span className="tool-pill">Standard Mixing Bowl</span>
                </div>
            </div>
        );
    };

    const getEstimatedMinutes = useCallback((recipe) => {
        const generatedMinutes = Number(
            recipe?.data?.generated_prep?.estimated_minutes ||
            recipe?.meta?.scalingTips?.prepMinutes ||
            recipe?.meta?.scaling_tips?.prepMinutes ||
            0
        );
        return Number.isFinite(generatedMinutes) && generatedMinutes > 0 ? generatedMinutes : 0;
    }, []);

    const exportColumns = useMemo(() => ([
        { key: 'weekly', label: 'Foundation Prep' },
        { key: 'daily', label: 'Daily Prep' },
        { key: 'service', label: 'Service Prep' }
    ]), []);

    const getColumnPayload = useCallback((columnKey) => {
        return filteredRecords.reduce((acc, recipe) => {
            const resolved = getBoardData(recipe);
            if (columnKey === 'weekly') {
                const tasks = getWeeklyTasks(resolved, recipe.meta);
                if (tasks.length > 0) {
                    acc.push({
                        recipe,
                        sections: [{ title: 'Long-Life Prep', tasks }]
                    });
                }
                return acc;
            }

            if (columnKey === 'daily') {
                const tasks = getMorningTasks(resolved, recipe.meta);
                const forwardTasks = getForwardTasks(resolved);
                if (tasks.length > 0 || forwardTasks.length > 0) {
                    const sections = [];
                    if (tasks.length > 0) sections.push({ title: 'Morning Prep', tasks });
                    if (forwardTasks.length > 0) sections.push({ title: 'Afternoon Prep', tasks: forwardTasks });
                    acc.push({ recipe, sections });
                }
                return acc;
            }

            if (columnKey === 'service') {
                const tasks = getServiceTasks(resolved, recipe.meta);
                if (tasks.length > 0) {
                    acc.push({
                        recipe,
                        sections: [{ title: 'Before Service', tasks }]
                    });
                }
            }

            return acc;
        }, []);
    }, [filteredRecords, getBoardData]);

    const escapeCsv = useCallback((value) => {
        const text = String(value ?? '');
        if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
        return text;
    }, []);

    const escapeHtml = useCallback((value) => (
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    ), []);

    const downloadFile = useCallback((filename, content, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    const downloadColumnCsv = useCallback((columnKey, label) => {
        const payload = getColumnPayload(columnKey);
        let csv = 'COLUMN,RECIPE,SECTION,TASK\n';
        payload.forEach(({ recipe, sections }) => {
            sections.forEach((section) => {
                section.tasks.forEach((task) => {
                    const taskLabel = typeof task === 'string' ? task : (task.label || '');
                    csv += [
                        escapeCsv(label),
                        escapeCsv(recipe.dish_name),
                        escapeCsv(section.title),
                        escapeCsv(taskLabel)
                    ].join(',') + '\n';
                });
            });
        });
        downloadFile(`${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-plan.csv`, csv, 'text/csv;charset=utf-8');
    }, [downloadFile, escapeCsv, getColumnPayload]);

    const downloadSelectedCsv = useCallback((columns, filename = 'kitchen-board-plan.csv') => {
        let csv = 'COLUMN,RECIPE,SECTION,TASK\n';
        columns.forEach(({ key: columnKey, label }) => {
            const payload = getColumnPayload(columnKey);
            payload.forEach(({ recipe, sections }) => {
                sections.forEach((section) => {
                    section.tasks.forEach((task) => {
                        const taskLabel = typeof task === 'string' ? task : (task.label || '');
                        csv += [
                            escapeCsv(label),
                            escapeCsv(recipe.dish_name),
                            escapeCsv(section.title),
                            escapeCsv(taskLabel)
                        ].join(',') + '\n';
                    });
                });
            });
        });
        downloadFile(filename, csv, 'text/csv;charset=utf-8');
    }, [downloadFile, escapeCsv, getColumnPayload]);

    const openPrintView = useCallback((title, columns, layout = 'horizontal') => {
        const printWindow = window.open('', '_blank', 'width=1200,height=900');
        if (!printWindow) return;
        const isSingleColumn = columns.length === 1;
        const singleColumnGridClass = layout === 'vertical' ? 'column-sheet-grid-vertical' : 'column-sheet-grid-horizontal';

        const renderedColumns = columns.map(({ label, payload }) => {
            const blocks = payload.map(({ recipe, sections }) => {
                const sectionHtml = sections.map((section) => {
                    const taskItems = section.tasks.map((task) => {
                        const taskLabel = typeof task === 'string' ? task : (task.label || '');
                        return `<li>${escapeHtml(taskLabel)}</li>`;
                    }).join('');
                    return `
                      <div class="section-block">
                        <div class="section-title">${escapeHtml(section.title)}</div>
                        <ul>${taskItems}</ul>
                      </div>
                    `;
                }).join('');

                return `
                  <article class="recipe-card">
                    <div class="recipe-head">
                      <h3>${escapeHtml(recipe.dish_name)}</h3>
                    </div>
                    ${sectionHtml}
                  </article>
                `;
            }).join('');

            return `
              <section class="column-sheet">
                <div class="column-title">${escapeHtml(label)}</div>
                <div class="${isSingleColumn ? singleColumnGridClass : ''}">
                  ${blocks || '<div class="empty-state">No tasks in this section.</div>'}
                </div>
              </section>
            `;
        }).join('');

        printWindow.document.open();
        printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 ${layout === 'horizontal' ? 'landscape' : 'portrait'}; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #111827; background: #fff; }
      .page { width: 100%; padding: 0; margin: 0; }
      .page-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding: 0 0 8px 0; margin: 0 0 10px 0; break-inside: avoid; page-break-inside: avoid; }
      .page-header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.08em; }
      .page-header .subtitle { font-size: 11px; color: #4b5563; text-transform: uppercase; }
      .columns-full { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: start; }
      .columns-single { display: block; }
      .column-sheet { border: 1px solid #d1d5db; padding: 8px; break-inside: avoid-page; page-break-inside: avoid; }
      .column-title { font-size: 13px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #111827; padding-bottom: 4px; margin-bottom: 8px; }
      .recipe-card { border: 1px solid #e5e7eb; padding: 8px; margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; }
      .columns-single .column-sheet { border: none; padding: 0; }
      .columns-single .column-title { margin-bottom: 10px; }
      .column-sheet-grid-horizontal { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; align-items: start; }
      .column-sheet-grid-vertical { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-items: start; }
      .columns-single .recipe-card { margin-bottom: 0; min-height: 100%; }
      .recipe-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
      .recipe-head h3 { margin: 0; font-size: 12px; text-transform: uppercase; line-height: 1.2; }
      .section-block { margin-bottom: 6px; }
      .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 3px; }
      ul { margin: 0; padding-left: 16px; }
      li { font-size: 10px; line-height: 1.35; margin-bottom: 2px; }
      .empty-state { font-size: 11px; color: #6b7280; }
      @media (max-width: 1200px) {
        .column-sheet-grid-horizontal { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .column-sheet-grid-vertical { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media print {
        html, body { margin: 0; padding: 0; }
        .page { page-break-after: auto; }
        .column-sheet { min-height: auto; }
        .column-sheet-grid-horizontal { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .column-sheet-grid-vertical { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <div class="subtitle">Kitchen board export | Print on A4 or save as PDF</div>
        </div>
        <div class="subtitle">${escapeHtml(new Date().toLocaleDateString())}</div>
      </div>
      <div class="${columns.length > 1 ? 'columns-full' : 'columns-single'}">
        ${renderedColumns}
      </div>
    </div>
    <script>
      window.addEventListener('load', function () {
        const triggerPrint = function () {
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 800);
            });
          });
        };
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(triggerPrint).catch(triggerPrint);
        } else {
          triggerPrint();
        }
      });
    </script>
  </body>
</html>`);
        printWindow.document.close();
    }, [escapeHtml]);

    const printColumnPlan = useCallback((columnKey, label) => {
        openPrintView(`${label} Plan`, [{ label, payload: getColumnPayload(columnKey) }], exportLayout);
    }, [exportLayout, getColumnPayload, openPrintView]);

    const printSelectedPlan = useCallback((title, columns) => {
        openPrintView(title, columns.map(({ key, label }) => ({
            label,
            payload: getColumnPayload(key)
        })), exportLayout);
    }, [exportLayout, getColumnPayload, openPrintView]);

    const handleExport = useCallback(() => {
        const selectedColumns = exportColumns.filter(({ key }) => exportScopes.includes(key));
        if (selectedColumns.length === 0) return;

        if (selectedColumns.length === exportColumns.length) {
            if (exportFormat === 'csv') downloadSelectedCsv(selectedColumns, 'kitchen-board-full-plan.csv');
            else printSelectedPlan('Kitchen Full Prep Plan', selectedColumns);
            setExportMenuOpen(false);
            return;
        }

        const title = selectedColumns.map(({ label }) => label).join(' + ');
        const filename = `${selectedColumns.map(({ label }) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('-')}-plan.csv`;
        if (exportFormat === 'csv') downloadSelectedCsv(selectedColumns, filename);
        else printSelectedPlan(`${title} Plan`, selectedColumns);
        setExportMenuOpen(false);
    }, [
        downloadSelectedCsv,
        exportColumns,
        exportFormat,
        exportScopes,
        printSelectedPlan
    ]);

    const toggleExportScope = useCallback((scopeKey) => {
        setExportScopes((prev) => (
            prev.includes(scopeKey)
                ? prev.filter((key) => key !== scopeKey)
                : [...prev, scopeKey]
        ));
    }, []);

    const allExportScopesSelected = exportScopes.length === exportColumns.length;
    const isColumnVisible = useCallback((columnKey) => !expandedColumn || expandedColumn === columnKey, [expandedColumn]);

    const generateRecipePrep = useCallback(async (recipe) => {
        const scaleFactor = getScaleFactor(recipe);
        const targetWeight = estimateRecipeWeight(recipe.meta || {}, scaleFactor);
        const draft = buildChefPrepDraft(recipe.meta || {}, scaleFactor, targetWeight);
        const existingWeekly = Array.isArray(recipe.data?.weekly)
            ? { batch: [...recipe.data.weekly], buffer: [] }
            : { ...(recipe.data?.weekly || {}) };
        const existingMorning = Array.isArray(recipe.data?.morning)
            ? { tasks: [...recipe.data.morning], forward: [] }
            : { ...(recipe.data?.morning || {}) };
        const existingService = Array.isArray(recipe.data?.service)
            ? { prep: [...recipe.data.service], setup: [], garnish: [] }
            : { ...(recipe.data?.service || {}) };

        const nextTasksJson = {
            ...(recipe.data && typeof recipe.data === 'object' ? recipe.data : {}),
            weekly: {
                ...existingWeekly,
                batch: draft.boardBuckets?.weekly?.batch || [],
                buffer: draft.boardBuckets?.weekly?.buffer || existingWeekly.buffer || []
            },
            morning: {
                ...existingMorning,
                tasks: draft.boardBuckets?.morning?.tasks || [],
                forward: draft.boardBuckets?.morning?.forward || []
            },
            service: {
                ...existingService,
                prep: draft.boardBuckets?.service?.prep || [],
                setup: draft.boardBuckets?.service?.setup || [],
                garnish: draft.boardBuckets?.service?.garnish || []
            },
            generated_prep: {
                steps: draft.steps,
                regular: draft.regular,
                largeScale: draft.largeScale,
                estimated_minutes: draft.estimatedMinutes,
                time_profile: draft.timeProfile
            }
        };

        const nextScalingTips = {
            ...(recipe.meta?.scalingTips || recipe.meta?.scaling_tips || {}),
            regular: draft.regular,
            largeScale: draft.largeScale,
            prepMinutes: draft.estimatedMinutes,
            prepTimeProfile: draft.timeProfile,
            generatedPrep: draft
        };

        const { error: recipeError } = await supabase
            .from('sop_recipes')
            .update({
                method: draft.steps,
                scaling_tips: nextScalingTips
            })
            .eq('client_id', clientId)
            .eq('recipe_id', recipe.meta?.id || recipe.id);

        if (recipeError) {
            window.alert(`Prep generation failed: ${recipeError.message}`);
            return;
        }

        const { error: boardError } = await supabase
            .from('sop_board_tasks')
            .upsert({
                dish_name: recipe.dish_name,
                tasks_json: nextTasksJson,
                client_id: clientId
            }, { onConflict: 'dish_name,client_id' });

        if (boardError) {
            window.alert(`Board sync failed: ${boardError.message}`);
            return;
        }

        setBoardRecords((prev) => prev.map((record) => (
            record.id === recipe.id || record.dish_name === recipe.dish_name
                ? {
                    ...record,
                    data: nextTasksJson,
                    hasTasks: true,
                    meta: {
                        ...record.meta,
                        method: draft.steps,
                        scalingTips: nextScalingTips
                    }
                }
                : record
        )));

        if (typeof onRecipeMethodSync === 'function') {
            onRecipeMethodSync(recipe.meta?.id || recipe.id, {
                method: draft.steps,
                scalingTips: nextScalingTips
            });
        }
    }, [clientId, getScaleFactor, onRecipeMethodSync]);

    const renderGroupedTasks = (recipe, boxKey, tasks, isForward = false) => {
        if (!tasks || tasks.length === 0) return null;

        return (
            <div className="task-group">
                {tasks.map((t, idx) => {
                    const label = typeof t === 'string' ? t : (t.label || '');
                    const taskType = typeof t === 'string' ? boxKey : (t.taskType || boxKey);
                    const sourceIndex = typeof t === 'string' ? idx : (t.sourceIndex ?? idx);
                    const taskKey = `${boxKey}-${taskType}-${sourceIndex}`;
                    const checkKey = `${recipe.id}-${taskType}-${sourceIndex}`;
                    const isChecked = checkedTasks[checkKey];
                    const isEditing = editingBoxKey === boxKey;
                    const displayValue = isEditing ? (editingTaskDrafts[taskKey] ?? label) : label;
                    return (
                        <div key={taskKey} className={`task-row group ${isChecked ? 'checked' : ''}`} onClick={() => toggleTask(checkKey)}>
                            <div className="check-box">
                                {isChecked && <CheckCircle2 size={12} />}
                            </div>
                            <div className="task-content">
                                {isEditing ? (
                                    <input
                                        className={`task-input ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-100'}`}
                                        value={displayValue}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setEditingTaskDrafts((prev) => ({ ...prev, [taskKey]: e.target.value }))}
                                    />
                                ) : (
                                    <div className={`task-label ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{displayValue}</div>
                                )}
                                {isForward && <span className="fwd-tag shrink-0">TOMORROW</span>}
                            </div>
                            {isEditing && (
                                <div className="task-actions" onClick={(e) => e.stopPropagation()}>
                                    <button className="task-icon-button task-icon-button-danger" onClick={() => deleteTask(recipe, taskType, sourceIndex, boxKey)}><Trash2 size={13} /></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500">
            <RotateCcw className="animate-spin mb-4" size={32} />
            <p className="uppercase tracking-widest text-xs font-black">Syncing Kitchen State...</p>
        </div>
    );

    return (
        <div className="command-board-wrapper">
            <style>{`
                .command-board-wrapper { background-color: var(--bg); font-family: 'Inter', sans-serif; height: calc(100vh - 120px); display: flex; flex-direction: column; overflow: hidden; width: 100%; box-sizing: border-box; }
                .board-header { width: 100%; max-width: 1180px; margin: 0 auto; padding: 15px 20px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; }
                .dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; padding: 15px 0; flex: 1; min-height: 0; width: 100%; max-width: 1180px; margin: 0 auto; overflow: hidden; box-sizing: border-box; }
                .dashboard-grid.focused-grid { grid-template-columns: minmax(0, 1fr); }
                .dashboard-grid, .col-content { scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
                .dashboard-grid::-webkit-scrollbar, .col-content::-webkit-scrollbar { width: 4px; height: 4px; }
                .dashboard-grid::-webkit-scrollbar-track, .col-content::-webkit-scrollbar-track { background: transparent; }
                .dashboard-grid::-webkit-scrollbar-thumb, .col-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
                .dashboard-grid::-webkit-scrollbar-thumb:hover, .col-content::-webkit-scrollbar-thumb:hover { background: var(--muted); }
                .board-column { background: var(--surface-low); border: 1px solid var(--border); display: flex; flex-direction: column; border-radius: 8px; overflow: hidden; min-width: 0; }
                .board-column.focused-column { min-height: 100%; }
                .col-header { padding: 15px; background: var(--surface); border-bottom: 2px solid var(--border); display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
                .col-title-stack { display: flex; flex-direction: column; gap: 3px; }
                .col-title-main { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 900; text-transform: uppercase; }
                .col-title-sub { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); }
                .col-header-actions { display: flex; align-items: center; gap: 8px; }
                .col-content { flex: 1; overflow-y: auto; padding: 15px; min-width: 0; }
                .col-content.focused-content { display: flex; flex-wrap: wrap; align-content: flex-start; align-items: flex-start; gap: 16px; overflow-x: hidden; overflow-y: auto; }
                .recipe-box { margin-bottom: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 15px; min-width: 0; }
                .focused-content .recipe-box { margin-bottom: 0; min-height: 100%; flex: 0 0 calc((100% - 48px) / 4); max-width: calc((100% - 48px) / 4); border-width: 1px; overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 16px 30px rgba(0,0,0,0.24); box-sizing: border-box; }
                .recipe-box.active-box { border-left: 6px solid var(--app-accent); }
                .recipe-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed var(--border); padding-bottom: 8px; gap: 10px; }
                .focused-content .recipe-header { align-items: stretch; flex-direction: column; }
                .recipe-header > div { min-width: 0; }
                .focused-content .recipe-header > div:first-child { display: flex; flex-wrap: wrap; row-gap: 6px; column-gap: 8px; }
                .focused-content .recipe-header > div:last-child { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
                .recipe-name { font-size: 14px; font-weight: 900; text-transform: uppercase; color: var(--text); line-height: 1.2; }
                .focused-content .recipe-name { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .recipe-scale-flag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; border-radius: 999px; border: 1px solid rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.08); color: #f59e0b; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0; }
                .recipe-target { font-size: 10px; font-weight: 900; color: var(--app-accent); }
                .task-row { padding: 10px; background: var(--bg); border: 1px solid var(--border); margin-bottom: 4px; border-radius: 6px; display: flex; align-items: flex-start; gap: 10px; cursor: pointer; transition: all 0.2s; }
                .task-row:hover { border-color: var(--app-accent); transform: translateX(4px); }
                .task-row.checked { opacity: 0.4; background: transparent; }
                .check-box { width: 16px; height: 16px; border: 2px solid var(--border); border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .checked .check-box { background: var(--app-accent); border-color: var(--app-accent); color: var(--bg); }
                .task-content { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
                .task-label { flex: 1; font-size: 11px; font-weight: 700; text-transform: uppercase; line-height: 1.35; }
                .task-input { width: 100%; min-width: 0; border: 1px solid var(--border); background: rgba(24, 24, 27, 0.9); border-radius: 8px; padding: 6px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; outline: none; }
                .task-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
                .task-icon-button { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid var(--border); background: rgba(24, 24, 27, 0.9); color: var(--muted); transition: all 0.2s; }
                .task-icon-button:hover { color: var(--text); border-color: var(--app-accent); }
                .task-icon-button-save { color: var(--app-accent); }
                .task-icon-button-danger { color: #f87171; }
                .column-focus-button { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid var(--border); background: rgba(24, 24, 27, 0.9); color: var(--muted); transition: all 0.2s; }
                .column-focus-button:hover { color: var(--text); border-color: var(--app-accent); }
                .section-note { margin: 10px 0 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
                .focused-content .task-row { min-height: 48px; margin-bottom: 6px; }
                .focused-content .task-row:hover { transform: none; }
                @media (max-width: 1500px) {
                    .focused-content .recipe-box { flex-basis: calc((100% - 32px) / 3); max-width: calc((100% - 32px) / 3); }
                }
                @media (max-width: 1180px) {
                    .focused-content .recipe-box { flex-basis: calc((100% - 16px) / 2); max-width: calc((100% - 16px) / 2); }
                }
                @media (max-width: 860px) {
                    .focused-content .recipe-box { flex-basis: 100%; max-width: 100%; }
                }
                .progress-hud { display: flex; align-items: center; gap: 20px; }
                .bar-container { width: 100px; height: 8px; background: var(--border); border-radius: 100px; overflow: hidden; }
                .bar-fill { height: 100%; background: var(--app-accent); transition: width 0.3s ease; }
                @media (max-width: 980px) {
                    .board-header { max-width: 100%; padding: 12px 14px; }
                    .dashboard-grid { max-width: 100%; padding: 12px 0; }
                }
            `}</style>

            <div className="board-header">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
                        <button
                            className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'board' ? 'bg-app-accent text-app-bg' : 'text-zinc-400 hover:text-zinc-100'}`}
                            onClick={() => {
                                setActiveView('board');
                                setExportMenuOpen(false);
                            }}
                        >
                            Kitchen Board
                        </button>
                        <button
                            className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'weekly' ? 'bg-app-accent text-app-bg' : 'text-zinc-400 hover:text-zinc-100'}`}
                            onClick={() => {
                                setActiveView('weekly');
                                setExportMenuOpen(false);
                            }}
                        >
                            Weekly Schedule
                        </button>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-app-muted">
                        {activeView === 'weekly' ? 'Weekly Prep Planner + History' : 'Kitchen Task Board'}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {activeView === 'board' ? (
                        <>
                            <div className="progress-hud">
                                <div className="flex flex-col items-end">
                                    <div className="text-[10px] font-black mb-1 opacity-50 tracking-widest">KITCHEN READINESS: {stats.percent}%</div>
                                    <div className="bar-container bg-zinc-800"><div className="bar-fill" style={{ width: `${stats.percent}%` }}></div></div>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-zinc-800"></div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        className="px-4 py-2 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-black uppercase rounded-xl transition-all"
                                        onClick={() => setExportMenuOpen((prev) => !prev)}
                                    >
                                        {exportFormat === 'csv' ? <Download size={14} className="inline mr-2 opacity-50" /> : <Printer size={14} className="inline mr-2 opacity-50" />}
                                        Export
                                    </button>
                                    {exportMenuOpen && (
                                        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Download Plan</div>
                                            <div className="mt-4">
                                                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Format</div>
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    {['pdf', 'csv'].map((format) => (
                                                        <button
                                                            key={format}
                                                            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition-all ${
                                                                exportFormat === format
                                                                    ? 'border-app-accent bg-app-accent/15 text-app-accent'
                                                                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                                                            }`}
                                                            onClick={() => setExportFormat(format)}
                                                        >
                                                            {format}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {exportFormat === 'pdf' && (
                                                <div className="mt-4">
                                                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Layout</div>
                                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                                        {['horizontal', 'vertical'].map((layout) => (
                                                            <button
                                                                key={layout}
                                                                className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase transition-all ${
                                                                    exportLayout === layout
                                                                        ? 'border-app-accent bg-app-accent/15 text-app-accent'
                                                                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                                                                }`}
                                                                onClick={() => setExportLayout(layout)}
                                                            >
                                                                {layout}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-4">
                                                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">Tables</div>
                                                <div className="mt-2 space-y-2">
                                                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-black uppercase text-zinc-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={allExportScopesSelected}
                                                            onChange={() => setExportScopes(allExportScopesSelected ? [] : exportColumns.map(({ key }) => key))}
                                                            className="h-4 w-4 accent-[var(--app-accent)]"
                                                        />
                                                        All Tables
                                                    </label>
                                                    {exportColumns.map(({ key, label }) => (
                                                        <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[10px] font-black uppercase text-zinc-200">
                                                            <input
                                                                type="checkbox"
                                                                checked={exportScopes.includes(key)}
                                                                onChange={() => toggleExportScope(key)}
                                                                className="h-4 w-4 accent-[var(--app-accent)]"
                                                            />
                                                            {label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <button
                                                    className="flex-1 rounded-xl border border-zinc-800 px-3 py-2 text-[10px] font-black uppercase text-zinc-300 transition-all hover:bg-zinc-900"
                                                    onClick={() => setExportMenuOpen(false)}
                                                >
                                                    Close
                                                </button>
                                                <button
                                                    className="flex-1 rounded-xl border border-app-accent bg-app-accent/15 px-3 py-2 text-[10px] font-black uppercase text-app-accent transition-all hover:bg-app-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                                                    onClick={handleExport}
                                                    disabled={exportScopes.length === 0}
                                                >
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button className="px-5 py-2 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-black uppercase rounded-xl transition-all" onClick={resetBoard}><RotateCcw size={14} className="inline mr-2 opacity-50" /> RESET BOARD</button>
                            </div>
                        </>
                    ) : (
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Reuse live board recipes, assign days, edit tasks globally
                        </div>
                    )}
                </div>
            </div>

            {activeView === 'weekly' ? (
                <WeeklyScheduleBoard
                    clientId={clientId}
                    boardRecords={boardRecords}
                    filteredRecords={filteredRecords}
                    productionTargets={productionTargets}
                    portionTargets={portionTargets}
                    canEdit={canEdit}
                    translateIngredient={translateIngredient}
                    getBoardData={getBoardData}
                    getWeeklyTasks={getWeeklyTasks}
                    mutateTaskAt={mutateTaskAt}
                />
            ) : filteredRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-app-muted bg-app-surface border border-dashed border-app-border rounded-xl m-10">
                    <ClipboardCheck size={48} className="opacity-20 mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px]">No active recipes for this board</p>
                    <button onClick={onExit} className="mt-4 text-[10px] font-black text-app-accent hover:underline">Pick Recipes in Scaler View</button>
                </div>
            ) : (
                <div className={`dashboard-grid ${expandedColumn ? 'focused-grid' : ''}`}>
                        <>
                            {isColumnVisible('weekly') && (
                            <div className={`board-column ${expandedColumn === 'weekly' ? 'focused-column' : ''}`} style={{ borderTop: '4px solid #3b82f6' }}>
                                <div className="col-header">
                                    <div className="col-title-stack">
                                        <div className="col-title-main"><ChefHat size={16} className="text-blue-400" /> Foundation Prep</div>
                                        <div className="col-title-sub">Long-life prep only</div>
                                    </div>
                                    <div className="col-header-actions">
                                        <button className="column-focus-button" onClick={() => setExpandedColumn(expandedColumn === 'weekly' ? null : 'weekly')}>
                                            {expandedColumn === 'weekly' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div className={`col-content ${expandedColumn === 'weekly' ? 'focused-content' : ''}`}>
                                    {filteredRecords.map(r => {
                                        const resolved = getBoardData(r);
                                        const tasks = getWeeklyTasks(resolved, r.meta);
                                        if (tasks.length === 0) {
                                            if (!canEdit) return null;
                                            return (
                                                <div data-testid={`board-card-weekly-${r.id}`} key={r.id} className="recipe-box hover:border-blue-500/30 transition-all">
                                                    <div className="recipe-header">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <span className="recipe-name text-blue-400">{translateIngredient(r.dish_name)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/40 p-3 text-[10px] text-zinc-400">
                                                        No prep summary saved yet.
                                                        <button
                                                            type="button"
                                                            onClick={() => generateRecipePrep(r)}
                                                            className="mt-3 inline-flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-300 hover:bg-blue-500 hover:text-white transition-colors"
                                                        >
                                                            <Zap size={12} />
                                                            Generate Prep
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        const boxKey = `${r.id}-weekly-box`;
                                        const isEditingBox = editingBoxKey === boxKey;
                                        return (
                                            <div data-testid={`board-card-weekly-${r.id}`} key={r.id} className="recipe-box hover:border-blue-500/30 transition-all">
                                                <div className="recipe-header">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className="recipe-name text-blue-400">{translateIngredient(r.dish_name)}</span>
                                                        {getEstimatedMinutes(r) > 0 && (
                                                            <span className="recipe-scale-flag">{getEstimatedMinutes(r)} min</span>
                                                        )}
                                                        {getScheduleProfile(r) === 'high_volume' && (
                                                            <span data-testid={`board-scale-flag-${r.id}`} className="recipe-scale-flag"><ArrowUp size={11} /> Large</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {canEdit && (
                                                            <button
                                                                type="button"
                                                                className="task-icon-button"
                                                                onClick={() => generateRecipePrep(r)}
                                                                title="Generate prep summary"
                                                            >
                                                                <Zap size={13} />
                                                            </button>
                                                        )}
                                                        {canEdit && (
                                                            isEditingBox ? (
                                                                <>
                                                                    <button className="task-icon-button task-icon-button-save" onClick={() => saveEditingBox(r, boxKey, tasks)}><Check size={13} /></button>
                                                                    <button className="task-icon-button" onClick={cancelEditingBox}><X size={13} /></button>
                                                                </>
                                                            ) : (
                                                                <button className="task-icon-button" onClick={() => startEditingBox(boxKey, tasks)}><Pencil size={13} /></button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                {renderGroupedTasks(r, boxKey, tasks)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            )}
                            {isColumnVisible('daily') && (
                            <div className={`board-column ${expandedColumn === 'daily' ? 'focused-column' : ''}`} style={{ borderTop: '4px solid #f59e0b' }}>
                                <div className="col-header">
                                    <div className="col-title-stack">
                                        <div className="col-title-main"><Timer size={16} className="text-amber-500" /> Daily Prep</div>
                                        <div className="col-title-sub">Today&apos;s production</div>
                                    </div>
                                    <div className="col-header-actions">
                                        <button className="column-focus-button" onClick={() => setExpandedColumn(expandedColumn === 'daily' ? null : 'daily')}>
                                            {expandedColumn === 'daily' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div className={`col-content ${expandedColumn === 'daily' ? 'focused-content' : ''}`}>
                                    {filteredRecords.map(r => {
                                        const resolved = getBoardData(r);
                                        const tasks = getMorningTasks(resolved, r.meta);
                                        const forwardTasks = getForwardTasks(resolved);
                                        if (tasks.length === 0 && forwardTasks.length === 0) return null;
                                        const boxKey = `${r.id}-daily-box`;
                                        const isEditingBox = editingBoxKey === boxKey;
                                        return (
                                            <div data-testid={`board-card-daily-${r.id}`} key={r.id} className="recipe-box active-box border-amber-500/20">
                                                <div className="recipe-header">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className="recipe-name text-amber-500">{translateIngredient(r.dish_name)}</span>
                                                        {getEstimatedMinutes(r) > 0 && (
                                                            <span className="recipe-scale-flag">{getEstimatedMinutes(r)} min</span>
                                                        )}
                                                        {getScheduleProfile(r) === 'high_volume' && (
                                                            <span data-testid={`board-scale-flag-${r.id}`} className="recipe-scale-flag"><ArrowUp size={11} /> Large</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {canEdit && (
                                                            isEditingBox ? (
                                                                <>
                                                                    <button className="task-icon-button task-icon-button-save" onClick={() => saveEditingBox(r, boxKey, [...tasks, ...forwardTasks])}><Check size={13} /></button>
                                                                    <button className="task-icon-button" onClick={cancelEditingBox}><X size={13} /></button>
                                                                </>
                                                            ) : (
                                                                <button className="task-icon-button" onClick={() => startEditingBox(boxKey, [...tasks, ...forwardTasks])}><Pencil size={13} /></button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                {renderGroupedTasks(r, boxKey, tasks)}
                                                {forwardTasks.length > 0 && (
                                                    <>
                                                        <div className="section-note">Afternoon Prep</div>
                                                        {renderGroupedTasks(r, boxKey, forwardTasks, true)}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            )}
                            {isColumnVisible('service') && (
                            <div className={`board-column ${expandedColumn === 'service' ? 'focused-column' : ''}`} style={{ borderTop: '4px solid #10b981' }}>
                                <div className="col-header">
                                    <div className="col-title-stack">
                                        <div className="col-title-main"><Zap size={16} className="text-emerald-500" /> Service Prep</div>
                                        <div className="col-title-sub">Just before service</div>
                                    </div>
                                    <div className="col-header-actions">
                                        <button className="column-focus-button" onClick={() => setExpandedColumn(expandedColumn === 'service' ? null : 'service')}>
                                            {expandedColumn === 'service' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div className={`col-content ${expandedColumn === 'service' ? 'focused-content' : ''}`}>
                                    {filteredRecords.map(r => {
                                        const resolved = getBoardData(r);
                                        const tasks = getServiceTasks(resolved, r.meta);
                                        if (tasks.length === 0) return null;
                                        const boxKey = `${r.id}-service-box`;
                                        const isEditingBox = editingBoxKey === boxKey;
                                        return (
                                            <div data-testid={`board-card-service-${r.id}`} key={r.id} className="recipe-box hover:border-emerald-500/30 transition-all">
                                                <div className="recipe-header">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <span className="recipe-name text-emerald-500">{translateIngredient(r.dish_name)}</span>
                                                        {getEstimatedMinutes(r) > 0 && (
                                                            <span className="recipe-scale-flag">{getEstimatedMinutes(r)} min</span>
                                                        )}
                                                        {getScheduleProfile(r) === 'high_volume' && (
                                                            <span data-testid={`board-scale-flag-${r.id}`} className="recipe-scale-flag"><ArrowUp size={11} /> Large</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {canEdit && (
                                                            isEditingBox ? (
                                                                <>
                                                                    <button className="task-icon-button task-icon-button-save" onClick={() => saveEditingBox(r, boxKey, tasks)}><Check size={13} /></button>
                                                                    <button className="task-icon-button" onClick={cancelEditingBox}><X size={13} /></button>
                                                                </>
                                                            ) : (
                                                                <button className="task-icon-button" onClick={() => startEditingBox(boxKey, tasks)}><Pencil size={13} /></button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                                {renderGroupedTasks(r, boxKey, tasks)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            )}
                        </>
                </div>
            )}
        </div>
    );
};

export default CommandBoard;
