const socket = io("https://yuroweb.com", 
    {
        path: "/cktc-musical/wss",
        transports: ["websocket"],
        upgrade: false,

        maxHttpBufferSize: 50 * 1024 * 1024,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500

    }
);
  
let previousQueueJson = '';

socket.on("connect", () => {
    console.log("Connected to VPS Socket.io");
    socket.emit("get_songqueue");
});
  
socket.on("disconnect", () => {
    console.log("Disconnected from VPS Socket.io");
});

socket.on("songqueue_updated", (response) => {
    if (response && response.success && response.data) {
        const queueJson = JSON.stringify(response.data);
        if (queueJson !== previousQueueJson) {
            previousQueueJson = queueJson;
            updateNowPlaying(response.data);
            updateQueueList(response.data);
        }
    }
});

socket.on('school_server_status', (status) => {
    const banner = document.getElementById('school-offline-banner');
    const addForm = document.getElementById('addSongForm');
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCount');
    
    const input = document.getElementById('youtubeUrl');
    const submitBtn = addForm ? addForm.querySelector('.btn-submit') : null;

    if (status && status.connected) {
        if (banner) banner.style.display = 'none';
        if (input) {
            input.disabled = false;
            input.placeholder = "ใส่ลิงก์เพลงใน YouTube ที่ความยาวไม่เกิน 6 นาที...";
        }
        if (submitBtn) submitBtn.disabled = false;
        
        socket.emit("get_songqueue");
    } else {
        if (banner) banner.style.display = 'flex';
        if (input) {
            input.disabled = true;
            input.placeholder = "ไม่สามารถขอเพลงได้ในขณะนี้ (ระบบประชาสัมพันธ์ออฟไลน์)";
            input.value = '';
        }
        if (submitBtn) submitBtn.disabled = true;
        if (queueCount) queueCount.textContent = '0 เพลง';
        if (queueList) {
            queueList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z"/></svg>
                    ไม่สามารถโหลดคิวเพลงได้ (ระบบประชาสัมพันธ์ออฟไลน์)
                </div>`;
        }
        const nowPlayingCard = document.getElementById('nowPlayingCard');
        if (nowPlayingCard) nowPlayingCard.style.display = 'none';
    }
});

window.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    const inputField = document.getElementById('youtubeUrl');
    const clearBtn = document.getElementById('clearInputBtn');
    if (inputField) {
        inputField.addEventListener('input', () => {
            clearBtn.style.display = inputField.value ? 'block' : 'none';
        });
    }
});

function updateClock() {
    const now = new Date();
    
    const timeStr = now.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
    });
    const liveTimeEl = document.getElementById('liveTime');
    if (liveTimeEl) liveTimeEl.textContent = timeStr;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('th-TH', options);
    const liveDateEl = document.getElementById('liveDate');
    if (liveDateEl) liveDateEl.textContent = dateStr;
}

async function pasteFromClipboard() {
    try {
        const inputField = document.getElementById('youtubeUrl');
        if (inputField && inputField.disabled) return;
        const text = await navigator.clipboard.readText();
        inputField.value = text.trim();
        document.getElementById('clearInputBtn').style.display = 'block';
        showToast('วางที่อยู่ลิงก์เรียบร้อย', 'info');
    } catch (err) {
        showToast('กรุณากด CTRL+V หรือคลิกขวาเพื่อวางข้อความ', 'info');
    }
}

function clearInput() {
    const inputField = document.getElementById('youtubeUrl');
    inputField.value = '';
    document.getElementById('clearInputBtn').style.display = 'none';
    inputField.focus();
}

const SwalToast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

function showToast(message, type = 'info') {
    SwalToast.fire({
        icon: type,
        title: message
    });
}

function updateNowPlaying(queue) {
    const nowPlayingCard = document.getElementById('nowPlayingCard');
    const nowPlayingTitle = document.getElementById('nowPlayingTitle');
    const nowPlayingThumb = document.getElementById('nowPlayingThumb');
    
    if (!nowPlayingCard) return;

    const currentSong = queue.find(item => item.status === 'playing');
    
    if (currentSong) {
        const vId = currentSong.videoId || currentSong.id;
        const titleStr = currentSong.title || currentSong.name || vId;
        nowPlayingTitle.textContent = titleStr;
        nowPlayingTitle.title = titleStr;
        nowPlayingThumb.src = `https://img.youtube.com/vi/${vId}/mqdefault.jpg`;
        
        if (nowPlayingCard.style.display === 'none') {
            nowPlayingCard.style.display = 'flex';
        }
    } else {
        nowPlayingCard.style.display = 'none';
    }
}

function getRelativeTimeString(dateString) {
    if (!dateString) return '';
    const addedDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - addedDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (isNaN(addedDate.getTime())) return '';
    
    const timeStr = addedDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    if (diffMins < 1) {
        return `เมื่อสักครู่ (${timeStr})`;
    } else if (diffMins < 60) {
        return `เมื่อ ${diffMins} นาทีที่แล้ว (${timeStr})`;
    } else if (diffHours < 12) {
        return `เมื่อ ${diffHours} ชม. ที่แล้ว (${timeStr})`;
    } else {
        return `วันนี้เมื่อ ${timeStr}`;
    }
}

function updateQueueList(queue) {
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCount');
    
    if (!queueList || !queueCount) return;

    const activeQueue = queue
        .map((item, idx) => ({ ...item, originalIndex: idx + 1 }))
        .filter(item => item.status !== 'played' && item.status !== 'deleted');
    
    queueCount.textContent = `${activeQueue.length} เพลง`;

    if (activeQueue.length === 0) {
        queueList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z"/></svg>
                ไม่มีเพลงรอเล่นในคิวขณะนี้
            </div>`;
        return;
    }

    const displayQueue = activeQueue.slice().reverse();

    let html = '';
    displayQueue.forEach((item) => {
        const relativeTime = getRelativeTimeString(item.addedAt);
        
        let badgeClass = 'badge-pending';
        let statusLabel = 'รอประมวลผล';
        
        if (item.status === 'downloading') {
            badgeClass = 'badge-downloading';
            statusLabel = 'กำลังโหลด';
        } else if (item.status === 'ready') {
            badgeClass = 'badge-ready';
            statusLabel = 'พร้อมเล่น';
        } else if (item.status === 'playing') {
            badgeClass = 'badge-playing';
            statusLabel = 'กำลังเล่น';
        }

        const vId = item.videoId || item.id;
        const songTitle = item.title || item.name || vId;

        html += `
            <div class="queue-item" data-id="${item.queueId || item.id}">
                <div class="item-left">
                    <div class="item-thumbnail-wrapper">
                        <span class="queue-index-badge">#${item.originalIndex}</span>
                        <img class="item-thumbnail" src="https://img.youtube.com/vi/${vId}/mqdefault.jpg" alt="Video cover thumbnail">
                    </div>
                    <div class="item-info">
                        <div class="item-title" title="${songTitle}">
                            ${songTitle}
                        </div>
                        <div class="item-time">
                            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            ${relativeTime}
                        </div>
                    </div>
                </div>
                <div class="item-right">
                    <span class="badge ${badgeClass}">${statusLabel}</span>
                </div>
            </div>
        `;
    });

    queueList.innerHTML = html;
}

async function addSong(e) {
    e.preventDefault();
    const input = document.getElementById('youtubeUrl');
    if (input && input.disabled) return;
    const url = input.value.trim();

    if (!url) return;

    socket.emit('add_song', { url }, (response) => {
        if (response && response.success) {
            showToast('เพิ่มเข้าคิวสำเร็จ!', 'success');
            input.value = '';
            document.getElementById('clearInputBtn').style.display = 'none';
        } else {
            showToast((response && response.error) || 'เกิดข้อผิดพลาดในการเพิ่มคิว', 'error');
        }
    });
}

async function moveQueue(id, action) {
    socket.emit('move_song', { queueId: id, action });
}

async function deleteQueue(id) {
    socket.emit('delete_song', { queueId: id }, (response) => {
        if (response && response.success) {
            showToast('ลบคิวเพลงเรียบร้อย', 'success');
        } else {
            showToast('ไม่สามารถลบคิวเพลงได้', 'error');
        }
    });
}
