// 预设颜色数组
const DEFAULT_COLORS = ['#FFFFFF', '#03FBFA', '#378BFC', '#F9C0D6', '#8A2AE3', '#E141F9', '#7702F9', '#FF00BB', '#FDE903', '#E3BBEC', '#EC602A'];

// 存储系统颜色和自定义颜色
let systemColors = [...DEFAULT_COLORS];
let customColors = [];
let currentColor = '#FFFFFF';
let currentColorIndex = 0;
let isFullscreen = false;
let pickerOpen = false;
let selectedHue = 0;
let selectedSaturation = 0;
let selectedValue = 100;
let draggedElement = null;
let touchStartX = 0;
let longPressTimer = null;
let pendingColorToAdd = null;

// DOM 元素
const lightArea = document.getElementById('lightArea');
const colorPalette = document.getElementById('colorPalette');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const colorPickerPopup = document.getElementById('colorPickerPopup');
const closePicker = document.getElementById('closePicker');
const colorGradient = document.getElementById('colorGradient');
const pickerCursor = document.getElementById('pickerCursor');
const hueSlider = document.getElementById('hueSlider');
const hueCursor = document.getElementById('hueCursor');

// 初始化应用
function initApp() {
  loadData();
  renderPalette();
  lightArea.style.background = currentColor;
  updateColorFromPicker();
  bindEventListeners();
}

// 加载保存的数据
function loadData() {
  const saved = localStorage.getItem('fillLightData');
  if (saved) {
    const data = JSON.parse(saved);
    systemColors = data.systemColors || [...DEFAULT_COLORS];
    customColors = data.customColors || [];
    currentColor = data.currentColor || '#FFFFFF';
  }
}

// 保存数据到 localStorage
function saveData() {
  localStorage.setItem('fillLightData', JSON.stringify({
    systemColors,
    customColors,
    currentColor
  }));
}

// 获取所有颜色（系统颜色 + 自定义颜色）
function getAllColors() {
  return [...systemColors, ...customColors];
}

// 渲染颜色面板
function renderPalette() {
  colorPalette.innerHTML = '';
  
  // 渲染系统颜色
  systemColors.forEach((color, index) => {
    const item = createColorItem(color, index, false);
    colorPalette.appendChild(item);
  });

  // 添加分隔符
  const divider = document.createElement('div');
  divider.className = 'divider';
  colorPalette.appendChild(divider);

  // 渲染自定义颜色
  customColors.forEach((color, index) => {
    const item = createColorItem(color, systemColors.length + index, true);
    colorPalette.appendChild(item);
  });

  // 添加添加按钮
  const addBtn = document.createElement('div');
  addBtn.className = 'add-btn';
  addBtn.textContent = '+';
  addBtn.onclick = toggleColorPicker;
  if (pickerOpen) {
    addBtn.classList.add('active');
  } else {
    addBtn.classList.remove('active');
  }
  colorPalette.appendChild(addBtn);

  updateSelection();
}

// 创建颜色项元素
function createColorItem(color, index, isCustom) {
  const item = document.createElement('div');
  item.className = 'color-item';
  item.style.background = color;
  item.dataset.color = color;
  item.dataset.index = index;
  item.draggable = true;

  // 如果是自定义颜色，添加删除按钮
  if (isCustom) {
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteCustomColor(index - systemColors.length);
    };
    item.appendChild(deleteBtn);
  }

   // 点击事件
   item.onclick = () => {
     if (isCustom) {
       // 点击自定义颜色时打开颜色选择器
       toggleColorPicker();
       // 设置当前选择的颜色为该自定义颜色
       pendingColorToAdd = color;
       // 更新颜色选择器显示为当前颜色
       updateColorFromPicker();
     } else {
       selectColor(color, index);
     }
   };

  // 触摸事件处理
  let pressTimer;
  item.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    pressTimer = setTimeout(() => {
      if (isCustom) {
        item.classList.add('show-delete');
      } else {
        startDrag(item, e);
      }
    }, 500);
  });

  item.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
  });

  item.addEventListener('touchmove', () => {
    clearTimeout(pressTimer);
  });

  // 拖拽事件
  item.addEventListener('dragstart', (e) => {
    draggedElement = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    draggedElement = null;
  });

  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (draggedElement && draggedElement !== item) {
      const allItems = [...colorPalette.querySelectorAll('.color-item')];
      const dragIndex = allItems.indexOf(draggedElement);
      const targetIndex = allItems.indexOf(item);
      
      if (dragIndex < systemColors.length && targetIndex < systemColors.length) {
        const temp = systemColors[dragIndex];
        systemColors.splice(dragIndex, 1);
        systemColors.splice(targetIndex, 0, temp);
        saveData();
        renderPalette();
      }
    }
  });

  return item;
}

// 开始拖拽
function startDrag(item, e) {
  draggedElement = item;
  item.classList.add('dragging');
}

// 选择颜色
function selectColor(color, index) {
  currentColor = color;
  currentColorIndex = index;
  lightArea.style.background = color;
  updateSelection();
  saveData();
}

