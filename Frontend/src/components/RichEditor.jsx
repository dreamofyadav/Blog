import { useRef, useCallback, useEffect } from 'react';
import api from '../utils/api';
import './RichEditor.css';

// ─── Sanitize before save ────────────────────────────────────────────────────
// Strips editor-only DOM nodes and attributes so the stored HTML is clean:
//   • contenteditable / data-placeholder  (caption editing)
//   • .editor-image-controls              (remove/change overlay buttons)
const sanitizeContent = (html) => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  tmp.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  tmp.querySelectorAll('[data-placeholder]').forEach(el => el.removeAttribute('data-placeholder'));
  tmp.querySelectorAll('.editor-image-controls').forEach(el => el.remove());

  return tmp.innerHTML;
};

// ─── Attach image controls to a <figure> ────────────────────────────────────
// Creates the hover overlay (Remove + Change buttons) and wires up their logic.
// Called both when a fresh image is inserted and when loading saved HTML.
const attachImageControls = (figure, { onRemove, onChange }) => {
  // Remove any stale controls first (e.g. after reloading saved content)
  figure.querySelectorAll('.editor-image-controls').forEach(el => el.remove());

  const controls = document.createElement('div');
  controls.className = 'editor-image-controls';
  controls.contentEditable = 'false'; // must not be editable

  // ── Remove button ──
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'img-ctrl-btn img-ctrl-remove';
  removeBtn.innerHTML = '✕ Remove';
  removeBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(figure);
  });

  // ── Change button ──
  const changeBtn = document.createElement('button');
  changeBtn.type = 'button';
  changeBtn.className = 'img-ctrl-btn img-ctrl-change';
  changeBtn.innerHTML = '🔄 Change';

  // Hidden file input scoped to this figure
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) onChange(figure, file);
    e.target.value = '';
  });

  changeBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  controls.appendChild(removeBtn);
  controls.appendChild(changeBtn);
  controls.appendChild(fileInput);

  // Insert controls as first child of figure so it sits above the image
  figure.insertBefore(controls, figure.firstChild);
};

// ─── Re-attach caption listeners (for loaded HTML) ───────────────────────────
const reattachCaptionListeners = (editorEl, onInput) => {
  editorEl.querySelectorAll('figcaption').forEach(cap => {
    const fresh = cap.cloneNode(true);
    fresh.contentEditable = 'true';
    fresh.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') ev.preventDefault();
    });
    fresh.addEventListener('input', () => onInput());
    cap.replaceWith(fresh);
  });
};

