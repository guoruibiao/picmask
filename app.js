// 全局变量
let uploadedImages = [];
let resultImage = null;
let customTemplates = [];
let currentMask = null; // 当前使用的蒙版（预置或自定义）
let isCurrentMaskCustom = false; // 是否为自定义蒙版
const canvas = document.getElementById('resultCanvas');
const ctx = canvas.getContext('2d');
// 拖拽相关变量
let isDragging = false;
let offsetX, offsetY;
const draggableContainer = document.getElementById('draggableContainer');
// 缩放相关变量
let currentScale = 1; // 当前缩放比例
let scaleFactor = 0.1; // 缩放步长
let minScale = 0.1; // 最小缩放比例
let maxScale = 5; // 最大缩放比例
// 颗粒拖拽相关变量
let particleData = []; // 存储每个颗粒的位置和图片信息
let isParticleDragging = false; // 是否正在拖拽颗粒
let draggedParticleIndex = -1; // 被拖拽的颗粒索引
let draggedImageFromList = null; // 从列表拖拽的图片

// 从localStorage加载自定义模板
function loadCustomTemplates() {
    const savedTemplates = localStorage.getItem('picmask-custom-templates');
    if (savedTemplates) {
        try {
            customTemplates = JSON.parse(savedTemplates);
        } catch (e) {
            console.error('Failed to parse custom templates:', e);
            customTemplates = [];
        }
    }
}

// 保存自定义模板到localStorage
function saveCustomTemplates() {
    localStorage.setItem('picmask-custom-templates', JSON.stringify(customTemplates));
    updateTemplateList();
}

// 预置蒙版数据（使用SVG数据URL）
const presetMasks = {
    cat: {
        name: '小猫咪',
        svgData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100,20 C80,20 62,30 50,45 C35,65 35,95 45,115 C40,125 38,135 40,145 C42,155 52,165 70,170 C85,175 115,175 130,170 C148,165 158,155 160,145 C162,135 160,125 155,115 C165,95 165,65 150,45 C138,30 120,20 100,20 Z"/></svg>',
        width: 200,
        height: 200
    },
    dog: {
        name: '小狗',
        svgData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M150,40 C160,30 170,30 180,40 C190,50 190,65 185,80 C175,70 165,65 155,65 C155,50 145,40 150,40 Z M50,40 C55,40 45,50 45,65 C35,65 25,70 15,80 C10,65 10,50 20,40 C30,30 40,30 50,40 Z M170,80 C175,90 170,100 165,110 C175,115 180,125 180,135 C180,145 175,155 165,160 C130,160 90,160 55,160 C45,155 40,145 40,135 C40,125 45,115 55,110 C50,100 45,90 50,80 C60,70 75,65 90,65 C110,65 130,70 140,80 C145,80 150,75 160,75 C170,75 170,75 170,80 Z"/></svg>',
        width: 200,
        height: 200
    },
    heart: {
        name: '爱心',
        svgData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100,40 C125,10 180,30 180,80 C180,120 120,170 100,185 C80,170 20,120 20,80 C20,30 75,10 100,40 Z"/></svg>',
        width: 200,
        height: 200
    },
    star: {
        name: '星星',
        svgData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100,20 L120,70 L170,75 L130,115 L145,165 L100,140 L55,165 L70,115 L30,75 L80,70 Z"/></svg>',
        width: 200,
        height: 200
    },
    circle: {
        name: '圆形',
        svgData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="80"/></svg>',
        width: 200,
        height: 200
    },
    square: {
        name: '方形',
        svgData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect x="40" y="40" width="120" height="120"/></svg>',
        width: 200,
        height: 200
    }
};

// DOM 元素
const fileUpload = document.getElementById('fileUpload');
const imageList = document.getElementById('imageList');
const maskTypeSelect = document.getElementById('maskType');
const combineBtn = document.getElementById('combineBtn');
const downloadBtn = document.getElementById('downloadBtn');
const emptyState = document.getElementById('emptyState');
const statusText = document.getElementById('statusText');
const notification = document.getElementById('notification');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const notificationIcon = document.getElementById('notificationIcon');
const addTemplateBtn = document.getElementById('addTemplateBtn');
const templateList = document.getElementById('templateList');

