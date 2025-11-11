// 'words' 變數 - 用來存放 "目前" 正在練習的題庫 (已合併單元)
let words = []; 

let shuffleWords = []; 
let results = {}; 
let currentIndex = 0;
let currentLevel = 'level1_element'; // 預設等級 (國小)
let currentHanlinGrade = ''; // 紀錄當前選擇的翰林年級 (例如 grade_7A)

// 'baseWordLists' 變數將由 <script src="words.js"></script> 檔案提供。

// 頁面載入時初始化
window.onload = init;

function init() {
    // 檢查 baseWordLists 是否成功載入
    if (typeof baseWordLists === 'undefined' || Object.keys(baseWordLists).length === 0) {
        alert("錯誤：無法載入 'words.js' 題庫檔案！請檢查檔案名稱或語法是否正確。");
        return;
    }

    // 讀取上次儲存的等級，如果沒有，就用預設的 'level1_element'
    currentLevel = localStorage.getItem('currentWordLevel') || 'level1_element';
    
    // 載入對應的單字列表
    if (currentLevel.startsWith('grade_')) {
        currentHanlinGrade = currentLevel; // 記錄下來
        // 嘗試從 grade_7A 預載入單字數給介面顯示
        if (baseWordLists.level6_hanlin[currentHanlinGrade] && baseWordLists.level6_hanlin[currentHanlinGrade].Unit1) {
            words = baseWordLists.level6_hanlin[currentHanlinGrade].Unit1; 
        }
    } else {
        loadWordList(currentLevel);
    }
    
    // 更新介面
    updateActiveTab(currentLevel);
    shuffleAndReset(); 
    updateStats();
    updateNavigation();
    updateControlsText(); // 初始化按鈕文字
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
 * 根據當前題庫總數更新按鈕文字 
 */
function updateControlsText() {
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
        const quizLimitHanlin = Math.min(selectedWordsCount, 100);

        if (selectedWordsCount === 0) {
             startQuizBtn.textContent = '開始測驗';
        } else if (selectedWordsCount <= 100) {
             startQuizBtn.textContent = `開始測驗 (共 ${quizLimitHanlin} 題)`;
        } else {
             startQuizBtn.textContent = `開始測驗 (抽取 100 題)`;
        }
    }


    // 處理「重新排序」按鈕
    const shuffleBtn = document.getElementById('shuffleButton'); 
    const totalWordsCount = words.length;
    const quizLimit = Math.min(totalWordsCount, 100);

    if (totalWordsCount === 0) {
        shuffleBtn.textContent = '重新排序 (題庫為空)';
    } else if (totalWordsCount <= 100) {
        shuffleBtn.textContent = `重新排序 (共 ${quizLimit} 題)`;
    } else {
        shuffleBtn.textContent = `重新排序 (抽取 100 題)`;
    }
}


// 100 題抽題邏輯
function shuffleAndReset() {
    if (!words || words.length === 0) {
        shuffleWords = []; 
    } else {
        let shuffledFullList = [...words].sort(() => Math.random() - 0.5);
        
        // 動態設定測驗數量 (核心修復點)
        const quizLimit = Math.min(shuffledFullList.length, 100);
        shuffleWords = shuffledFullList.slice(0, quizLimit);
    }

    results = {}; 
    currentIndex = 0;
    generateCurrentCard();
    updateNavigation();
    updateStats();
    updateControlsText(); 
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

    // [修改] 判斷是否為自訂題庫，若是，則呼叫 API 翻譯
    if (currentLevel === 'custom') {
        fetchTranslation(word, translationEl); // 注意：這裡是用 word 變數
    } else {
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
    // 檢查中文是否為 "自訂" 或 "無例句"，如果是，就只唸英文
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
        resultEl.innerHTML = '正確！';
        resultEl.className = 'result correct';
        wordCard.className = 'word-card correct';
    } else {
        resultEl.innerHTML = `錯誤！正確答案是 ${correctWord}`;
        resultEl.className = 'result incorrect';
        wordCard.className = 'word-card incorrect';
    }
    
    // [修改] 判斷是否為自訂題庫，若是，則呼叫 API 翻譯
    if (currentLevel === 'custom') {
        fetchTranslation(correctWord, translationEl);
    } else {
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

    const stats = updateStats(); // 更新統計並取得回傳值

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
    
    // 回傳統計物件，供完成檢查使用
    return { totalWords, checkedWords, correctWords, incorrectWords, accuracy };
}

// 開啟設定視窗
function openWordSettings() {
    const modal = document.getElementById('wordSettingsModal');
    modal.style.display = 'flex'; 
    
    // 只有在「自訂題庫」模式下才載入儲存的單字，否則清空
    if (currentLevel === 'custom') {
        const customWords = JSON.parse(localStorage.getItem('customWords')) || [];
        document.getElementById('customWordsTextarea').value = customWords.map(w => w.word).join('\n');
    } else {
        document.getElementById('customWordsTextarea').value = '';
    }
    document.getElementById('customWordsTextarea').focus();
}

// 關閉設定視Window
function closeWordSettings() {
    document.getElementById('wordSettingsModal').style.display = 'none'; 
}

// 儲存設定 (自訂題庫)
function saveWordSettings() {
    const text = document.getElementById('customWordsTextarea').value;
    const newWordsStrings = text.split('\n').map(w => w.trim()).filter(w => w);
    
    if (newWordsStrings.length === 0) {
        alert('請至少輸入一個單字');
        return;
    }

    const newWordsObjects = newWordsStrings.map(w => ({
        word: w,
        translation: '（自訂單字）',
        sentence_en: '（無例句）',
        sentence_zh: '（無例句）'
    }));

    localStorage.setItem('customWords', JSON.stringify(newWordsObjects));
    
    alert("自訂題庫已儲存！");
    closeWordSettings(); 
    
    // 自動切換到自訂題庫並重置
    changeLevel('custom');
}

// 「恢復預設」的函式
function restoreDefaultWords() {
    if (confirm("您確定要清除所有自訂單字，並恢復為預設題庫嗎？")) {
        localStorage.removeItem('customWords'); 
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
