import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  GripVertical,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X
} from 'lucide-react';

const DAY_COLUMNS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday']
];

const padDate = (value) => String(value).padStart(2, '0');
const formatDateKey = (date) => `${date.getFullYear()}-${padDate(date.getMonth() + 1)}-${padDate(date.getDate())}`;
const startOfWeek = (source) => {
  const date = new Date(source);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const WeeklyScheduleBoard = ({
  clientId = 'kabile',
  boardRecords = [],
  filteredRecords = [],
  productionTargets = {},
  portionTargets = {},
  canEdit = false,
  translateIngredient,
  getBoardData,
  getWeeklyTasks,
  mutateTaskAt
}) => {
  const daysScrollerRef = useRef(null);
  const [weekStart, setWeekStart] = useState(() => formatDateKey(startOfWeek(new Date())));
  const [scheduleRows, setScheduleRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddDayKey, setOpenAddDayKey] = useState(null);
  const [recipeSearchByDay, setRecipeSearchByDay] = useState({});
  const [selectedRecipeByDay, setSelectedRecipeByDay] = useState({});
  const [activeEntryByDay, setActiveEntryByDay] = useState({});
  const [editingBoxKey, setEditingBoxKey] = useState(null);
  const [editingTaskDrafts, setEditingTaskDrafts] = useState({});
  const [exportFormat, setExportFormat] = useState('pdf');
  const [loadError, setLoadError] = useState('');
  const [dailyHours, setDailyHours] = useState(6);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [undoSnapshotRows, setUndoSnapshotRows] = useState(null);
  const [isUndoingAutoGenerate, setIsUndoingAutoGenerate] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState(null);
  const [autoStartDayKey, setAutoStartDayKey] = useState('mon');

  const normalize = useCallback((val) => (
    String(val || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^[0-9]+[\.\)\s-]+/, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim()
  ), []);

  const boardRecordMap = useMemo(() => {
    const next = new Map();
    boardRecords.forEach((record) => {
      next.set(record.id, record);
      next.set(normalize(record.dish_name), record);
      if (record.meta?.id) next.set(record.meta.id, record);
      if (record.meta?.name) next.set(normalize(record.meta.name), record);
    });
    return next;
  }, [boardRecords, normalize]);

  const resolveRecipeRecord = useCallback((entry) => (
    boardRecordMap.get(entry.recipe_id) ||
    boardRecordMap.get(normalize(entry.recipe_name)) ||
    null
  ), [boardRecordMap, normalize]);

  const eligibleRecipes = useMemo(() => (
    filteredRecords
      .filter((record) => {
        const targetWeight = Number(productionTargets[record.id] || productionTargets[record.meta?.id] || 0);
        const targetPortions = Number(portionTargets[record.id] || portionTargets[record.meta?.id] || 0);
        return targetWeight > 0 || targetPortions > 0 || record.meta?.show_on_board;
      })
      .sort((a, b) => String(a.dish_name || '').localeCompare(String(b.dish_name || '')))
  ), [filteredRecords, portionTargets, productionTargets]);

  const getEstimatedMinutes = useCallback((record) => {
    const value = Number(
      record?.data?.generated_prep?.estimated_minutes ||
      record?.meta?.scalingTips?.prepMinutes ||
      record?.meta?.scaling_tips?.prepMinutes ||
      0
    );
    return Number.isFinite(value) && value > 0 ? value : 20;
  }, []);

  const getCategoryPriority = useCallback((record) => {
    const combined = String([
      record?.dish_name,
      record?.meta?.dishStyle,
      record?.meta?.dishCategory,
      record?.meta?.portion_class,
      record?.meta?.scalingTips?.selectorGroup,
      record?.meta?.scaling_tips?.selectorGroup
    ].filter(Boolean).join(' ')).toLowerCase();

    if (/(foundation|roux|stock|base|kimchi base|master sauce|prep base|long-life)/.test(combined)) return 0;
    if (/(marinade|marinated|brine|season chicken|season beef|season pork|meat marinade|protein marinade)/.test(combined)) return 1;
    if (/(sauce|glaze|dressing|mayo|aioli|vinaigrette|kimchi mayo|gravy)/.test(combined)) return 2;
    if (/(main meat dish|main dish|meat stir fry|main \+ carb|main_carb|curry|stew|braise|cook|roast|fry|grill|execution)/.test(combined)) return 3;
    if (/(veg stir fry|salad|slaw|vegetable|side)/.test(combined)) return 4;
    return 5;
  }, []);

  const loadScheduleRows = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase
      .from('weekly_prep_schedule')
      .select('*')
      .eq('client_id', clientId)
      .eq('week_start', weekStart)
      .order('day_key')
      .order('sort_order');

    if (error) {
      console.error('Weekly schedule fetch failed:', error);
      setScheduleRows([]);
      setLoadError(error.message || 'Unable to load weekly schedule.');
      setLoading(false);
      return;
    }

    setScheduleRows(data || []);
    setOpenAddDayKey(null);
    setLoading(false);
  }, [clientId, weekStart]);

  useEffect(() => {
    loadScheduleRows();
  }, [loadScheduleRows]);

  const groupedRows = useMemo(() => {
    const next = Object.fromEntries(DAY_COLUMNS.map(([key]) => [key, []]));
    scheduleRows.forEach((row) => {
      if (!next[row.day_key]) next[row.day_key] = [];
      next[row.day_key].push(row);
    });
    return next;
  }, [scheduleRows]);

  useEffect(() => {
    setActiveEntryByDay((prev) => {
      const next = { ...prev };
      DAY_COLUMNS.forEach(([dayKey]) => {
        const entries = groupedRows[dayKey] || [];
        if (entries.length === 0) {
          delete next[dayKey];
          return;
        }
        const stillExists = entries.some((entry) => entry.id === next[dayKey]);
        if (!stillExists) next[dayKey] = entries[0].id;
      });
      return next;
    });
  }, [groupedRows]);

  const updateSelectedRecipe = useCallback((dayKey, recipeId) => {
    setSelectedRecipeByDay((prev) => ({ ...prev, [dayKey]: recipeId }));
  }, []);

  const updateRecipeSearch = useCallback((dayKey, value) => {
    setRecipeSearchByDay((prev) => ({ ...prev, [dayKey]: value }));
  }, []);

  const addRecipeToDay = useCallback(async (dayKey) => {
    const recipeId = selectedRecipeByDay[dayKey];
    if (!recipeId) return;
    const recipe = eligibleRecipes.find((item) => item.id === recipeId);
    if (!recipe) return;

    const nextSortOrder = (groupedRows[dayKey] || []).length;
    const targetWeight = Number(productionTargets[recipe.id] || productionTargets[recipe.meta?.id] || 0);
    const targetPortions = Number(portionTargets[recipe.id] || portionTargets[recipe.meta?.id] || 0);

    const payload = {
      client_id: clientId,
      week_start: weekStart,
      day_key: dayKey,
      recipe_id: recipe.id,
      recipe_name: recipe.dish_name,
      target_weight: targetWeight > 0 ? targetWeight : null,
      target_portions: targetPortions > 0 ? targetPortions : null,
      sort_order: nextSortOrder,
      week_note: null
    };

    const { data, error } = await supabase
      .from('weekly_prep_schedule')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      window.alert(`Weekly schedule save failed: ${error.message}`);
      return;
    }

    setScheduleRows((prev) => [...prev, data]);
    setActiveEntryByDay((prev) => ({ ...prev, [dayKey]: data.id }));
    setSelectedRecipeByDay((prev) => ({ ...prev, [dayKey]: '' }));
    setRecipeSearchByDay((prev) => ({ ...prev, [dayKey]: '' }));
    setOpenAddDayKey(null);
  }, [clientId, eligibleRecipes, groupedRows, portionTargets, productionTargets, selectedRecipeByDay, weekStart]);

  const removeScheduledRecipe = useCallback(async (entryId, dayKey = null) => {
    const { error } = await supabase
      .from('weekly_prep_schedule')
      .delete()
      .eq('id', entryId);

    if (error) {
      window.alert(`Remove failed: ${error.message}`);
      return;
    }

    setScheduleRows((prev) => prev.filter((row) => row.id !== entryId));
    if (dayKey) {
      setActiveEntryByDay((prev) => {
        const next = { ...prev };
        if (next[dayKey] === entryId) delete next[dayKey];
        return next;
      });
    }
  }, []);

  const getEntryEstimatedMinutes = useCallback((entry) => {
    const recipe = resolveRecipeRecord(entry);
    return recipe ? getEstimatedMinutes(recipe) : 0;
  }, [getEstimatedMinutes, resolveRecipeRecord]);

  const dayLoadMap = useMemo(() => {
    return Object.fromEntries(DAY_COLUMNS.map(([dayKey]) => [
      dayKey,
      (groupedRows[dayKey] || []).reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry), 0)
    ]));
  }, [getEntryEstimatedMinutes, groupedRows]);

  const startEditingBox = useCallback((boxKey, tasks) => {
    const nextDrafts = {};
    tasks.forEach((task, idx) => {
      const draftKey = `${boxKey}-${task.taskType}-${task.sourceIndex ?? idx}`;
      nextDrafts[draftKey] = task.label || '';
    });
    setEditingTaskDrafts(nextDrafts);
    setEditingBoxKey(boxKey);
  }, []);

  const cancelEditingBox = useCallback(() => {
    setEditingBoxKey(null);
    setEditingTaskDrafts({});
  }, []);

  const saveEditingBox = useCallback(async (recipe, boxKey, tasks) => {
    for (let idx = 0; idx < tasks.length; idx += 1) {
      const task = tasks[idx];
      const draftKey = `${boxKey}-${task.taskType}-${task.sourceIndex ?? idx}`;
      const nextLabel = String(editingTaskDrafts[draftKey] ?? task.label ?? '').trim();
      if (nextLabel && nextLabel !== task.label) {
        await mutateTaskAt(recipe, task.taskType, task.sourceIndex ?? idx, 'update', nextLabel);
      }
    }
    cancelEditingBox();
  }, [cancelEditingBox, editingTaskDrafts, mutateTaskAt]);

  const deleteTask = useCallback(async (recipe, task, boxKey) => {
    await mutateTaskAt(recipe, task.taskType, task.sourceIndex ?? 0, 'delete');
    setEditingTaskDrafts((prev) => {
      const next = { ...prev };
      delete next[`${boxKey}-${task.taskType}-${task.sourceIndex ?? 0}`];
      return next;
    });
  }, [mutateTaskAt]);

  const jumpWeek = useCallback((offset) => {
    const base = startOfWeek(new Date(weekStart));
    base.setDate(base.getDate() + (offset * 7));
    setWeekStart(formatDateKey(base));
  }, [weekStart]);

  const weekRangeLabel = useMemo(() => {
    const start = startOfWeek(new Date(weekStart));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }, [weekStart]);

  const getEntryTasks = useCallback((entry) => {
    const recipe = resolveRecipeRecord(entry);
    if (!recipe) return [];
    const resolved = getBoardData(recipe);
    return getWeeklyTasks(resolved, recipe.meta);
  }, [getBoardData, getWeeklyTasks, resolveRecipeRecord]);

  const getFilteredRecipeOptions = useCallback((dayKey) => {
    const search = String(recipeSearchByDay[dayKey] || '').toLowerCase().trim();
    return eligibleRecipes.filter((recipe) => {
      const matchesSearch = !search || String(recipe.dish_name || '').toLowerCase().includes(search);
      const alreadyAdded = (groupedRows[dayKey] || []).some((entry) => entry.recipe_id === recipe.id);
      return matchesSearch && !alreadyAdded;
    });
  }, [eligibleRecipes, groupedRows, recipeSearchByDay]);

  const hasActiveScheduleTarget = useCallback((record) => {
    const targetWeight = Number(productionTargets[record.id] || productionTargets[record.meta?.id] || 0);
    const targetPortions = Number(portionTargets[record.id] || portionTargets[record.meta?.id] || 0);
    return targetWeight > 0 || targetPortions > 0 || !!record.meta?.show_on_board;
  }, [portionTargets, productionTargets]);

  const hasBoardPrepTasks = useCallback((record) => {
    const data = getBoardData(record);
    return Boolean(
      (Array.isArray(data?.weekly) && data.weekly.length > 0) ||
      data?.weekly?.batch?.length > 0 ||
      data?.weekly?.buffer?.length > 0 ||
      (Array.isArray(data?.morning) && data.morning.length > 0) ||
      data?.morning?.tasks?.length > 0 ||
      data?.morning?.forward?.length > 0 ||
      (Array.isArray(data?.service) && data.service.length > 0) ||
      data?.service?.prep?.length > 0 ||
      data?.service?.setup?.length > 0 ||
      data?.service?.garnish?.length > 0 ||
      data?.pre_service?.length > 0
    );
  }, [getBoardData]);

  const updateWeekNote = useCallback(async (entryId, nextNote) => {
    setScheduleRows((prev) => prev.map((row) => (
      row.id === entryId ? { ...row, week_note: nextNote } : row
    )));

    const { error } = await supabase
      .from('weekly_prep_schedule')
      .update({ week_note: nextNote })
      .eq('id', entryId);

    if (error) {
      console.error('Weekly note update failed:', error);
      window.alert(`Weekly note update failed: ${error.message}`);
      await loadScheduleRows();
    }
  }, [loadScheduleRows]);

  const updateEntryTargets = useCallback(async (entryId, updates) => {
    const normalizedUpdates = {
      ...(updates.target_weight !== undefined ? {
        target_weight: updates.target_weight === '' || updates.target_weight === null
          ? null
          : Math.max(0, Number(updates.target_weight) || 0)
      } : {}),
      ...(updates.target_portions !== undefined ? {
        target_portions: updates.target_portions === '' || updates.target_portions === null
          ? null
          : Math.max(0, Number(updates.target_portions) || 0)
      } : {})
    };

    setScheduleRows((prev) => prev.map((row) => (
      row.id === entryId ? { ...row, ...normalizedUpdates } : row
    )));

    const { error } = await supabase
      .from('weekly_prep_schedule')
      .update(normalizedUpdates)
      .eq('id', entryId);

    if (error) {
      console.error('Weekly target update failed:', error);
      window.alert(`Weekly target update failed: ${error.message}`);
      await loadScheduleRows();
    }
  }, [loadScheduleRows]);

  const persistDayOrder = useCallback(async (dayKey, orderedEntries) => {
    const previousRows = scheduleRows.map((row) => ({ ...row }));
    const normalizedEntries = orderedEntries.map((entry, index) => ({
      ...entry,
      day_key: dayKey,
      sort_order: index
    }));

    setScheduleRows((prev) => {
      const untouched = prev.filter((row) => row.day_key !== dayKey);
      return [...untouched, ...normalizedEntries];
    });

    const updateResults = await Promise.all(
      normalizedEntries.map((entry, index) => (
        supabase
          .from('weekly_prep_schedule')
          .update({ day_key: dayKey, sort_order: index })
          .eq('id', entry.id)
      ))
    );

    const failed = updateResults.find((result) => result.error);
    if (failed?.error) {
      console.error('Weekly reorder failed:', failed.error);
      window.alert(`Reorder failed: ${failed.error.message}`);
      setScheduleRows(previousRows);
    }
  }, [scheduleRows]);

  const reorderWithinDay = useCallback(async (dayKey, draggedId, targetId = null) => {
    if (!draggedId) return;
    const dayEntries = [...(groupedRows[dayKey] || [])];
    const fromIndex = dayEntries.findIndex((entry) => entry.id === draggedId);
    if (fromIndex < 0) return;

    const [movedEntry] = dayEntries.splice(fromIndex, 1);
    if (targetId == null) {
      dayEntries.push(movedEntry);
    } else {
      const toIndex = dayEntries.findIndex((entry) => entry.id === targetId);
      if (toIndex < 0) {
        dayEntries.push(movedEntry);
      } else {
        dayEntries.splice(toIndex, 0, movedEntry);
      }
    }

    const unchanged = dayEntries.every((entry, index) => entry.id === (groupedRows[dayKey] || [])[index]?.id);
    if (unchanged) return;

    await persistDayOrder(dayKey, dayEntries);
  }, [groupedRows, persistDayOrder]);

  const moveEntryAcrossDays = useCallback(async (fromDayKey, toDayKey, draggedId, targetId = null) => {
    if (!draggedId || !fromDayKey || !toDayKey) return;
    if (fromDayKey === toDayKey) {
      await reorderWithinDay(toDayKey, draggedId, targetId);
      return;
    }

    const sourceEntries = [...(groupedRows[fromDayKey] || [])];
    const targetEntries = [...(groupedRows[toDayKey] || [])];
    const fromIndex = sourceEntries.findIndex((entry) => entry.id === draggedId);
    if (fromIndex < 0) return;

    const [movedEntry] = sourceEntries.splice(fromIndex, 1);
    const movedWithDay = { ...movedEntry, day_key: toDayKey };

    if (targetId == null) {
      targetEntries.push(movedWithDay);
    } else {
      const toIndex = targetEntries.findIndex((entry) => entry.id === targetId);
      if (toIndex < 0) {
        targetEntries.push(movedWithDay);
      } else {
        targetEntries.splice(toIndex, 0, movedWithDay);
      }
    }

    const previousRows = scheduleRows.map((row) => ({ ...row }));
    const normalizedSource = sourceEntries.map((entry, index) => ({
      ...entry,
      day_key: fromDayKey,
      sort_order: index
    }));
    const normalizedTarget = targetEntries.map((entry, index) => ({
      ...entry,
      day_key: toDayKey,
      sort_order: index
    }));

    setScheduleRows((prev) => {
      const untouched = prev.filter((row) => row.day_key !== fromDayKey && row.day_key !== toDayKey);
      return [...untouched, ...normalizedSource, ...normalizedTarget];
    });

    const updateResults = await Promise.all([
      ...normalizedSource.map((entry, index) => (
        supabase
          .from('weekly_prep_schedule')
          .update({ day_key: fromDayKey, sort_order: index })
          .eq('id', entry.id)
      )),
      ...normalizedTarget.map((entry, index) => (
        supabase
          .from('weekly_prep_schedule')
          .update({ day_key: toDayKey, sort_order: index })
          .eq('id', entry.id)
      ))
    ]);

    const failed = updateResults.find((result) => result.error);
    if (failed?.error) {
      console.error('Weekly move failed:', failed.error);
      window.alert(`Move failed: ${failed.error.message}`);
      setScheduleRows(previousRows);
      return;
    }

    setActiveEntryByDay((prev) => ({
      ...prev,
      [toDayKey]: draggedId
    }));
  }, [groupedRows, reorderWithinDay, scheduleRows]);

  const autoGenerateWeek = useCallback(async () => {
    if (!canEdit) return;
    const dayCapacity = Math.max(60, Math.round(Number(dailyHours || 0) * 60));
    const startDayIndex = Math.max(0, DAY_COLUMNS.findIndex(([dayKey]) => dayKey === autoStartDayKey));
    const scheduleDayColumns = DAY_COLUMNS.slice(startDayIndex);
    const candidates = eligibleRecipes
      .filter((record) => {
        if (!hasActiveScheduleTarget(record)) return false;
        return hasBoardPrepTasks(record);
      })
      .map((record) => ({
        record,
        estimatedMinutes: getEstimatedMinutes(record),
        priority: getCategoryPriority(record)
      }))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (b.estimatedMinutes !== a.estimatedMinutes) return b.estimatedMinutes - a.estimatedMinutes;
        return String(a.record.dish_name || '').localeCompare(String(b.record.dish_name || ''));
      });

    if (candidates.length === 0) {
      window.alert('No scaled board recipes with prep tasks are ready for auto scheduling.');
      return;
    }

    const previousRows = scheduleRows.map((row) => ({ ...row }));

    if (previousRows.length > 0 && !window.confirm('Replace the current weekly schedule with a new auto-generated draft?')) {
      return;
    }

    const remainingMinutes = Object.fromEntries(scheduleDayColumns.map(([dayKey]) => [dayKey, dayCapacity]));
    const generatedRows = [];
    let dayIndex = 0;

    candidates.forEach(({ record, estimatedMinutes }) => {
      const taskMinutes = Math.max(1, estimatedMinutes);
      let selectedDayIndex = dayIndex;

      while (
        selectedDayIndex < scheduleDayColumns.length - 1 &&
        remainingMinutes[scheduleDayColumns[selectedDayIndex][0]] < taskMinutes
      ) {
        selectedDayIndex += 1;
      }

      const selectedDayKey = scheduleDayColumns[selectedDayIndex][0];
      dayIndex = selectedDayIndex;
      remainingMinutes[selectedDayKey] = Math.max(0, remainingMinutes[selectedDayKey] - taskMinutes);

      if (remainingMinutes[selectedDayKey] === 0 && dayIndex < scheduleDayColumns.length - 1) {
        dayIndex += 1;
      }

      generatedRows.push({
        client_id: clientId,
        week_start: weekStart,
        day_key: selectedDayKey,
        recipe_id: record.id,
        recipe_name: record.dish_name,
        target_weight: Number(productionTargets[record.id] || productionTargets[record.meta?.id] || 0) || null,
        target_portions: Number(portionTargets[record.id] || portionTargets[record.meta?.id] || 0) || null,
        sort_order: generatedRows.filter((row) => row.day_key === selectedDayKey).length,
        week_note: `${taskMinutes} min prep window`
      });
    });

    setIsAutoGenerating(true);
    const { error: deleteError } = await supabase
      .from('weekly_prep_schedule')
      .delete()
      .eq('client_id', clientId)
      .eq('week_start', weekStart);

    if (deleteError) {
      setIsAutoGenerating(false);
      window.alert(`Auto-generate failed: ${deleteError.message}`);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('weekly_prep_schedule')
      .insert(generatedRows)
      .select('*');

    setIsAutoGenerating(false);

    if (insertError) {
      window.alert(`Auto-generate failed: ${insertError.message}`);
      return;
    }

    setUndoSnapshotRows(previousRows);
    setScheduleRows(data || []);
  }, [
    canEdit,
    clientId,
    dailyHours,
    autoStartDayKey,
    hasBoardPrepTasks,
    hasActiveScheduleTarget,
    eligibleRecipes,
    getBoardData,
    getCategoryPriority,
    getEstimatedMinutes,
    portionTargets,
    productionTargets,
    scheduleRows,
    weekStart
  ]);

  const undoAutoGenerate = useCallback(async () => {
    if (!canEdit || !Array.isArray(undoSnapshotRows)) return;

    setIsUndoingAutoGenerate(true);
    const { error: deleteError } = await supabase
      .from('weekly_prep_schedule')
      .delete()
      .eq('client_id', clientId)
      .eq('week_start', weekStart);

    if (deleteError) {
      setIsUndoingAutoGenerate(false);
      window.alert(`Undo failed: ${deleteError.message}`);
      return;
    }

    if (undoSnapshotRows.length === 0) {
      setScheduleRows([]);
      setUndoSnapshotRows(null);
      setIsUndoingAutoGenerate(false);
      return;
    }

    const restorePayload = undoSnapshotRows.map((row, index) => ({
      client_id: row.client_id || clientId,
      week_start: row.week_start || weekStart,
      day_key: row.day_key,
      recipe_id: row.recipe_id,
      recipe_name: row.recipe_name,
      target_weight: row.target_weight ?? null,
      target_portions: row.target_portions ?? null,
      sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index,
      week_note: row.week_note ?? null
    }));

    const { data, error: insertError } = await supabase
      .from('weekly_prep_schedule')
      .insert(restorePayload)
      .select('*')
      .order('day_key')
      .order('sort_order');

    setIsUndoingAutoGenerate(false);

    if (insertError) {
      window.alert(`Undo failed: ${insertError.message}`);
      return;
    }

    setScheduleRows(data || []);
    setUndoSnapshotRows(null);
  }, [canEdit, clientId, undoSnapshotRows, weekStart]);

  const resetWeekSchedule = useCallback(async () => {
    if (!canEdit) return;
    const previousRows = scheduleRows.map((row) => ({ ...row }));
    if (previousRows.length === 0) return;
    if (!window.confirm('Clear the current weekly schedule?')) return;

    const { error } = await supabase
      .from('weekly_prep_schedule')
      .delete()
      .eq('client_id', clientId)
      .eq('week_start', weekStart);

    if (error) {
      window.alert(`Reset failed: ${error.message}`);
      return;
    }

    setUndoSnapshotRows(previousRows);
    setScheduleRows([]);
  }, [canEdit, clientId, scheduleRows, weekStart]);

  const scrollDays = useCallback((direction) => {
    const node = daysScrollerRef.current;
    if (!node) return;
    const scrollAmount = Math.max(node.clientWidth * 0.9, 320);
    node.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  }, []);

  const addTask = useCallback(async (recipe, entry, boxKey) => {
    const existingTasks = getEntryTasks(entry);
    const nextTaskLabel = window.prompt('New prep task');
    if (!nextTaskLabel || !nextTaskLabel.trim()) return;
    await mutateTaskAt(recipe, existingTasks[0]?.taskType || 'weekly', existingTasks.length, 'append', nextTaskLabel.trim());
    const nextIndex = existingTasks.length;
    setEditingTaskDrafts((prev) => ({
      ...prev,
      [`${boxKey}-${existingTasks[0]?.taskType || 'weekly'}-${nextIndex}`]: nextTaskLabel.trim()
    }));
  }, [getEntryTasks, mutateTaskAt]);

  const escapeCsv = useCallback((value) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }, []);

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

  const exportCsv = useCallback(() => {
    let csv = 'DAY,RECIPE,TARGET_WEIGHT,TARGET_PORTIONS,NOTE,TASK\n';
    DAY_COLUMNS.forEach(([dayKey, dayLabel]) => {
      (groupedRows[dayKey] || []).forEach((entry) => {
        const tasks = getEntryTasks(entry);
        if (tasks.length === 0) {
          csv += [
            escapeCsv(dayLabel),
            escapeCsv(entry.recipe_name),
            escapeCsv(entry.target_weight ?? ''),
            escapeCsv(entry.target_portions ?? ''),
            escapeCsv(entry.week_note ?? ''),
            escapeCsv('')
          ].join(',') + '\n';
          return;
        }
        tasks.forEach((task) => {
          csv += [
            escapeCsv(dayLabel),
            escapeCsv(entry.recipe_name),
            escapeCsv(entry.target_weight ?? ''),
            escapeCsv(entry.target_portions ?? ''),
            escapeCsv(entry.week_note ?? ''),
            escapeCsv(task.label || '')
          ].join(',') + '\n';
        });
      });
    });
    downloadFile(`weekly-prep-${weekStart}.csv`, csv, 'text/csv;charset=utf-8');
  }, [downloadFile, escapeCsv, getEntryTasks, groupedRows, weekStart]);

  const openPrintView = useCallback(() => {
    const printWindow = window.open('', '_blank', 'width=1400,height=1000');
    if (!printWindow) return;

    const renderedDays = DAY_COLUMNS.map(([dayKey, dayLabel]) => {
      const cards = (groupedRows[dayKey] || []).map((entry) => {
        const tasks = getEntryTasks(entry);
        const targetMeta = [
          entry.target_weight ? `${Number(entry.target_weight).toFixed(0)}g target` : '',
          entry.target_portions ? `${Number(entry.target_portions).toFixed(0)} portions` : ''
        ].filter(Boolean).join(' | ');

        return `
          <article class="recipe-card">
            <div class="recipe-title">${String(entry.recipe_name || '').replace(/</g, '&lt;')}</div>
            ${targetMeta ? `<div class="recipe-meta">${targetMeta}</div>` : ''}
            ${entry.week_note ? `<div class="recipe-note">${String(entry.week_note || '').replace(/</g, '&lt;')}</div>` : ''}
            <ul>
              ${tasks.map((task) => `<li>${String(task.label || '').replace(/</g, '&lt;')}</li>`).join('') || '<li>No prep tasks recorded yet.</li>'}
            </ul>
          </article>
        `;
      }).join('');

      return `
        <section class="day-column">
          <div class="day-title">${dayLabel}</div>
          ${cards || '<div class="empty-state">No recipes scheduled.</div>'}
        </section>
      `;
    }).join('');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Weekly Prep ${weekStart}</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
      .page-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
      .page-header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.08em; }
      .page-header .meta { font-size: 11px; color: #4b5563; text-transform: uppercase; }
      .week-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
      .day-column { border: 1px solid #d1d5db; padding: 8px; min-height: 180px; break-inside: avoid; }
      .day-title { font-size: 12px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #111827; padding-bottom: 4px; margin-bottom: 8px; }
      .recipe-card { border: 1px solid #e5e7eb; padding: 8px; margin-bottom: 8px; }
      .recipe-title { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
      .recipe-meta { font-size: 9px; color: #6b7280; text-transform: uppercase; margin-bottom: 6px; }
      .recipe-note { font-size: 10px; color: #374151; margin-bottom: 6px; padding: 6px 8px; background: #f9fafb; border: 1px solid #e5e7eb; }
      ul { margin: 0; padding-left: 16px; }
      li { font-size: 10px; line-height: 1.35; margin-bottom: 2px; }
      .empty-state { font-size: 10px; color: #6b7280; text-transform: uppercase; }
      @media print {
        .week-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      }
    </style>
  </head>
  <body>
    <div class="page-header">
      <div>
        <h1>Weekly Prep Schedule</h1>
        <div class="meta">${weekRangeLabel}</div>
      </div>
      <div class="meta">${new Date().toLocaleDateString()}</div>
    </div>
    <div class="week-grid">${renderedDays}</div>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 500);
      });
    </script>
  </body>
</html>`);
    printWindow.document.close();
  }, [getEntryTasks, groupedRows, weekRangeLabel, weekStart]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        <div className="text-[10px] font-black uppercase tracking-widest">Loading weekly schedule...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <style>{`
        .weekly-schedule-shell { width: 100%; max-width: 1280px; margin: 0 auto; padding: 14px 20px 20px; display: flex; flex-direction: column; gap: 14px; min-height: 0; }
        .weekly-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .weekly-week-nav { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .weekly-button { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 12px; padding: 10px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; transition: all 0.2s; }
        .weekly-button:hover { border-color: var(--app-accent); color: var(--app-accent); }
        .weekly-button-accent { border-color: rgba(212, 175, 55, 0.25); background: rgba(212, 175, 55, 0.12); color: var(--app-accent); }
        .weekly-date-input { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 12px; padding: 10px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; }
        .weekly-range-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
        .weekly-hours-input { width: 84px; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 12px; padding: 10px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; text-align: center; }
        .weekly-hours-group { display: flex; align-items: center; gap: 8px; }
        .weekly-hours-label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
        .weekly-grid-shell { display: flex; align-items: stretch; gap: 10px; min-height: 0; }
        .weekly-grid-nav { width: 24px; flex: 0 0 24px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.28); border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; opacity: 0.45; }
        .weekly-grid-shell:hover .weekly-grid-nav { opacity: 0.7; }
        .weekly-grid-nav:hover { border-color: rgba(212, 175, 55, 0.25); background: rgba(212, 175, 55, 0.1); color: var(--app-accent); opacity: 1; }
        .weekly-grid-viewport { flex: 1; min-width: 0; overflow: hidden; }
        .weekly-grid { display: flex; gap: 14px; overflow-x: auto; overflow-y: hidden; padding-bottom: 8px; scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; }
        .weekly-grid::-webkit-scrollbar { display: none; }
        .weekly-day-column { flex: 0 0 calc((100% - 12px) / 4); border: 1px solid var(--border); background: var(--surface-low); border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 10px; min-height: 220px; min-width: 280px; max-height: calc(100vh - 260px); }
        .weekly-day-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .weekly-day-header.is-start-day .weekly-day-title { color: var(--app-accent); }
        .weekly-day-title { font-size: 12px; font-weight: 900; text-transform: uppercase; color: var(--text); }
        .weekly-add-row { display: flex; gap: 8px; align-items: center; }
        .weekly-picker-overlay { position: fixed; inset: 0; background: rgba(9, 9, 11, 0.64); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 1200; }
        .weekly-picker-modal { width: min(680px, 100%); max-height: min(78vh, 760px); overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.18); background: #111318; border-radius: 18px; box-shadow: 0 24px 60px rgba(0,0,0,0.45); display: flex; flex-direction: column; }
        .weekly-picker-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
        .weekly-picker-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text); }
        .weekly-add-panel { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
        .weekly-search-input { width: 100%; border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 10px; padding: 9px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; outline: none; }
        .weekly-option-list { display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto; }
        .weekly-option-button { width: 100%; text-align: left; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 10px; padding: 9px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; transition: all 0.2s; }
        .weekly-option-button:hover { border-color: var(--app-accent); color: var(--app-accent); }
        .weekly-option-button.is-selected { border-color: rgba(212, 175, 55, 0.35); background: rgba(212, 175, 55, 0.14); color: var(--app-accent); }
        .weekly-day-body { display: flex; flex-direction: column; gap: 10px; min-height: 0; flex: 1; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .weekly-day-body::-webkit-scrollbar { display: none; }
        .weekly-tab-list { display: flex; flex-direction: column; gap: 8px; min-height: 0; }
        .weekly-tab-list::-webkit-scrollbar { display: none; }
        .weekly-tab-card { border: 1px solid var(--border); background: var(--surface); border-radius: 14px; overflow: hidden; transition: all 0.2s; }
        .weekly-tab-card.is-active { border-color: rgba(212,175,55,0.26); box-shadow: 0 10px 28px rgba(0,0,0,0.18); }
        .weekly-tab-card.is-dragging { opacity: 0.45; transform: scale(0.98); }
        .weekly-tab-card.is-drop-target { border-color: rgba(212,175,55,0.45); box-shadow: 0 0 0 1px rgba(212,175,55,0.28); }
        .weekly-tab-header { display: flex; align-items: stretch; gap: 0; }
        .weekly-drag-handle { width: 34px; flex: 0 0 34px; border: none; border-right: 1px solid var(--border); background: transparent; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; cursor: grab; }
        .weekly-drag-handle:hover { color: var(--app-accent); background: rgba(212,175,55,0.06); }
        .weekly-drag-handle:active { cursor: grabbing; }
        .weekly-tab-button { width: 100%; text-align: left; border: none; background: transparent; color: var(--muted); padding: 10px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; transition: all 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .weekly-tab-button:hover { border-color: var(--app-accent); color: var(--text); }
        .weekly-tab-button.is-active { border-color: rgba(212,175,55,0.28); background: rgba(212,175,55,0.1); color: var(--app-accent); }
        .weekly-card { border-top: 1px solid var(--border); background: rgba(255,255,255,0.02); padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .weekly-card-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .weekly-card-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: var(--text); line-height: 1.25; }
        .weekly-card-meta { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-top: 4px; }
        .weekly-target-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .weekly-target-field { display: flex; flex-direction: column; gap: 4px; }
        .weekly-target-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
        .weekly-target-input { width: 100%; border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 10px; padding: 9px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; outline: none; }
        .weekly-note-input { width: 100%; min-height: 86px; resize: vertical; border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 10px; padding: 10px; font-size: 10px; font-weight: 700; line-height: 1.4; outline: none; }
        .weekly-note-display { min-height: 86px; border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 10px; padding: 10px; font-size: 10px; font-weight: 700; line-height: 1.4; white-space: pre-wrap; }
        .weekly-task-preview { display: flex; flex-direction: column; gap: 6px; }
        .weekly-task-preview-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
        .weekly-task-preview ul { margin: 0; padding-left: 16px; }
        .weekly-task-preview li { font-size: 10px; line-height: 1.35; color: var(--text); margin-bottom: 2px; }
        .weekly-task-row { padding: 9px 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; display: flex; gap: 8px; align-items: flex-start; }
        .weekly-task-input { width: 100%; min-width: 0; border: 1px solid var(--border); background: rgba(24, 24, 27, 0.9); border-radius: 8px; padding: 6px 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text); outline: none; }
        .weekly-task-label { flex: 1; font-size: 10px; font-weight: 800; text-transform: uppercase; line-height: 1.35; color: var(--text); }
        .weekly-task-actions, .weekly-card-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
        .weekly-icon-button { width: 30px; height: 30px; border-radius: 10px; border: 1px solid var(--border); background: rgba(24, 24, 27, 0.9); color: var(--muted); display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .weekly-icon-button:hover { border-color: var(--app-accent); color: var(--app-accent); }
        .weekly-empty { border: 1px dashed var(--border); border-radius: 12px; padding: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--muted); text-align: center; }
        .weekly-error { border: 1px solid rgba(248, 113, 113, 0.3); background: rgba(127, 29, 29, 0.2); color: #fca5a5; border-radius: 14px; padding: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        @media (max-width: 1280px) { .weekly-day-column { flex-basis: calc((100% - 28px) / 3); } }
        @media (max-width: 980px) { .weekly-day-column { flex-basis: calc((100% - 14px) / 2); } }
        @media (max-width: 640px) { .weekly-day-column { flex-basis: 100%; min-width: 100%; } .weekly-schedule-shell { padding: 12px; } .weekly-add-row { flex-direction: column; } .weekly-picker-overlay { padding: 10px; } .weekly-grid-nav { display: none; } }
      `}</style>

      <div className="weekly-schedule-shell">
        <div className="weekly-toolbar">
          <div className="weekly-week-nav">
            <button className="weekly-button" onClick={() => jumpWeek(-1)}><ChevronLeft size={14} className="inline mr-1" /> Prev Week</button>
            <button className="weekly-button" onClick={() => setWeekStart(formatDateKey(startOfWeek(new Date())))}>Current Week</button>
            <button className="weekly-button" onClick={() => jumpWeek(1)}>Next Week <ChevronRight size={14} className="inline ml-1" /></button>
            <input
              type="date"
              value={weekStart}
              className="weekly-date-input"
              onChange={(e) => setWeekStart(formatDateKey(startOfWeek(new Date(e.target.value))))}
            />
            <div className="weekly-range-label"><CalendarDays size={14} className="inline mr-2" />{weekRangeLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit ? (
              <>
                <div className="weekly-hours-group">
                  <span className="weekly-hours-label">Daily Hours</span>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    step="0.5"
                    value={dailyHours}
                    className="weekly-hours-input"
                    onChange={(e) => setDailyHours(Math.max(1, Number(e.target.value) || 1))}
                    title="Daily prep hours"
                  />
                </div>
                <div className="weekly-hours-group">
                  <span className="weekly-hours-label">Start Day</span>
                  <select
                    value={autoStartDayKey}
                    onChange={(e) => setAutoStartDayKey(e.target.value)}
                    className="weekly-date-input"
                    title="Auto-generate start day"
                  >
                    {DAY_COLUMNS.map(([dayKey, dayLabel]) => (
                      <option key={dayKey} value={dayKey}>{dayLabel}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="weekly-button weekly-button-accent"
                  onClick={autoGenerateWeek}
                  disabled={isAutoGenerating}
                  title={`Generate from ${DAY_COLUMNS.find(([dayKey]) => dayKey === autoStartDayKey)?.[1] || 'Monday'}`}
                >
                  <CalendarDays size={14} className="inline mr-1" />
                  {isAutoGenerating ? 'Generating...' : 'Auto Generate'}
                </button>
                {undoSnapshotRows ? (
                  <button
                    className="weekly-button"
                    onClick={undoAutoGenerate}
                    disabled={isUndoingAutoGenerate}
                  >
                    <ChevronLeft size={14} className="inline mr-1" />
                    {isUndoingAutoGenerate ? 'Undoing...' : 'Undo Auto'}
                  </button>
                ) : null}
                <button
                  className="weekly-button"
                  onClick={resetWeekSchedule}
                  disabled={scheduleRows.length === 0}
                >
                  <X size={14} className="inline mr-1" />
                  Reset Week
                </button>
              </>
            ) : null}
            <button className={`weekly-button ${exportFormat === 'pdf' ? 'weekly-button-accent' : ''}`} onClick={() => setExportFormat('pdf')}>PDF</button>
            <button className={`weekly-button ${exportFormat === 'csv' ? 'weekly-button-accent' : ''}`} onClick={() => setExportFormat('csv')}>CSV</button>
            <button className="weekly-button weekly-button-accent" onClick={() => (exportFormat === 'csv' ? exportCsv() : openPrintView())}>
              {exportFormat === 'csv' ? <Download size={14} className="inline mr-1" /> : <Printer size={14} className="inline mr-1" />}
              Export Week
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="weekly-error">
            Weekly schedule table is not available yet: {loadError}
          </div>
        ) : null}

        <div className="weekly-grid-shell">
          <button className="weekly-grid-nav" onClick={() => scrollDays(-1)} aria-label="Show earlier days">
            <ChevronLeft size={16} />
          </button>
          <div className="weekly-grid-viewport">
            <div className="weekly-grid" ref={daysScrollerRef}>
              {DAY_COLUMNS.map(([dayKey, dayLabel]) => (
            <section key={dayKey} className="weekly-day-column">
              <div className={`weekly-day-header ${autoStartDayKey === dayKey ? 'is-start-day' : ''}`}>
                <div className="weekly-day-title">{dayLabel}</div>
                <div className="weekly-range-label">{(groupedRows[dayKey] || []).length} recipes | {dayLoadMap[dayKey] || 0}/{Math.round(Number(dailyHours || 0) * 60)} min</div>
              </div>

              {canEdit ? (
                <button className="weekly-button weekly-button-accent" onClick={() => setOpenAddDayKey(dayKey)}>
                  <Plus size={14} className="inline mr-1" />
                  Add Recipe
                </button>
              ) : null}

              {(groupedRows[dayKey] || []).length === 0 ? (
                <div className="weekly-empty">No prep recipes scheduled</div>
              ) : (
                <div
                  className="weekly-day-body"
                  onDragOver={canEdit ? (e) => e.preventDefault() : undefined}
                  onDrop={canEdit ? async (e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    const sourceDayKey = e.dataTransfer.getData('application/x-weekly-day');
                    setDraggingEntryId(null);
                    if (sourceDayKey && sourceDayKey !== dayKey) {
                      await moveEntryAcrossDays(sourceDayKey, dayKey, draggedId, null);
                    } else {
                      await reorderWithinDay(dayKey, draggedId, null);
                    }
                  } : undefined}
                >
                  <div className="weekly-tab-list">
                    {(groupedRows[dayKey] || []).map((entry) => {
                      const isActive = activeEntryByDay[dayKey] === entry.id;
                      const taskPreview = getEntryTasks(entry).slice(0, 3);
                      return (
                        <article
                          key={entry.id}
                          className={`weekly-tab-card ${isActive ? 'is-active' : ''} ${draggingEntryId === entry.id ? 'is-dragging' : ''}`}
                          onDragOver={canEdit ? (e) => {
                            e.preventDefault();
                            if (draggingEntryId && draggingEntryId !== entry.id) {
                              e.currentTarget.classList.add('is-drop-target');
                            }
                          } : undefined}
                          onDragLeave={canEdit ? (e) => {
                            e.currentTarget.classList.remove('is-drop-target');
                          } : undefined}
                          onDrop={canEdit ? async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.currentTarget.classList.remove('is-drop-target');
                            const draggedId = e.dataTransfer.getData('text/plain');
                            const sourceDayKey = e.dataTransfer.getData('application/x-weekly-day');
                            setDraggingEntryId(null);
                            if (sourceDayKey && sourceDayKey !== dayKey) {
                              await moveEntryAcrossDays(sourceDayKey, dayKey, draggedId, entry.id);
                            } else {
                              await reorderWithinDay(dayKey, draggedId, entry.id);
                            }
                          } : undefined}
                        >
                          <div className="weekly-tab-header">
                            {canEdit ? (
                              <button
                                type="button"
                                className="weekly-drag-handle"
                                draggable
                                onDragStart={(e) => {
                                  setDraggingEntryId(entry.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  e.dataTransfer.setData('text/plain', String(entry.id));
                                  e.dataTransfer.setData('application/x-weekly-day', dayKey);
                                }}
                                onDragEnd={() => setDraggingEntryId(null)}
                                title="Drag to move recipe"
                              >
                                <GripVertical size={14} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className={`weekly-tab-button ${isActive ? 'is-active' : ''}`}
                              onClick={() => setActiveEntryByDay((prev) => ({ ...prev, [dayKey]: prev[dayKey] === entry.id ? null : entry.id }))}
                            >
                              {translateIngredient(entry.recipe_name)}
                            </button>
                          </div>

                          {isActive ? (
                            <div className="weekly-card">
                              <div className="weekly-card-head">
                                <div className="min-w-0">
                                  <div className="weekly-card-meta">
                                    {[entry.target_weight ? `${Number(entry.target_weight).toFixed(0)}g target` : '', entry.target_portions ? `${Number(entry.target_portions).toFixed(0)} portions` : '']
                                      .filter(Boolean)
                                      .join(' | ') || 'Prep tasks included in export'}
                                  </div>
                                </div>
                                {canEdit ? (
                                  <div className="weekly-card-actions">
                                    <button className="weekly-icon-button" onClick={() => removeScheduledRecipe(entry.id, dayKey)}><Trash2 size={14} /></button>
                                  </div>
                                ) : null}
                              </div>

                              {canEdit ? (
                                <div className="weekly-target-grid">
                                  <label className="weekly-target-field">
                                    <span className="weekly-target-label">Target Weight (g)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      className="weekly-target-input"
                                      value={entry.target_weight ?? ''}
                                      onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setScheduleRows((prev) => prev.map((row) => (
                                          row.id === entry.id ? { ...row, target_weight: nextValue === '' ? null : Number(nextValue) } : row
                                        )));
                                      }}
                                      onBlur={(e) => updateEntryTargets(entry.id, { target_weight: e.target.value })}
                                    />
                                  </label>
                                  <label className="weekly-target-field">
                                    <span className="weekly-target-label">Target Portions</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      className="weekly-target-input"
                                      value={entry.target_portions ?? ''}
                                      onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setScheduleRows((prev) => prev.map((row) => (
                                          row.id === entry.id ? { ...row, target_portions: nextValue === '' ? null : Number(nextValue) } : row
                                        )));
                                      }}
                                      onBlur={(e) => updateEntryTargets(entry.id, { target_portions: e.target.value })}
                                    />
                                  </label>
                                </div>
                              ) : null}

                              {canEdit ? (
                                <textarea
                                  className="weekly-note-input"
                                  placeholder="Write weekly note if needed"
                                  value={entry.week_note || ''}
                                  onChange={(e) => {
                                    const nextValue = e.target.value;
                                    setScheduleRows((prev) => prev.map((row) => (
                                      row.id === entry.id ? { ...row, week_note: nextValue } : row
                                    )));
                                  }}
                                  onBlur={(e) => updateWeekNote(entry.id, e.target.value)}
                                />
                              ) : (
                                <div className="weekly-note-display">
                                  {entry.week_note || 'No weekly note written.'}
                                </div>
                              )}

                              <div className="weekly-task-preview">
                                <div className="weekly-task-preview-title">Prep Preview</div>
                                {taskPreview.length > 0 ? (
                                  <ul>
                                    {taskPreview.map((task, idx) => (
                                      <li key={`${entry.id}-preview-${idx}`}>{task.label}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="weekly-empty">No prep tasks saved yet</div>
                                )}
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
              ))}
            </div>
          </div>
          <button className="weekly-grid-nav" onClick={() => scrollDays(1)} aria-label="Show later days">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {canEdit && openAddDayKey ? (
        <div className="weekly-picker-overlay" onClick={() => {
          setOpenAddDayKey(null);
          setSelectedRecipeByDay((prev) => ({ ...prev, [openAddDayKey]: '' }));
          setRecipeSearchByDay((prev) => ({ ...prev, [openAddDayKey]: '' }));
        }}>
          <div className="weekly-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="weekly-picker-header">
              <div className="weekly-picker-title">Add Recipe To {DAY_COLUMNS.find(([key]) => key === openAddDayKey)?.[1] || 'Day'}</div>
              <button
                className="weekly-icon-button"
                onClick={() => {
                  setOpenAddDayKey(null);
                  setSelectedRecipeByDay((prev) => ({ ...prev, [openAddDayKey]: '' }));
                  setRecipeSearchByDay((prev) => ({ ...prev, [openAddDayKey]: '' }));
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="weekly-add-panel">
              <input
                className="weekly-search-input"
                placeholder="Search prep recipe"
                value={recipeSearchByDay[openAddDayKey] || ''}
                onChange={(e) => updateRecipeSearch(openAddDayKey, e.target.value)}
              />
              <div className="weekly-option-list">
                {getFilteredRecipeOptions(openAddDayKey).length === 0 ? (
                  <div className="weekly-empty">No matching live prep recipes</div>
                ) : (
                  getFilteredRecipeOptions(openAddDayKey).map((recipe) => (
                    <button
                      key={`${openAddDayKey}-${recipe.id}`}
                      type="button"
                      className={`weekly-option-button ${selectedRecipeByDay[openAddDayKey] === recipe.id ? 'is-selected' : ''}`}
                      onClick={() => updateSelectedRecipe(openAddDayKey, recipe.id)}
                    >
                      {translateIngredient(recipe.dish_name)}
                    </button>
                  ))
                )}
              </div>
              <div className="weekly-add-row">
                <button className="weekly-button weekly-button-accent" onClick={() => addRecipeToDay(openAddDayKey)} disabled={!selectedRecipeByDay[openAddDayKey]}>
                  <Plus size={14} className="inline mr-1" />
                  Add Selected
                </button>
                <button
                  className="weekly-button"
                  onClick={() => {
                    setOpenAddDayKey(null);
                    setSelectedRecipeByDay((prev) => ({ ...prev, [openAddDayKey]: '' }));
                    setRecipeSearchByDay((prev) => ({ ...prev, [openAddDayKey]: '' }));
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WeeklyScheduleBoard;