// 缩放画布
function scaleCanvas(delta) {
    // 计算新的缩放比例
    const newScale = currentScale + delta;
    
    // 限制在最小和最大缩放比例之间
    if (newScale >= minScale && newScale <= maxScale) {
        // 保存当前缩放比例，用于位置计算
        const oldScale = currentScale;
        currentScale = newScale;
        
        // 获取画布容器
        const canvasContainer = draggableContainer;
        
        // 应用缩放，使用center作为transformOrigin获得更自然的缩放体验
        canvasContainer.style.transformOrigin = 'center';
        canvasContainer.style.transform = `scale(${currentScale})`;
        
        // 显示当前缩放比例（避免过于频繁的通知）
        if (Math.abs(delta) >= scaleFactor * 2 || Math.round(currentScale * 10) % 10 === 0) {
            showNotification('info', '缩放', `缩放比例: ${Math.round(currentScale * 100)}%`);
        }
        
        // 重新调整位置，确保元素不会完全移出可视区域
        const previewContainer = document.getElementById('previewContainer');
        const containerRect = previewContainer.getBoundingClientRect();
        
        // 获取当前位置
        let currentLeft = canvasContainer.style.left ? parseInt(canvasContainer.style.left) : 0;
        let currentTop = canvasContainer.style.top ? parseInt(canvasContainer.style.top) : 0;
        
        // 如果使用了center定位，需要调整为具体像素位置
        if (currentLeft === '50%' || currentTop === '50%') {
            currentLeft = containerRect.width / 2;
            currentTop = containerRect.height / 2;
        }
        
        // 计算缩放后的位置调整
        const scaleRatio = currentScale / oldScale;
        
        // 计算元素中心位置的调整
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;
        
        // 保持元素相对于容器中心的位置比例
        const relativeX = currentLeft / containerCenterX;
        const relativeY = currentTop / containerCenterY;
        
        // 更新位置
        canvasContainer.style.left = `${relativeX * containerCenterX}px`;
        canvasContainer.style.top = `${relativeY * containerCenterY}px`;
        
        // 确保在拖动时使用左上角作为原点
        if (isDragging) {
            canvasContainer.style.transformOrigin = '0 0';
        }
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 文件上传处理
    fileUpload.addEventListener('change', handleFileUpload);
    
    // 拖拽上传支持
    const dropZone = document.querySelector('label[for="fileUpload"]');
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    
    // 蒙版类型选择
    maskTypeSelect.addEventListener('change', handleMaskTypeChange);
    
    // 合成按钮
    combineBtn.addEventListener('click', combineImages);
    
    // 下载按钮
    downloadBtn.addEventListener('click', downloadImage);
    
    // 窗口大小变化时重新调整Canvas
    window.addEventListener('resize', adjustCanvasSize);
    
    // 拖拽功能事件监听
    draggableContainer.addEventListener('mousedown', (e) => {
        // 如果点击的是Canvas，检查是否点击了颗粒
        if (e.target === canvas && !isParticleDragging) {
            checkParticleClick(e);
        } else {
            startDrag(e);
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (isParticleDragging) {
            dragParticle(e);
        } else {
            drag(e);
        }
    });
    document.addEventListener('mouseup', (e) => {
        if (isParticleDragging) {
            endDragParticle(e);
        } else {
            endDrag(e);
        }
    });
    
    // 触摸设备支持
    draggableContainer.addEventListener('touchstart', (e) => {
        if (e.target === canvas && e.touches.length === 1) {
            checkParticleClick(e);
        } else {
            startDrag(e);
        }
    });
    document.addEventListener('touchmove', (e) => {
        if (isParticleDragging) {
            dragParticle(e);
        } else {
            drag(e, { passive: false });
        }
    });
    document.addEventListener('touchend', (e) => {
        if (isParticleDragging) {
            endDragParticle(e);
        } else {
            endDrag(e);
        }
    });
    
    // 添加Canvas的drop事件监听器（用于从列表拖拽图片替换颗粒）
    if (canvas) {
        canvas.addEventListener('drop', handleCanvasDrop);
    }
    
    // 自定义模板相关事件
    if (addTemplateBtn) {
        addTemplateBtn.addEventListener('click', showAddTemplateModal);
    }
    
    // 添加鼠标滚轮缩放事件
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        // 判断是否按住Ctrl键（Windows/Linux）或Command键（Mac）
        if (e.ctrlKey || e.metaKey) {
            // 滚轮方向决定缩放方向
            const delta = e.deltaY > 0 ? -scaleFactor : scaleFactor;
            scaleCanvas(delta);
        }
    });
    
    // 触摸设备的双指缩放支持
    let lastDistance = null;
    previewContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastDistance = Math.sqrt(dx * dx + dy * dy);
        } else {
            lastDistance = null;
        }
    });
    
    previewContainer.addEventListener('touchmove', (e) => {
        // 如果正在拖拽，则不处理缩放
        if (isDragging) return;
        
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            
            if (lastDistance) {
                const distanceDelta = currentDistance - lastDistance;
                // 根据距离变化调整缩放比例
                const scaleDelta = (distanceDelta / 100) * scaleFactor;
                scaleCanvas(scaleDelta);
            }
            
            lastDistance = currentDistance;
        }
    });
    
    previewContainer.addEventListener('touchend', () => {
        lastDistance = null;
    });
    
    // 添加缩放控制按钮
    function createScaleButtons() {
        const scaleControls = document.createElement('div');
        scaleControls.className = 'absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md flex space-x-2';
        scaleControls.innerHTML = `
            <button id="zoomOutBtn" class="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-full transition-colors">
                <i class="fa fa-search-minus"></i>
            </button>
            <button id="resetZoomBtn" class="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-full transition-colors">
                <i class="fa fa-arrows-alt"></i>
            </button>
            <button id="zoomInBtn" class="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-full transition-colors">
                <i class="fa fa-search-plus"></i>
            </button>
        `;
        previewContainer.appendChild(scaleControls);
        
        // 添加事件监听器
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            scaleCanvas(-scaleFactor);
        });
        
        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            currentScale = 1;
            draggableContainer.style.transform = 'scale(1)';
            draggableContainer.style.left = '50%';
            draggableContainer.style.top = '50%';
            draggableContainer.style.transformOrigin = 'center';
            showNotification('info', '重置', '已重置缩放和位置');
        });
        
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            scaleCanvas(scaleFactor);
        });
    }
    
    // 初始化缩放控制按钮
    createScaleButtons();
    
    // 初始化蒙版预览
    updateMaskPreview(maskTypeSelect.value);
}

// 处理文件上传
function handleFileUpload(e) {
    const files = e.target.files;
    processFiles(files);
    // 重置input以允许重新上传相同文件
    e.target.value = '';
}

// 处理拖拽事件
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('border-primary');
    e.currentTarget.classList.add('bg-primary/5');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('border-primary');
    e.currentTarget.classList.remove('bg-primary/5');
    
    if (e.dataTransfer.files.length) {
        processFiles(e.dataTransfer.files);
    }
}

// 处理文件
function processFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    // 添加到上传图片数组
                    uploadedImages.push({
                        id: Date.now() + Math.random(),
                        src: event.target.result,
                        width: img.width,
                        height: img.height
                    });
                    updateImageList();
                    showNotification('success', '上传成功', `成功上传图片: ${file.name}`);
                };
                img.onerror = () => {
                    showNotification('error', '上传失败', `无法加载图片: ${file.name}`);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            showNotification('warning', '不支持的文件类型', `文件 ${file.name} 不是有效的图片文件`);
        }
    });
}