// ─── Toolbar button definitions ──────────────────────────────────────────────
const TOOLBAR_BUTTONS = [
  { cmd: 'bold',               icon: '<strong>B</strong>', title: 'Bold (Ctrl+B)'    },
  { cmd: 'italic',             icon: '<em>I</em>',         title: 'Italic (Ctrl+I)'  },
  { cmd: 'underline',          icon: '<u>U</u>',           title: 'Underline (Ctrl+U)'},
  { cmd: 'strikeThrough',      icon: '<s>S</s>',           title: 'Strikethrough'    },
  { type: 'sep' },
  { cmd: 'formatBlock', value: 'h1',         icon: 'H1', title: 'Heading 1'  },
  { cmd: 'formatBlock', value: 'h2',         icon: 'H2', title: 'Heading 2'  },
  { cmd: 'formatBlock', value: 'h3',         icon: 'H3', title: 'Heading 3'  },
  { cmd: 'formatBlock', value: 'p',          icon: 'P',  title: 'Paragraph'  },
  { cmd: 'formatBlock', value: 'blockquote', icon: '❝',  title: 'Blockquote' },
  { type: 'sep' },
  { cmd: 'insertUnorderedList', icon: '≡',   title: 'Bullet list'   },
  { cmd: 'insertOrderedList',   icon: '1.',  title: 'Numbered list' },
  { type: 'sep' },
  { cmd: 'justifyLeft',   icon: '⬛⬜⬜', title: 'Align left'   },
  { cmd: 'justifyCenter', icon: '⬜⬛⬜', title: 'Align center' },
  { cmd: 'justifyRight',  icon: '⬜⬜⬛', title: 'Align right'  },
  { type: 'sep' },
  { cmd: 'createLink',           icon: '🔗', title: 'Insert link',    special: 'link' },
  { cmd: 'insertHorizontalRule', icon: '—',  title: 'Horizontal rule' },
  { type: 'sep' },
  { cmd: 'undo', icon: '↩', title: 'Undo (Ctrl+Z)' },
  { cmd: 'redo', icon: '↪', title: 'Redo (Ctrl+Y)' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function RichEditor({ value, onChange, readOnly = false }) {
  const editorRef    = useRef(null);
  const fileInputRef = useRef(null);           // toolbar "Insert Image" input
  const isInternalChange = useRef(false);

  // ── handleInput: sanitize then emit ────────────────────────────────────────
  const handleInput = useCallback(() => {
    if (readOnly) return;
    isInternalChange.current = true;
    const clean = sanitizeContent(editorRef.current?.innerHTML || '');
    onChange?.(clean);
  }, [readOnly, onChange]);

  // ── Remove a <figure> from the editor ──────────────────────────────────────
  const removeImage = useCallback((figure) => {
    // Insert a paragraph in its place so the cursor has somewhere to land
    const para = document.createElement('p');
    para.innerHTML = '<br>';
    figure.replaceWith(para);

    // Move caret into the replacement paragraph
    const range = document.createRange();
    range.setStart(para, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    handleInput();
  }, [handleInput]);

  // ── Replace the <img> inside a <figure> with a new upload ──────────────────
  const changeImage = useCallback(async (figure, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }

    const img = figure.querySelector('img.editor-image');
    if (!img) return;

    // Show a loading state on the existing image
    img.style.opacity = '0.4';
    const loadingLabel = document.createElement('p');
    loadingLabel.className = 'img-uploading';
    loadingLabel.textContent = '⏳ Uploading new image…';
    figure.insertBefore(loadingLabel, img);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      img.src = res.data.url;
      img.style.opacity = '1';
      loadingLabel.remove();
      handleInput();
    } catch {
      img.style.opacity = '1';
      loadingLabel.remove();
      alert('Failed to upload replacement image.');
    }
  }, [handleInput]);

  // ── Build a complete <figure> DOM node ─────────────────────────────────────
  const buildFigure = useCallback((imageUrl) => {
    const figure = document.createElement('figure');
    figure.className = 'editor-image-figure';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Blog image';
    img.className = 'editor-image';
    img.style.maxWidth = '100%';

    const caption = document.createElement('figcaption');
    caption.contentEditable = 'true';
    caption.className = 'editor-image-caption';
    caption.dataset.placeholder = 'Add a caption…';
    caption.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') ev.preventDefault();
    });
    caption.addEventListener('input', () => handleInput());

    figure.appendChild(img);
    figure.appendChild(caption);

    // Attach the remove / change overlay
    attachImageControls(figure, {
      onRemove: removeImage,
      onChange: changeImage,
    });

    return figure;
  }, [handleInput, removeImage, changeImage]);

  // ── Load content into editor ────────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || value === undefined) return;
    if (isInternalChange.current || editorRef.current.innerHTML === value) {
      isInternalChange.current = false;
      return;
    }

    editorRef.current.innerHTML = value || '<p><br></p>';

    if (!readOnly) {
      reattachCaptionListeners(editorRef.current, handleInput);

      // Re-attach image controls to every <figure> in the loaded HTML
      editorRef.current.querySelectorAll('figure.editor-image-figure').forEach(fig => {
        attachImageControls(fig, { onRemove: removeImage, onChange: changeImage });
      });
    }

    isInternalChange.current = false;
  }, [value, readOnly, handleInput, removeImage, changeImage]);

  // ── Exec helper ────────────────────────────────────────────────────────────
  const exec = useCallback((cmd, val = null) => {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  }, [readOnly, handleInput]);

  const handleToolbarClick = (btn, e) => {
    e.preventDefault();
    if (readOnly || btn.type === 'sep') return;
    if (btn.special === 'link') {
      const url = prompt('Enter URL:');
      if (url) exec('createLink', url);
      return;
    }
    exec(btn.cmd, btn.value || null);
  };

  const handleKeyDown = (e) => {
    if (readOnly) { e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); exec('bold');      break;
        case 'i': e.preventDefault(); exec('italic');    break;
        case 'u': e.preventDefault(); exec('underline'); break;
        default: break;
      }
    }
  };

  // ── Upload image at cursor position ────────────────────────────────────────
  const saveSelection = () => {
    const sel = window.getSelection();
    return sel?.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
  };

  const restoreSelection = (range) => {
    if (!range) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const uploadAndInsertImage = async (file) => {
    if (!file || !file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }

    const formData = new FormData();
    formData.append('image', file);

    // Save / resolve insertion point
    const range = saveSelection() || (() => {
      const r = document.createRange();
      r.selectNodeContents(editorRef.current);
      r.collapse(false);
      return r;
    })();

    editorRef.current.focus();
    restoreSelection(range);

    // Show uploading placeholder
    const placeholder = document.createElement('p');
    placeholder.className = 'img-uploading';
    placeholder.textContent = '⏳ Uploading image…';
    range.insertNode(placeholder);

    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const figure = buildFigure(res.data.url);

      // Paragraph after figure so the cursor can continue writing
      const afterPara = document.createElement('p');
      afterPara.innerHTML = '<br>';

      placeholder.replaceWith(figure);
      figure.insertAdjacentElement('afterend', afterPara);

      // Move caret to after-paragraph
      const newRange = document.createRange();
      newRange.setStart(afterPara, 0);
      newRange.collapse(true);
      restoreSelection(newRange);

      handleInput();
    } catch (err) {
      console.error(err);
      placeholder.remove();
      alert('Failed to upload image. Make sure you are logged in and try again.');
    }
  };

  // ── Toolbar image button ────────────────────────────────────────────────────
  const handleImageButtonClick = (e) => {
    e.preventDefault();
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (file) await uploadAndInsertImage(file);
    e.target.value = '';
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleDrop = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      let range;
      if (document.caretRangeFromPoint)      range = document.caretRangeFromPoint(e.clientX, e.clientY);
      else if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
      }
      if (range) restoreSelection(range);
      await uploadAndInsertImage(file);
    }
  };

  // ── Paste ──────────────────────────────────────────────────────────────────
  const handlePaste = async (e) => {
    if (readOnly) { e.preventDefault(); return; }
    const imgItem = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      await uploadAndInsertImage(imgItem.getAsFile());
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`rich-editor ${readOnly ? 'rich-editor--readonly' : ''}`}>

      {/* Toolbar */}
      <div className={`editor-toolbar ${readOnly ? 'editor-toolbar--readonly' : ''}`}>
        {TOOLBAR_BUTTONS.map((btn, i) =>
          btn.type === 'sep' ? (
            <span key={i} className="toolbar-sep" />
          ) : (
            <button
              key={i}
              type="button"
              title={readOnly ? 'Enable editing to use toolbar' : btn.title}
              className="toolbar-btn"
              onMouseDown={(e) => handleToolbarClick(btn, e)}
              dangerouslySetInnerHTML={{ __html: btn.icon }}
              disabled={readOnly}
            />
          )
        )}

        <span className="toolbar-sep" />

        <button
          type="button"
          title={readOnly ? 'Enable editing to upload images' : 'Insert Image  (drag & drop or paste also works)'}
          className="toolbar-btn toolbar-img-btn"
          onMouseDown={handleImageButtonClick}
          disabled={readOnly}
        >
          🖼 Image
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={readOnly}
        />

        {readOnly && <span className="toolbar-readonly-badge">🔒 Read-only</span>}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        className={`editor-area ${readOnly ? 'editor-area--readonly' : ''}`}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
        data-placeholder="Write your story here… Drag & drop or paste images anytime."
      />
    </div>
  );
}
