// 這是 'script.js' 檔案
// [最終遊戲化整合版] v21 - (v20 擴充 + v19.1 Bug修復 + 10題無上限)

// 'words' 變數 - 用來存放 "目前" 正在練習的題庫 (已合併單元)
let words = []; 

let shuffleWords = []; 
let results = {}; 
let currentIndex = 0;
let currentLevel = 'level1_element'; // 預設等級 (國小)
let currentHanlinGrade = ''; // 紀錄當前選擇的翰林年級 (例如 grade_7A)

// --- [新增] 遊戲化全域變數 ---
let totalXP = 0;
let currentStreak = 0;
let unlockedBadges = [];
let quizLengthLimit = 100; // [新增] 測驗題數上限

// [修改 v20] 寵物進化設定 (擴充至 10 級)
const petLevels = [
    { xp: 0,    name: '學習新星', image: '🥚' },
    { xp: 100,  name: '見習學徒', image: '🐣' },
    { xp: 500,  name: '小小探險家', image: '🦖' },
    { xp: 1500, name: '單字獵人', image: '🦕' },
    { xp: 3000, name: '翰林學者', image: '🐉' },
    { xp: 6000, name: '單字大師', image: '👑🐉' },
    { xp: 10000,name: '烈焰巨龍', image: '🔥🐉' },
    { xp: 18000,name: '寒冰巨龍', image: '🧊🐉' },
    { xp: 30000,name: '雷霆聖龍', image: '⚡🐉' },
    { xp: 50000,name: '單字之神', image: '✨🐉' }
];

// [修改 v20] 徽章成就設定 (擴充至 15 個)
const allBadges = {
    // 累積徽章
    'first_correct': { icon: '✅', title: '踏出第一步', desc: '第一次答對單字' },
    'correct_10': { icon: '🔟', title: '小小成就', desc: '累積答對 10 題' },
    'correct_50': { icon: '5️⃣0️⃣', title: '穩定進步', desc: '累積答對 50 題' },
    'correct_100': { icon: '💯', title: '百詞斬', desc: '累積答對 100 題' },
    'correct_500': { icon: '5️⃣0️⃣0️⃣', title: '詞彙忍者', desc: '累積答對 500 題' },
    'correct_1000': { icon: '🏆', title: '千詞達人', desc: '累積答對 1000 題' },
    
    // 連擊徽章
    'streak_5': { icon: '🔥', title: '連擊好手', desc: '連續答對 5 題' },
    'streak_10': { icon: '💥', title: '火力全開', desc: '連續答對 10 題' },
    'streak_25': { icon: '🚀', title: '勢不可擋', desc: '連續答對 25 題' },

    // 技巧徽章
    'perfect_quiz': { icon: '🎯', title: '完美測驗', desc: '在一次測驗中 (至少20題) 達到 100% 答對率' },
    'perfect_100': { icon: '💎', title: '完美無瑕', desc: '在 100 題的測驗中達到 100% 答對率' },

    // 探索徽章
    'custom_user': { icon: '✏️', title: '自造者', desc: '完成一次自訂題庫測驗' },
    'hanlin_user': { icon: '📘', title: '翰林學霸', desc: '完成一次翰林專區測驗' },
    'junior_pass': { icon: '🧑‍🎓', title: '國中畢業', desc: '完成一次國中等級測驗' },
    'senior_pass': { icon: '🏛️', title: '高中畢業', desc: '完成一次高中等級測驗' }
};
// --- (遊戲化變數結束) ---

// 'baseWordLists' 變數將由 <script src="words.js"></script> 檔案提供。

// 頁面載入時初始化
window.onload = init;

function init() {
    // 檢查 baseWordLists 是否成功載入
    if (typeof baseWordLists === 'undefined' || Object.keys(baseWordLists).length === 0) {
        alert("錯誤：無法載入 'words.js' 題庫檔案！請檢查檔案名稱或語法是否正確。");
        return;
    }

    // 載入遊戲化資料
    totalXP = parseInt(localStorage.getItem('totalXP') || '0', 10);
    unlockedBadges = JSON.parse(localStorage.getItem('unlockedBadges') || '[]');
    
    // [修改 v21] 載入自訂題數 (預設 100)
    quizLengthLimit = parseInt(localStorage.getItem('quizLengthLimit') || '100', 10);
    document.getElementById('quizLengthInput').value = quizLengthLimit;


    // 讀取上次儲存的等級，如果沒有，就用預設的 'level1_element'
    currentLevel = localStorage.getItem('currentWordLevel') || 'level1_element';
    
    // [BUG 修復 v19.1]
    // 檢查儲存的等級是否為 'level6_hanlin' (翰林主面板) 或 'grade_' (翰林子選單)
    // 這些狀態在重新載入時無法直接載入題庫，會導致錯誤
    if (currentLevel === 'level6_hanlin' || currentLevel.startsWith('grade_')) {
        // 強制重設回 level1，讓使用者有一個安全的啟動狀態
        currentLevel = 'level1_element';
        localStorage.setItem('currentWordLevel', 'level1_element');
    }

    // 載入對應的單字列表 (此時 currentLevel 一定是 level1-5 或 custom)
    loadWordList(currentLevel);
    
    // 更新介面
    updateActiveTab(currentLevel);
    shuffleAndReset(); // 這裡會重設 streak
    updateStats();
    updateNavigation();
    updateControlsText(); // 初始化按鈕文字
    updatePetDisplay(); // [新增] 初始化寵物介面
}

/**
 * 載入指定等級的單字到 'words' 變數中
 */