// 更新图片列表
function updateImageList() {
    if (uploadedImages.length === 0) {
        imageList.innerHTML = `
            <div class="text-center text-gray-400 p-8">
                <i class="fa fa-picture-o text-4xl mb-3"></i>
                <p class="text-sm">暂无图片，请上传图片</p>
            </div>
        `;
        return;
    }
    
    imageList.innerHTML = '';
    uploadedImages.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = `relative rounded-lg overflow-hidden shadow-md hover-scale transition-custom cursor-grab active:cursor-grabbing`;
        imageItem.draggable = true;
        imageItem.dataset.imageIndex = index;
        
        imageItem.innerHTML = `
            <img src="${image.src}" alt="上传图片" class="w-full h-40 object-cover">
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p class="text-xs text-white truncate">图片 ${index + 1}</p>
            </div>
            <div class="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <button data-id="${image.id}" class="delete-btn bg-red-500 text-white p-2 rounded-full" title="删除">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;
        
        // 添加拖拽事件监听器
        imageItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            e.dataTransfer.effectAllowed = 'copy';
            draggedImageFromList = uploadedImages[index];
            imageItem.classList.add('opacity-50');
        });
        
        imageItem.addEventListener('dragend', () => {
            draggedImageFromList = null;
            imageItem.classList.remove('opacity-50');
        });
        
        imageList.appendChild(imageItem);
    });
    
    // 添加删除按钮事件监听器
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const imageId = parseFloat(e.currentTarget.dataset.id);
            deleteImage(imageId);
        });
    });
    
    // 确保Canvas支持拖放
    if (canvas) {
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            canvas.style.cursor = 'copy';
        });
        
        canvas.addEventListener('dragleave', () => {
            canvas.style.cursor = 'default';
        });
    }
}

// 处理蒙版类型变化
function handleMaskTypeChange(e) {
    const maskType = e.target.value;
    updateMaskPreview(maskType);
    // 更新当前蒙版状态
    currentMask = presetMasks[maskType];
    isCurrentMaskCustom = false;
    showNotification('info', '蒙版已更改', `已选择${presetMasks[maskType].name}蒙版`);
}

// 更新蒙版预览（直接在canvas上绘制）
function updateMaskPreview(maskType) {
    const mask = presetMasks[maskType];
    if (mask) {
        updateMaskPreviewWithMask(mask, false);
    }
}

// 使用蒙版对象更新预览
function updateMaskPreviewWithMask(mask, isCustom = false) {
    // 确保mask对象有效
    if (!mask || !mask.svgData) {
        console.error('无效的蒙版对象');
        showNotification('error', '错误', '无效的蒙版数据');
        return;
    }
    
    // 调整Canvas大小以适应蒙版
    adjustCanvasSize(mask.width || 200, mask.height || 200);
    
    // 清除Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制蒙版预览
    const maskImg = new Image();
    
    // 处理加载错误
    maskImg.onerror = () => {
        console.error('蒙版图像加载失败');
        showNotification('error', '错误', '蒙版图像加载失败');
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('蒙版预览失败', canvas.width / 2, canvas.height / 2);
    };
    
    maskImg.onload = () => {
        try {
            // 创建临时Canvas用于提取蒙版数据
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = mask.width || 200;
            tempCanvas.height = mask.height || 200;
            
            // 先填充透明背景
            tempCtx.fillStyle = 'rgba(255, 255, 255, 0)';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // 绘制蒙版图像
            tempCtx.drawImage(maskImg, 0, 0);
            
            // 获取蒙版图像数据
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            // 使用预设的网格大小
            const gridSize = gridSizePresets.medium;
            
            // 统计非透明像素数量，用于验证蒙版有效性
            let nonTransparentPixels = 0;
            
            // 绘制灰色网格预览
            for (let y = 0; y < tempCanvas.height; y += gridSize) {
                for (let x = 0; x < tempCanvas.width; x += gridSize) {
                    const index = (y * tempCanvas.width + x) * 4;
                    const alpha = data[index + 3];
                    
                    // 如果像素不是完全透明（alpha > 0）
                    if (alpha > 0) {
                        nonTransparentPixels++;
                        // 绘制灰色小方块表示蒙版区域
                        ctx.fillStyle = '#e5e7eb';
                        ctx.fillRect(x, y, gridSize, gridSize);
                        
                        // 添加边框
                        ctx.strokeStyle = '#d1d5db';
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(x, y, gridSize, gridSize);
                    }
                }
            }
            
            // 如果蒙版几乎没有非透明像素，显示警告
            if (nonTransparentPixels < 10) {
                console.warn('蒙版有效区域过小');
                showNotification('warning', '提示', '蒙版有效区域过小，可能影响合成效果');
            }
            
            // 设置初始位置为居中
            draggableContainer.style.left = '50%';
            draggableContainer.style.top = '50%';
            draggableContainer.style.transform = 'translate(-50%, -50%)';
        } catch (error) {
            console.error('处理蒙版预览出错:', error);
            showNotification('error', '错误', '处理蒙版预览时出错');
        }
    };
    
    // 确保SVG数据格式正确
    if (mask.svgData && typeof mask.svgData === 'string') {
        // 验证data URL格式
        if (mask.svgData.startsWith('data:image/svg+xml')) {
            maskImg.src = mask.svgData;
        } else {
            console.error('无效的SVG数据格式');
            showNotification('error', '错误', '无效的SVG数据格式');
        }
    } else {
        console.error('SVG数据缺失或无效');
        showNotification('error', '错误', 'SVG数据缺失或无效');
    }
    
    // 显示Canvas容器，隐藏空状态
    draggableContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // 更新状态
    const maskPrefix = isCustom ? `自定义模板 "${mask.name || '未命名'}"` : (mask.name || '未知') + '蒙版';
    if (uploadedImages.length > 0) {
        statusText.textContent = `已选择${maskPrefix}，可以开始合成`;
    } else {
        statusText.textContent = `已选择${maskPrefix}，请上传图片`;
    }
    
    // 更新当前蒙版状态
    currentMask = mask;
    isCurrentMaskCustom = isCustom;
    
    // 重置结果图片引用
    resultImage = null;
}

// 显示添加模板模态框
function showAddTemplateModal() {
    // 创建模态框HTML
    const modalHTML = `
        <div id="templateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
                <div class="p-5 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-dark">添加自定义蒙版模板</h3>
                    <button id="closeModalBtn" class="text-gray-400 hover:text-gray-600">
                        <i class="fa fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-5 space-y-4">
                    <div>
                        <label for="templateName" class="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                        <input type="text" id="templateName" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary">
                    </div>
                    <div>
                        <label for="templateSvg" class="block text-sm font-medium text-gray-700 mb-1">上传SVG文件</label>
                        <label for="templateSvg" class="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary cursor-pointer transition-custom bg-gray-50 hover:bg-primary/5">
                            <i class="fa fa-cloud-upload text-3xl text-primary mb-2"></i>
                            <p class="text-sm text-gray-600">点击上传SVG文件</p>
                            <p class="text-xs text-gray-500 mt-1">仅支持SVG格式</p>
                            <input type="file" id="templateSvg" class="hidden" accept=".svg">
                        </label>
                    </div>
                    <div id="svgPreview" class="hidden">
                        <p class="text-sm font-medium text-gray-700 mb-1">SVG预览</p>
                        <div class="border border-gray-200 rounded-lg p-2 bg-gray-50 min-h-[150px] flex items-center justify-center">
                            <img id="previewImage" class="max-w-full max-h-[150px]" src="" alt="SVG预览">
                        </div>
                    </div>
                </div>
                <div class="p-5 border-t border-gray-200 flex justify-end space-x-3">
                    <button id="cancelAddBtn" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-custom">
                        取消
                    </button>
                    <button id="confirmAddBtn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-custom" disabled>
                        添加
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 添加到body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 获取模态框元素
    const modal = document.getElementById('templateModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const confirmAddBtn = document.getElementById('confirmAddBtn');
    const templateName = document.getElementById('templateName');
    const templateSvg = document.getElementById('templateSvg');
    const svgPreview = document.getElementById('svgPreview');
    const previewImage = document.getElementById('previewImage');
    
    let svgData = null;
    
    // 关闭模态框
    function closeModal() {
        modal.remove();
    }
    
    // 验证表单
    function validateForm() {
        confirmAddBtn.disabled = !templateName.value.trim() || !svgData;
    }
    
    // 上传SVG文件
    templateSvg.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.svg')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    // 读取原始SVG文本内容
                    const svgText = event.target.result;
                    
                    // 解析SVG获取尺寸和内容
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                    const svg = svgDoc.querySelector('svg');
                    
                    if (svg) {
                        // 确保SVG有明确的尺寸
                        let width = 200;
                        let height = 200;
                        
                        // 优先使用viewBox
                        if (svg.getAttribute('viewBox')) {
                            const viewBoxStr = svg.getAttribute('viewBox');
                            const viewBoxParts = viewBoxStr.split(' ').map(Number);
                            if (viewBoxParts.length >= 4 && !isNaN(viewBoxParts[2]) && !isNaN(viewBoxParts[3])) {
                                width = Math.abs(viewBoxParts[2]);
                                height = Math.abs(viewBoxParts[3]);
                            }
                        } 
                        // 然后使用width/height属性
                        else if (svg.getAttribute('width') && svg.getAttribute('height')) {
                            width = parseInt(svg.getAttribute('width')) || 200;
                            height = parseInt(svg.getAttribute('height')) || 200;
                        }
                        
                        // 确保SVG有正确的命名空间
                        if (!svg.getAttribute('xmlns')) {
                            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                        }
                        
                        // 确保SVG元素有填充色（非透明）
                        const paths = svgDoc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
                        paths.forEach(path => {
                            if (!path.getAttribute('fill') || path.getAttribute('fill') === 'none') {
                                path.setAttribute('fill', '#000000'); // 设置为黑色
                            }
                            if (!path.getAttribute('stroke') || path.getAttribute('stroke') === 'none') {
                                path.setAttribute('stroke', '#000000');
                            }
                        });
                        
                        // 确保SVG背景透明
                        svg.setAttribute('fill', 'none');
                        
                        // 将修改后的SVG转换为data URL
                        const serializer = new XMLSerializer();
                        const modifiedSvgText = serializer.serializeToString(svgDoc);
                        svgData = 'data:image/svg+xml;utf8,' + encodeURIComponent(modifiedSvgText);
                        
                        // 更新预览和尺寸信息
                        previewImage.src = svgData;
                        svgPreview.classList.remove('hidden');
                        
                        // 存储尺寸信息
                        templateSvg.dataset.width = width.toString();
                        templateSvg.dataset.height = height.toString();
                        
                        validateForm();
                    } else {
                        showNotification('error', 'SVG解析错误', '无法解析SVG文件内容');
                    }
                } catch (error) {
                    console.error('SVG处理错误:', error);
                    showNotification('error', '处理失败', '处理SVG文件时发生错误');
                }
            };
            reader.onerror = () => {
                showNotification('error', '读取失败', '无法读取SVG文件');
            };
            // 以文本方式读取SVG
            reader.readAsText(file);
        } else {
            showNotification('error', '文件格式错误', '请上传SVG格式的文件');
        }
    });
    
    // 监听输入变化
    templateName.addEventListener('input', validateForm);
    
    // 关闭按钮
    closeModalBtn.addEventListener('click', closeModal);
    cancelAddBtn.addEventListener('click', closeModal);
    
    // 确认添加
    confirmAddBtn.addEventListener('click', () => {
        if (templateName.value.trim() && svgData) {
            const newTemplate = {
                id: 'custom-' + Date.now(),
                name: templateName.value.trim(),
                svgData: svgData,
                width: parseInt(templateSvg.dataset.width) || 200,
                height: parseInt(templateSvg.dataset.height) || 200,
                isCustom: true
            };
            
            // 添加到自定义模板列表
            customTemplates.push(newTemplate);
            saveCustomTemplates();
            
            // 更新模板列表UI
            updateTemplateList();
            
            // 关闭模态框
            closeModal();
            
            // 显示成功通知
            showNotification('success', '添加成功', `模板 "${newTemplate.name}" 已添加`);
        }
    });
    
    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// 更新模板列表
