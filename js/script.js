
const LS_KEY = 'credentials_notes_v1';
const canvas = document.getElementById('canvas');
const copySelectionBtn = document.getElementById('copySelection');

let notes = loadNotes();
let drag = { active: false, id: null, offsetX: 0, offsetY: 0 };
let emptyNote = null;

notes.forEach(n => createNoteElement(n));

// Add new note
canvas.addEventListener('mousedown', (e) => {
    if (e.target !== canvas) return;

    // remove existing empty note if any
    if (emptyNote) { emptyNote.querySelector('.editor').innerText.length <= 0 ? emptyNote.remove() : emptyNote = null }

    const note = createEditableNote({ id: genId(), text: '', x: e.clientX, y: e.clientY });
    canvas.appendChild(note);
    emptyNote = note;
    setTimeout(() => note.querySelector('.editor').focus(), 0);
});
 
// Drag start
document.addEventListener('mousedown', (e) => {
    const noteEl = e.target.closest && e.target.closest('.note');
    if (!noteEl || !noteEl.classList.contains('moving')) return;
    drag.active = true;
    drag.id = noteEl.dataset.id;
    drag.offsetX = e.clientX - noteEl.offsetLeft;
    drag.offsetY = e.clientY - noteEl.offsetTop;
    e.preventDefault();
});

// Drag move
document.addEventListener('mousemove', (e) => {
    if (!drag.active) return;
    const noteEl = document.querySelector(`.note[data-id="${drag.id}"]`);
    if (!noteEl) return;
    noteEl.style.left = (e.clientX - drag.offsetX) + 'px';
    noteEl.style.top = (e.clientY - drag.offsetY) + 'px';
});

// Drag stop
document.addEventListener('mouseup', () => {
    if (!drag.active) return;
    const noteEl = document.querySelector(`.note[data-id="${drag.id}"]`);
    if (noteEl) {
        const id = noteEl.dataset.id;
        const idx = notes.findIndex(n => n.id === id);
        if (idx !== -1) {
            notes[idx].x = parseInt(noteEl.style.left);
            notes[idx].y = parseInt(noteEl.style.top);
            saveNotes();
        }
        noteEl.classList.remove('moving');
    }
    drag = { active: false, id: null, offsetX: 0, offsetY: 0 };
});

// Helpers
function genId() { return 'n_' + Math.random().toString(36).slice(2, 9); }
function loadNotes() {
    const v2 = localStorage.getItem(LS_KEY);
    if (v2) try { return JSON.parse(v2); } catch { }
    return [];
}
function saveNotes() { localStorage.setItem(LS_KEY, JSON.stringify(notes)); }

function createToolbar(noteObj, noteEl) {
    const bar = document.createElement('div');
    bar.className = 'toolbar';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = (e) => { e.stopPropagation(); enableEdit(noteObj, noteEl); };

    const moveBtn = document.createElement('button');
    moveBtn.textContent = 'Move';
    moveBtn.onclick = (e) => {
        e.stopPropagation();
        noteEl.classList.add('moving');
    };

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Delete this note?')) {
            notes = notes.filter(n => n.id !== noteObj.id);
            saveNotes();
            noteEl.remove();
        }
    };

    bar.append(editBtn, moveBtn, delBtn);
    return bar;
}

function createNoteElement(noteObj) {
    const el = document.createElement('div');
    el.className = 'note';
    el.dataset.id = noteObj.id;
    el.style.left = (noteObj.x || 50) + 'px';
    el.style.top = (noteObj.y || 50) + 'px';

    const toolbar = createToolbar(noteObj, el);
    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = noteObj.text;

    el.append(toolbar, content);
    enableSelectionCopy(el);
    canvas.appendChild(el);
    return el;
}

function createEditableNote(noteObj) {
    const el = document.createElement('div');
    el.className = 'note';
    el.dataset.id = noteObj.id;
    el.style.left = (noteObj.x || 50) + 'px';
    el.style.top = (noteObj.y || 50) + 'px';

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = (e) => { e.stopPropagation(); saveNote(el); emptyNote = null; };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = (e) => {
        e.stopPropagation();
        emptyNote = null;
        if (getNoteById(noteObj.id)) {
            el.replaceWith(createNoteElement(getNoteById(noteObj.id)));
        } else {
            el.remove();
        }
    };

    toolbar.append(saveBtn, cancelBtn);

    const editor = document.createElement('div');
    editor.className = 'editor';
    editor.contentEditable = true;
    editor.textContent = noteObj.text || '';

    el.append(toolbar, editor);
    return el;
}

function enableEdit(noteObj, noteEl) {
    const editing = createEditableNote({ id: noteObj.id, text: noteObj.text, x: parseInt(noteEl.style.left), y: parseInt(noteEl.style.top) });
    noteEl.replaceWith(editing);
    // emptyNote = editing;
    editing.querySelector('.editor').focus();
}

function saveNote(editEl) {
    const id = editEl.dataset.id;
    const editor = editEl.querySelector('.editor');
    const text = (editor.innerText || '').trim();
    if (!text) { editEl.remove(); return; }

    const x = parseInt(editEl.style.left) || 50;
    const y = parseInt(editEl.style.top) || 50;

    const idx = notes.findIndex(n => n.id === id);
    const newObj = { id, text, x, y };
    if (idx === -1) { notes.push(newObj); } else { notes[idx] = newObj; }
    saveNotes();

    const display = createNoteElement(newObj);
    editEl.replaceWith(display);
}

function getNoteById(id) { return notes.find(n => n.id === id); }
function enableSelectionCopy(note) {
    const editor = note.querySelector('.editor') || note.querySelector('.content');
    if (!editor) return;

    editor.addEventListener('mouseup', (e) => {
        const sel = window.getSelection();
        const text = sel ? sel.toString() : '';

        // Only show copy if selection belongs to THIS editor
        if (text.trim() && editor.contains(sel.anchorNode)) {
            copySelectionBtn.style.left = e.pageX + 'px';
            copySelectionBtn.style.top = e.pageY + 'px';
            copySelectionBtn.style.display = 'block';
            copySelectionBtn.onclick = () => {
                navigator.clipboard.writeText(text);
                copySelectionBtn.style.display = 'none';
            };
        } else {
            copySelectionBtn.style.display = 'none';
        }
    });
} 