function loadWordList(level) {
    let wordList = [];
    
    if (level === 'custom') {
        const customWords = JSON.parse(localStorage.getItem('customWords')) || [];
        wordList = customWords;
    } 
    // 處理其他一般等級 (level1_element 到 level5_business)
    else if (level.startsWith('level') && level !== 'level6_hanlin') {
        wordList = baseWordLists[level] || [];
        if (wordList.length === 0 && level !== 'level1_element') {
             alert(`「${level.replace('level', '').replace('_', ' ').toUpperCase()}」等級的題庫是空的，請選擇其他等級。`);
        }
    }
    // 處理翰林子等級 (grade_7A, grade_7B...) - 這裡只載入 structure
    else if (level.startsWith('grade_')) {
         const gradeData = baseWordLists.level6_hanlin[level];
         if (!gradeData || Object.keys(gradeData).length === 0) {
             alert(`「${level}」的題庫為空。請選擇其他等級。`);
         }
         words = []; // 保持 words 為空，等待 startHanlinQuiz
         currentLevel = level;
         localStorage.setItem('currentWordLevel', level);
         return;
    }
    
    // 更新 words 和 currentLevel
    words = wordList;
    currentLevel = level;
    localStorage.setItem('currentWordLevel', level);
}

/**
 * 點擊等級按鈕時呼叫 (主要層級)
 */
function changeLevel(newLevel) {
    // 如果是切換到翰林專區，則呼叫 showHanlinPanel
    if (newLevel === 'level6_hanlin') {
        showHanlinPanel();
        return;
    }
    
    hideHanlinPanel(); // 確保翰林面板是隱藏的

    // 如果點擊的是當前等級，且不是自訂題庫，則重置即可
    if (newLevel === currentLevel && newLevel !== 'custom') {
        resetAll(); 
        return;
    }

    loadWordList(newLevel);
    updateActiveTab(newLevel);
    resetAll(); // 重置測驗
    updateControlsText(); // 更新按鈕文字
}


// --- 翰林專區邏輯 ---

/**
 * 點擊「翰林專區」按鈕時呼叫
 */
function showHanlinPanel() {
    document.getElementById('mainTabs').style.display = 'none';
    document.getElementById('hanlinPanel').style.display = 'block';
    updateActiveTab('tab-level6_hanlin');

    // 預設顯示七年級上學期的單元
    if (!currentHanlinGrade || !currentHanlinGrade.startsWith('grade_')) {
        currentHanlinGrade = 'grade_7A';
    }
    showHanlinUnits(currentHanlinGrade);
}

/**
 * 點擊「返回主等級」按鈕時呼叫
 */
function hideHanlinPanel() {
    document.getElementById('mainTabs').style.display = 'flex';
    document.getElementById('hanlinPanel').style.display = 'none';
    
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 恢復到預設的國小等級
    loadWordList('level1_element');
    updateActiveTab('level1_element'); 
    resetAll();
    updateControlsText();
}

/**
 * 點擊「年級學期」按鈕時呼叫 (例如 grade_7A)
 */
function showHanlinUnits(gradeKey) {
    currentHanlinGrade = gradeKey;
    const unitContainer = document.getElementById('unitCheckboxes');
    unitContainer.innerHTML = ''; // 清空舊內容
    
    // 移除年級按鈕的 active 狀態
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // 激活當前按鈕
    const activeGradeTab = document.querySelector(`.grade-btn[data-grade="${gradeKey}"]`);
    if (activeGradeTab) {
        activeGradeTab.classList.add('active');
    }

    // 檢查該年級下是否有單元資料 (words.js 是三層結構)
    const gradeData = baseWordLists.level6_hanlin[gradeKey];
    
    if (!gradeData || Object.keys(gradeData).length === 0) {
        unitContainer.innerHTML = `<div class="unit-message">「${gradeKey}」的題庫為空！請手動新增資料。</div>`;
        return;
    }

    const unitKeys = Object.keys(gradeData);

    // 動態創建核取方塊
    unitKeys.forEach(unitKey => {
        const wordCount = gradeData[unitKey].length;
        const label = document.createElement('label');
        label.className = 'unit-checkbox-item';
        
        // 賦予 input 唯一的 ID，並使用 label for 綁定
        const inputId = `${gradeKey}-${unitKey}`;
        
        label.innerHTML = `
            <input type="checkbox" id="${inputId}" name="hanlinUnit" value="${unitKey}" onclick="updateControlsText()">
            <span style="font-weight: bold;">${unitKey}</span> (${wordCount} 詞)
        `;
        unitContainer.appendChild(label);
    });
}

/**
 * 點擊「全選/全不選」時呼叫
 */
function toggleSelectAllUnits(checkStatus) {
    document.querySelectorAll('#unitCheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = checkStatus;
    });
    updateControlsText(); // 更新按鈕文字
}

/**
 * 點擊「開始測驗」按鈕時呼叫
 */