function updateTemplateList() {
    if (customTemplates.length === 0) {
        templateList.innerHTML = `
            <div class="text-center text-gray-400 p-8">
                <i class="fa fa-magic text-4xl mb-3"></i>
                <p class="text-sm">暂无自定义模板</p>
            </div>
        `;
        return;
    }
    
    templateList.innerHTML = '';
    customTemplates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = `relative rounded-lg overflow-hidden shadow-md hover-scale transition-custom`;
        
        templateItem.innerHTML = `
            <div class="p-3 bg-gray-50">
                <div class="flex items-center justify-between mb-2">
                    <p class="text-sm font-medium text-gray-800 truncate">${template.name}</p>
                    <div class="flex space-x-1">
                        <button data-id="${template.id}" class="use-template-btn bg-primary/10 text-primary p-1 rounded hover:bg-primary/20 transition-custom" title="使用">
                            <i class="fa fa-check text-xs"></i>
                        </button>
                        <button data-id="${template.id}" class="delete-template-btn bg-red-500/10 text-red-500 p-1 rounded hover:bg-red-500/20 transition-custom" title="删除">
                            <i class="fa fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                <div class="border border-gray-200 rounded-lg p-2 bg-white flex items-center justify-center min-h-[80px]">
                    <img src="${template.svgData}" alt="${template.name}" class="max-w-full max-h-[60px] object-contain">
                </div>
            </div>
        `;
        
        templateList.appendChild(templateItem);
    });
    
    // 添加使用按钮事件监听器
    document.querySelectorAll('.use-template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const templateId = e.currentTarget.dataset.id;
            useCustomTemplate(templateId);
        });
    });
    
    // 添加删除按钮事件监听器
    document.querySelectorAll('.delete-template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const templateId = e.currentTarget.dataset.id;
            deleteCustomTemplate(templateId);
        });
    });
}

