(() => {
  'use strict';

  const STORAGE_KEY = 'taskboard-prototype-v1';
  const PRIORITY_LABEL = { high: '高', mid: '中', low: '低' };
  const PRIORITY_MARK = { high: '▲', mid: '●', low: '▼' };
  const LABEL_COLORS = [
    { value: '', name: 'なし' },
    { value: 'red', name: '赤' },
    { value: 'blue', name: '青' },
    { value: 'green', name: '緑' },
    { value: 'yellow', name: '黄' },
    { value: 'purple', name: '紫' },
  ];

  // カードの形は基本設計書のCARDSに合わせる(status/position/due_date/label)
  let cards = [];
  let editingId = null;
  let draggingId = null;

  // ---------- 日付ユーティリティ ----------
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const offsetDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toISO(d);
  };
  // 期限までの日数(今日=0、期限なし=null)
  const daysUntil = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((due - today) / 86400000);
  };
  // 'normal' | 'soon' | 'overdue'(完了列は常に通常)
  const dueState = (card) => {
    if (card.status === 'done') return 'normal';
    const days = daysUntil(card.due);
    if (days === null) return 'normal';
    if (days < 0) return 'overdue';
    if (days <= 1) return 'soon';
    return 'normal';
  };

  // ---------- データ ----------
  const sampleCards = () => [
    { id: 1, title: 'JavaScriptの復習', detail: '配列メソッドとDOM操作をおさらいする', due: offsetDate(5), priority: 'mid', status: 'todo', label: 'blue' },
    { id: 2, title: '課題の要件定義書を仕上げる', detail: 'ユースケースとワイヤーフレームを見直す', due: offsetDate(1), priority: 'high', status: 'todo', label: 'red' },
    { id: 3, title: 'ER図のレビュー', detail: '', due: offsetDate(0), priority: 'high', status: 'todo', label: '' },
    { id: 4, title: '参考書を読む', detail: '第3章まで', due: offsetDate(-2), priority: 'low', status: 'todo', label: 'green' },
    { id: 5, title: 'プロトタイプ作成', detail: 'HTML/CSS/JavaScriptで画面イメージを確認する', due: offsetDate(3), priority: 'high', status: 'doing', label: 'purple' },
    { id: 6, title: 'DB製品の比較', detail: 'SQLite / MySQL / PostgreSQL', due: '', priority: 'low', status: 'doing', label: 'yellow' },
    { id: 7, title: '基本設計書を書く', detail: '画面構成とデータ設計', due: offsetDate(-3), priority: 'mid', status: 'done', label: 'blue' },
    { id: 8, title: '要件定義書を書く', detail: '', due: offsetDate(-7), priority: 'mid', status: 'done', label: '' },
  ].map((c, i) => ({ ...c, position: i }));

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); } catch (e) { /* 保存できなくても動作は続ける */ }
  };
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 読めなければサンプルにする */ }
    return sampleCards();
  };
  const nextId = () => cards.reduce((max, c) => Math.max(max, c.id), 0) + 1;
  const inColumn = (status) => cards.filter((c) => c.status === status).sort((a, b) => a.position - b.position);
  const renumber = (status) => inColumn(status).forEach((c, i) => { c.position = i; });

  // ---------- 絞り込み ----------
  const $ = (sel) => document.querySelector(sel);
  const filters = () => ({
    keyword: $('#search').value.trim().toLowerCase(),
    priority: $('#filter-priority').value,
    due: $('#filter-due').value,
    label: $('#filter-label').value,
  });
  const isFiltering = () => Object.values(filters()).some((v) => v !== '');
  const matches = (card, f) => {
    if (f.keyword && !`${card.title}\n${card.detail}`.toLowerCase().includes(f.keyword)) return false;
    if (f.priority && card.priority !== f.priority) return false;
    if (f.due && dueState(card) !== f.due) return false;
    if (f.label && card.label !== f.label) return false;
    return true;
  };

  // ---------- 描画 ----------
  const formatDue = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${y}/${m}/${d}`;
  };

  const buildCard = (card, canDrag) => {
    const el = document.createElement('article');
    const state = dueState(card);
    el.className = `card ${state === 'normal' ? '' : state}`.trim();
    el.dataset.id = card.id;
    el.dataset.label = card.label;
    el.draggable = canDrag;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.title;
    el.append(title);

    if (card.detail) {
      const detail = document.createElement('div');
      detail.className = 'card-detail';
      detail.textContent = card.detail;
      el.append(detail);
    }

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    const pri = document.createElement('span');
    pri.className = `priority ${card.priority}`;
    pri.textContent = `${PRIORITY_MARK[card.priority]} ${PRIORITY_LABEL[card.priority]}`;
    meta.append(pri);

    if (card.due) {
      const due = document.createElement('span');
      due.className = 'due';
      due.textContent = `期限 ${formatDue(card.due)}`;
      meta.append(due);
    }
    if (state === 'overdue' || state === 'soon') {
      const badge = document.createElement('span');
      badge.className = 'due-badge';
      badge.textContent = state === 'overdue' ? '期限切れ' : (daysUntil(card.due) === 0 ? '今日まで' : '明日まで');
      meta.append(badge);
    }
    el.append(meta);
    return el;
  };

  const render = () => {
    const f = filters();
    const filtering = isFiltering();
    $('#drag-hint').hidden = !filtering;

    document.querySelectorAll('.card-list').forEach((list) => {
      const status = list.dataset.status;
      list.replaceChildren();
      const all = inColumn(status);
      const visible = all.filter((c) => matches(c, f));
      visible.forEach((c) => list.append(buildCard(c, !filtering)));
      list.closest('.column').querySelector('.count').textContent =
        filtering ? `${visible.length} / ${all.length}` : String(all.length);
    });
  };

  // ---------- モーダル ----------
  const modal = $('#modal');
  const form = $('#card-form');

  // ラベル色のラジオボタンを作る
  $('#f-label').replaceChildren(...LABEL_COLORS.map((c) => {
    const label = document.createElement('label');
    label.title = c.name;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'label';
    input.value = c.value;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.dataset.color = c.value;
    label.append(input, swatch);
    return label;
  }));

  const setLabelChoice = (value) => {
    const target = form.querySelector(`input[name="label"][value="${value}"]`);
    if (target) target.checked = true;
  };

  const openModal = (card) => {
    editingId = card ? card.id : null;
    $('#modal-title').textContent = card ? 'カードを編集' : 'カードを追加';
    $('#f-title').value = card ? card.title : '';
    $('#f-detail').value = card ? card.detail : '';
    $('#f-due').value = card ? card.due : '';
    $('#f-priority').value = card ? card.priority : 'mid';
    setLabelChoice(card ? card.label : '');
    $('#delete').hidden = !card;
    modal.showModal();
    $('#f-title').focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#f-title').value.trim();
    if (!title) { $('#f-title').setCustomValidity('タイトルを入力してください'); $('#f-title').reportValidity(); return; }
    const checked = form.querySelector('input[name="label"]:checked');
    const data = {
      title,
      detail: $('#f-detail').value.trim(),
      due: $('#f-due').value,
      priority: $('#f-priority').value,
      label: checked ? checked.value : '',
    };
    if (editingId === null) {
      // 新規は「未着手」列の末尾へ
      cards.push({ id: nextId(), status: 'todo', position: inColumn('todo').length, ...data });
    } else {
      Object.assign(cards.find((c) => c.id === editingId), data);
    }
    save();
    render();
    modal.close();
  });
  $('#f-title').addEventListener('input', (e) => e.target.setCustomValidity(''));

  $('#cancel').addEventListener('click', () => modal.close());
  $('#delete').addEventListener('click', () => {
    if (!confirm('このカードを削除しますか?')) return;
    const card = cards.find((c) => c.id === editingId);
    cards = cards.filter((c) => c.id !== editingId);
    if (card) renumber(card.status);
    save();
    render();
    modal.close();
  });
  // モーダル外(背景)クリックで閉じる
  modal.addEventListener('mousedown', (e) => { if (e.target === modal) modal.close(); });

  $('#add').addEventListener('click', () => openModal(null));
  document.querySelector('.board').addEventListener('click', (e) => {
    const el = e.target.closest('.card');
    if (el) openModal(cards.find((c) => c.id === Number(el.dataset.id)));
  });

  // ---------- 検索・絞り込みの入力 ----------
  ['#search', '#filter-priority', '#filter-due', '#filter-label'].forEach((sel) => {
    $(sel).addEventListener('input', render);
  });
  $('#filter-clear').addEventListener('click', () => {
    $('#search').value = '';
    ['#filter-priority', '#filter-due', '#filter-label'].forEach((sel) => { $(sel).value = ''; });
    render();
  });

  $('#reset').addEventListener('click', () => {
    if (!confirm('カードをすべてサンプルデータに戻しますか?')) return;
    cards = sampleCards();
    save();
    render();
  });

  // ---------- ドラッグ&ドロップ ----------
  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';

  // マウス位置より下にある最初のカード(この手前に挿入する)。なければnull
  const cardAfter = (list, y) => {
    const others = [...list.querySelectorAll('.card:not(.dragging)')];
    return others.find((el) => {
      const box = el.getBoundingClientRect();
      return y < box.top + box.height / 2;
    }) || null;
  };

  const clearDragUI = () => {
    indicator.remove();
    document.querySelectorAll('.card-list.drag-over').forEach((l) => l.classList.remove('drag-over'));
  };

  const board = document.querySelector('.board');

  board.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.card');
    if (!el) return;
    draggingId = Number(el.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(draggingId));
    // dragging クラスは描画後に付ける(付けるとドラッグ画像まで薄くなるため)
    requestAnimationFrame(() => el.classList.add('dragging'));
  });

  board.addEventListener('dragover', (e) => {
    const list = e.target.closest('.card-list');
    if (!list || draggingId === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.card-list.drag-over').forEach((l) => { if (l !== list) l.classList.remove('drag-over'); });
    list.classList.add('drag-over');
    const after = cardAfter(list, e.clientY);
    if (after) list.insertBefore(indicator, after);
    else list.append(indicator);
  });

  board.addEventListener('dragleave', (e) => {
    if (!board.contains(e.relatedTarget)) clearDragUI();
  });

  board.addEventListener('drop', (e) => {
    const list = e.target.closest('.card-list');
    if (!list || draggingId === null) return;
    e.preventDefault();
    const status = list.dataset.status;
    const afterEl = cardAfter(list, e.clientY);
    const afterId = afterEl ? Number(afterEl.dataset.id) : null;

    const moving = cards.find((c) => c.id === draggingId);
    const oldStatus = moving.status;
    moving.status = status;

    // 移動先の列を並べ直す(絞り込み中はドラッグ不可なので、表示中=全カード)
    const order = inColumn(status).filter((c) => c.id !== moving.id);
    const index = afterId === null ? order.length : order.findIndex((c) => c.id === afterId);
    order.splice(index, 0, moving);
    order.forEach((c, i) => { c.position = i; });
    if (oldStatus !== status) renumber(oldStatus);

    clearDragUI();
    draggingId = null;
    save();
    render();
  });

  board.addEventListener('dragend', () => {
    draggingId = null;
    clearDragUI();
    document.querySelectorAll('.card.dragging').forEach((el) => el.classList.remove('dragging'));
  });

  // ---------- 起動 ----------
  cards = load();
  render();
})();
