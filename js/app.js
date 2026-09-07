/**
 * VidaOS - Personal Blog System
 * iOS Liquid Glass Style
 * All data stored locally in localStorage
 */

// ==========================================
// State Management
// ==========================================
const AppState = {
    posts: [],
    currentView: 'home',
    editingPostId: null,
    tempImages: [],
    tempTags: [],
    confirmCallback: null,
};

// ==========================================
// Storage
// ==========================================
const Storage = {
    KEY: 'vidaos_data',

    load() {
        try {
            const data = localStorage.getItem(this.KEY);
            if (data) {
                const parsed = JSON.parse(data);
                AppState.posts = parsed.posts || [];
            }
        } catch (e) {
            console.error('Failed to load data:', e);
            AppState.posts = [];
        }
    },

    save() {
        try {
            localStorage.setItem(this.KEY, JSON.stringify({ posts: AppState.posts }));
        } catch (e) {
            console.error('Failed to save data:', e);
            showToast('保存失败，存储空间可能已满', 'error');
        }
    },

    clear() {
        localStorage.removeItem(this.KEY);
        AppState.posts = [];
    }
};

// ==========================================
// Utilities
// ==========================================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatFullDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} / ${days[date.getDay()]}`;
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ==========================================
// Post Management
// ==========================================
const PostManager = {
    create(title, content, type, images = [], tags = []) {
        const post = {
            id: generateId(),
            title: title.trim(),
            content: content.trim(),
            type,
            images,
            tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        AppState.posts.unshift(post);
        Storage.save();
        return post;
    },

    update(id, updates) {
        const index = AppState.posts.findIndex(p => p.id === id);
        if (index === -1) return null;
        AppState.posts[index] = {
            ...AppState.posts[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        Storage.save();
        return AppState.posts[index];
    },

    delete(id) {
        const index = AppState.posts.findIndex(p => p.id === id);
        if (index === -1) return false;
        AppState.posts.splice(index, 1);
        Storage.save();
        return true;
    },

    get(id) {
        return AppState.posts.find(p => p.id === id);
    },

    getAll() {
        return [...AppState.posts];
    },

    getByType(type) {
        return AppState.posts.filter(p => p.type === type);
    },

    getByTag(tag) {
        return AppState.posts.filter(p => p.tags.includes(tag));
    },

    getRecent(limit = 10) {
        return AppState.posts.slice(0, limit);
    },

    getAllTags() {
        const tagMap = new Map();
        AppState.posts.forEach(post => {
            post.tags.forEach(tag => {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
        });
        return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
    },

    getAllImages() {
        const images = [];
        AppState.posts.forEach(post => {
            post.images.forEach(img => {
                images.push({ src: img, postId: post.id, postTitle: post.title });
            });
        });
        return images;
    },

    getUniqueDays() {
        const days = new Set();
        AppState.posts.forEach(post => {
            days.add(post.createdAt.split('T')[0]);
        });
        return days.size;
    }
};

// ==========================================
// Import / Export
// ==========================================
const DataIO = {
    // Export to JSON
    exportJSON() {
        const data = { posts: AppState.posts, exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `vidaos_export_${this.dateSuffix()}.json`);
    },

    // Export to TXT
    exportTXT() {
        let content = '=== VidaOS Export ===\n';
        content += `Export Date: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `Total Posts: ${AppState.posts.length}\n`;
        content += '='.repeat(40) + '\n\n';

        AppState.posts.forEach((post, i) => {
            content += `[${i + 1}] ${post.title || 'Untitled'}\n`;
            content += `Type: ${post.type}\n`;
            content += `Date: ${new Date(post.createdAt).toLocaleString('zh-CN')}\n`;
            content += `Tags: ${post.tags.join(', ') || 'None'}\n`;
            content += '-' * 30 + '\n';
            content += post.content + '\n';
            if (post.images.length > 0) {
                content += `\n[Images: ${post.images.length}]\n`;
            }
            content += '\n' + '='.repeat(40) + '\n\n';
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        this.downloadFile(blob, `vidaos_export_${this.dateSuffix()}.txt`);
    },

    // Export to Markdown
    exportMarkdown() {
        let content = '# VidaOS Blog Export\n\n';
        content += `> Exported on ${new Date().toLocaleString('zh-CN')}\n\n`;
        content += `---\n\n`;

        AppState.posts.forEach(post => {
            content += `## ${post.title || 'Untitled'}\n\n`;
            content += `**Type:** ${post.type} | **Date:** ${new Date(post.createdAt).toLocaleString('zh-CN')}\n\n`;
            if (post.tags.length > 0) {
                content += `**Tags:** ${post.tags.map(t => `#${t}`).join(' ')}\n\n`;
            }
            content += post.content + '\n\n';
            if (post.images.length > 0) {
                post.images.forEach(img => {
                    content += `![Image](${img})\n\n`;
                });
            }
            content += `---\n\n`;
        });

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        this.downloadFile(blob, `vidaos_export_${this.dateSuffix()}.md`);
    },

    // Export to PDF
    exportPDF() {
        const element = document.createElement('div');
        element.style.cssText = 'padding: 40px; font-family: system-ui, sans-serif; color: #333; line-height: 1.7;';

        let html = '<h1 style="text-align:center; color: #007AFF;">VidaOS</h1>';
        html += `<p style="text-align:center; color: #666;">Exported on ${new Date().toLocaleString('zh-CN')}</p>`;
        html += '<hr style="margin: 20px 0;">';

        AppState.posts.forEach(post => {
            html += `<h2>${escapeHtml(post.title || 'Untitled')}</h2>`;
            html += `<p style="color: #666; font-size: 14px;">`;
            html += `Type: ${post.type} | Date: ${new Date(post.createdAt).toLocaleString('zh-CN')}</p>`;
            if (post.tags.length > 0) {
                html += `<p style="color: #007AFF; font-size: 13px;">Tags: ${post.tags.map(t => '#' + escapeHtml(t)).join(' ')}</p>`;
            }
            html += '<div style="margin: 16px 0;">';
            const lines = post.content.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    html += `<p>${escapeHtml(line)}</p>`;
                } else {
                    html += '<br>';
                }
            });
            html += '</div>';
            html += '<hr style="margin: 24px 0; border-color: #eee;">';
        });

        element.innerHTML = html;
        document.body.appendChild(element);

        const opt = {
            margin: [15, 15],
            filename: `vidaos_export_${this.dateSuffix()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
            showToast('PDF 导出成功');
        }).catch(err => {
            document.body.removeChild(element);
            console.error('PDF export failed:', err);
            showToast('PDF 导出失败', 'error');
        });
    },

    // Import
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const ext = file.name.split('.').pop().toLowerCase();

                    if (ext === 'json') {
                        const data = JSON.parse(content);
                        if (data.posts && Array.isArray(data.posts)) {
                            AppState.posts = [...data.posts, ...AppState.posts];
                            Storage.save();
                            resolve({ count: data.posts.length, type: 'JSON' });
                        } else {
                            reject(new Error('无效的 JSON 格式'));
                        }
                    } else if (ext === 'txt') {
                        const posts = this.parseTXT(content);
                        AppState.posts = [...posts, ...AppState.posts];
                        Storage.save();
                        resolve({ count: posts.length, type: 'TXT' });
                    } else if (ext === 'md' || ext === 'markdown') {
                        const posts = this.parseMarkdown(content);
                        AppState.posts = [...posts, ...AppState.posts];
                        Storage.save();
                        resolve({ count: posts.length, type: 'Markdown' });
                    } else {
                        reject(new Error('不支持的文件格式'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    },

    parseTXT(content) {
        const posts = [];
        const sections = content.split(/={40,}/).filter(s => s.trim());

        sections.forEach(section => {
            const lines = section.trim().split('\n');
            if (lines.length < 2) return;

            let title = '';
            let type = 'diary';
            let date = new Date().toISOString();
            let tags = [];
            let bodyLines = [];
            let inBody = false;

            lines.forEach(line => {
                if (line.startsWith('[') && line.includes(']')) {
                    title = line.replace(/^\[\d+\]\s*/, '').trim();
                } else if (line.startsWith('Type:')) {
                    type = line.replace('Type:', '').trim();
                } else if (line.startsWith('Date:')) {
                    const d = new Date(line.replace('Date:', '').trim());
                    if (!isNaN(d)) date = d.toISOString();
                } else if (line.startsWith('Tags:')) {
                    tags = line.replace('Tags:', '').split(',').map(t => t.trim()).filter(t => t && t !== 'None');
                } else if (line.startsWith('-') && line.replace(/-/g, '').trim() === '') {
                    inBody = true;
                } else if (inBody && !line.startsWith('[Images:')) {
                    bodyLines.push(line);
                }
            });

            if (bodyLines.length > 0 || title) {
                posts.push({
                    id: generateId(),
                    title,
                    content: bodyLines.join('\n').trim(),
                    type,
                    images: [],
                    tags,
                    createdAt: date,
                    updatedAt: date,
                });
            }
        });

        return posts;
    },

    parseMarkdown(content) {
        const posts = [];
        // Split by horizontal rules, looking for h2 headings
        const sections = content.split(/\n---\s*\n/).filter(s => s.trim());

        sections.forEach(section => {
            const lines = section.trim().split('\n');
            let title = '';
            let type = 'diary';
            let date = new Date().toISOString();
            let tags = [];
            let bodyLines = [];
            let inBody = false;

            lines.forEach(line => {
                if (line.startsWith('## ')) {
                    title = line.replace('## ', '').trim();
                } else if (line.startsWith('**Type:**')) {
                    const match = line.match(/Type:\s*(\w+)/);
                    if (match) type = match[1];
                } else if (line.startsWith('**Date:**')) {
                    const d = new Date(line.replace('**Date:**', '').replace(/\*\*/g, '').trim());
                    if (!isNaN(d)) date = d.toISOString();
                } else if (line.startsWith('**Tags:**')) {
                    const tagStr = line.replace('**Tags:**', '').replace(/\*\*/g, '').trim();
                    tags = tagStr.split(/\s+/).map(t => t.replace(/^#/, '')).filter(Boolean);
                } else if (line.startsWith('>')) {
                    // skip metadata lines
                } else if (line.startsWith('![')) {
                    // skip images for now
                } else if (line.trim() && !line.startsWith('#')) {
                    bodyLines.push(line);
                }
            });

            if (bodyLines.length > 0 || title) {
                posts.push({
                    id: generateId(),
                    title,
                    content: bodyLines.join('\n').trim(),
                    type,
                    images: [],
                    tags,
                    createdAt: date,
                    updatedAt: date,
                });
            }
        });

        return posts;
    },

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`${filename} 导出成功`);
    },

    dateSuffix() {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    }
};

// ==========================================
// UI Rendering
// ==========================================
const UI = {
    updateStats() {
        document.getElementById('totalPosts').textContent = AppState.posts.length;
        document.getElementById('totalPhotos').textContent = PostManager.getAllImages().length;
        document.getElementById('totalTags').textContent = PostManager.getAllTags().length;
        document.getElementById('totalDays').textContent = PostManager.getUniqueDays();
    },

    updateHeroDateTime() {
        const now = new Date();
        document.getElementById('heroDate').textContent = formatFullDate(now);
        document.getElementById('heroTime').textContent = formatTime(now);
        document.getElementById('statusTime').textContent = formatTime(now);
    },

    renderPostsList(containerId, posts) {
        const container = document.getElementById(containerId);
        if (!posts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <p>还没有记录哦</p>
                    <p class="empty-sub">点击下方按钮开始你的第一篇日记</p>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => this.createPostCard(post)).join('');

        // Attach click handlers
        container.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                openDetailModal(id);
            });
        });
    },

    createPostCard(post) {
        const imagesHtml = post.images.length > 0
            ? `<div class="post-images">${post.images.slice(0, 3).map(img =>
                `<img src="${escapeHtml(img)}" class="post-image-thumb" loading="lazy" alt="">`
            ).join('')}${post.images.length > 3 ? `<div class="post-image-thumb" style="display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.05);font-size:14px;color:var(--text-secondary);">+${post.images.length - 3}</div>` : ''}</div>`
            : '';

        const tagsHtml = post.tags.length > 0
            ? `<div class="post-tags">${post.tags.map(tag => `<span class="post-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';

        const typeLabels = { diary: '日记', photo: '照片', rant: '吐槽' };

        return `
            <article class="post-card" data-id="${post.id}">
                <span class="post-type-badge ${post.type}">${typeLabels[post.type] || post.type}</span>
                <div class="post-header">
                    <h3 class="post-title">${escapeHtml(post.title || '无标题')}</h3>
                    <span class="post-time">${formatDate(post.createdAt)}</span>
                </div>
                <div class="post-content">${escapeHtml(post.content)}</div>
                ${imagesHtml}
                ${tagsHtml}
            </article>
        `;
    },

    renderTimeline() {
        const container = document.getElementById('timeline');
        const posts = PostManager.getAll();

        if (!posts.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <p>时间线为空</p>
                </div>
            `;
            return;
        }

        const grouped = {};
        posts.forEach(post => {
            const date = post.createdAt.split('T')[0];
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(post);
        });

        container.innerHTML = Object.entries(grouped).map(([date, dayPosts]) => {
            const items = dayPosts.map(post => `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div class="timeline-date">${formatDate(post.createdAt)} ${formatTime(post.createdAt)}</div>
                        <div class="timeline-title">${escapeHtml(post.title || '无标题')}</div>
                        <div class="timeline-text">${escapeHtml(post.content.substring(0, 100))}${post.content.length > 100 ? '...' : ''}</div>
                    </div>
                </div>
            `).join('');
            return items;
        }).join('');

        // Add click handlers
        container.querySelectorAll('.timeline-content').forEach(el => {
            el.addEventListener('click', () => {
                const item = el.closest('.timeline-item');
                const index = Array.from(container.querySelectorAll('.timeline-item')).indexOf(item);
                let count = 0;
                for (const [, dayPosts] of Object.entries(grouped)) {
                    if (count + dayPosts.length > index) {
                        openDetailModal(dayPosts[index - count].id);
                        break;
                    }
                    count += dayPosts.length;
                }
            });
        });
    },

    renderTags() {
        const container = document.getElementById('tagsCloud');
        const tags = PostManager.getAllTags();

        if (!tags.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    <p>还没有标签</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tags.map(([tag, count]) => `
            <button class="tag-cloud-item" data-tag="${escapeHtml(tag)}">
                <span>${escapeHtml(tag)}</span>
                <span class="tag-count">${count}</span>
            </button>
        `).join('');

        container.querySelectorAll('.tag-cloud-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.dataset.tag;
                const posts = PostManager.getByTag(tag);
                switchView('home');
                this.renderPostsList('postsList', posts);
                document.querySelector('.section-title').textContent = `#${tag}`;
            });
        });
    },

    renderGallery() {
        const container = document.getElementById('galleryGrid');
        const images = PostManager.getAllImages();

        if (!images.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p>还没有照片</p>
                </div>
            `;
            return;
        }

        container.innerHTML = images.map(img => `
            <div class="gallery-item" data-post-id="${img.postId}">
                <img src="${escapeHtml(img.src)}" loading="lazy" alt="${escapeHtml(img.postTitle || '')}">
            </div>
        `).join('');

        container.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                openDetailModal(item.dataset.postId);
            });
        });
    },
};

// ==========================================
// Modal Functions
// ==========================================
function openEditModal(mode = 'create', postId = null) {
    const modal = document.getElementById('editModal');
    const titleEl = document.getElementById('modalTitle');
    const titleInput = document.getElementById('postTitle');
    const contentInput = document.getElementById('postContent');
    const previewEl = document.getElementById('markdownPreview');
    const imageGrid = document.getElementById('imagePreviewGrid');
    const tagsPreview = document.getElementById('tagsPreview');
    const typeInputs = document.querySelectorAll('input[name="postType"]');

    // Reset state
    AppState.tempImages = [];
    AppState.tempTags = [];
    AppState.editingPostId = postId;
    imageGrid.innerHTML = '';
    tagsPreview.innerHTML = '';
    contentInput.style.display = 'block';
    previewEl.classList.remove('active');
    document.querySelectorAll('.toolbar-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-mode="write"]').classList.add('active');

    if (mode === 'edit' && postId) {
        const post = PostManager.get(postId);
        if (!post) return;
        titleEl.textContent = '编辑';
        titleInput.value = post.title;
        contentInput.value = post.content;
        AppState.tempImages = [...post.images];
        AppState.tempTags = [...post.tags];
        typeInputs.forEach(input => {
            input.checked = input.value === post.type;
        });
    } else {
        titleEl.textContent = mode === 'photo' ? '发照片' : mode === 'rant' ? '吐槽' : '写日记';
        titleInput.value = '';
        contentInput.value = '';
        const targetType = mode === 'photo' ? 'photo' : mode === 'rant' ? 'rant' : 'diary';
        typeInputs.forEach(input => {
            input.checked = input.value === targetType;
        });
    }

    // Render temp images
    AppState.tempImages.forEach(img => addImagePreview(img));
    // Render temp tags
    AppState.tempTags.forEach(tag => addTagChip(tag));

    modal.classList.add('active');
    titleInput.focus();
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    AppState.editingPostId = null;
    AppState.tempImages = [];
    AppState.tempTags = [];
}

function openDetailModal(postId) {
    const post = PostManager.get(postId);
    if (!post) return;

    const modal = document.getElementById('detailModal');
    const titleEl = document.getElementById('detailTitle');
    const bodyEl = document.getElementById('detailBody');

    titleEl.textContent = post.title || '文章详情';

    const typeLabels = { diary: '日记', photo: '照片', rant: '吐槽' };
    const typeColors = { diary: '#007AFF', photo: '#34C759', rant: '#FF3B30' };

    const imagesHtml = post.images.length > 0
        ? `<div class="detail-images">${post.images.map(img =>
            `<img src="${escapeHtml(img)}" alt="">`
        ).join('')}</div>`
        : '';

    const tagsHtml = post.tags.length > 0
        ? `<div class="detail-tags">${post.tags.map(tag =>
            `<span class="post-tag">${escapeHtml(tag)}</span>`
        ).join('')}</div>`
        : '';

    // Convert markdown-like content to HTML
    const contentHtml = post.content
        .split('\n')
        .map(line => {
            if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
            if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
            if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
            if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
            if (line.startsWith('> ')) return `<blockquote>${escapeHtml(line.slice(2))}</blockquote>`;
            if (line.trim() === '') return '<br>';
            return `<p>${escapeHtml(line)}</p>`;
        })
        .join('');

    bodyEl.innerHTML = `
        <div class="detail-meta">
            <span style="color:${typeColors[post.type] || '#007AFF'}">${typeLabels[post.type] || post.type}</span>
            <span>${new Date(post.createdAt).toLocaleString('zh-CN')}</span>
        </div>
        ${imagesHtml}
        <div class="detail-content">${contentHtml}</div>
        ${tagsHtml}
    `;

    // Store current post ID for edit/delete
    modal.dataset.currentPostId = postId;

    modal.classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
    delete document.getElementById('detailModal').dataset.currentPostId;
}

function openImportModal() {
    document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('active');
}

function openConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    AppState.confirmCallback = onConfirm;
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    AppState.confirmCallback = null;
}

// ==========================================
// Image & Tag Helpers
// ==========================================
function addImagePreview(dataUrl) {
    const grid = document.getElementById('imagePreviewGrid');
    const div = document.createElement('div');
    div.className = 'image-preview-item';
    div.innerHTML = `
        <img src="${dataUrl}" alt="">
        <button class="image-preview-remove" onclick="removeTempImage(this)">&times;</button>
    `;
    grid.appendChild(div);
}

function removeTempImage(btn) {
    const item = btn.closest('.image-preview-item');
    const img = item.querySelector('img');
    const idx = AppState.tempImages.indexOf(img.src);
    if (idx > -1) AppState.tempImages.splice(idx, 1);
    item.remove();
}

function addTagChip(tag) {
    const container = document.getElementById('tagsPreview');
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${escapeHtml(tag)} <span class="remove-tag" onclick="removeTempTag(this, '${escapeHtml(tag)}')">&times;</span>`;
    container.appendChild(chip);
}

function removeTempTag(btn, tag) {
    const idx = AppState.tempTags.indexOf(tag);
    if (idx > -1) AppState.tempTags.splice(idx, 1);
    btn.closest('.tag-chip').remove();
}

// ==========================================
// View Navigation
// ==========================================
function switchView(viewName) {
    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewName + 'View').classList.add('active');

    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update side menu
    document.querySelectorAll('.side-menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update header title
    const titles = {
        home: 'VidaOS',
        timeline: '时间线',
        tags: '标签',
        gallery: '图集',
        settings: '设置',
    };
    document.getElementById('headerTitle').textContent = titles[viewName] || 'VidaOS';

    AppState.currentView = viewName;

    // Refresh view data
    if (viewName === 'home') {
        UI.renderPostsList('postsList', PostManager.getRecent());
        document.querySelector('.section-title').textContent = '最近记录';
        UI.updateStats();
    } else if (viewName === 'timeline') {
        UI.renderTimeline();
    } else if (viewName === 'tags') {
        UI.renderTags();
    } else if (viewName === 'gallery') {
        UI.renderGallery();
    }
}

// ==========================================
// Event Handlers Setup
// ==========================================
function setupEventHandlers() {
    // Menu toggle
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuOverlay = document.getElementById('sideMenuOverlay');

    function openSideMenu() {
        sideMenu.classList.add('active');
        sideMenuOverlay.classList.add('active');
    }

    function closeSideMenu() {
        sideMenu.classList.remove('active');
        sideMenuOverlay.classList.remove('active');
    }

    menuBtn.addEventListener('click', openSideMenu);
    sideMenuOverlay.addEventListener('click', closeSideMenu);

    // Side menu navigation
    document.querySelectorAll('.side-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view);
            closeSideMenu();
        });
    });

    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view);
        });
    });

    // Quick action buttons
    document.getElementById('newPostBtn').addEventListener('click', () => openEditModal('create'));
    document.getElementById('newPhotoBtn').addEventListener('click', () => openEditModal('photo'));
    document.getElementById('newRantBtn').addEventListener('click', () => openEditModal('rant'));
    document.getElementById('importBtn').addEventListener('click', openImportModal);
    document.getElementById('viewAllPosts').addEventListener('click', () => {
        UI.renderPostsList('postsList', PostManager.getAll());
        document.querySelector('.section-title').textContent = '全部记录';
    });

    // Modal close buttons
    document.getElementById('modalClose').addEventListener('click', closeEditModal);
    document.getElementById('cancelBtn').addEventListener('click', closeEditModal);
    document.getElementById('detailClose').addEventListener('click', closeDetailModal);
    document.getElementById('importClose').addEventListener('click', closeImportModal);

    // Edit modal save
    document.getElementById('saveBtn').addEventListener('click', () => {
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const type = document.querySelector('input[name="postType"]:checked').value;

        if (!content.trim() && AppState.tempImages.length === 0) {
            showToast('请输入内容或添加图片', 'error');
            return;
        }

        if (AppState.editingPostId) {
            PostManager.update(AppState.editingPostId, {
                title,
                content,
                type,
                images: [...AppState.tempImages],
                tags: [...AppState.tempTags],
            });
            showToast('更新成功');
        } else {
            PostManager.create(title, content, type, [...AppState.tempImages], [...AppState.tempTags]);
            showToast('发布成功');
        }

        closeEditModal();
        switchView('home');
    });

    // Detail modal actions
    document.getElementById('editPostBtn').addEventListener('click', () => {
        const modal = document.getElementById('detailModal');
        const postId = modal.dataset.currentPostId;
        if (postId) {
            closeDetailModal();
            openEditModal('edit', postId);
        }
    });

    document.getElementById('deletePostBtn').addEventListener('click', () => {
        const modal = document.getElementById('detailModal');
        const postId = modal.dataset.currentPostId;
        if (postId) {
            openConfirmModal('删除文章', '确定要删除这篇文章吗？此操作不可恢复。', () => {
                PostManager.delete(postId);
                closeDetailModal();
                switchView('home');
                showToast('已删除');
            });
        }
    });

    // Confirm modal
    document.getElementById('confirmCancel').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmOk').addEventListener('click', () => {
        if (AppState.confirmCallback) {
            AppState.confirmCallback();
        }
        closeConfirmModal();
    });

    // Editor toolbar
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            document.querySelectorAll('.toolbar-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const textarea = document.getElementById('postContent');
            const preview = document.getElementById('markdownPreview');

            if (mode === 'preview') {
                textarea.style.display = 'none';
                preview.classList.add('active');
                const rawContent = textarea.value;
                // Simple markdown-like rendering
                preview.innerHTML = marked.parse(rawContent || '*无预览内容*');
            } else {
                textarea.style.display = 'block';
                preview.classList.remove('active');
            }
        });
    });

    // Image upload
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');

    imageUploadArea.addEventListener('click', () => imageInput.click());

    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.classList.add('drag-over');
    });

    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.classList.remove('drag-over');
    });

    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.classList.remove('drag-over');
        handleImageFiles(e.dataTransfer.files);
    });

    imageInput.addEventListener('change', (e) => {
        handleImageFiles(e.target.files);
        imageInput.value = '';
    });

    function handleImageFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                AppState.tempImages.push(e.target.result);
                addImagePreview(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // Tag input
    const tagInput = document.getElementById('tagInput');
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const value = tagInput.value.trim();
            if (value && !AppState.tempTags.includes(value)) {
                AppState.tempTags.push(value);
                addTagChip(value);
            }
            tagInput.value = '';
        }
    });

    tagInput.addEventListener('blur', () => {
        const value = tagInput.value.trim();
        if (value && !AppState.tempTags.includes(value)) {
            AppState.tempTags.push(value);
            addTagChip(value);
        }
        tagInput.value = '';
    });

    // Settings - Export buttons
    document.getElementById('exportJSONBtn').addEventListener('click', () => DataIO.exportJSON());
    document.getElementById('exportTXTBtn').addEventListener('click', () => DataIO.exportTXT());
    document.getElementById('exportMDBtn').addEventListener('click', () => DataIO.exportMarkdown());
    document.getElementById('exportPDFBtn').addEventListener('click', () => DataIO.exportPDF());

    // Settings - Import
    document.getElementById('importDataBtn').addEventListener('click', openImportModal);

    // Import drop zone
    const importDropZone = document.getElementById('importDropZone');
    const importFileInput = document.getElementById('importFileInput');

    importDropZone.addEventListener('click', () => importFileInput.click());

    importDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        importDropZone.classList.add('drag-over');
    });

    importDropZone.addEventListener('dragleave', () => {
        importDropZone.classList.remove('drag-over');
    });

    importDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        importDropZone.classList.remove('drag-over');
        handleImportFiles(e.dataTransfer.files);
    });

    importFileInput.addEventListener('change', (e) => {
        handleImportFiles(e.target.files);
        importFileInput.value = '';
    });

    function handleImportFiles(files) {
        Array.from(files).forEach(file => {
            DataIO.importData(file)
                .then(result => {
                    showToast(`成功导入 ${result.count} 条${result.type}记录`);
                    closeImportModal();
                    switchView('home');
                })
                .catch(err => {
                    showToast('导入失败: ' + err.message, 'error');
                });
        });
    }

    // Settings - Clear data
    document.getElementById('clearDataBtn').addEventListener('click', () => {
        openConfirmModal('清空数据', '确定要清空所有数据吗？此操作不可恢复，建议先导出备份。', () => {
            Storage.clear();
            switchView('home');
            showToast('所有数据已清空');
        });
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });
}