function startHanlinQuiz() {
    const checkedUnits = [];
    const unitCheckboxes = document.querySelectorAll('#unitCheckboxes input[type="checkbox"]:checked');
    
    unitCheckboxes.forEach(checkbox => {
        checkedUnits.push(checkbox.value);
    });

    if (checkedUnits.length === 0) {
        alert('請至少選擇一個單元才能開始測驗！');
        return;
    }

    // 1. 合併單字列表
    let combinedWords = [];
    const gradeData = baseWordLists.level6_hanlin[currentHanlinGrade];

    checkedUnits.forEach(unitKey => {
        const unitList = gradeData[unitKey];
        if (unitList && unitList.length > 0) {
            combinedWords = combinedWords.concat(unitList);
        }
    });

    if (combinedWords.length === 0) {
        alert('所選單元中沒有任何單字，請檢查題庫資料。');
        return;
    }

    // 2. 載入並重置測驗
    words = combinedWords;
    currentLevel = currentHanlinGrade; // 設置當前等級為選擇的年級
    localStorage.setItem('currentWordLevel', currentHanlinGrade);
    
    document.getElementById('mainTabs').style.display = 'flex'; // 修正：顯示主 Tabs
    document.getElementById('hanlinPanel').style.display = 'none'; // 隱藏面板
    
    updateActiveTab('level6_hanlin'); // 激活「翰林專區」主按鈕
    shuffleAndReset();
    updateControlsText(); // 更新按鈕文字
}


/**
 * 更新頂部等級按鈕的 "active" 狀態
 */