// 使用自定义模板
function useCustomTemplate(templateId) {
    const template = customTemplates.find(t => t.id === templateId);
    if (template) {
        // 更新蒙版预览
        updateMaskPreviewWithMask(template, true);
        showNotification('info', '模板已选择', `已选择自定义模板: ${template.name}`);
    }
}

// 删除自定义模板
function deleteCustomTemplate(templateId) {
    const template = customTemplates.find(t => t.id === templateId);
    if (template) {
        if (confirm(`确定要删除模板 "${template.name}" 吗？`)) {
            customTemplates = customTemplates.filter(t => t.id !== templateId);
            saveCustomTemplates();
            // 更新模板列表UI
            updateTemplateList();
            showNotification('info', '删除成功', `模板 "${template.name}" 已删除`);
            
            // 如果删除的是当前使用的模板，切换回默认预设
            if (isCurrentMaskCustom && currentMask && currentMask.id === templateId) {
                const defaultPreset = maskTypeSelect.value;
                updateMaskPreview(defaultPreset);
            }
        }
    }
}

// 删除图片
function deleteImage(imageId) {
    const index = uploadedImages.findIndex(img => img.id === imageId);
    if (index !== -1) {
        uploadedImages.splice(index, 1);
        updateImageList();
        showNotification('info', '删除成功', '图片已从列表中删除');
        
        // 重置结果图片
        resetResult();
        
        // 更新状态
        const maskType = maskTypeSelect.value;
        if (uploadedImages.length === 0) {
            statusText.textContent = `已选择${presetMasks[maskType].name}蒙版，请上传图片`;
        }
    }
}

// 预设网格大小（替代原来的颗粒度）
const gridSizePresets = {
    small: 8,
    medium: 16,
    large: 24
};