// 更新选中状态
function updateSelection() {
  document.querySelectorAll('.color-item').forEach((item, idx) => {
    if (idx === currentColorIndex) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

// 删除自定义颜色
function deleteCustomColor(index) {
  customColors.splice(index, 1);
  saveData();
  renderPalette();
  
  if (currentColorIndex >= systemColors.length + index) {
    currentColorIndex = Math.max(0, currentColorIndex - 1);
    currentColor = getAllColors()[currentColorIndex];
    lightArea.style.background = currentColor;
  }
}

// 切换颜色选择器
function toggleColorPicker() {
  pickerOpen = !pickerOpen;
  if (pickerOpen) {
    colorPickerPopup.classList.add('show');
    document.querySelector('.add-btn').classList.add('active');
    // 保存当前选择的颜色供后续添加
    pendingColorToAdd = hsvToHex(selectedHue, selectedSaturation, selectedValue);
  } else {
    colorPickerPopup.classList.remove('show');
    document.querySelector('.add-btn').classList.remove('active');
    // 立即添加颜色到自定义色块
    addCurrentColorToCustom();
    pendingColorToAdd = null;
  }
}

// 添加当前颜色到自定义颜色
function addCurrentColorToCustom() {
  if (pendingColorToAdd) {
    const newColor = pendingColorToAdd;
    if (!customColors.includes(newColor) && !systemColors.includes(newColor)) {
      customColors.push(newColor);
      saveData();
      renderPalette();
      pendingColorToAdd = null;
    }
  }
}

// HSV 转 RGB
function hsvToRgb(h, s, v) {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r, g, b;
  
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

// HSV 转 Hex
function hsvToHex(h, s, v) {
  const rgb = hsvToRgb(h, s, v);
  return '#' + [rgb.r, rgb.g, rgb.b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// 更新颜色选择器显示
function updateColorFromPicker() {
  const color = hsvToHex(selectedHue, selectedSaturation, selectedValue);
  lightArea.style.background = color;
  pickerCursor.style.background = color;
  
  const baseColor = hsvToRgb(selectedHue, 100, 100);
  colorGradient.style.background = `
    linear-gradient(to bottom, transparent, #000),
    linear-gradient(to right, #fff, transparent),
    rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})
  `;
}

// 颜色选择器交互处理
function handlePickerInteraction(e) {
  e.preventDefault();
  const updateColor = (clientX, clientY) => {
    const rect = colorGradient.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    selectedSaturation = (x / rect.width) * 100;
    selectedValue = 100 - (y / rect.height) * 100;
    
    pickerCursor.style.left = x + 'px';
    pickerCursor.style.top = y + 'px';
    updateColorFromPicker();
  };

  const handleMove = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    updateColor(touch.clientX, touch.clientY);
  };

  const handleEnd = () => {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
  };

  const touch = e.touches ? e.touches[0] : e;
  updateColor(touch.clientX, touch.clientY);

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchmove', handleMove);
  document.addEventListener('touchend', handleEnd);
}

// 色调滑块交互处理
function handleHueInteraction(e) {
  e.preventDefault();
  const updateHue = (clientX) => {
    const rect = hueSlider.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    selectedHue = (x / rect.width) * 360;
    hueCursor.style.left = x + 'px';
    updateColorFromPicker();
  };

  const handleMove = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    updateHue(touch.clientX);
  };

  const handleEnd = () => {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
  };

  const touch = e.touches ? e.touches[0] : e;
  updateHue(touch.clientX);

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchmove', handleMove);
  document.addEventListener('touchend', handleEnd);
}

// 绑定事件监听器
function bindEventListeners() {
  // 颜色选择器交互
  colorGradient.addEventListener('mousedown', handlePickerInteraction);
  colorGradient.addEventListener('touchstart', handlePickerInteraction);

  // 色调滑块交互
  hueSlider.addEventListener('mousedown', handleHueInteraction);
  hueSlider.addEventListener('touchstart', handleHueInteraction);

   // 添加颜色按钮
   const addColorBtn = document.getElementById('addColorBtn');
   addColorBtn.addEventListener('click', () => {
     // 立即添加颜色
     addCurrentColorToCustom();
     // 然后关闭选择器
     toggleColorPicker();
   });

  // 关闭颜色选择器
  closePicker.onclick = toggleColorPicker;

   // 点击颜色选择器外部区域关闭
   document.addEventListener('click', (e) => {
     if (pickerOpen && !e.target.closest('.color-picker-popup') && !e.target.closest('.add-btn')) {
       toggleColorPicker();
     }
   });

  // 全屏切换
  fullscreenBtn.onclick = toggleFullscreen;
  lightArea.onclick = toggleFullscreen;

  // 滑动手势处理
  let touchStartTime = 0;
  let swipeStartX = 0;
  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.color-palette') || e.target.closest('.color-picker-popup')) return;
    touchStartTime = Date.now();
    swipeStartX = e.touches[0].clientX;
  });

  document.addEventListener('touchend', (e) => {
    if (e.target.closest('.color-palette') || e.target.closest('.color-picker-popup')) return;
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchEndX - swipeStartX;
    const swipeTime = Date.now() - touchStartTime;
    
    if (Math.abs(swipeDistance) > 50 && swipeTime < 300) {
      const allColors = getAllColors();
      if (swipeDistance > 0 && currentColorIndex > 0) {
        currentColorIndex--;
      } else if (swipeDistance < 0 && currentColorIndex < allColors.length - 1) {
        currentColorIndex++;
      }
      currentColor = allColors[currentColorIndex];
      lightArea.style.background = currentColor;
      updateSelection();
      saveData();
    }
  });

  // 点击外部关闭删除状态
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.color-item')) {
      document.querySelectorAll('.color-item').forEach(item => {
        item.classList.remove('show-delete');
      });
    }
  });
}

// 切换全屏模式
function toggleFullscreen() {
  isFullscreen = !isFullscreen;
  if (isFullscreen) {
    document.body.classList.add('fullscreen-mode');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  } else {
    document.body.classList.remove('fullscreen-mode');
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);