function updateActiveTab(activeLevelId = currentLevel) {
    // 移除所有主按鈕的 active
    document.querySelectorAll('.level-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 判斷是否為翰林子等級 (grade_7A)，如果是，則激活 'tab-level6_hanlin' 按鈕
    const mainTabId = activeLevelId.startsWith('grade_') ? 'tab-level6_hanlin' : 'tab-' + activeLevelId;

    const activeTab = document.getElementById(mainTabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 移除所有年級按鈕的 active 狀態
    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // 如果當前等級是翰林子等級，則激活子等級按鈕
    if (activeLevelId.startsWith('grade_')) {
        const activeGradeTab = document.querySelector(`.grade-btn[data-grade="${activeLevelId}"]`);
        if (activeGradeTab) {
            activeGradeTab.classList.add('active');
        }
    }
}

/**
 * [新增] 更新自訂題數
 */
function updateQuizLength() {
    const input = document.getElementById('quizLengthInput');
    let length = parseInt(input.value, 10);

    // [修改 v21] 驗證輸入，最小值為 10，移除上限
    if (isNaN(length) || length < 10) {
        length = 10;
        alert("測驗題數最少為 10 題。");
    }
    
    input.value = length; // 校正輸入框中的值
    quizLengthLimit = length;
    localStorage.setItem('quizLengthLimit', length);
    
    // 立即更新按鈕文字，並重新抽題
    updateControlsText();
    shuffleAndReset();
}

/**
 * 根據當前題庫總數更新按鈕文字 
 */
function updateControlsText() {
    // [修改] 讀取 quizLengthLimit
    const currentQuizLimit = quizLengthLimit;

    // 處理 Unit Selection 介面
    const startQuizBtn = document.querySelector('.btn-start-quiz');
    if (startQuizBtn && document.getElementById('hanlinPanel').style.display === 'block' && currentHanlinGrade) {
        let combinedWords = [];
        const gradeData = baseWordLists.level6_hanlin[currentHanlinGrade];
        
        // 檢查 gradeData 是否存在
        if(gradeData) {
            const checkedUnits = document.querySelectorAll('#unitCheckboxes input[type="checkbox"]:checked');
            
            checkedUnits.forEach(checkbox => {
                const unitList = gradeData[checkbox.value];
                if (unitList && unitList.length > 0) {
                    combinedWords = combinedWords.concat(unitList);
                }
            });
        }

        const selectedWordsCount = combinedWords.length;
        // [修改] 翰林專區的測驗題數也使用自訂上限
        const quizLimitHanlin = Math.min(selectedWordsCount, currentQuizLimit);

        if (selectedWordsCount === 0) {
             startQuizBtn.textContent = '開始測驗';
        } else if (selectedWordsCount <= currentQuizLimit) {
             startQuizBtn.textContent = `開始測驗 (共 ${quizLimitHanlin} 題)`;
        } else {
             startQuizBtn.textContent = `開始測驗 (抽取 ${currentQuizLimit} 題)`;
        }
    }


    // 處理「重新排序」按鈕
    const shuffleBtn = document.getElementById('shuffleButton'); 
    const totalWordsCount = words.length;
    // [修改] 一般等級的測驗題數也使用自訂上限
    const quizLimit = Math.min(totalWordsCount, currentQuizLimit);

    if (totalWordsCount === 0) {
        shuffleBtn.textContent = '重新排序 (題庫為空)';
    } else if (totalWordsCount <= currentQuizLimit) {
        shuffleBtn.textContent = `重新排序 (共 ${quizLimit} 題)`;
    } else {
        shuffleBtn.textContent = `重新排序 (抽取 ${currentQuizLimit} 題)`;
    }
}


// [修改] 抽題邏輯
function shuffleAndReset() {
    if (!words || words.length === 0) {
        shuffleWords = []; 
    } else {
        let shuffledFullList = [...words].sort(() => Math.random() - 0.5);
        
        // [重大修改] 動態設定測驗數量 (使用 quizLengthLimit)
        const quizLimit = Math.min(shuffledFullList.length, quizLengthLimit);
        shuffleWords = shuffledFullList.slice(0, quizLimit);
    }

    results = {}; 
    currentIndex = 0;
    currentStreak = 0; // [新增] 重設連擊
    generateCurrentCard();
    updateNavigation();
    updateStats();
    updateControlsText(); // [新增] 更新按鈕文字
}

// 生成卡片
function generateCurrentCard() {
    removeAllStepMarkers(); 
    const card = document.getElementById('wordCard');
    card.innerHTML = ''; 
    card.className = 'word-card'; 

    if (shuffleWords.length === 0) {
        card.innerHTML = `<div class="word-number">題庫是空的！<br>請選擇其他等級，或點「設定單字」加入自訂單字。</div>`;
        
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        
        return;
    }

    const wordObject = shuffleWords[currentIndex];
    
    const englishWord = wordObject.word;
    const chineseWord = wordObject.translation;

    const wordNumber = document.createElement('div');
    wordNumber.className = 'word-number';
    wordNumber.textContent = `${currentIndex + 1} / ${shuffleWords.length} 個單字`;

    const wordDisplay = document.createElement('div');
    wordDisplay.className = 'word-display';
    wordDisplay.textContent = englishWord; 

    const wordControls = document.createElement('div');
    wordControls.className = 'word-controls';

    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.textContent = '美式發音 + 中文';
    speakBtn.onclick = () => speakWordAndTranslation(englishWord, chineseWord, "en-US"); 

    const speakBtnUK = document.createElement('button');
    speakBtnUK.className = 'speak-btn';
    speakBtnUK.textContent = '英式發音 + 中文';
    speakBtnUK.onclick = () => speakWordAndTranslation(englishWord, chineseWord, "en-GB"); 

    const wordInput = document.createElement('input');
    wordInput.type = 'text';
    wordInput.className = 'word-input';
    wordInput.id = 'currentInput';
    wordInput.placeholder = '請輸入單字...';
    wordInput.onkeypress = (event) => handleEnterKey(event, wordObject);
    wordInput.onfocus = () => {
        setTimeout(() => {
            wordInput.focus();
        }, 0);
    };

    const checkBtn = document.createElement('button');
    checkBtn.className = 'check-btn';
    checkBtn.textContent = '檢查';
    checkBtn.onclick = () => checkCurrentWord(wordObject);

    const result = document.createElement('div');
    result.className = 'result';
    result.id = 'currentResult';

    const translationDisplay = document.createElement('div');
    translationDisplay.className = 'translation-display';
    translationDisplay.id = 'translationDisplay';

    const sentenceDisplay = document.createElement('div');
    sentenceDisplay.className = 'sentence-display';
    sentenceDisplay.id = 'sentenceDisplay';


    const speakBtnGroup = document.createElement('div');
    speakBtnGroup.className = 'speak-btn-group';
    speakBtnGroup.appendChild(speakBtn);
    speakBtnGroup.appendChild(speakBtnUK);

    wordControls.appendChild(speakBtnGroup);
    wordControls.appendChild(wordInput);
    wordControls.appendChild(checkBtn);

    card.appendChild(wordNumber);
    card.appendChild(wordDisplay);
    card.appendChild(wordControls);
    card.appendChild(result);
    card.appendChild(translationDisplay); 
    card.appendChild(sentenceDisplay); 

    if (results.hasOwnProperty(currentIndex)) {
        displayPreviousResult();
    } else {
        wordDisplay.style.display = 'none';
        
        // 加入步驟提示
        addStepMarker(speakBtnGroup, '①', 'step-marker-1');
        addStepMarker(wordControls, '②', 'step-marker-2'); 
        addStepMarker(wordControls, '③', 'step-marker-3'); 
    }
}

// 顯示結果 (用於切換卡片時)
function displayPreviousResult() {
    removeAllStepMarkers(); 

    const isCorrect = results[currentIndex];
    const resultEl = document.getElementById('currentResult');
    const translationEl = document.getElementById('translationDisplay'); 
    const sentenceEl = document.getElementById('sentenceDisplay'); 
    const cardElement = document.getElementById('wordCard');
    const wordDisplayEl = document.querySelector('#wordCard .word-display'); 

    const wordObject = shuffleWords[currentIndex];
    const word = wordObject.word;
    const translation = wordObject.translation;
    const sentence_en = wordObject.sentence_en;
    const sentence_zh = wordObject.sentence_zh;

    if (isCorrect) {
        resultEl.innerHTML = '正確！';
        resultEl.className = 'result correct';
        cardElement.className = 'word-card correct';
    } else {
        resultEl.innerHTML = `錯誤！正確答案是 ${word}`;
        resultEl.className = 'result incorrect';
        cardElement.className = 'word-card incorrect';
    }

    // [修改] 判斷是否為自訂題庫
    if (currentLevel === 'custom') {
        // [新邏輯] 如果翻譯是 '（自動翻譯）'，才呼叫 API
        if (translation === '（自動翻譯）') {
            fetchTranslation(word, translationEl);
        } else {
            // 否則 (代表是從 words.js 抓到的)，直接顯示
            translationEl.innerHTML = `<span class="translation">${translation}</span>`;
        }
    } else {
        // (非自訂題庫的原始邏輯)
        translationEl.innerHTML = `<span class="translation">${translation}</span>`;
    }
    
    // 正確建立按鈕和事件
    const sentenceEnSpan = document.createElement('span');
    sentenceEnSpan.className = 'sentence-en';
    sentenceEnSpan.textContent = sentence_en;

    const sentenceSpeakBtn = document.createElement('button');
    sentenceSpeakBtn.className = 'sentence-speak-btn';
    sentenceSpeakBtn.innerHTML = '🔊';
    sentenceSpeakBtn.onclick = () => speakWord(sentence_en.replace(/'/g, "\\'"), 'en-US');
    
    addStepMarker(sentenceSpeakBtn, '④', 'step-marker-4'); // 附加到按鈕上

    const sentenceZhSpan = document.createElement('span');
    sentenceZhSpan.className = 'sentence-zh';
    sentenceZhSpan.textContent = sentence_zh;

    // 清空 sentenceEl 以避免重複添加
    sentenceEl.innerHTML = '';
    sentenceEl.appendChild(sentenceEnSpan);
    sentenceEl.appendChild(sentenceSpeakBtn);
    sentenceEl.appendChild(document.createElement('br'));
    sentenceEl.appendChild(sentenceZhSpan);

    if(wordDisplayEl) {
        wordDisplayEl.style.display = 'block';
    }
    
    const inputElement = document.getElementById('currentInput');
    const checkButton = document.querySelector('#wordCard .check-btn');
    if(inputElement) inputElement.disabled = true;
    if(checkButton) checkButton.disabled = true;

    // 將提示 ⑤ 附加到「下一張」按鈕上
    addStepMarker(document.getElementById('nextBtn'), '⑤', 'step-marker-5');
}

// 加入步驟提示標記
function addStepMarker(targetElement, text, className) {
    if (!targetElement) return;

    // 檢查是否已經有相同的標記，避免重複
    if (targetElement.querySelector(`.${className}`)) return;
    
    const marker = document.createElement('span');
    marker.className = `step-marker ${className}`;
    marker.textContent = text;
    targetElement.appendChild(marker);
}

// 移除所有步驟提示標記
function removeAllStepMarkers() {
    document.querySelectorAll('.step-marker').forEach(marker => marker.remove());
}


// 更新導航按鈕
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const cardInfo = document.getElementById('cardInfo');
    
    if (prevBtn) prevBtn.disabled = currentIndex === 0 || shuffleWords.length === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === shuffleWords.length - 1 || shuffleWords.length === 0;
    if (cardInfo) cardInfo.textContent = shuffleWords.length === 0 ? "N/A" : `${currentIndex + 1} / ${shuffleWords.length}`;
}

// 上一張卡片
function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        generateCurrentCard();
        updateNavigation();
    }
}

// 下一張卡片
function nextCard() {
    if (currentIndex < shuffleWords.length - 1) {
        currentIndex++;
        generateCurrentCard();
        updateNavigation();
    }
}

// 發音功能 (只播單一語言，給例句 🔊 使用)
function speakWord(word, lang = "en-US") {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = lang;
        utterance.rate = 0.8;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
        
        setTimeout(() => {
            const inputElement = document.getElementById('currentInput');
            if (inputElement && !inputElement.disabled) { 
                inputElement.focus();
            }
        }, 0);
    } else {
        alert('您的瀏覽器不支援語音合成功能');
    }
}