// ==========================================
// Demo Data
// ==========================================
function loadDemoData() {
    if (AppState.posts.length > 0) return;

    const demoPosts = [
        {
            id: generateId(),
            title: '欢迎使用 VidaOS',
            content: '这是你个人生活的私密空间。\n\n在这里，你可以：\n- 记录每天的心情和感悟\n- 上传生活照片\n- 写下随手的吐槽和想法\n- 给内容打上标签，方便整理\n\n所有数据都保存在你的浏览器本地，不会上传到任何服务器。你可以随时导出为 JSON、TXT、Markdown 或 PDF 格式备份。\n\n开始记录你的生活吧！',
            type: 'diary',
            images: [],
            tags: ['欢迎', 'VidaOS'],
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
            id: generateId(),
            title: '今天天气真好',
            content: '出门散步的时候发现路边的花开得很漂亮，随手拍了几张照片。生活中这些小美好真的让人心情愉悦。\n\n有时候放慢脚步，才能发现身边的美。',
            type: 'photo',
            images: [],
            tags: ['生活', '摄影'],
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
            id: generateId(),
            title: '',
            content: '为什么周一的早上总是这么困？咖啡续命中...\n\n#周一综合症 #不想上班',
            type: 'rant',
            images: [],
            tags: ['吐槽', '日常'],
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            updatedAt: new Date(Date.now() - 259200000).toISOString(),
        },
    ];

    AppState.posts = demoPosts;
    Storage.save();
}

// ==========================================
// Initialization
// ==========================================
function init() {
    // Load data
    Storage.load();

    // Load demo data if empty
    loadDemoData();

    // Setup UI
    UI.updateStats();
    UI.updateHeroDateTime();
    UI.renderPostsList('postsList', PostManager.getRecent());

    // Setup events
    setupEventHandlers();

    // Update time every minute
    setInterval(() => {
        UI.updateHeroDateTime();
    }, 60000);

    // Auto-refresh posts list every 30 seconds
    setInterval(() => {
        if (AppState.currentView === 'home') {
            UI.renderPostsList('postsList', PostManager.getRecent());
            UI.updateStats();
        }
    }, 30000);

    console.log('VidaOS initialized successfully');
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