// 合成图片
function combineImages() {
    // 检查是否有足够的图片
    if (uploadedImages.length === 0) {
        showNotification('error', '合成失败', '请先上传图片');
        return;
    }
    
    // 显示加载状态
    statusText.textContent = '正在合成图片...';
    
    // 获取当前使用的蒙版
    let mask = currentMask;
    
    // 确保mask对象存在
    if (!mask) {
        // 如果currentMask未设置，使用选中的预设蒙版
        const maskType = maskTypeSelect.value;
        mask = presetMasks[maskType];
        
        // 如果仍然没有蒙版，显示错误
        if (!mask) {
            showNotification('error', '合成失败', '未找到有效的蒙版');
            statusText.textContent = '合成失败：未找到有效的蒙版';
            return;
        }
    }
    
    // 验证蒙版对象包含必要的属性
    if (!mask.svgData || !mask.width || !mask.height) {
        showNotification('error', '合成失败', '蒙版数据不完整');
        statusText.textContent = '合成失败：蒙版数据不完整';
        return;
    }
    
    try {
        // 创建蒙版图像
        const maskImg = new Image();
        
        // 处理图像加载错误
        maskImg.onerror = () => {
            showNotification('error', '合成失败', '蒙版图像加载失败');
            statusText.textContent = '合成失败：蒙版图像加载失败';
        };
        
        maskImg.onload = () => {
            try {
                // 根据预览容器大小调整Canvas
                adjustCanvasSize(mask.width, mask.height);
                
                // 清除Canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // 清空颗粒数据
                particleData = [];
                
                // 使用预设的网格大小
                const gridSize = gridSizePresets.medium;
                
                // 创建临时Canvas用于提取蒙版数据
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = mask.width;
                tempCanvas.height = mask.height;
                
                // 确保绘制前设置透明背景
                tempCtx.fillStyle = 'rgba(255, 255, 255, 0)';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                // 绘制蒙版图像
                tempCtx.drawImage(maskImg, 0, 0);
                
                // 获取蒙版图像数据
                const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const data = imageData.data;
                
                // 提取非透明区域的像素点
                const maskPixels = [];
                for (let y = 0; y < tempCanvas.height; y += gridSize) {
                    for (let x = 0; x < tempCanvas.width; x += gridSize) {
                        const index = (y * tempCanvas.width + x) * 4;
                        const alpha = data[index + 3];
                        
                        // 如果像素不是完全透明（alpha > 0）
                        if (alpha > 0) {
                            maskPixels.push({ x, y });
                        }
                    }
                }
                
                // 检查是否有有效的蒙版像素
                if (maskPixels.length === 0) {
                    showNotification('warning', '合成提示', '未找到有效的蒙版区域，请检查蒙版图像');
                    statusText.textContent = '未找到有效的蒙版区域';
                    return;
                }
                
                // 加载所有上传的图片
                const imagePromises = uploadedImages.map(img => {
                    return new Promise((resolve) => {
                        const image = new Image();
                        image.onload = () => resolve(image);
                        image.onerror = () => resolve(null); // 忽略加载失败的图片
                        image.src = img.src;
                    });
                });
                
                Promise.all(imagePromises).then(images => {
                    try {
                        // 过滤掉加载失败的图片
                        const validImages = images.filter(img => img !== null);
                        
                        if (validImages.length === 0) {
                            showNotification('error', '合成失败', '所有图片加载失败');
                            statusText.textContent = '合成失败：所有图片加载失败';
                            return;
                        }
                        
                        // 在蒙版区域填充小图片
                        const scaleFactor = gridSize;
                        
                        maskPixels.forEach(pixel => {
                            // 随机选择一张图片
                            const randomImage = validImages[Math.floor(Math.random() * validImages.length)];
                            const imageIndex = validImages.findIndex(img => img === randomImage);
                            
                            // 计算裁剪区域，确保图片填充整个网格（允许裁剪）
                            const imgWidth = randomImage.width;
                            const imgHeight = randomImage.height;
                            
                            // 计算裁剪参数
                            let sx, sy, sWidth, sHeight;
                            
                            // 确保裁剪的区域是正方形，以适应网格
                            if (imgWidth >= imgHeight) {
                                // 横向图片，裁剪中间部分
                                sWidth = imgHeight;
                                sHeight = imgHeight;
                                sx = (imgWidth - sWidth) / 2;
                                sy = 0;
                            } else {
                                // 纵向图片，裁剪中间部分
                                sWidth = imgWidth;
                                sHeight = imgWidth;
                                sx = 0;
                                sy = (imgHeight - sHeight) / 2;
                            }
                            
                            // 目标位置和大小（完全填充网格）
                            const dx = pixel.x;
                            const dy = pixel.y;
                            const dWidth = scaleFactor;
                            const dHeight = scaleFactor;
                            
                            // 保存颗粒数据
                            particleData.push({
                                x: dx,
                                y: dy,
                                width: dWidth,
                                height: dHeight,
                                imageIndex: imageIndex,
                                imageSrc: randomImage.src,
                                cropParams: { sx, sy, sWidth, sHeight }
                            });
                            
                            // 绘制裁剪后的图片
                            ctx.drawImage(randomImage, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
                        });
                        
                        // 添加颗粒点击事件监听器
                        addParticleEventListeners();
                        
                        // 更新状态和按钮
                        statusText.textContent = '图片合成完成';
                        downloadBtn.disabled = false;
                        showNotification('success', '合成成功', '图片已成功合成，可拖拽颗粒进行替换');
                        
                        // 更新结果图片引用
                        resultImage = canvas.toDataURL('image/png');
                    } catch (error) {
                        console.error('图片合成过程出错:', error);
                        showNotification('error', '合成失败', '图片合成过程出错');
                        statusText.textContent = '合成失败：处理图片时出错';
                    }
                });
            } catch (error) {
                console.error('处理蒙版数据出错:', error);
                showNotification('error', '合成失败', '处理蒙版数据出错');
                statusText.textContent = '合成失败：处理蒙版数据出错';
            }
        };
        
        // 对于自定义模板，确保SVG数据格式正确
        if (isCurrentMaskCustom && mask.svgData) {
            // 确保SVG数据是有效的URL格式
            if (!mask.svgData.startsWith('data:image/svg+xml')) {
                // 如果不是data URL格式，尝试转换
                console.warn('自定义模板SVG数据格式可能不正确，尝试修正');
            }
        }
        
        maskImg.src = mask.svgData;
    } catch (error) {
        console.error('初始化合成过程出错:', error);
        showNotification('error', '合成失败', '初始化合成过程出错');
        statusText.textContent = '合成失败：初始化过程出错';
    }
}

// 调整Canvas大小
function adjustCanvasSize(originalWidth = 800, originalHeight = 600) {
    const previewContainer = document.getElementById('previewContainer');
    const containerWidth = previewContainer.clientWidth - 64; // 减去内边距
    const containerHeight = previewContainer.clientHeight - 64;
    
    // 计算初始缩放比例
    const initialScale = Math.min(containerWidth / originalWidth, containerHeight / originalHeight, 1);
    
    // 设置Canvas尺寸
    canvas.width = originalWidth;
    canvas.height = originalHeight;
    
    // 直接设置Canvas的实际尺寸，缩放由容器控制
    canvas.style.width = `${originalWidth}px`;
    canvas.style.height = `${originalHeight}px`;
    
    // 保存当前缩放状态
    const wasScaled = currentScale !== 1;
    const scaleBefore = currentScale;
    
    // 如果是初始加载或重置状态，使用初始缩放
    if (!wasScaled) {
        currentScale = initialScale;
        draggableContainer.style.transform = `scale(${currentScale})`;
        draggableContainer.style.transformOrigin = 'center';
        
        // 居中显示
        draggableContainer.style.left = '50%';
        draggableContainer.style.top = '50%';
    } else {
        // 应用当前缩放
        draggableContainer.style.transform = `scale(${currentScale})`;
        
        // 如果之前有自定义位置，保持相对位置
        if (draggableContainer.style.left && draggableContainer.style.top) {
            const rect = draggableContainer.getBoundingClientRect();
            const containerRect = previewContainer.getBoundingClientRect();
            
            // 计算新位置，尽量保持相对位置
            let left = parseInt(draggableContainer.style.left);
            let top = parseInt(draggableContainer.style.top);
            
            // 限制在容器内
            const maxLeft = containerRect.width - rect.width;
            const maxTop = containerRect.height - rect.height;
            
            draggableContainer.style.left = `${Math.max(0, Math.min(left, maxLeft))}px`;
            draggableContainer.style.top = `${Math.max(0, Math.min(top, maxTop))}px`;
        } else {
            // 居中显示
            draggableContainer.style.left = '50%';
            draggableContainer.style.top = '50%';
            draggableContainer.style.transformOrigin = 'center';
        }
    }
}

// 下载图片
function downloadImage() {
    if (resultImage) {
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `picmask-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('success', '下载成功', '图片已开始下载');
    }
}

// 重置结果图片
function resetResult() {
    // 重置位置
    draggableContainer.style.left = '';
    draggableContainer.style.top = '';
    draggableContainer.style.transform = '';
    
    // 禁用下载按钮
    downloadBtn.disabled = true;
    
    // 清除Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resultImage = null;
    
    // 重新显示蒙版预览
    if (currentMask) {
        updateMaskPreviewWithMask(currentMask, isCurrentMaskCustom);
    } else {
        const maskType = maskTypeSelect.value;
        updateMaskPreview(maskType);
    }
}

// 开始拖拽
function startDrag(e) {
    // 阻止事件冒泡
    e.preventDefault();
    
    // 如果是双指触摸，不启动拖拽
    if (e.touches && e.touches.length > 1) return;
    
    isDragging = true;
    
    // 获取鼠标或触摸位置
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    // 计算鼠标相对于元素的偏移量
    const rect = draggableContainer.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    
    // 改变鼠标样式
    document.body.style.cursor = 'grabbing';
    draggableContainer.style.cursor = 'grabbing';
    
    // 添加拖拽中的样式
    draggableContainer.classList.add('opacity-90');
    
    // 调整transformOrigin以确保拖拽体验一致
    draggableContainer.style.transformOrigin = '0 0';
}

// 拖拽中
function drag(e) {
    if (!isDragging) return;
    
    // 阻止默认行为（对于触摸设备尤为重要）
    e.preventDefault();
    
    // 获取预览容器的位置和尺寸
    const previewContainer = document.getElementById('previewContainer');
    const containerRect = previewContainer.getBoundingClientRect();
    
    // 获取当前鼠标或触摸位置
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    // 计算新位置（相对于容器）
    let newLeft = clientX - containerRect.left - offsetX;
    let newTop = clientY - containerRect.top - offsetY;
    
    // 限制拖拽范围在容器内
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const elementWidth = draggableContainer.offsetWidth * currentScale;
    const elementHeight = draggableContainer.offsetHeight * currentScale;
    
    // 计算最大可移动距离，允许部分超出以更好地查看边缘
    const maxLeft = containerWidth - elementWidth * 0.2;
    const maxTop = containerHeight - elementHeight * 0.2;
    const minLeft = -elementWidth * 0.8;
    const minTop = -elementHeight * 0.8;
    
    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
    newTop = Math.max(minTop, Math.min(newTop, maxTop));
    
    // 更新元素位置，保持缩放效果
    draggableContainer.style.left = `${newLeft}px`;
    draggableContainer.style.top = `${newTop}px`;
    draggableContainer.style.transform = `scale(${currentScale})`;
}

// 结束拖拽
function endDrag() {
    if (!isDragging) return;
    
    isDragging = false;
    
    // 恢复鼠标样式
    document.body.style.cursor = 'default';
    draggableContainer.style.cursor = 'move';
    
    // 移除拖拽中的样式
    draggableContainer.classList.remove('opacity-90');
    
    // 确保transformOrigin设置为center，以获得更好的缩放体验
    draggableContainer.style.transformOrigin = 'center';
    
    // 确保保持当前缩放状态
    draggableContainer.style.transform = `scale(${currentScale})`;
}

// 添加颗粒事件监听器
function addParticleEventListeners() {
    if (!canvas) return;
    
    // 鼠标悬停效果
    canvas.addEventListener('mousemove', highlightParticle);
}

// 检查是否点击了颗粒
function checkParticleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 获取点击位置相对于Canvas的坐标
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    // 查找被点击的颗粒
    const clickedParticle = particleData.find((particle, index) => {
        return x >= particle.x && x <= particle.x + particle.width && 
               y >= particle.y && y <= particle.y + particle.height;
    });
    
    if (clickedParticle) {
        isParticleDragging = true;
        draggedParticleIndex = particleData.indexOf(clickedParticle);
        
        // 改变鼠标样式
        document.body.style.cursor = 'grabbing';
        canvas.style.cursor = 'grabbing';
    }
}

// 拖拽颗粒（交换位置）
function dragParticle(e) {
    if (!isParticleDragging || draggedParticleIndex === -1) return;
    
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // 获取当前位置
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    // 查找拖拽到的目标颗粒
    const targetParticle = particleData.find((particle, index) => {
        return index !== draggedParticleIndex &&
               x >= particle.x && x <= particle.x + particle.width && 
               y >= particle.y && y <= particle.y + particle.height;
    });
    
    if (targetParticle) {
        const targetIndex = particleData.indexOf(targetParticle);
        
        // 交换颗粒的图片信息
        const tempImageIndex = particleData[draggedParticleIndex].imageIndex;
        const tempImageSrc = particleData[draggedParticleIndex].imageSrc;
        const tempCropParams = { ...particleData[draggedParticleIndex].cropParams };
        
        particleData[draggedParticleIndex].imageIndex = particleData[targetIndex].imageIndex;
        particleData[draggedParticleIndex].imageSrc = particleData[targetIndex].imageSrc;
        particleData[draggedParticleIndex].cropParams = { ...particleData[targetIndex].cropParams };
        
        particleData[targetIndex].imageIndex = tempImageIndex;
        particleData[targetIndex].imageSrc = tempImageSrc;
        particleData[targetIndex].cropParams = tempCropParams;
        
        // 重新绘制Canvas
        redrawCanvas();
        
        // 更新拖拽的颗粒索引为目标索引
        draggedParticleIndex = targetIndex;
    }
}

// 结束拖拽颗粒
function endDragParticle(e) {
    if (!isParticleDragging) return;
    
    isParticleDragging = false;
    draggedParticleIndex = -1;
    
    // 恢复鼠标样式
    document.body.style.cursor = 'default';
    canvas.style.cursor = 'default';
}

// 高亮显示鼠标悬停的颗粒
function highlightParticle(e) {
    if (isDragging || isParticleDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // 查找悬停的颗粒
    const hoveredParticle = particleData.find(particle => {
        return x >= particle.x && x <= particle.x + particle.width && 
               y >= particle.y && y <= particle.y + particle.height;
    });
    
    // 改变鼠标样式
    canvas.style.cursor = hoveredParticle ? 'pointer' : 'default';
}

// 处理Canvas的drop事件（从列表拖拽图片替换颗粒）
function handleCanvasDrop(e) {
    e.preventDefault();
    canvas.style.cursor = 'default';
    
    // 获取拖拽的图片索引
    const imageIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= uploadedImages.length) {
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // 查找drop位置的颗粒
    const targetParticle = particleData.find(particle => {
        return x >= particle.x && x <= particle.x + particle.width && 
               y >= particle.y && y <= particle.y + particle.height;
    });
    
    if (targetParticle) {
        // 获取拖拽的图片
        const draggedImage = uploadedImages[imageIndex];
        const img = new Image();
        img.onload = () => {
            // 计算裁剪参数
            const imgWidth = img.width;
            const imgHeight = img.height;
            
            let sx, sy, sWidth, sHeight;
            if (imgWidth >= imgHeight) {
                sWidth = imgHeight;
                sHeight = imgHeight;
                sx = (imgWidth - sWidth) / 2;
                sy = 0;
            } else {
                sWidth = imgWidth;
                sHeight = imgWidth;
                sx = 0;
                sy = (imgHeight - sHeight) / 2;
            }
            
            // 更新颗粒数据
            targetParticle.imageIndex = imageIndex;
            targetParticle.imageSrc = draggedImage.src;
            targetParticle.cropParams = { sx, sy, sWidth, sHeight };
            
            // 重新绘制Canvas
            redrawCanvas();
            
            showNotification('success', '替换成功', '颗粒图片已成功替换');
        };
        img.src = draggedImage.src;
    }
}

// 重新绘制Canvas
function redrawCanvas() {
    // 清除Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 重新绘制所有颗粒
    particleData.forEach(particle => {
        const img = new Image();
        img.src = particle.imageSrc;
        
        // 使用保存的裁剪参数绘制图片
        ctx.drawImage(
            img,
            particle.cropParams.sx,
            particle.cropParams.sy,
            particle.cropParams.sWidth,
            particle.cropParams.sHeight,
            particle.x,
            particle.y,
            particle.width,
            particle.height
        );
    });
    
    // 更新结果图片引用
    resultImage = canvas.toDataURL('image/png');
}

// 显示通知
function showNotification(type, title, message) {
    // 设置通知类型样式
    notificationIcon.innerHTML = '';
    if (type === 'success') {
        notificationIcon.innerHTML = '<i class="fa fa-check-circle text-green-500"></i>';
    } else if (type === 'error') {
        notificationIcon.innerHTML = '<i class="fa fa-exclamation-circle text-red-500"></i>';
    } else if (type === 'warning') {
        notificationIcon.innerHTML = '<i class="fa fa-exclamation-triangle text-yellow-500"></i>';
    } else {
        notificationIcon.innerHTML = '<i class="fa fa-info-circle text-primary"></i>';
    }
    
    // 设置通知内容
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    // 显示通知
    notification.classList.remove('translate-x-full');
    
    // 3秒后自动关闭
    setTimeout(() => {
        notification.classList.add('translate-x-full');
    }, 3000);
}

// 初始化应用
function init() {
    // 加载自定义模板
    loadCustomTemplates();
    // 更新模板列表
    updateTemplateList();
    // 初始化事件监听器
    initEventListeners();
    // 设置默认蒙版预览
    updateMaskPreview(maskTypeSelect.value);
    // 设置初始状态
    downloadBtn.disabled = true;
    adjustCanvasSize();
    
    // 初始化侧边栏拖拽功能
    initSidebarResizing();
}

// 初始化侧边栏拖拽功能
function initSidebarResizing() {
    const sidebar = document.getElementById('sidebar');
    const dragHandle = document.getElementById('dragHandle');
    const mainContent = document.querySelector('main > div:last-child'); // 右侧预览区域
    let isResizing = false;
    
    if (!sidebar || !dragHandle) return;
    
    // 开始调整大小
    dragHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        
        // 更改鼠标样式
        document.body.style.cursor = 'col-resize';
        dragHandle.classList.add('bg-primary');
        
        // 保存初始位置
        const startX = e.clientX;
        const startWidth = sidebar.offsetWidth;
        
        // 调整大小过程中
        function onMouseMove(e) {
            if (!isResizing) return;
            
            // 计算新宽度
            const deltaX = e.clientX - startX;
            let newWidth = startWidth + deltaX;
            
            // 限制最小和最大宽度
            const minWidth = 200;
            const maxWidth = 500;
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            
            // 更新侧边栏宽度
            sidebar.style.width = `${newWidth}px`;
            
            // 更新拖拽手柄位置
            dragHandle.style.left = `${newWidth}px`;
        }
        
        // 结束调整大小
        function onMouseUp() {
            if (!isResizing) return;
            
            isResizing = false;
            document.body.style.cursor = '';
            dragHandle.classList.remove('bg-primary');
            
            // 移除事件监听器
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mouseleave', onMouseUp);
        }
        
        // 添加事件监听器
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mouseleave', onMouseUp);
    });
    
    // 触摸设备支持
    dragHandle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isResizing = true;
        
        dragHandle.classList.add('bg-primary');
        
        const startTouch = e.touches[0];
        const startX = startTouch.clientX;
        const startWidth = sidebar.offsetWidth;
        
        function onTouchMove(e) {
            if (!isResizing) return;
            e.preventDefault();
            
            const currentTouch = e.touches[0];
            const deltaX = currentTouch.clientX - startX;
            let newWidth = startWidth + deltaX;
            
            const minWidth = 200;
            const maxWidth = 500;
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            
            sidebar.style.width = `${newWidth}px`;
            dragHandle.style.left = `${newWidth}px`;
        }
        
        function onTouchEnd() {
            if (!isResizing) return;
            
            isResizing = false;
            dragHandle.classList.remove('bg-primary');
            
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        }
        
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });
}

// 当页面加载完成时初始化
window.addEventListener('DOMContentLoaded', init);