// 發音功能 (播放英文單字 + 中文翻譯)
function speakWordAndTranslation(englishWord, chineseWord, englishLang = "en-US") {
    // [修改] 如果是自動翻譯的 placeholder，也只唸英文
    if (chineseWord.includes('（') || chineseWord.includes('(')) {
        speakWord(englishWord, englishLang);
        return;
    }
    
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); 

        const utteranceEN = new SpeechSynthesisUtterance(englishWord);
        utteranceEN.lang = englishLang;
        utteranceEN.rate = 0.8;
        utteranceEN.volume = 1;

        const utteranceZH = new SpeechSynthesisUtterance(chineseWord);
        utteranceZH.lang = 'zh-TW'; 
        utteranceZH.rate = 0.8;
        utteranceZH.volume = 1;

        utteranceEN.onend = function() {
            window.speechSynthesis.speak(utteranceZH);
        };

        window.speechSynthesis.speak(utteranceEN);

        setTimeout(() => {
            const inputElement = document.getElementById('currentInput');
            if (inputElement && !inputElement.disabled) { 
                inputElement.focus();
            }
        }, 0);
    } else {
        alert('您的瀏覽器不支援語音合成功能');
    }
}


// 檢查答案
function checkCurrentWord(wordObject) { 
    removeAllStepMarkers(); 
    
    const index = currentIndex;
    const input = document.getElementById('currentInput');
    const resultEl = document.getElementById('currentResult');
    const translationEl = document.getElementById('translationDisplay'); 
    const sentenceEl = document.getElementById('sentenceDisplay'); 
    const wordCard = document.getElementById('wordCard');
    const wordDisplayEl = document.querySelector('#wordCard .word-display'); 

    if (input.disabled) return; 

    const correctWord = wordObject.word;
    const translation = wordObject.translation;
    const sentence_en = wordObject.sentence_en;
    const sentence_zh = wordObject.sentence_zh;

    const userInput = input.value.trim().toLowerCase();
    const isCorrect = userInput === correctWord.toLowerCase();
    results[index] = isCorrect; 

    if (isCorrect) {
        // [新增] 連擊和 XP 邏輯
        currentStreak++;
        let xpGained = 10 + Math.min(currentStreak, 5); // 基礎 10 XP，連擊最多額外+5 XP
        addXP(xpGained);

        let comboText = '';
        if (currentStreak > 1) {
            comboText = `<span class="combo-streak">🔥 連續答對 ${currentStreak} 題！(+${xpGained} XP)</span>`;
        } else {
            comboText = ` (+${xpGained} XP)`;
        }

        resultEl.innerHTML = '正確！' + comboText;
        resultEl.className = 'result correct';
        wordCard.className = 'word-card correct';
        
    } else {
        // [新增] 中斷連擊
        currentStreak = 0;
        resultEl.innerHTML = `錯誤！正確答案是 ${correctWord}`;
        resultEl.className = 'result incorrect';
        wordCard.className = 'word-card incorrect';
    }
    
    // [修改] 判斷是否為自訂題庫
    if (currentLevel === 'custom') {
        // [新邏輯] 如果翻譯是 '（自動翻譯）'，才呼叫 API
        if (translation === '（自動翻譯）') {
            fetchTranslation(correctWord, translationEl);
        } else {
            // 否則 (代表是從 words.js 抓到的)，直接顯示
            translationEl.innerHTML = `<span class="translation">${translation}</span>`;
        }
    } else {
        // (非自訂題庫的原始邏輯)
        translationEl.innerHTML = `<span class="translation">${translation}</span>`;
    }
    
    // 正確建立按鈕和事件
    const sentenceEnSpan = document.createElement('span');
    sentenceEnSpan.className = 'sentence-en';
    sentenceEnSpan.textContent = sentence_en;

    const sentenceSpeakBtn = document.createElement('button');
    sentenceSpeakBtn.className = 'sentence-speak-btn';
    sentenceSpeakBtn.innerHTML = '🔊';
    sentenceSpeakBtn.onclick = () => speakWord(sentence_en.replace(/'/g, "\\'"), 'en-US');
    
    addStepMarker(sentenceSpeakBtn, '④', 'step-marker-4'); // 附加到按鈕上

    const sentenceZhSpan = document.createElement('span');
    sentenceZhSpan.className = 'sentence-zh';
    sentenceZhSpan.textContent = sentence_zh;

    // 清空 sentenceEl 以避免重複添加
    sentenceEl.innerHTML = '';
    sentenceEl.appendChild(sentenceEnSpan);
    sentenceEl.appendChild(sentenceSpeakBtn);
    sentenceEl.appendChild(document.createElement('br'));
    sentenceEl.appendChild(sentenceZhSpan);

    if(wordDisplayEl) {
        wordDisplayEl.style.display = 'block';
    }
    
    input.disabled = true;
    document.querySelector('#wordCard .check-btn').disabled = true;

    const stats = updateStats(); // 更新統計並取得回傳值 (這裡會觸發徽章檢查)

    // 將提示 ⑤ 附加到「下一張」按鈕上
    addStepMarker(document.getElementById('nextBtn'), '⑤', 'step-marker-5');

    // 檢查是否全部完成
    if (stats.checkedWords === stats.totalWords && stats.totalWords > 0) {
        setTimeout(() => {
            alert(`🎉 恭喜完成！🎉\n\n您完成了 ${stats.totalWords} 題測驗。\n答對：${stats.correctWords} 題\n答錯：${stats.incorrectWords} 題\n答對率：${stats.accuracy}%\n\n繼續努力學習！`);
        }, 500); // 延遲 0.5 秒，讓畫面先顯示答案
    }
}

// 處理 Enter 鍵
function handleEnterKey(event, wordObject) { 
    if (event.key === 'Enter') {
        checkCurrentWord(wordObject); 
    }
}

// 重置所有進度
function resetAll() {
    results = {};
    currentIndex = 0;
    currentStreak = 0; // [新增] 重設連擊
    shuffleAndReset(); 
    updateNavigation();
    updateStats();
}

// 更新統計數據
function updateStats() {
    const totalWords = shuffleWords.length;
    const checkedWords = Object.keys(results).length;
    const correctWords = Object.values(results).filter(result => result).length;
    const incorrectWords = checkedWords - correctWords;
    const accuracy = checkedWords > 0 ? Math.round((correctWords / checkedWords) * 100) : 0;

    document.getElementById('totalWords').textContent = totalWords;
    document.getElementById('correctCount').textContent = correctWords;
    document.getElementById('incorrectCount').textContent = incorrectWords;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('practicedCount').textContent = checkedWords;
    
    // 回傳統計物件
    const stats = { totalWords, checkedWords, correctWords, incorrectWords, accuracy };
    
    // [新增] 檢查是否解鎖徽章
    checkAndUnlockBadges(stats);

    return stats;
}

// 開啟設定視窗
function openWordSettings() {
    const modal = document.getElementById('wordSettingsModal');
    modal.style.display = 'flex'; 
    
    // [修改] 載入自訂單字，並格式化回 "單字;例句" 格式
    if (currentLevel === 'custom') {
        const customWords = JSON.parse(localStorage.getItem('customWords')) || [];
        
        const textValue = customWords.map(w => {
            // 只有當例句不是預設值時才把它組合回去
            const s_en = (w.sentence_en && w.sentence_en !== '（無例句）') ? w.sentence_en : '';
            const s_zh = (w.sentence_zh && w.sentence_zh !== '（無例句）') ? w.sentence_zh : '';
            
            // 組合，並清除尾端多餘的分號
            let line = w.word;
            if (s_en || s_zh) {
                line += `;${s_en}`;
            }
            if (s_zh) {
                line += `;${s_zh}`;
            }
            return line;
        }).join('\n');
        
        document.getElementById('customWordsTextarea').value = textValue;
    } else {
        document.getElementById('customWordsTextarea').value = '';
    }
    document.getElementById('customWordsTextarea').focus();
}

// 關閉設定視Window
function closeWordSettings() {
    document.getElementById('wordSettingsModal').style.display = 'none'; 
}

/**
 * [新功能] 在 'words.js' 中搜尋單字，回傳找到的物件或 null
 */
function findWordInDatabase(wordToFind) {
    if (!wordToFind || typeof baseWordLists === 'undefined') {
        return null;
    }
    const targetWord = wordToFind.toLowerCase();

    // 1. 搜尋 Level 1 到 Level 5
    const levelsToSearch = ['level1_element', 'level2_junior', 'level3_senior', 'level4_college', 'level5_business'];
    for (const level of levelsToSearch) {
        const wordList = baseWordLists[level] || [];
        const found = wordList.find(w => w.word.toLowerCase() === targetWord);
        if (found) {
            return found; // 找到就回傳
        }
    }

    // 2. 搜尋 Level 6 (翰林)
    const hanlinData = baseWordLists.level6_hanlin || {};
    // 迭代所有年級 (e.g., 'grade_7A')
    for (const gradeKey in hanlinData) {
        const grade = hanlinData[gradeKey] || {};
        // 迭代該年級所有單元 (e.g., 'Unit1')
        for (const unitKey in grade) {
            const unitList = grade[unitKey] || [];
            const found = unitList.find(w => w.word.toLowerCase() === targetWord);
            if (found) {
                return found; // 找到就回傳
            }
        }
    }

    // 都找不到
    return null;
}

// [重大修改] 儲存設定 (自訂題庫) - 整合搜尋與手動輸入
function saveWordSettings() {
    const text = document.getElementById('customWordsTextarea').value;
    const newWordsStrings = text.split('\n').map(w => w.trim()).filter(w => w);
    
    if (newWordsStrings.length === 0) {
        alert('請至少輸入一個單字');
        return;
    }

    const newWordsObjects = newWordsStrings.map(w => {
        const parts = w.split(';');
        const word = parts[0] ? parts[0].trim() : '';
        if (!word) return null; // 略過空行

        // 檢查使用者是否手動輸入了例句
        const user_s_en = parts[1] ? parts[1].trim() : '';
        const user_s_zh = parts[2] ? parts[2].trim() : '';

        let final_translation = '（自動翻譯）'; // 預設為 API 翻譯
        let final_sentence_en = '（無例句）';
        let final_sentence_zh = '（無例句）';

        // 1. [新邏輯] 優先搜尋資料庫
        const foundWord = findWordInDatabase(word);
        if (foundWord) {
            final_translation = foundWord.translation; // 找到就用資料庫的翻譯
            final_sentence_en = foundWord.sentence_en;
            final_sentence_zh = foundWord.sentence_zh;
        }

        // 2. [新邏輯] 如果使用者有手動輸入例句 (user_s_en 非空)，則覆蓋掉資料庫的例句
        if (user_s_en) {
            final_sentence_en = user_s_en;
            final_sentence_zh = user_s_zh ? user_s_zh : '（無例句）'; // 中文例句也必須以使用者的為主
        }
        
        return {
            word: word,
            translation: final_translation, // 可能是 "蘋果" 或 "（自動翻譯）"
            sentence_en: final_sentence_en,
            sentence_zh: final_sentence_zh
        };
    }).filter(obj => obj && obj.word); // 過濾掉所有 null 或沒有 word 的物件

    localStorage.setItem('customWords', JSON.stringify(newWordsObjects));
    
    alert("自訂題庫已儲存！");
    closeWordSettings(); 
    
    // 自動切換到自訂題庫並重置
    changeLevel('custom');
}

// 「恢復預設」的函式
function restoreDefaultWords() {
    if (confirm("您確定要清除所有自訂單字，並恢復為預設題庫嗎？\n（注意：這也會重設您的寵物等級和成就！）")) {
        localStorage.removeItem('customWords'); 
        
        // [新增] 同時清除遊戲化進度
        localStorage.removeItem('totalXP');
        localStorage.removeItem('unlockedBadges');
        localStorage.removeItem('quizLengthLimit'); // [新增] 重設題數
        
        alert("已恢復預設題庫，網頁將會重新整理。");
        
        // 恢復到國小等級
        localStorage.setItem('currentWordLevel', 'level1_element');
        window.location.reload(); 
    }
}

// 控制說明區塊
function toggleGuide() {
    const content = document.getElementById('guideContent');
    if (content.style.display === 'block') {
        content.style.display = 'none';
    } else {
        content.style.display = 'block';
    }
}

// 頁面載入時預設隱藏說明
document.addEventListener('DOMContentLoaded', () => {
    const guideContent = document.getElementById('guideContent');
    if (guideContent) {
        guideContent.style.display = 'none';
    }
});


/**
 * [新功能] 獲取單字翻譯並更新 UI
 * @param {string} word - 要翻譯的英文單字
 * @param {HTMLElement} element - 要顯示翻譯的 HTML 元素 (translationEl)
 */
async function fetchTranslation(word, element) {
    // 顯示載入中...
    element.innerHTML = `<span class="translation">（正在翻譯...）</span>`;

    try {
        // 使用免費的 MyMemory API (英文 翻譯到 繁體中文)
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        // 檢查 API 是否成功返回翻譯
        if (data.responseData && data.responseData.translatedText) {
            let translated = data.responseData.translatedText;
            
            // 過濾掉 API 可能返回的錯誤訊息
            if (translated.includes('NO QUERY SPECIFIED') || translated.includes('INVALID LANGUAGE PAIR')) {
                 element.innerHTML = `<span class="translation">（無法翻譯此單字）</span>`;
            } else {
                 element.innerHTML = `<span class="translation">${translated}</span>`;
            }
        } else {
            element.innerHTML = `<span class="translation">（翻譯失敗）</span>`;
        }
    } catch (error) {
        console.error('Fetch translation error:', error);
        element.innerHTML = `<span class="translation">（翻譯載入錯誤）</span>`;
    }
}


// --- [新增] 遊戲化功能函式 (v20 擴充) ---

/**
 * [新] 增加經驗值並更新
 */
function addXP(amount) {
    totalXP += amount;
    localStorage.setItem('totalXP', totalXP);
    updatePetDisplay();
}

/**
 * [新] 更新寵物/等級介面
 */
function updatePetDisplay() {
    let currentPet = petLevels[0];
    let nextLevelXP = petLevels[1].xp;

    // 倒序尋找目前等級
    for (let i = petLevels.length - 1; i >= 0; i--) {
        if (totalXP >= petLevels[i].xp) {
            currentPet = petLevels[i];
            
            // 找到下一個等級的 XP 門檻
            if (i < petLevels.length - 1) {
                nextLevelXP = petLevels[i + 1].xp;
            } else {
                nextLevelXP = petLevels[i].xp; // 已滿等
            }
            break;
        }
    }

    // 計算經驗值條百分比
    let xpForCurrentLevel = totalXP - currentPet.xp;
    let xpToNextLevel = nextLevelXP - currentPet.xp;
    let percentage = 0;
    
    if (xpToNextLevel > 0) { // 避免除以零
        percentage = Math.min((xpForCurrentLevel / xpToNextLevel) * 100, 100);
    } else if (totalXP >= nextLevelXP) { // 滿等
        percentage = 100;
        xpForCurrentLevel = xpToNextLevel; // 顯示為滿
    }

    // 更新 DOM 元素
    const petNameEl = document.getElementById('petName');
    
    // [新增] 檢查是否進化 (名稱是否改變)
    if (petNameEl.textContent !== currentPet.name && petNameEl.textContent !== '') {
        const frameEl = document.querySelector('.pet-image-frame');
        if (frameEl) {
            frameEl.classList.add('evolve'); // 觸發動畫
            setTimeout(() => {
                frameEl.classList.remove('evolve'); // 動畫結束後移除 class
            }, 800); // 800ms 必須和 CSS 動畫時間一致
        }
    }

    document.getElementById('petImage').textContent = currentPet.image;
    document.getElementById('petName').textContent = currentPet.name; // 名稱和圖片照常更新
    document.getElementById('xpBarFill').style.width = `${percentage}%`;
    
    if (percentage === 100 && xpToNextLevel <= 0) { // 滿等狀態
         document.getElementById('xpText').textContent = `XP: ${totalXP} (已滿等)`;
    } else {
         document.getElementById('xpText').textContent = `XP: ${xpForCurrentLevel} / ${xpToNextLevel}`;
    }
}

/**
 * [新] 開啟成就徽章 Modal
 */
function openBadgeModal() {
    const modal = document.getElementById('badgeModal');
    const grid = document.getElementById('badgeGrid');
    grid.innerHTML = ''; // 清空

    // 遍歷所有徽章
    for (const badgeId in allBadges) {
        const badge = allBadges[badgeId];
        const isUnlocked = unlockedBadges.includes(badgeId);

        const badgeEl = document.createElement('div');
        badgeEl.className = isUnlocked ? 'badge-item badge-unlocked' : 'badge-item badge-locked';
        
        let desc = isUnlocked ? badge.desc : '（未解鎖）';
        
        badgeEl.innerHTML = `
            <div class="badge-icon">${isUnlocked ? badge.icon : '❓'}</div>
            <div class="badge-title">${isUnlocked ? badge.title : '？？？'}</div>
            <div class="badge-desc">${desc}</div>
        `;
        grid.appendChild(badgeEl);
    }
    
    modal.style.display = 'flex';
}

/**
 * [新] 關閉成就徽章 Modal
 */
function closeBadgeModal() {
    document.getElementById('badgeModal').style.display = 'none';
}

/**
 * [新] 解鎖徽章 (如果尚未解鎖)
 */
function unlockBadge(badgeId) {
    if (!unlockedBadges.includes(badgeId)) {
        unlockedBadges.push(badgeId);
        localStorage.setItem('unlockedBadges', JSON.stringify(unlockedBadges));
        
        const badge = allBadges[badgeId];
        // 延遲 1 秒跳出提示，避免和「答對」提示衝突
        setTimeout(() => {
            alert(`🎖️ 解鎖新成就！ 🎖️\n\n${badge.icon} ${badge.title}\n${badge.desc}`);
        }, 1000);
    }
}

/**
 * [修改 v20] 檢查並解鎖徽章 (擴充邏輯)
 */
function checkAndUnlockBadges(stats) {
    // 檢查累積答對 (用 XP 估算，1 題約 10-15 XP)
    if (totalXP >= 10) unlockBadge('first_correct');
    if (totalXP >= 150) unlockBadge('correct_10'); // 約 10-15 題
    if (totalXP >= 750) unlockBadge('correct_50'); // 約 50-75 題
    if (totalXP >= 1500) unlockBadge('correct_100'); // 約 100-150 題
    if (totalXP >= 7500) unlockBadge('correct_500'); // 約 500-750 題
    if (totalXP >= 15000) unlockBadge('correct_1000'); // 約 1000-1500 題
    
    // 檢查連擊
    if (currentStreak >= 5) unlockBadge('streak_5');
    if (currentStreak >= 10) unlockBadge('streak_10');
    if (currentStreak >= 25) unlockBadge('streak_25');

    // 檢查是否完成測驗
    if (stats.checkedWords > 0 && stats.checkedWords === stats.totalWords) {
        // 探索徽章
        if (currentLevel === 'custom') unlockBadge('custom_user');
        if (currentLevel.startsWith('grade_')) unlockBadge('hanlin_user');
        if (currentLevel === 'level2_junior') unlockBadge('junior_pass');
        if (currentLevel === 'level3_senior') unlockBadge('senior_pass');
        
        // 技巧徽章
        if (stats.accuracy === 100) {
            if (stats.totalWords >= 20) {
                unlockBadge('perfect_quiz');
            }
            if (stats.totalWords >= 100) { // 必須是 100 題的完美測驗
                unlockBadge('perfect_100');
            }
        }
    }
}